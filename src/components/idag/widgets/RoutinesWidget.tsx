"use client";

import { useEffect, useState } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex, todayKey } from "@/lib/dates";
import { compareRoutines, routineVisibleNow } from "@/lib/routines";
import type { IdagWidgetOrientation, Person, Routine } from "@/lib/types";

/**
 * Fixed step-card height (use `h-*`, not `min-h-*`).
 * `.tap-target` sets min-height: 44px after utilities and would override min-h-*.
 */
function StepCard({
  emoji,
  label,
  done,
  layout,
  onToggle,
}: {
  emoji: string;
  label: string;
  done: boolean;
  layout: "row" | "column";
  onToggle: () => void;
}) {
  const column = layout === "column";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className={`tap-target relative flex h-[6.5rem] items-center justify-center gap-1.5 rounded-2xl ring-2 transition ${
        column
          ? "w-full shrink-0 flex-row gap-3 px-4 py-3"
          : "min-w-0 flex-1 flex-col px-2 py-3"
      } ${
        done
          ? "bg-[var(--accent)] text-white ring-[var(--accent-deep)] shadow-md"
          : "bg-[var(--surface-soft)] text-[var(--ink)] ring-transparent"
      }`}
    >
      {done ? (
        <span
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-[var(--accent-deep)] shadow ring-1 ring-[var(--accent-deep)]"
          aria-hidden
        >
          ✓
        </span>
      ) : null}
      <span
        className={`text-4xl leading-none ${done ? "opacity-90" : ""}`}
        aria-hidden
      >
        {emoji}
      </span>
      <span
        className={`max-w-full truncate px-0.5 font-display text-base font-bold ${
          column ? "min-w-0 flex-1 text-left" : "text-center"
        } ${done ? "text-white" : "text-[var(--ink)]"}`}
      >
        {label}
      </span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
          done
            ? "bg-white text-[var(--accent-deep)]"
            : "bg-white/70 text-[var(--ink-faint)]"
        }`}
      >
        {done ? "Klart" : "Tryck"}
      </span>
    </button>
  );
}

export function RoutinesWidget({
  child,
  orientation = "horizontal",
}: {
  child: Person | undefined;
  orientation?: IdagWidgetOrientation;
}) {
  const { routines, routineProgress, toggleRoutineStep } = useFamilyStore();
  const [now, setNow] = useState(() => Date.now());
  const todayWeekday = mondayWeekdayIndex(new Date());
  const today = todayKey();
  const personId = child?.id ?? "";
  const column = orientation === "vertical";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const childRoutines = routines
    .filter((r) => routineVisibleNow(r, todayWeekday, new Date(now)))
    .filter((r) => r.personId === personId)
    .slice()
    .sort(compareRoutines);

  if (childRoutines.length === 0) {
    return (
      <p className="px-1 py-2 text-center text-sm text-[var(--ink-muted)]">
        Ingen rutin för {child?.name ?? "detta barn"} just nu. Lägg till, eller
        ändra dagar och tider under Hantera → Rutiner.
      </p>
    );
  }

  return (
    <div
      className={
        column
          ? "flex flex-col gap-3"
          : "flex h-full min-h-0 flex-col gap-3 overflow-auto"
      }
    >
      {childRoutines.map((routine) => {
        const progress = routineProgress.find(
          (p) => p.routineId === routine.id && p.date === today,
        );
        const doneCount = progress?.completedStepIds.length ?? 0;
        const stepTotal = routine.steps.length;
        const steps = [...routine.steps].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );

        return (
          <div key={routine.id} className="flex shrink-0 flex-col">
            <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-[var(--ink)]">
                  {routine.title} · {child?.name ?? "Barn"}
                </h3>
                <p className="text-sm font-medium text-[var(--ink-muted)]">
                  {doneCount}/{stepTotal} klart
                </p>
              </div>
            </div>
            <div
              className={
                column ? "flex flex-col gap-2" : "flex flex-nowrap gap-2"
              }
            >
              {steps.map((step) => {
                const done = progress?.completedStepIds.includes(step.id);
                return (
                  <StepCard
                    key={step.id}
                    emoji={step.emoji}
                    label={step.label}
                    done={Boolean(done)}
                    layout={column ? "column" : "row"}
                    onToggle={() =>
                      void toggleRoutineStep(routine.id, step.id)
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Step cards that drive column height for the routines widget. */
export function countRoutineContentUnits(
  routines: Routine[],
  personId: string,
  weekday: number,
  now: Date,
): number {
  return routines
    .filter((r) => r.personId === personId)
    .filter((r) => routineVisibleNow(r, weekday, now))
    .reduce((sum, r) => sum + Math.max(1, r.steps.length), 0);
}
