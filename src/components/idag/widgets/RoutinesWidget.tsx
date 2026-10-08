"use client";

import { useEffect, useState } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex, todayKey } from "@/lib/dates";
import { idagWidgetPreferVertical } from "@/lib/idagLayout";
import { compareRoutines, routineVisibleNow } from "@/lib/routines";
import type { IdagWidgetOrientation, IdagWidgetSize, Person } from "@/lib/types";

const STEP_CARD_MIN_H = "min-h-[6.5rem]";

function StepCard({
  emoji,
  label,
  done,
  stretch,
  onToggle,
}: {
  emoji: string;
  label: string;
  done: boolean;
  stretch: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className={`tap-target relative flex ${STEP_CARD_MIN_H} flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 ring-2 transition ${
        stretch ? "w-full flex-1" : "min-w-0 flex-1"
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
        className={`max-w-full truncate px-0.5 text-center font-display text-base font-bold ${
          done ? "text-white" : "text-[var(--ink)]"
        }`}
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
  size = "XL",
  orientation = "horizontal",
}: {
  child: Person | undefined;
  size?: IdagWidgetSize;
  orientation?: IdagWidgetOrientation;
}) {
  const { routines, routineProgress, toggleRoutineStep } = useFamilyStore();
  const [now, setNow] = useState(() => Date.now());
  const todayWeekday = mondayWeekdayIndex(new Date());
  const today = todayKey();
  const personId = child?.id ?? "";
  const vertical = idagWidgetPreferVertical(size, orientation);
  /** Grow step cards to fill the tile when stacked vertically. */
  const fillHeight = vertical;

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
      className={`flex flex-col gap-3 ${fillHeight ? "h-full min-h-0" : ""}`}
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
          <div
            key={routine.id}
            className={`flex min-h-0 flex-col ${fillHeight ? "flex-1" : ""}`}
          >
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
                vertical
                  ? `flex min-h-0 flex-col gap-2 ${fillHeight ? "flex-1" : ""}`
                  : "flex flex-nowrap gap-2"
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
                    stretch={vertical}
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
