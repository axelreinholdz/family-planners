"use client";

import { useState } from "react";
import { ManagePeople } from "@/components/ManagePeople";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import {
  KITCHEN_PAGE_OPTIONS,
  toggleVisibleKitchenPage,
} from "@/lib/kitchenPages";
import {
  isDefaultManagePin,
  resetManagePinForLocalMode,
  setManagePin,
  verifyManagePin,
} from "@/lib/managePin";
import {
  getCachedMembership,
  isCloudMode,
  setCloudMode,
} from "@/lib/repository";
import { createClient } from "@/lib/supabase/client";
import { clearCloudCache } from "@/lib/supabase/cloud-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { KitchenPageId } from "@/lib/types";

type SettingsSection = "pages" | "people" | "security" | "data";

const MENU_ITEMS: {
  id: SettingsSection;
  title: string;
  description: string;
}[] = [
  {
    id: "pages",
    title: "Visade sidor",
    description: "Välj vilka vyer som syns när ni sveper i köket",
  },
  {
    id: "people",
    title: "Personer",
    description: "Lägg till och ändra familjemedlemmar",
  },
  {
    id: "security",
    title: "PIN till Hantera",
    description: "Byt koden till föräldraläget",
  },
  {
    id: "data",
    title: "Synk & data",
    description: "Molnsynk, utloggning och återställning",
  },
];

export function ManageSettings() {
  const { resetData } = useFamilyStore();
  const [section, setSection] = useState<SettingsSection>("pages");
  const active = MENU_ITEMS.find((item) => item.id === section) ?? MENU_ITEMS[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h3 className="font-display text-xl font-bold">Inställningar</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Välj i menyn till vänster.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          className="flex shrink-0 gap-2 overflow-x-auto p-0.5 md:flex-col md:overflow-y-auto md:overflow-x-visible"
          aria-label="Inställningar"
        >
          {MENU_ITEMS.map((item) => {
            const selected = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`tap-target shrink-0 rounded-2xl px-4 py-3 text-left md:w-full ${
                  selected
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-white/80 text-[var(--ink)] ring-1 ring-black/5"
                }`}
              >
                <p className="font-display text-base font-bold">{item.title}</p>
                <p
                  className={`mt-0.5 hidden text-xs font-medium md:block ${
                    selected ? "text-white/80" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {item.description}
                </p>
              </button>
            );
          })}
        </nav>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <div className="mb-3 shrink-0 md:hidden">
            <h4 className="font-display text-lg font-bold text-[var(--ink)]">
              {active.title}
            </h4>
            <p className="text-sm text-[var(--ink-muted)]">
              {active.description}
            </p>
          </div>

          {section === "pages" ? <PagesSettings /> : null}
          {section === "people" ? <ManagePeople /> : null}
          {section === "security" ? <SecuritySettings /> : null}
          {section === "data" ? (
            <DataSettings onReset={() => void resetData()} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function PagesSettings() {
  const { visibleKitchenPages, saveVisibleKitchenPages } = useFamilyStore();

  const toggle = (pageId: KitchenPageId) => {
    const next = toggleVisibleKitchenPage(visibleKitchenPages, pageId);
    void saveVisibleKitchenPages(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-0.5">
      <div className="hidden md:block">
        <h4 className="font-display text-lg font-bold text-[var(--ink)]">
          Visade sidor
        </h4>
        <p className="text-sm text-[var(--ink-muted)]">
          Avmarkerade sidor döljs i köksvyn. Minst en sida måste vara synlig.
        </p>
      </div>
      <p className="text-sm text-[var(--ink-muted)] md:hidden">
        Avmarkerade sidor döljs i köksvyn. Minst en sida måste vara synlig.
      </p>
      <ul className="flex flex-col gap-2">
        {KITCHEN_PAGE_OPTIONS.map((page) => {
          const on = visibleKitchenPages.includes(page.id);
          const onlyOne = visibleKitchenPages.length === 1 && on;
          return (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => toggle(page.id)}
                disabled={onlyOne}
                className={`tap-target flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left disabled:opacity-60 ${
                  on
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-soft)] text-[var(--ink)]"
                }`}
              >
                <span className="font-display text-lg font-bold">
                  {page.label}
                </span>
                <span className="text-sm font-bold">
                  {on ? "Synlig" : "Dold"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SecuritySettings() {
  const cloud = isCloudMode();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-0.5">
      <div className="hidden md:block">
        <h4 className="font-display text-lg font-bold text-[var(--ink)]">
          PIN till Hantera
        </h4>
        <p className="text-sm text-[var(--ink-muted)] text-pretty">
          {cloud
            ? "Skyddar föräldraläget för ditt konto (synkas mellan enheter). Soft gate — inte hög säkerhet."
            : "Skyddar föräldraläget på den här enheten."}
          {isDefaultManagePin() ? " Standardkod: 1234." : ""}
        </p>
      </div>
      <p className="text-sm text-[var(--ink-muted)] text-pretty md:hidden">
        {cloud
          ? "Skyddar föräldraläget för ditt konto (synkas mellan enheter)."
          : "Skyddar föräldraläget på den här enheten."}
        {isDefaultManagePin() ? " Standardkod: 1234." : ""}
      </p>
      <form
        className="grid max-w-md gap-2 p-0.5"
        onSubmit={(e) => {
          e.preventDefault();
          setPinMessage(null);
          setPinError(null);
          void (async () => {
            try {
              if (!(await verifyManagePin(currentPin))) {
                setPinError("Nuvarande PIN är fel");
                return;
              }
              if (newPin !== confirmPin) {
                setPinError("Nya PIN-koderna matchar inte");
                return;
              }
              await setManagePin(newPin);
              setCurrentPin("");
              setNewPin("");
              setConfirmPin("");
              setPinMessage(cloud ? "PIN sparad och synkad" : "PIN sparad");
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : err &&
                      typeof err === "object" &&
                      "message" in err &&
                      typeof (err as { message: unknown }).message === "string"
                    ? (err as { message: string }).message
                    : "Kunde inte spara PIN";
              setPinError(message);
            }
          })();
        }}
      >
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Nuvarande PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={currentPin}
            onChange={(e) =>
              setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Ny PIN (4–6 siffror)
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Bekräfta ny PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
          />
        </label>
        {pinError ? (
          <p className="text-sm font-semibold text-red-700">{pinError}</p>
        ) : null}
        {pinMessage ? (
          <p className="text-sm font-semibold text-[var(--accent-deep)]">
            {pinMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={
            currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4
          }
          className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          Byt PIN
        </button>
      </form>
    </div>
  );
}

function DataSettings({ onReset }: { onReset: () => void }) {
  const cloud = isCloudMode();
  const membership = getCachedMembership();
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-0.5">
      <div className="hidden md:block">
        <h4 className="font-display text-lg font-bold text-[var(--ink)]">
          Synk & data
        </h4>
      </div>
      {cloud && membership ? (
        <>
          <p className="text-sm text-[var(--ink-muted)]">
            Data synkas via Supabase för familjen{" "}
            <strong>{membership.familyName}</strong>. Dela koden nedan för att
            logga in från telefon eller annan dator.
          </p>
          <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Inbjudningskod
            </p>
            <p className="font-display text-3xl font-bold tracking-[0.2em] text-[var(--ink)]">
              {membership.inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                clearCloudCache();
                setCloudMode(false);
                resetManagePinForLocalMode();
              })();
            }}
            className="tap-target max-w-md rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
          >
            Logga ut
          </button>
        </>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          {configured
            ? "Du kör lokalt just nu. Logga in för att synka mellan enheter."
            : "Data sparas lokalt på den här enheten (IndexedDB). Lägg till Supabase-nycklar för molnsynk."}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              "Vill du återställa till exempeldata? Allt ni har lagt in raderas.",
            )
          ) {
            onReset();
          }
        }}
        className="tap-target max-w-md rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"
      >
        Återställ exempeldata
      </button>
    </div>
  );
}
