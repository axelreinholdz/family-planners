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
  const [savedFlash, setSavedFlash] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: DinnerPlan[] = titles.map((title, weekday) => ({
      weekday,
      title: title.trim(),
    }));
    await saveDinners(next);
    setTitles(titlesFromDinners(next));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5"
    >
      <h3 className="font-display text-xl font-bold">Middagsmeny</h3>
      <p className="text-sm text-[var(--ink-muted)]">
        Veckans återkommande middagar. Syns på Idag-sidan.
      </p>

      <div className="flex flex-col gap-2">
        {WEEKDAY_LABELS.map((label, weekday) => (
          <div
            key={label}
            className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]"
          >
            <span className="uppercase">{label}</span>
            <input
              value={titles[weekday] ?? ""}
              onChange={(e) => {
                const next = [...titles];
                next[weekday] = e.target.value;
                setTitles(next);
              }}
              placeholder="Ingen middag"
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
              aria-label={`Middag ${label}`}
            />
            <MicButton
              value={titles[weekday] ?? ""}
              onTranscript={(text) => {
                const next = [...titles];
                next[weekday] = text;
                setTitles(next);
              }}
              label={`Tala in middag ${label}`}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
        >
          {savedFlash ? "Sparad!" : "Spara menyn"}
        </button>
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
              });
            }
          }}
          className="tap-target rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
        >
          Exempelmeny
        </button>
      </div>
    </form>
  );
}

export function ManageDinners() {
  const { dinners } = useFamilyStore();
  return <DinnerMenuForm key={dinners.length > 0 ? "loaded" : "empty"} initial={dinners} />;
}
