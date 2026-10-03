"use client";

import { useEffect, useMemo, useState } from "react";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";
import {
  formatClock,
  mondayWeekdayIndex,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import {
  remainingSeconds,
  usedSecondsTotal,
} from "@/lib/screenTime";

function ProgressRing({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const size = 220;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <svg width={size} height={size} className="mx-auto -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(31,42,36,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function IdagView() {
  const {
    ready,
    people,
    dinners,
    getScreenTimeSettings,
    getScreenTimeDay,
    ensureTodayScreenTime,
    startScreenTime,
    stopScreenTime,
  } = useFamilyStore();

  const [now, setNow] = useState(() => Date.now());
  const todayWeekday = mondayWeekdayIndex(new Date());

  const ebbe =
    people.find((p) => p.id === EBBE_ID) ??
    people.find((p) => p.role === "child");
  const personId = ebbe?.id ?? EBBE_ID;
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
      if (document.visibilityState === "visible") {
        setNow(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const remaining = remainingSeconds(day, now);
  const used = usedSecondsTotal(day, now);
  const allowanceSeconds = (day?.allowanceMinutes ?? settings?.dailyMinutes ?? 45) * 60;
  const progress = allowanceSeconds > 0 ? remaining / allowanceSeconds : 0;
  const running = Boolean(day?.activeStartedAt);
  const enabled = settings?.enabled !== false;
  const exhausted = remaining <= 0;

  // Auto-stop when time runs out
  useEffect(() => {
    if (running && remaining <= 0) {
      void stopScreenTime(personId);
    }
  }, [running, remaining, personId, stopScreenTime]);

  const dinnerToday = useMemo(
    () => dinners.find((d) => d.weekday === todayWeekday),
    [dinners, todayWeekday],
  );

  const weekMenu = useMemo(() => {
    return Array.from({ length: 7 }, (_, weekday) => {
      const plan = dinners.find((d) => d.weekday === weekday);
      return {
        weekday,
        label: WEEKDAY_LABELS[weekday],
        title: plan?.title?.trim() ?? "",
      };
    });
  }, [dinners]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar idag…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Idag
        </h2>
        <p className="text-sm font-medium text-[var(--ink-muted)]">
          Skärmtid och middag
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2">
        <section className="flex min-h-0 flex-col items-center justify-center gap-4 overflow-y-auto rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-3xl"
              style={{ backgroundColor: `${ebbe?.color ?? "#2A9D8F"}33` }}
            >
              {ebbe?.avatar ?? "👦"}
            </span>
            <div>
              <p className="font-display text-2xl font-bold text-[var(--ink)]">
                Skärmtid
              </p>
              <p className="text-sm font-semibold text-[var(--ink-muted)]">
                {ebbe?.name ?? "Ebbe"}
              </p>
            </div>
          </div>

          <div className="relative">
            <ProgressRing
              progress={progress}
              color={exhausted ? "#c45c4a" : (ebbe?.color ?? "#2A9D8F")}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-5xl font-bold tabular-nums text-[var(--ink)]">
                {formatClock(remaining)}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
                {exhausted ? "Slut för idag" : "kvar idag"}
              </p>
            </div>
          </div>

          <p className="text-sm font-medium text-[var(--ink-muted)]">
            Använt {formatClock(used)} av{" "}
            {day?.allowanceMinutes ?? settings?.dailyMinutes ?? 45} min
          </p>

          {!enabled ? (
            <p className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink-muted)]">
              Skärmtid är avstängd just nu.
            </p>
          ) : (
            <div className="flex w-full max-w-sm gap-3">
              {running ? (
                <button
                  type="button"
                  onClick={() => void stopScreenTime(personId)}
                  className="tap-target flex-1 rounded-2xl bg-[#c45c4a] px-6 py-5 text-xl font-bold text-white shadow-sm"
                >
                  Stoppa
                </button>
              ) : (
                <button
                  type="button"
                  disabled={exhausted}
                  onClick={() => void startScreenTime(personId)}
                  className="tap-target flex-1 rounded-2xl bg-[var(--accent)] px-6 py-5 text-xl font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Starta
                </button>
              )}
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-3xl bg-white/75 p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Middag idag · {WEEKDAY_LABELS[todayWeekday]}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-[var(--ink)] sm:text-4xl">
              {dinnerToday?.title?.trim()
                ? dinnerToday.title
                : "Ingen middag planerad"}
            </p>
          </div>

          <div className="min-h-0 flex-1 rounded-3xl bg-white/65 p-4 shadow-sm ring-1 ring-black/5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Veckans middagar
            </h3>
            <ul className="flex flex-col gap-1.5">
              {weekMenu.map((item) => {
                const isToday = item.weekday === todayWeekday;
                return (
                  <li
                    key={item.weekday}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${
                      isToday
                        ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40"
                        : "bg-[var(--surface-soft)]"
                    }`}
                  >
                    <span className="w-10 text-sm font-bold uppercase text-[var(--ink-muted)]">
                      {item.label}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-right text-base font-semibold ${
                        item.title
                          ? "text-[var(--ink)]"
                          : "text-[var(--ink-faint)]"
                      }`}
                    >
                      {item.title || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
