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
  }, [ready, personId, feed?.id, feed?.enabled, feed?.schoolSlug, syncSchoolLunch]);

  const primary = useMemo(() => {
    if (!feed) return "Ingen skola vald";
    if (feed.lastError && !day) return "Kunde inte hämta meny";
    if (!day || day.dishes.length === 0) return "Ingen meny idag";
    return day.dishes[0]!;
  }, [feed, day]);

  const secondary =
    day && day.dishes.length > 1 ? day.dishes.slice(1).join(" · ") : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Skolmat
        </h3>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden">
        <p
          className="line-clamp-2 font-display text-lg font-bold leading-snug text-[var(--ink)]"
          title={primary}
        >
          {primary}
        </p>
        {secondary ? (
          <p
            className="line-clamp-2 text-sm font-medium leading-snug text-[var(--ink-muted)]"
            title={secondary}
          >
            {secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}
