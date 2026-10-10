"use client";

import { useMemo } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex } from "@/lib/dates";

export function DinnerWidget() {
  const { dinners } = useFamilyStore();
  const todayWeekday = mondayWeekdayIndex(new Date());
  const dinnerToday = useMemo(
    () => dinners.find((d) => d.weekday === todayWeekday),
    [dinners, todayWeekday],
  );
  const dish = dinnerToday?.title?.trim() || "Ingen planerad";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Middag
        </h3>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
        <p
          title={dish}
          className="truncate font-display text-sm font-bold leading-tight text-[var(--ink)]"
        >
          {dish}
        </p>
      </div>
    </div>
  );
}
