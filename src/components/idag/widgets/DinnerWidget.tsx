"use client";

import { useMemo } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex, WEEKDAY_LABELS } from "@/lib/dates";

export function DinnerWidget() {
  const { dinners } = useFamilyStore();
  const todayWeekday = mondayWeekdayIndex(new Date());
  const dinnerToday = useMemo(
    () => dinners.find((d) => d.weekday === todayWeekday),
    [dinners, todayWeekday],
  );

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
        Middag idag · {WEEKDAY_LABELS[todayWeekday]}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">
        {dinnerToday?.title?.trim() || "Ingen middag planerad"}
      </p>
    </div>
  );
}
