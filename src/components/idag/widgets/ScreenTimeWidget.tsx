"use client";

import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/idag/widgets/ProgressRing";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { formatClock } from "@/lib/dates";
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
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Skärmtid
        </h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="relative flex w-full max-w-[140px] min-h-0 flex-1 items-center justify-center">
          <ProgressRing
            progress={ringProgress}
            color={exhausted ? "#c45c4a" : (child?.color ?? "#2A9D8F")}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-[var(--ink)]">
              {formatClock(remaining)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-[var(--ink-muted)]">
              {exhausted ? "Slut för idag" : "kvar idag"}
            </p>
          </div>
        </div>
      </div>

      {!enabled ? (
        <p className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">
          Skärmtid är avstängd.
        </p>
      ) : (
        <div className="flex w-full shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void adjustScreenTimeUsed(personId, -5)}
            disabled={remaining <= 0}
            className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-40"
            aria-label="Dra av 5 minuter"
            title="−5 min"
          >
            −
          </button>
          {running ? (
            <button
              type="button"
              onClick={() => void stopScreenTime(personId)}
              className="tap-target min-w-0 flex-1 rounded-xl bg-[#c45c4a] px-2 py-2.5 text-sm font-bold text-white"
            >
              Stoppa
            </button>
          ) : (
            <button
              type="button"
              disabled={exhausted}
              onClick={() => void startScreenTime(personId)}
              className="tap-target min-w-0 flex-1 rounded-xl bg-[var(--accent)] px-2 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Starta
            </button>
          )}
          <button
            type="button"
            onClick={() => void adjustScreenTimeUsed(personId, 5)}
            disabled={used <= 0}
            className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-40"
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
