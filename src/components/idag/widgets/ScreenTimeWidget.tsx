"use client";

import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/idag/widgets/ProgressRing";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { formatClock } from "@/lib/dates";
import { getIconEmoji } from "@/lib/icons";
import { remainingSeconds, usedSecondsTotal } from "@/lib/screenTime";
import type { Person } from "@/lib/types";

export function ScreenTimeWidget({ child }: { child: Person | undefined }) {
  const {
    ready,
    getScreenTimeSettings,
    getScreenTimeDay,
    ensureTodayScreenTime,
    startScreenTime,
    stopScreenTime,
    adjustScreenTimeUsed,
  } = useFamilyStore();

  const personId = child?.id ?? "";
  const [now, setNow] = useState(() => Date.now());
  const settings = getScreenTimeSettings(personId);
  const day = getScreenTimeDay(personId);

  useEffect(() => {
    if (!ready || !personId) return;
    void ensureTodayScreenTime(personId);
  }, [ready, personId, ensureTodayScreenTime]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const remaining = remainingSeconds(day, now);
  const used = usedSecondsTotal(day, now);
  const allowanceSeconds =
    (day?.allowanceMinutes ?? settings?.dailyMinutes ?? 45) * 60;
  const ringProgress = allowanceSeconds > 0 ? remaining / allowanceSeconds : 0;
  const running = Boolean(day?.activeStartedAt);
  const enabled = settings?.enabled !== false;
  const exhausted = remaining <= 0;

  useEffect(() => {
    if (running && remaining <= 0 && personId) {
      void stopScreenTime(personId);
    }
  }, [running, remaining, personId, stopScreenTime]);

  if (!personId) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">Inget barn valt.</p>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex items-center gap-3 self-start">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${child?.color ?? "#2A9D8F"}33` }}
        >
          {child?.avatar ?? getIconEmoji("boy")}
        </span>
        <div>
          <p className="font-display text-xl font-bold text-[var(--ink)]">
            Skärmtid
          </p>
          <p className="text-sm font-semibold text-[var(--ink-muted)]">
            {child?.name ?? "Barn"}
          </p>
        </div>
      </div>

      <div className="relative">
        <ProgressRing
          progress={ringProgress}
          color={exhausted ? "#c45c4a" : (child?.color ?? "#2A9D8F")}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-4xl font-bold tabular-nums text-[var(--ink)]">
            {formatClock(remaining)}
          </p>
          <p className="text-xs font-semibold text-[var(--ink-muted)]">
            {exhausted ? "Slut för idag" : "kvar idag"}
          </p>
        </div>
      </div>

      <p className="text-sm font-medium text-[var(--ink-muted)]">
        Använt {formatClock(used)} av{" "}
        {day?.allowanceMinutes ?? settings?.dailyMinutes ?? 45} min
      </p>

      {!enabled ? (
        <p className="text-sm font-semibold text-[var(--ink-muted)]">
          Skärmtid är avstängd.
        </p>
      ) : (
        <div className="flex w-full max-w-xs items-center gap-2">
          <button
            type="button"
            onClick={() => void adjustScreenTimeUsed(personId, -5)}
            disabled={remaining <= 0}
            className="tap-target flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-40"
            aria-label="Dra av 5 minuter"
            title="−5 min"
          >
            −
          </button>
          {running ? (
            <button
              type="button"
              onClick={() => void stopScreenTime(personId)}
              className="tap-target min-w-0 flex-1 rounded-2xl bg-[#c45c4a] px-4 py-4 text-lg font-bold text-white"
            >
              Stoppa
            </button>
          ) : (
            <button
              type="button"
              disabled={exhausted}
              onClick={() => void startScreenTime(personId)}
              className="tap-target min-w-0 flex-1 rounded-2xl bg-[var(--accent)] px-4 py-4 text-lg font-bold text-white disabled:opacity-40"
            >
              Starta
            </button>
          )}
          <button
            type="button"
            onClick={() => void adjustScreenTimeUsed(personId, 5)}
            disabled={used <= 0}
            className="tap-target flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-40"
            aria-label="Lägg tillbaka 5 minuter"
            title="+5 min"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
