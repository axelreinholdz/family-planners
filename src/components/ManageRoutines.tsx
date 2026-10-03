"use client";

import { useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { defaultRoutineSteps, getIconEmoji } from "@/lib/icons";
import type { Routine, RoutineStep } from "@/lib/types";

function makeDefaultSteps(): RoutineStep[] {
  return defaultRoutineSteps().map((step, index) => ({
    id: crypto.randomUUID(),
    label: step.label,
    emoji: step.emoji,
    sortOrder: index,
  }));
}

export function ManageRoutines() {
  const { people, routines, saveRoutine, createRoutine, removeRoutine } =
    useFamilyStore();
  const children = people.filter((p) => p.role === "child");

  const [drafts, setDrafts] = useState<Record<string, Routine>>({});
  const [personId, setPersonId] = useState(children[0]?.id ?? "");
  const [title, setTitle] = useState("Kväll");
  const [steps, setSteps] = useState<RoutineStep[]>(() => makeDefaultSteps());
  const [pickingStepId, setPickingStepId] = useState<string | null>(null);

  const selectedPersonId =
    personId && people.some((p) => p.id === personId)
      ? personId
      : (children[0]?.id ?? people[0]?.id ?? "");

  const getDraft = (routine: Routine) => drafts[routine.id] ?? routine;

  const setDraft = (routineId: string, next: Routine) => {
    setDrafts((prev) => ({ ...prev, [routineId]: next }));
  };

  const resetCreateForm = () => {
    setPersonId(children[0]?.id ?? "");
    setTitle("Kväll");
    setSteps(makeDefaultSteps());
    setPickingStepId(null);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim() || steps.length === 0) return;
    await createRoutine({
      personId: selectedPersonId,
      title: title.trim(),
      steps: steps.map((step, index) => ({
        ...step,
        label: step.label.trim() || `Steg ${index + 1}`,
        sortOrder: index,
      })),
    });
    resetCreateForm();
  };

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-2">
      <form
        onSubmit={(e) => void onCreate(e)}
        className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
      >
        <h3 className="font-display text-xl font-bold">Ny rutin</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Ett barn kan ha flera rutiner, t.ex. morgon och kväll. Ikoner hämtas
          från appens gemensamma bibliotek.
        </p>

        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Vem
          <select
            value={selectedPersonId}
            onChange={(e) => setPersonId(e.target.value)}
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
          >
            {people
              .filter((p) => p.role === "child")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.avatar} {p.name}
                </option>
              ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Namn
          <span className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
            />
            <MicButton value={title} onTranscript={setTitle} />
          </span>
        </label>

        <ul className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex flex-col gap-2">
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPickingStepId((id) =>
                      id === step.id ? null : step.id,
                    )
                  }
                  className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-2xl ring-2 ring-transparent hover:ring-[var(--accent)]/40"
                  aria-label={`Välj ikon för steg ${index + 1}`}
                  title="Välj ikon"
                >
                  {step.emoji}
                </button>
                <input
                  value={step.label}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.id === step.id ? { ...s, label: e.target.value } : s,
                      ),
                    )
                  }
                  className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold"
                  aria-label={`Namn steg ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setSteps((prev) => prev.filter((s) => s.id !== step.id))
                  }
                  disabled={steps.length <= 1}
                  className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl disabled:opacity-30"
                  aria-label={`Ta bort steg ${index + 1}`}
                  title="Ta bort"
                >
                  {getIconEmoji("delete")}
                </button>
              </div>
              {pickingStepId === step.id ? (
                <IconPicker
                  category="routine"
                  value={step.emoji}
                  onChange={(icon) => {
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.id === step.id
                          ? {
                              ...s,
                              emoji: icon.emoji,
                              label:
                                !s.label ||
                                defaultRoutineSteps().some(
                                  (d) => d.label === s.label,
                                )
                                  ? icon.label
                                  : s.label,
                            }
                          : s,
                      ),
                    );
                    setPickingStepId(null);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            setSteps((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                label: "Steg",
                emoji: getIconEmoji("other"),
                sortOrder: prev.length,
              },
            ])
          }
          className="tap-target rounded-full bg-[var(--surface-soft)] px-4 py-2 text-sm font-bold"
        >
          + Lägg till steg
        </button>

        <button
          type="submit"
          className="tap-target mt-auto rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
        >
          Lägg till rutin
        </button>
      </form>

      <div className="flex min-h-0 flex-col gap-3">
        <h3 className="font-display text-xl font-bold">Rutiner</h3>
        {routines.length === 0 ? (
          <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
            Inga rutiner ännu.
          </div>
        ) : (
          routines.map((routine) => {
            const draft = getDraft(routine);
            const person = people.find((p) => p.id === routine.personId);
            return (
              <form
                key={routine.id}
                className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveRoutine({
                    ...draft,
                    title: draft.title.trim() || routine.title,
                    steps: draft.steps.map((step, index) => ({
                      ...step,
                      sortOrder: index,
                    })),
                  }).then(() => {
                    setDrafts((prev) => {
                      const next = { ...prev };
                      delete next[routine.id];
                      return next;
                    });
                    setPickingStepId(null);
                  });
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                      {person ? `${person.avatar} ${person.name}` : "?"}
                    </p>
                    <label className="mt-2 grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                      Namn
                      <span className="flex gap-2">
                        <input
                          value={draft.title}
                          onChange={(e) =>
                            setDraft(routine.id, {
                              ...draft,
                              title: e.target.value,
                            })
                          }
                          className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
                        />
                        <MicButton
                          value={draft.title}
                          onTranscript={(text) =>
                            setDraft(routine.id, { ...draft, title: text })
                          }
                        />
                      </span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Ta bort rutinen “${routine.title}”?`,
                        )
                      ) {
                        void removeRoutine(routine.id);
                      }
                    }}
                    className="tap-target shrink-0 rounded-full px-3 py-1 text-sm font-bold text-red-700"
                  >
                    Ta bort
                  </button>
                </div>

                <ul className="flex flex-col gap-2">
                  {[...draft.steps]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((step, index) => {
                      const pickId = `${routine.id}:${step.id}`;
                      return (
                        <li key={step.id} className="flex flex-col gap-2">
                          <div className="flex min-w-0 flex-nowrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPickingStepId((id) =>
                                  id === pickId ? null : pickId,
                                )
                              }
                              className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-2xl"
                              aria-label={`Välj ikon för steg ${index + 1}`}
                            >
                              {step.emoji}
                            </button>
                            <input
                              value={step.label}
                              onChange={(e) => {
                                const nextSteps = draft.steps.map((s) =>
                                  s.id === step.id
                                    ? { ...s, label: e.target.value }
                                    : s,
                                );
                                setDraft(routine.id, {
                                  ...draft,
                                  steps: nextSteps,
                                });
                              }}
                              className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold"
                              aria-label={`Namn steg ${index + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDraft(routine.id, {
                                  ...draft,
                                  steps: draft.steps.filter(
                                    (s) => s.id !== step.id,
                                  ),
                                })
                              }
                              disabled={draft.steps.length <= 1}
                              className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl disabled:opacity-30"
                              aria-label={`Ta bort steg ${index + 1}`}
                              title="Ta bort"
                            >
                              {getIconEmoji("delete")}
                            </button>
                          </div>
                          {pickingStepId === pickId ? (
                            <IconPicker
                              category="routine"
                              value={step.emoji}
                              onChange={(icon) => {
                                setDraft(routine.id, {
                                  ...draft,
                                  steps: draft.steps.map((s) =>
                                    s.id === step.id
                                      ? {
                                          ...s,
                                          emoji: icon.emoji,
                                          label: s.label ? s.label : icon.label,
                                        }
                                      : s,
                                  ),
                                });
                                setPickingStepId(null);
                              }}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                </ul>

                <button
                  type="button"
                  onClick={() =>
                    setDraft(routine.id, {
                      ...draft,
                      steps: [
                        ...draft.steps,
                        {
                          id: crypto.randomUUID(),
                          label: "Steg",
                          emoji: getIconEmoji("other"),
                          sortOrder: draft.steps.length,
                        },
                      ],
                    })
                  }
                  className="tap-target self-start rounded-full bg-[var(--surface-soft)] px-4 py-2 text-sm font-bold"
                >
                  + Lägg till steg
                </button>

                <button
                  type="submit"
                  className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
                >
                  Spara rutin
                </button>
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}
