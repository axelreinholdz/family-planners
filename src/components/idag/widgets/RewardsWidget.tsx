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
    <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden">
      <h3 className="mb-1 shrink-0 font-display text-xl font-bold leading-none text-[var(--ink)]">
        Belöning
      </h3>
      <p className="truncate font-display text-2xl font-bold leading-tight text-[var(--ink)]">
        {collected}
        <span className="text-lg font-semibold text-[var(--ink-muted)]">
          {" "}
          / {possible}
        </span>
      </p>
    </div>
  );
}
