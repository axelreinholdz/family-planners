/**
 * Hantera PIN — soft parental gate (not high security).
 * PINs are stored as SHA-256 hashes with a static app salt.
 * Cloud mode: source of truth is Supabase `user_settings` per auth user.
 * Local-only: falls back to device localStorage.
 */

import { createClient } from "@/lib/supabase/client";
import { isCloudMode } from "@/lib/repository";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const LEGACY_PLAIN_KEY = "family-planners-manage-pin";
const LOCAL_HASH_KEY = "family-planners-manage-pin-hash";
const LOCAL_LENGTH_KEY = "family-planners-manage-pin-length";
const ACTIVE_USER_KEY = "family-planners-manage-pin-user";

/** Static app salt — soft gate only; not a substitute for real auth. */
const PIN_SALT = "family-planners-manage-pin-v1";

export const DEFAULT_MANAGE_PIN = "1234";

/** Precomputed SHA-256 of `${PIN_SALT}:${DEFAULT_MANAGE_PIN}`. */
export const DEFAULT_MANAGE_PIN_HASH =
  "553a468ce7f4c9545ecf73d4d286afdc20941625896f0ae2ec830f8d7789cb31";

type PinState = {
  hash: string;
  length: number;
  userId: string | null;
};

let memory: PinState | null = null;
let syncPromise: Promise<void> | null = null;

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashManagePin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_SALT}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}

function userHashKey(userId: string) {
  return `${LOCAL_HASH_KEY}:${userId}`;
}

function userLengthKey(userId: string) {
  return `${LOCAL_LENGTH_KEY}:${userId}`;
}

function defaultState(userId: string | null = null): PinState {
  return {
    hash: DEFAULT_MANAGE_PIN_HASH,
    length: DEFAULT_MANAGE_PIN.length,
    userId,
  };
}

function readSlot(
  hashKey: string,
  lengthKey: string,
  userId: string | null,
): PinState | null {
  if (typeof window === "undefined") return null;
  const hash = window.localStorage.getItem(hashKey);
  const lengthRaw = window.localStorage.getItem(lengthKey);
  const length = lengthRaw ? Number(lengthRaw) : NaN;
  if (hash && hash.length === 64 && length >= 4 && length <= 6) {
    return { hash, length, userId };
  }
  return null;
}

function writeSlot(state: PinState): void {
  if (typeof window === "undefined") return;
  if (state.userId) {
    window.localStorage.setItem(userHashKey(state.userId), state.hash);
    window.localStorage.setItem(
      userLengthKey(state.userId),
      String(state.length),
    );
    window.localStorage.setItem(ACTIVE_USER_KEY, state.userId);
  } else {
    window.localStorage.setItem(LOCAL_HASH_KEY, state.hash);
    window.localStorage.setItem(LOCAL_LENGTH_KEY, String(state.length));
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  }
  window.localStorage.removeItem(LEGACY_PLAIN_KEY);
  memory = state;
}

function readActiveState(): PinState {
  if (typeof window === "undefined") return defaultState();

  const activeUser = window.localStorage.getItem(ACTIVE_USER_KEY);
  if (activeUser) {
    const scoped = readSlot(
      userHashKey(activeUser),
      userLengthKey(activeUser),
      activeUser,
    );
    if (scoped) return scoped;
  }

  const local = readSlot(LOCAL_HASH_KEY, LOCAL_LENGTH_KEY, null);
  if (local) return local;

  return defaultState();
}

function getState(): PinState {
  if (memory) return memory;
  memory = readActiveState();
  return memory;
}

/** Ensure legacy plaintext PIN (if any) is hashed into the local (device) slot. */
async function migrateLegacyPlaintext(): Promise<void> {
  if (typeof window === "undefined") return;
  const legacy = window.localStorage.getItem(LEGACY_PLAIN_KEY);
  if (!legacy || !/^\d{4,6}$/.test(legacy)) return;
  const hash = await hashManagePin(legacy);
  writeSlot({ hash, length: legacy.length, userId: null });
}

export function getManagePinLength(): number {
  return getState().length;
}

export function getManagePinHash(): string {
  return getState().hash;
}

export function isDefaultManagePin(): boolean {
  return getState().hash === DEFAULT_MANAGE_PIN_HASH;
}

export async function verifyManagePin(input: string): Promise<boolean> {
  await migrateLegacyPlaintext();
  if (!/^\d{4,6}$/.test(input)) return false;
  if (input.length !== getState().length) return false;
  const hash = await hashManagePin(input);
  return hash === getState().hash;
}

/**
 * Save a new PIN locally (and to Supabase when cloud-connected).
 */
function pinCloudError(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  const code = error.code ?? "";
  const missingTable =
    code === "PGRST205" ||
    /user_settings/i.test(message) ||
    /Could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /schema cache/i.test(message);
  if (missingTable) {
    return new Error(
      "PIN-tabellen saknas i Supabase. Kör migrationen 003_user_settings.sql i SQL Editor.",
    );
  }
  if (code === "42501" || /permission denied|row-level security/i.test(message)) {
    return new Error(
      "Saknar behörighet att spara PIN. Kontrollera RLS/policy för user_settings.",
    );
  }
  return new Error(message || "Kunde inte synka PIN till molnet");
}

export async function setManagePin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN måste vara 4–6 siffror");
  }
  const hash = await hashManagePin(pin);
  const length = pin.length;

  let userId: string | null = null;
  if (isCloudMode() && isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Inte inloggad — kan inte synka PIN");
    }
    userId = user.id;
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        manage_pin_hash: hash,
        manage_pin_length: length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw pinCloudError(error);
  }

  writeSlot({ hash, length, userId });
}

/**
 * Load the signed-in user's PIN hash from Supabase into local cache.
 * No-op when not in cloud mode. Safe to call repeatedly.
 */
export async function syncManagePinFromCloud(): Promise<void> {
  if (!isCloudMode() || !isSupabaseConfigured()) {
    await migrateLegacyPlaintext();
    return;
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    await migrateLegacyPlaintext();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Switch active slot immediately so we never verify against another user's PIN.
    const offline =
      readSlot(userHashKey(user.id), userLengthKey(user.id), user.id) ??
      defaultState(user.id);
    memory = offline;

    const { data, error } = await supabase
      .from("user_settings")
      .select("manage_pin_hash, manage_pin_length")
      .eq("user_id", user.id)
      .maybeSingle();

    // Missing table / RLS should not block the app — keep offline PIN.
    if (error) {
      console.warn("Kunde inte hämta PIN från molnet:", pinCloudError(error).message);
      writeSlot(offline);
      return;
    }

    if (
      data?.manage_pin_hash &&
      data.manage_pin_length &&
      data.manage_pin_length >= 4 &&
      data.manage_pin_length <= 6
    ) {
      writeSlot({
        hash: data.manage_pin_hash,
        length: data.manage_pin_length,
        userId: user.id,
      });
      return;
    }

    // No cloud row yet: seed from this user's offline cache or default.
    const { error: upsertError } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        manage_pin_hash: offline.hash,
        manage_pin_length: offline.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) {
      console.warn(
        "Kunde inte skapa PIN i molnet:",
        pinCloudError(upsertError).message,
      );
      writeSlot(offline);
      return;
    }
    writeSlot({ ...offline, userId: user.id });
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

/** Clear in-memory PIN so the next read reloads from storage. */
export function clearManagePinMemory(): void {
  memory = null;
}

/**
 * After sign-out: deactivate the cloud user slot and fall back to device-local PIN.
 */
export function resetManagePinForLocalMode(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  }
  memory = null;
}
