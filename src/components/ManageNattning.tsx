"use client";

import { useEffect, useState } from "react";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";
import { WEEKDAY_LABELS } from "@/lib/dates";
import {
  EMPTY_NATTNING_WEEK,
  normalizeParentByWeekday,
} from "@/lib/nattning";

function NattningEditor({ personId }: { personId: string }) {
  const { people, getNattningSchedule, saveNattningSchedule } = useFamilyStore();
  const parents = people.filter((p) => p.role === "parent");
  const schedule = getNattningSchedule(personId);
  const [parentByWeekday, setParentByWeekday] = useState<(string | null)[]>(
    () =>
      normalizeParentByWeekday(schedule?.parentByWeekday ?? EMPTY_NATTNING_WEEK),
  );

  useEffect(() => {
    setParentByWeekday(
      normalizeParentByWeekday(schedule?.parentByWeekday ?? EMPTY_NATTNING_WEEK),
    );
  }, [schedule, personId]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {WEEKDAY_LABELS.map((label, day) => (
          <li
            key={day}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-3 py-2"
          >
            <span className="w-10 shrink-0 text-sm font-bold text-[var(--ink)]">
              {label}
            </span>
            <select
              value={parentByWeekday[day] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setParentByWeekday((prev) => {
                  const next = [...prev];
                  next[day] = value || null;
                  return next;
                });
              }}
              className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
            >
              <option value="">Ej vald</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
            {parentByWeekday[day] ? (
              <span
                className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
                style={{
                  backgroundColor:
                    parents.find((p) => p.id === parentByWeekday[day])?.color ??
                    "#ccc",
                }}
                aria-hidden
              />
            ) : (
              <span className="h-6 w-6 shrink-0" aria-hidden />
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-[var(--ink-muted)]">
        Bakgrundsfärgen på Idag kommer från förälderns färg under Personer.
      </p>

      <button
        type="button"
        onClick={() =>
          void saveNattningSchedule({
            personId,
            parentByWeekday: normalizeParentByWeekday(parentByWeekday),
          })
        }
        className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
      >
        Spara nattning
      </button>
    </div>
  );
}

function scheduleSummary(
  parentByWeekday: (string | null)[] | undefined,
  parentNames: Map<string, string>,
): string {
  const days = normalizeParentByWeekday(parentByWeekday);
  const set = days.filter(Boolean).length;
  if (set === 0) return "Inget schema";
  const names = [
    ...new Set(
      days
        .filter((id): id is string => Boolean(id))
        .map((id) => parentNames.get(id) ?? "Förälder"),
    ),
  ];
  return `${set}/7 dagar · ${names.join(" / ")}`;
}

export function ManageNattning() {
  const { people, getNattningSchedule } = useFamilyStore();
  const children = people.filter((p) => p.role === "child");
  const parents = people.filter((p) => p.role === "parent");
  const parentNames = new Map(parents.map((p) => [p.id, p.name]));
  const [editingId, setEditingId] = useState<string | null>(
    () => children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? null,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-0.5">
      <div>
        <h3 className="font-display text-xl font-bold">Nattning</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Vem som lägger varje barn varje veckodag. Visas som bokstav på Idag.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga barn ännu.
        </div>
      ) : parents.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Lägg till föräldrar under Personer först.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {children.map((child) => {
            const schedule = getNattningSchedule(child.id);
            const isEditing = editingId === child.id;
            return (
              <li
                key={child.id}
                className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    {child.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                      {child.name}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-muted)]">
                      {scheduleSummary(schedule?.parentByWeekday, parentNames)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingId((id) => (id === child.id ? null : child.id))
                    }
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {isEditing ? "Stäng" : "Ändra"}
                  </button>
                </div>
                {isEditing ? (
                  <div className="border-t border-black/5 px-4 py-4">
                    <NattningEditor key={child.id} personId={child.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
