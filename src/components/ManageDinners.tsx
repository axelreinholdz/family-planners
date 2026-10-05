"use client";

import { useState, type FormEvent } from "react";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { SEED_DINNERS } from "@/lib/seed";
import type { DinnerPlan } from "@/lib/types";

function titlesFromDinners(dinners: DinnerPlan[]): string[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    return dinners.find((d) => d.weekday === weekday)?.title ?? "";
  });
}

function DinnerMenuForm({ initial }: { initial: DinnerPlan[] }) {
  const { saveDinners, resetDinnerMenu } = useFamilyStore();
  const [titles, setTitles] = useState(() => titlesFromDinners(initial));
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: DinnerPlan[] = titles.map((title, weekday) => ({
      weekday,
      title: title.trim(),
    }));
    await saveDinners(next);
    setTitles(titlesFromDinners(next));
    setEditingDay(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Middagsmeny</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Veckans återkommande middagar. Syns på Idag-sidan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Återställa till exempelmenyn (fisk, pasta, gryta…)?",
                )
              ) {
                void resetDinnerMenu().then(() => {
                  setTitles(titlesFromDinners(SEED_DINNERS));
                  setEditingDay(null);
                });
              }
            }}
            className="tap-target rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-sm ring-1 ring-black/10"
          >
            Exempelmeny
          </button>
          <button
            type="submit"
            className="tap-target rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
          >
            {savedFlash ? "Sparad!" : "Spara menyn"}
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const title = titles[weekday] ?? "";
          const isEditing = editingDay === weekday;
          return (
            <li
              key={label}
              className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold uppercase text-[var(--ink)]">
                    {label}
                  </p>
                  <p className="truncate text-sm text-[var(--ink-muted)]">
                    {title.trim() || "Ingen middag"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingDay((day) => (day === weekday ? null : weekday))
                  }
                  className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                >
                  {isEditing ? "Stäng" : "Ändra"}
                </button>
              </div>
              {isEditing ? (
                <div className="flex flex-col gap-3 border-t border-black/5 px-4 py-4">
                  <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                    Middag
                    <span className="flex gap-2">
                      <input
                        value={title}
                        onChange={(e) => {
                          const next = [...titles];
                          next[weekday] = e.target.value;
                          setTitles(next);
                        }}
                        placeholder="Ingen middag"
                        className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
                        aria-label={`Middag ${label}`}
                      />
                      <MicButton
                        value={title}
                        onTranscript={(text) => {
                          const next = [...titles];
                          next[weekday] = text;
                          setTitles(next);
                        }}
                        label={`Tala in middag ${label}`}
                      />
                    </span>
                  </label>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </form>
  );
}

export function ManageDinners() {
  const { dinners } = useFamilyStore();
  return (
    <DinnerMenuForm
      key={dinners.length > 0 ? "loaded" : "empty"}
      initial={dinners}
    />
  );
}
