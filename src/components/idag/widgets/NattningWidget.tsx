"use client";

import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex } from "@/lib/dates";
import {
  parentInitial,
  readableInkOn,
  resolveNattningParentId,
} from "@/lib/nattning";
import type { Person } from "@/lib/types";

export function NattningWidget({
  child,
  editing = false,
}: {
  child: Person | undefined;
  editing?: boolean;
}) {
  const {
    people,
    getNattningSchedule,
    getNattningDayOverride,
    setNattningDayOverride,
    clearNattningDayOverride,
  } = useFamilyStore();

  const personId = child?.id ?? "";
  const parents = people.filter((p) => p.role === "parent");
  const schedule = personId ? getNattningSchedule(personId) : undefined;
  const override = personId ? getNattningDayOverride(personId) : undefined;
  const weekday = mondayWeekdayIndex(new Date());
  const parentId = resolveNattningParentId(schedule, override, weekday);
  const parent = parentId
    ? people.find((p) => p.id === parentId)
    : undefined;
  const bg = parent?.color ?? "var(--surface-soft)";
  const ink = parent ? readableInkOn(parent.color) : "var(--ink-muted)";
  const letter = parent ? parentInitial(parent.name) : "—";
  const hasOverride = Boolean(override);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl px-3 py-2.5"
        style={{ backgroundColor: bg, color: ink }}
      >
        <div className="flex shrink-0 items-end justify-between gap-2">
          <h3 className="font-display text-xl font-bold" style={{ color: ink }}>
            Nattning
          </h3>
          {hasOverride ? (
            <span
              className="text-[10px] font-bold uppercase tracking-wider opacity-80"
              style={{ color: ink }}
            >
              Idag
            </span>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <span
            className="font-display text-[7.5rem] font-bold leading-none"
            style={{ color: ink }}
            aria-label={
              parent
                ? `Nattning: ${parent.name}`
                : "Nattning: ingen förälder vald"
            }
          >
            {letter}
          </span>
        </div>

        {!parent && !editing ? (
          <p className="shrink-0 text-center text-xs opacity-80" style={{ color: ink }}>
            Ställ in under Hantera
          </p>
        ) : parent && !editing ? (
          <p className="shrink-0 text-center text-sm font-semibold opacity-90" style={{ color: ink }}>
            {parent.name}
          </p>
        ) : null}
      </div>

      {editing && personId ? (
        <div className="shrink-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Byt för idag
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parents.map((p) => {
              const selected = parentId === p.id;
              const chipInk = readableInkOn(p.color);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void setNattningDayOverride(personId, p.id)}
                  className={`tap-target rounded-xl px-2.5 py-1.5 text-sm font-bold ring-2 ${
                    selected ? "ring-[var(--ink)]" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: p.color, color: chipInk }}
                  aria-pressed={selected}
                  title={p.name}
                >
                  {parentInitial(p.name)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void clearNattningDayOverride(personId)}
              disabled={!hasOverride}
              className="tap-target rounded-xl bg-[var(--surface-soft)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink-muted)] ring-1 ring-black/10 disabled:opacity-40"
            >
              Schema
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
