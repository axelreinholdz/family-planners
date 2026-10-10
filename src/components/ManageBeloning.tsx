"use client";

import { useState, type FormEvent } from "react";
import { ManageModal } from "@/components/ManageModal";
import { MicButton } from "@/components/MicButton";
import { defaultChildId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { WEEKDAY_LABELS } from "@/lib/dates";
import {
  ALL_WEEKDAYS,
  sanitizeWeekdays,
} from "@/lib/routines";
import {
  clampMaxStars,
  compareRewardActivities,
  normalizeRewardActivity,
} from "@/lib/rewards";
import type { RewardActivity, RewardMaxStars } from "@/lib/types";

const MAX_STAR_OPTIONS: RewardMaxStars[] = [1, 2, 3, 4, 5];

function toggleWeekday(weekdays: number[], day: number): number[] {
  const next = weekdays.includes(day)
    ? weekdays.filter((d) => d !== day)
    : [...weekdays, day];
  return sanitizeWeekdays(next);
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
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

function MaxStarsPicker({
  value,
  onChange,
}: {
  value: RewardMaxStars;
  onChange: (value: RewardMaxStars) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
        Max stjärnor per dag
      </legend>
      <div className="flex flex-wrap gap-2">
        {MAX_STAR_OPTIONS.map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`tap-target h-11 min-w-11 rounded-xl px-3 text-sm font-bold ${
                on
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function formatWeekdays(weekdays: number[]): string {
  const days = sanitizeWeekdays(weekdays);
  if (days.length === 7) return "alla dagar";
  if (days.length === 0) return "inga dagar";
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

function ReorderButtons({
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

export function ManageBeloning() {
  const {
    people,
    rewardActivities,
    saveRewardActivity,
    createRewardActivity,
    removeRewardActivity,
  } = useFamilyStore();

  const children = people.filter((p) => p.role === "child");
  const [filterPersonId, setFilterPersonId] = useState(() =>
    defaultChildId(people),
  );
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RewardActivity>>({});
  const [personId, setPersonId] = useState(() => defaultChildId(people));
  const [title, setTitle] = useState("");
  const [maxStars, setMaxStars] = useState<RewardMaxStars>(1);
  const [weekdays, setWeekdays] = useState<number[]>(() => [...ALL_WEEKDAYS]);

  const activeFilterId = defaultChildId(people, filterPersonId);
  const selectedPersonId = defaultChildId(people, personId);
  const filtered = rewardActivities
    .filter((activity) => activity.personId === activeFilterId)
    .slice()
    .sort(compareRewardActivities);
  const filterPerson = children.find((p) => p.id === activeFilterId);

  const getDraft = (activity: RewardActivity) => {
    const base = drafts[activity.id] ?? activity;
    return normalizeRewardActivity(base);
  };

  const setDraft = (activityId: string, next: RewardActivity) => {
    setDrafts((prev) => ({ ...prev, [activityId]: next }));
  };

  const resetCreateForm = () => {
    setPersonId(activeFilterId);
    setTitle("");
    setMaxStars(1);
    setWeekdays([...ALL_WEEKDAYS]);
  };

  const closeCreate = () => {
    setCreating(false);
    resetCreateForm();
  };

  const reorderActivity = async (index: number, direction: -1 | 1) => {
    const next = moveItem(filtered, index, direction);
    if (next === filtered) return;
    const updates = next.map((activity, sortOrder) =>
      normalizeRewardActivity({ ...activity, sortOrder }),
    );
    await Promise.all(updates.map((activity) => saveRewardActivity(activity)));
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim() || weekdays.length === 0) return;
    const sortOrder =
      filtered.reduce(
        (max, activity) => Math.max(max, activity.sortOrder ?? 0),
        -1,
      ) + 1;
    await createRewardActivity({
      personId: selectedPersonId,
      title: title.trim(),
      maxStars: clampMaxStars(maxStars),
      weekdays: sanitizeWeekdays(weekdays),
      sortOrder,
      enabled: true,
    });
    closeCreate();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Belöning</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Aktiviteter per barn — max stjärnor och vilka dagar de gäller.
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
          + Ny aktivitet
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
        }}
      />

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Lägg till ett barn under Personer för att skapa belöningar.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga aktiviteter för {filterPerson?.name ?? "detta barn"} ännu.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((activity, index) => {
            const draft = getDraft(activity);
            const isEditing = editingId === activity.id;

            return (
              <li
                key={activity.id}
                className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <ReorderButtons
                    index={index}
                    total={filtered.length}
                    label={`aktivitet ${draft.title}`}
                    onMove={(direction) => {
                      void reorderActivity(index, direction);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                      {draft.title}
                      {!draft.enabled ? (
                        <span className="ml-2 text-sm font-semibold text-[var(--ink-muted)]">
                          (av)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-muted)]">
                      max {draft.maxStars} ★ · {formatWeekdays(draft.weekdays)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void saveRewardActivity({
                        ...draft,
                        enabled: !draft.enabled,
                      });
                    }}
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--ink-muted)]"
                  >
                    {draft.enabled ? "Inaktivera" : "Aktivera"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId((id) =>
                        id === activity.id ? null : activity.id,
                      );
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
                          `Ta bort aktiviteten “${activity.title}”?`,
                        )
                      ) {
                        void removeRewardActivity(activity.id);
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
                      void saveRewardActivity(
                        normalizeRewardActivity({
                          ...draft,
                          title: draft.title.trim() || activity.title,
                          maxStars: clampMaxStars(draft.maxStars),
                          weekdays: sanitizeWeekdays(draft.weekdays),
                        }),
                      ).then(() => {
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[activity.id];
                          return next;
                        });
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
                            setDraft(activity.id, {
                              ...draft,
                              title: e.target.value,
                            })
                          }
                          className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
                        />
                        <MicButton
                          value={draft.title}
                          onTranscript={(text) =>
                            setDraft(activity.id, { ...draft, title: text })
                          }
                        />
                      </span>
                    </label>

                    <MaxStarsPicker
                      value={draft.maxStars}
                      onChange={(next) =>
                        setDraft(activity.id, { ...draft, maxStars: next })
                      }
                    />

                    <WeekdayPicker
                      weekdays={draft.weekdays}
                      onChange={(next) =>
                        setDraft(activity.id, { ...draft, weekdays: next })
                      }
                    />

                    <button
                      type="submit"
                      disabled={draft.weekdays.length === 0}
                      className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Spara aktivitet
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
          title="Ny belöningsaktivitet"
          description="Välj barn, max stjärnor och dagar."
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
                  placeholder="T.ex. Bädda sängen"
                  className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
                />
                <MicButton value={title} onTranscript={setTitle} />
              </span>
            </label>

            <MaxStarsPicker value={maxStars} onChange={setMaxStars} />
            <WeekdayPicker weekdays={weekdays} onChange={setWeekdays} />

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
                disabled={!title.trim() || weekdays.length === 0}
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
