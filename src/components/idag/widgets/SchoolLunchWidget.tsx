"use client";

import { useEffect, useMemo } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { todayKey } from "@/lib/dates";
import type { Person } from "@/lib/types";

export function SchoolLunchWidget({ child }: { child: Person | undefined }) {
  const {
    ready,
    getSchoolLunchFeed,
    getSchoolLunchDay,
    syncSchoolLunch,
  } = useFamilyStore();

  const personId = child?.id ?? "";
  const feed = getSchoolLunchFeed(personId);
  const day = getSchoolLunchDay(personId, todayKey());

  useEffect(() => {
    if (!ready || !personId || !feed?.enabled) return;
    void syncSchoolLunch(personId);
  }, [
    ready,
    personId,
    feed?.id,
    feed?.enabled,
    feed?.schoolSlug,
    syncSchoolLunch,
  ]);

  const dishes = useMemo(() => {
    if (!feed) return ["Ingen skola vald"];
    if (feed.lastError && !day) return ["Kunde inte hämta meny"];
    if (!day || day.dishes.length === 0) return ["Ingen meny idag"];
    return day.dishes;
  }, [feed, day]);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden">
      <h3 className="mb-1 shrink-0 font-display text-xl font-bold leading-none text-[var(--ink)]">
        Skolmat
      </h3>
      <div className="flex min-h-0 min-w-0 flex-col justify-center gap-0.5 overflow-hidden">
        {dishes.map((dish, index) => (
          <p
            key={`${index}-${dish}`}
            title={dish}
            className={
              index === 0
                ? "truncate font-display text-sm font-bold leading-tight text-[var(--ink)]"
                : "truncate text-xs font-medium leading-tight text-[var(--ink-muted)]"
            }
          >
            {dish}
          </p>
        ))}
      </div>
    </div>
  );
}
