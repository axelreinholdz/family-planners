import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSeedEvents,
  buildSeedTodos,
  SEED_DINNERS,
  SEED_PEOPLE,
  SEED_ROUTINES,
  SEED_SCREEN_TIME,
  SEED_TEMPLATES,
} from "@/lib/seed";
import {
  applySpanForTemplate,
  eventsFromTemplatesForWeeks,
  weekAnchorsBetween,
} from "@/lib/recurring";
import { defaultIdagLayout, normalizeIdagLayout } from "@/lib/idagLayout";
import { normalizeRoutine } from "@/lib/routines";
import type { FamilyData } from "@/lib/types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function emptyFamilyData(): FamilyData {
  return {
    people: [],
    events: [],
    todos: [],
    dinners: [],
    screenTimeSettings: [],
    screenTimeDays: [],
    routines: [],
    routineProgress: [],
    recurringTemplates: [],
    calendarSubscriptions: [],
    idagLayout: defaultIdagLayout(),
  };
}

export function buildSeedFamilyData(): FamilyData {
  const recurringTemplates = SEED_TEMPLATES.map((t) => ({ ...t }));
  const events = buildSeedEvents();
  const created = eventsFromTemplatesForWeeks(
    recurringTemplates.filter((t) => t.enabled),
    events,
    (() => {
      if (recurringTemplates.length === 0) return [];
      let fromKey = applySpanForTemplate(recurringTemplates[0]).fromKey;
      let toKey = applySpanForTemplate(recurringTemplates[0]).toKey;
      for (const template of recurringTemplates) {
        const span = applySpanForTemplate(template);
        if (span.fromKey < fromKey) fromKey = span.fromKey;
        if (span.toKey > toKey) toKey = span.toKey;
      }
      return weekAnchorsBetween(fromKey, toKey);
    })(),
    newId,
  );

  return {
    people: SEED_PEOPLE.map((p) => ({ ...p })),
    events: [...events, ...created],
    todos: buildSeedTodos(),
    dinners: SEED_DINNERS.map((d) => ({ ...d })),
    screenTimeSettings: SEED_SCREEN_TIME.map((s) => ({ ...s })),
    screenTimeDays: [],
    routines: SEED_ROUTINES.map((r) => ({
      ...r,
      steps: r.steps.map((s) => ({ ...s })),
    })),
    routineProgress: [],
    recurringTemplates,
    calendarSubscriptions: [],
    idagLayout: defaultIdagLayout(),
  };
}

function randomInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function getMembership(
  supabase: SupabaseClient,
): Promise<{ familyId: string; inviteCode: string; familyName: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error } = await supabase
    .from("family_members")
    .select("family_id, families(id, name, invite_code)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!membership) return null;

  const family = membership.families as unknown as {
    id: string;
    name: string;
    invite_code: string;
  } | null;

  if (!family) return null;

  return {
    familyId: family.id,
    inviteCode: family.invite_code,
    familyName: family.name,
  };
}

export async function createFamily(
  supabase: SupabaseClient,
  name = "Familjen",
): Promise<{ familyId: string; inviteCode: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Inte inloggad");

  // Prefer RPC (atomic + bypasses select-after-insert RLS issues).
  const { data: rpcRows, error: rpcError } = await supabase.rpc("create_family", {
    family_name: name,
  });

  let familyId: string;
  let inviteCode: string;

  if (!rpcError && rpcRows && Array.isArray(rpcRows) && rpcRows[0]) {
    familyId = rpcRows[0].family_id as string;
    inviteCode = rpcRows[0].invite_code as string;
  } else if (!rpcError && rpcRows && typeof rpcRows === "object" && "family_id" in rpcRows) {
    const row = rpcRows as { family_id: string; invite_code: string };
    familyId = row.family_id;
    inviteCode = row.invite_code;
  } else {
    // Fallback for DBs that only have the original migration.
    if (rpcError && !/could not find|PGRST202|404/i.test(rpcError.message)) {
      throw new Error(rpcError.message);
    }

    inviteCode = randomInviteCode();
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select("id, invite_code")
      .single();

    if (familyError) {
      throw new Error(
        familyError.message.includes("schema cache") ||
          familyError.code === "42P01"
          ? "Databasen saknar tabeller. Kör SQL-migrationerna i Supabase."
          : familyError.message,
      );
    }

    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: family.id,
      user_id: user.id,
      role: "parent",
    });
    if (memberError) throw new Error(memberError.message);

    familyId = family.id;
    inviteCode = family.invite_code;

    const { error: emptyDataError } = await supabase.from("family_data").upsert({
      family_id: familyId,
      payload: {},
      updated_by: user.id,
    });
    if (emptyDataError) throw new Error(emptyDataError.message);
  }

  const payload = buildSeedFamilyData();
  const { error: dataError } = await supabase.from("family_data").upsert({
    family_id: familyId,
    payload,
    updated_by: user.id,
  });
  if (dataError) throw new Error(dataError.message);

  return { familyId, inviteCode };
}

export async function joinFamily(
  supabase: SupabaseClient,
  code: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("join_family", {
    code: code.trim(),
  });
  if (error) throw error;
  return data as string;
}

export async function loadFamilyPayload(
  supabase: SupabaseClient,
  familyId: string,
): Promise<FamilyData> {
  const { data, error } = await supabase
    .from("family_data")
    .select("payload")
    .eq("family_id", familyId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.payload) return emptyFamilyData();
  return normalizeFamilyData(data.payload as Partial<FamilyData>);
}

export async function saveFamilyPayload(
  supabase: SupabaseClient,
  familyId: string,
  payload: FamilyData,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("family_data").upsert({
    family_id: familyId,
    payload,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  });

  if (error) throw error;
}

function normalizeFamilyData(partial: Partial<FamilyData>): FamilyData {
  const base = emptyFamilyData();
  return {
    people: partial.people ?? base.people,
    events: partial.events ?? base.events,
    todos: partial.todos ?? base.todos,
    dinners: partial.dinners ?? base.dinners,
    screenTimeSettings: partial.screenTimeSettings ?? base.screenTimeSettings,
    screenTimeDays: partial.screenTimeDays ?? base.screenTimeDays,
    routines: (partial.routines ?? base.routines).map(normalizeRoutine),
    routineProgress: partial.routineProgress ?? base.routineProgress,
    recurringTemplates: partial.recurringTemplates ?? base.recurringTemplates,
    calendarSubscriptions:
      partial.calendarSubscriptions ?? base.calendarSubscriptions,
    idagLayout: normalizeIdagLayout(partial.idagLayout),
  };
}
