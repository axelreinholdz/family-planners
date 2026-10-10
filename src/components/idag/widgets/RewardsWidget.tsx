"use client";

import { useMemo } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import {
  sumStarsForPerson,
  weekDateKeySet,
  weekPossibleStars,
} from "@/lib/rewards";
import type { Person } from "@/lib/types";

export function RewardsWidget({ child }: { child: Person | undefined }) {
  const { rewardActivities, rewardAwards } = useFamilyStore();
  const personId = child?.id ?? "";

  const { collected, possible } = useMemo(() => {
    if (!personId) return { collected: 0, possible: 0 };
    const weekKeys = weekDateKeySet(new Date());
    return {
      collected: sumStarsForPerson(rewardAwards, personId, weekKeys),
      possible: weekPossibleStars(rewardActivities, personId),
    };
  }, [personId, rewardActivities, rewardAwards]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Belöning
        </h3>
      </div>
      <p className="flex min-h-0 flex-1 items-center truncate font-display text-4xl font-bold leading-none tabular-nums text-[var(--ink)]">
        {collected}
        <span className="text-2xl font-semibold text-[var(--ink-muted)]">
          {" "}
          / {possible}
        </span>
      </p>
    </div>
  );
}
