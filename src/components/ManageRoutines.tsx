"use client";

import { useState } from "react";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import type { Routine } from "@/lib/types";

export function ManageRoutines() {
  const { people, routines, saveRoutine } = useFamilyStore();
  const [drafts, setDrafts] = useState<Record<string, Routine>>({});

  const getDraft = (routine: Routine) => drafts[routine.id] ?? routine;

  if (routines.length === 0) {
    return (
      <div className="rounded-3xl bg-white/80 p-6 text-sm text-[var(--ink-muted)]">
        Inga rutiner ännu. Återställ exempeldata under Inställningar för att få
        Ebbes morgonrutin.
      </div>
    );
  }

  return (
    <div className="grid gap-4 overflow-y-auto lg:grid-cols-2">
      {routines.map((routine) => {
        const draft = getDraft(routine);
        const person = people.find((p) => p.id === routine.personId);
        return (
          <form
            key={routine.id}
            className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
            onSubmit={(e) => {
              e.preventDefault();
              void saveRoutine(draft).then(() => {
                setDrafts((prev) => {
                  const next = { ...prev };
                  delete next[routine.id];
                  return next;
                });
              });
            }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                Rutin · {person ? `${person.avatar} ${person.name}` : "?"}
              </p>
              <label className="mt-2 grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                Namn
                <span className="flex gap-2">
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [routine.id]: { ...draft, title: e.target.value },
                      }))
                    }
                    className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
                  />
                  <MicButton
                    value={draft.title}
                    onTranscript={(text) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [routine.id]: { ...draft, title: text },
                      }))
                    }
                  />
                </span>
              </label>
            </div>

            <ul className="flex flex-col gap-2">
              {[...draft.steps]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((step, index) => (
                  <li
                    key={step.id}
                    className="grid grid-cols-[3rem_1fr] items-center gap-2"
                  >
                    <input
                      value={step.emoji}
                      onChange={(e) => {
                        const steps = draft.steps.map((s) =>
                          s.id === step.id
                            ? { ...s, emoji: e.target.value }
                            : s,
                        );
                        setDrafts((prev) => ({
                          ...prev,
                          [routine.id]: { ...draft, steps },
                        }));
                      }}
                      className="tap-target rounded-xl border border-black/10 bg-white px-2 py-2 text-center text-xl"
                      aria-label={`Emoji steg ${index + 1}`}
                    />
                    <input
                      value={step.label}
                      onChange={(e) => {
                        const steps = draft.steps.map((s) =>
                          s.id === step.id
                            ? { ...s, label: e.target.value }
                            : s,
                        );
                        setDrafts((prev) => ({
                          ...prev,
                          [routine.id]: { ...draft, steps },
                        }));
                      }}
                      className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold"
                      aria-label={`Namn steg ${index + 1}`}
                    />
                  </li>
                ))}
            </ul>

            <button
              type="submit"
              className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
            >
              Spara rutin
            </button>
          </form>
        );
      })}
    </div>
  );
}
