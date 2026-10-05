"use client";

import { useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { ManageModal } from "@/components/ManageModal";
import { MicButton } from "@/components/MicButton";
import { defaultChildId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { defaultRoutineSteps, getIconEmoji } from "@/lib/icons";
import {
  ALL_WEEKDAYS,
  compareRoutines,
  formatRoutineTimeWindow,
  normalizeRoutine,
  normalizeRoutineWeekdays,
  sanitizeWeekdays,
} from "@/lib/routines";
import type { Routine, RoutineStep } from "@/lib/types";

function makeDefaultSteps(): RoutineStep[] {
  return defaultRoutineSteps().map((step, index) => ({
    id: crypto.randomUUID(),
    label: step.label,
    emoji: step.emoji,
    sortOrder: index,
  }));
}

function toggleWeekday(weekdays: number[], day: number): number[] {
  const next = weekdays.includes(day)
    ? weekdays.filter((d) => d !== day)
    : [...weekdays, day];
  return sanitizeWeekdays(next);
}

function moveStep<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function StepReorderButtons({
  index,
  total,
  onMove,
  label,
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="tap-target flex h-12 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm font-bold disabled:opacity-30"
        aria-label={`Flytta upp ${label}`}
        title="Flytta upp"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index >= total - 1}
        className="tap-target flex h-12 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm font-bold disabled:opacity-30"
        aria-label={`Flytta ner ${label}`}
        title="Flytta ner"
      >
        ▼
      </button>
    </div>
  );
}

function WeekdayPicker({
  weekdays,
  onChange,
}: {
  weekdays: number[];
  onChange: (weekdays: number[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
        Dagar
      </legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_LABELS.map((label, day) => {
          const on = weekdays.includes(day);
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(toggleWeekday(weekdays, day))}
              className={`tap-target h-11 w-11 rounded-xl text-sm font-bold uppercase ${
                on
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
              }`}
            >
              {label.slice(0, 1)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function formatWeekdays(weekdays: number[]): string {
  const days = normalizeRoutineWeekdays(weekdays);
  if (days.length === 7) return "alla dagar";
  if (days.length === 0) return "inga dagar";
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

function TimeWindowFields({
  showFrom,
  showUntil,
  onChange,
}: {
  showFrom?: string;
  showUntil?: string;
  onChange: (next: { showFrom?: string; showUntil?: string }) => void;
}) {
  const allDay = !showFrom && !showUntil;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
        Visas
      </legend>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({ showFrom: undefined, showUntil: undefined });
            } else {
              onChange({ showFrom: "06:00", showUntil: "12:00" });
            }
          }}
          className="h-5 w-5"
        />
        Hela dagen
      </label>
      {!allDay ? (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Från
            <input
              type="time"
              value={showFrom ?? ""}
              onChange={(e) =>
                onChange({
                  showFrom: e.target.value || undefined,
                  showUntil,
                })
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Till
            <input
              type="time"
              value={showUntil ?? ""}
              onChange={(e) =>
                onChange({
                  showFrom,
                  showUntil: e.target.value || undefined,
                })
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

export function ManageRoutines() {
  const { people, routines, saveRoutine, createRoutine, removeRoutine } =
    useFamilyStore();

  const children = people.filter((p) => p.role === "child");
  const [filterPersonId, setFilterPersonId] = useState(() =>
    defaultChildId(people),
  );
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Routine>>({});
  const [personId, setPersonId] = useState(() => defaultChildId(people));
  const [title, setTitle] = useState("Kväll");
  const [weekdays, setWeekdays] = useState<number[]>(() => [...ALL_WEEKDAYS]);
  const [showFrom, setShowFrom] = useState<string | undefined>();
  const [showUntil, setShowUntil] = useState<string | undefined>();
  const [steps, setSteps] = useState<RoutineStep[]>(() => makeDefaultSteps());
  const [pickingStepId, setPickingStepId] = useState<string | null>(null);

  const activeFilterId = defaultChildId(people, filterPersonId);
  const selectedPersonId = defaultChildId(people, personId);
  const filteredRoutines = routines
    .filter((routine) => routine.personId === activeFilterId)
    .slice()
    .sort(compareRoutines);
  const filterPerson = children.find((p) => p.id === activeFilterId);

  const getDraft = (routine: Routine) => {
    const base = drafts[routine.id] ?? routine;
    return normalizeRoutine(base);
  };

  const setDraft = (routineId: string, next: Routine) => {
    setDrafts((prev) => ({ ...prev, [routineId]: next }));
  };

  const resetCreateForm = () => {
    setPersonId(activeFilterId);
    setTitle("Kväll");
    setWeekdays([...ALL_WEEKDAYS]);
    setShowFrom(undefined);
    setShowUntil(undefined);
    setSteps(makeDefaultSteps());
    setPickingStepId(null);
  };

  const closeCreate = () => {
    setCreating(false);
    resetCreateForm();
  };

  const reorderRoutine = async (index: number, direction: -1 | 1) => {
    const next = moveStep(filteredRoutines, index, direction);
    if (next === filteredRoutines) return;
    const updates = next.map((routine, sortOrder) =>
      normalizeRoutine({ ...routine, sortOrder }),
    );
    await Promise.all(updates.map((routine) => saveRoutine(routine)));
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim() || steps.length === 0) return;
    if (weekdays.length === 0) return;
    const sortOrder =
      filteredRoutines.reduce(
        (max, routine) => Math.max(max, routine.sortOrder ?? 0),
        -1,
      ) + 1;
    const normalized = normalizeRoutine({
      id: "new",
      personId: selectedPersonId,
      title: title.trim(),
      weekdays: normalizeRoutineWeekdays(weekdays),
      showFrom,
      showUntil,
      sortOrder,
      steps: steps.map((step, index) => ({
        ...step,
        label: step.label.trim() || `Steg ${index + 1}`,
        sortOrder: index,
      })),
    });
    await createRoutine({
      personId: normalized.personId,
      title: normalized.title,
      weekdays: normalized.weekdays,
      showFrom: normalized.showFrom,
      showUntil: normalized.showUntil,
      sortOrder: normalized.sortOrder,
      steps: normalized.steps,
    });
    closeCreate();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Rutiner</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Ordna rutiner med ▲▼ — samma ordning används på Idag när flera
            visas samtidigt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setCreating(true);
          }}
          disabled={children.length === 0}
          className="tap-target shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          + Ny rutin
        </button>
      </div>

      <PersonTabs
        people={people}
        selectedId={activeFilterId}
        roles={["child"]}
        label="Välj barn"
        onSelect={(id) => {
          setFilterPersonId(id);
          setEditingId(null);
          setPickingStepId(null);
        }}
      />

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Lägg till ett barn under Personer för att skapa rutiner.
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga rutiner för {filterPerson?.name ?? "detta barn"} ännu.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredRoutines.map((routine, index) => {
            const draft = getDraft(routine);
            const isEditing = editingId === routine.id;
            const stepCount = draft.steps.length;

            return (
              <li
                key={routine.id}
                className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <StepReorderButtons
                    index={index}
                    total={filteredRoutines.length}
                    label={`rutin ${draft.title}`}
                    onMove={(direction) => {
                      void reorderRoutine(index, direction);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                      {draft.title}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-muted)]">
                      {formatWeekdays(draft.weekdays)} ·{" "}
                      {formatRoutineTimeWindow(
                        draft.showFrom,
                        draft.showUntil,
                      )}{" "}
                      · {stepCount} steg
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId((id) =>
                        id === routine.id ? null : routine.id,
                      );
                      setPickingStepId(null);
                    }}
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {isEditing ? "Stäng" : "Ändra"}
                  </button>
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
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
                  >
                    Ta bort
                  </button>
                </div>

                {isEditing ? (
                  <form
                    className="flex flex-col gap-3 border-t border-black/5 px-4 py-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.weekdays.length === 0) return;
                      void saveRoutine(
                        normalizeRoutine({
                          ...draft,
                          title: draft.title.trim() || routine.title,
                          weekdays: normalizeRoutineWeekdays(draft.weekdays),
                          steps: draft.steps.map((step, index) => ({
                            ...step,
                            sortOrder: index,
                          })),
                        }),
                      ).then(() => {
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[routine.id];
                          return next;
                        });
                        setPickingStepId(null);
                        setEditingId(null);
                      });
                    }}
                  >
                    <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
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

                    <WeekdayPicker
                      weekdays={draft.weekdays}
                      onChange={(next) =>
                        setDraft(routine.id, { ...draft, weekdays: next })
                      }
                    />

                    <TimeWindowFields
                      showFrom={draft.showFrom}
                      showUntil={draft.showUntil}
                      onChange={(next) =>
                        setDraft(routine.id, { ...draft, ...next })
                      }
                    />

                    <ul className="flex flex-col gap-2">
                      {[...draft.steps]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((step, index, ordered) => {
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
                                <StepReorderButtons
                                  index={index}
                                  total={ordered.length}
                                  label={`steg ${index + 1}`}
                                  onMove={(direction) => {
                                    const reordered = moveStep(
                                      ordered,
                                      index,
                                      direction,
                                    ).map((s, sortOrder) => ({
                                      ...s,
                                      sortOrder,
                                    }));
                                    setDraft(routine.id, {
                                      ...draft,
                                      steps: reordered,
                                    });
                                  }}
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
                                              label: s.label
                                                ? s.label
                                                : icon.label,
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
                      disabled={draft.weekdays.length === 0}
                      className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Spara rutin
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <ManageModal
          title="Ny rutin"
          description="Välj barn, dagar, tider och steg."
          onClose={closeCreate}
        >
          <form
            onSubmit={(e) => void onCreate(e)}
            className="flex flex-col gap-3"
          >
            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Barn
              <select
                value={selectedPersonId}
                onChange={(e) => setPersonId(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
              >
                {children.map((p) => (
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

            <WeekdayPicker weekdays={weekdays} onChange={setWeekdays} />

            <TimeWindowFields
              showFrom={showFrom}
              showUntil={showUntil}
              onChange={(next) => {
                setShowFrom(next.showFrom);
                setShowUntil(next.showUntil);
              }}
            />

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
                      className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-2xl"
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
                            s.id === step.id
                              ? { ...s, label: e.target.value }
                              : s,
                          ),
                        )
                      }
                      className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold"
                      aria-label={`Namn steg ${index + 1}`}
                    />
                    <StepReorderButtons
                      index={index}
                      total={steps.length}
                      label={`steg ${index + 1}`}
                      onMove={(direction) =>
                        setSteps((prev) => moveStep(prev, index, direction))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSteps((prev) =>
                          prev.filter((s) => s.id !== step.id),
                        )
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
              className="tap-target self-start rounded-full bg-[var(--surface-soft)] px-4 py-2 text-sm font-bold"
            >
              + Lägg till steg
            </button>

            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={weekdays.length === 0}
                className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                Lägg till
              </button>
            </div>
          </form>
        </ManageModal>
      ) : null}
    </div>
  );
}
