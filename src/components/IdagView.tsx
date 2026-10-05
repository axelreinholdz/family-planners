"use client";

import { useEffect, useMemo, useState } from "react";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";
import {
  formatClock,
  mondayWeekdayIndex,
  todayKey,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { getIconEmoji, resolveActivityEmoji } from "@/lib/icons";
import { nextEventsForPerson } from "@/lib/nextEvents";
import { routineVisibleNow, compareRoutines } from "@/lib/routines";
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
  const size = 180;
  const stroke = 12;
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
    events,
    dinners,
    routines,
    routineProgress,
    getScreenTimeSettings,
    getScreenTimeDay,
    ensureTodayScreenTime,
    startScreenTime,
    stopScreenTime,
    toggleRoutineStep,
  } = useFamilyStore();

  const [now, setNow] = useState(() => Date.now());
  const todayWeekday = mondayWeekdayIndex(new Date());
  const children = people.filter((p) => p.role === "child");
  const defaultChildId =
    children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? EBBE_ID;
  const [selectedChildId, setSelectedChildId] = useState(defaultChildId);

  const personId = children.some((p) => p.id === selectedChildId)
    ? selectedChildId
    : defaultChildId;
  const child = children.find((p) => p.id === personId) ?? children[0];
  const settings = getScreenTimeSettings(personId);
  const day = getScreenTimeDay(personId);

  const childRoutines = routines
    .filter((r) =>
      routineVisibleNow(r, todayWeekday, new Date(now)),
    )
    .filter((r) => r.personId === personId)
    .slice()
    .sort(compareRoutines);
  const today = todayKey();

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
    if (running && remaining <= 0) void stopScreenTime(personId);
  }, [running, remaining, personId, stopScreenTime]);

  const dinnerToday = useMemo(
    () => dinners.find((d) => d.weekday === todayWeekday),
    [dinners, todayWeekday],
  );

  const { current, upcoming } = nextEventsForPerson(
    events,
    personId,
    undefined,
    new Date(now),
  );

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar idag…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Idag
          </h2>
          <p className="text-sm font-medium text-[var(--ink-muted)]">
            Skärmtid, middag, nästa och rutiner
          </p>
        </div>

        {children.length > 1 ? (
          <div
            className="flex gap-2 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5"
            role="tablist"
            aria-label="Välj barn"
          >
            {children.map((kid) => {
              const active = kid.id === personId;
              return (
                <button
                  key={kid.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedChildId(kid.id)}
                  className={`tap-target flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                    style={{
                      backgroundColor: active ? "#ffffff33" : `${kid.color}33`,
                    }}
                    aria-hidden
                  >
                    {kid.avatar}
                  </span>
                  {kid.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5">
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
          ) : running ? (
            <button
              type="button"
              onClick={() => void stopScreenTime(personId)}
              className="tap-target w-full max-w-xs rounded-2xl bg-[#c45c4a] px-6 py-4 text-lg font-bold text-white"
            >
              Stoppa
            </button>
          ) : (
            <button
              type="button"
              disabled={exhausted}
              onClick={() => void startScreenTime(personId)}
              className="tap-target w-full max-w-xs rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-bold text-white disabled:opacity-40"
            >
              Starta
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Middag idag · {WEEKDAY_LABELS[todayWeekday]}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">
              {dinnerToday?.title?.trim() || "Ingen middag planerad"}
            </p>
          </div>

          <div className="flex-1 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Nästa för {child?.name ?? "barn"}
            </p>
            {current ? (
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 ring-1 ring-[var(--accent)]/30">
                <span className="text-4xl" aria-hidden>
                  {resolveActivityEmoji(current.iconKey, current.emoji)}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-[var(--ink)]">
                    {current.title}
                  </p>
                  <p className="text-sm font-medium text-[var(--ink-muted)]">
                    {current.startTime
                      ? current.endTime
                        ? `${current.startTime}–${current.endTime}`
                        : `Från ${current.startTime}`
                      : "Heldag"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                Inget mer inlagt idag.
              </p>
            )}

            {upcoming.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1.5">
                {upcoming.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-2"
                  >
                    <span className="text-xl" aria-hidden>
                      {resolveActivityEmoji(event.iconKey, event.emoji)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                      {event.title}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink-muted)]">
                      {event.startTime ?? "Heldag"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      {childRoutines.length > 0 ? (
        childRoutines.map((routine) => {
          const progress = routineProgress.find(
            (p) => p.routineId === routine.id && p.date === today,
          );
          const doneCount = progress?.completedStepIds.length ?? 0;
          const stepTotal = routine.steps.length;
          return (
            <section
              key={routine.id}
              className="rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--ink)]">
                    {routine.title} · {child?.name ?? "Barn"}
                  </h3>
                  <p className="text-sm font-medium text-[var(--ink-muted)]">
                    {doneCount}/{stepTotal} klart
                  </p>
                </div>
              </div>
              <div className="flex flex-nowrap gap-2">
                {[...routine.steps]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((step) => {
                    const done = progress?.completedStepIds.includes(step.id);
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() =>
                          void toggleRoutineStep(routine.id, step.id)
                        }
                        aria-pressed={done}
                        className={`tap-target relative flex min-h-[6.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 ring-2 transition ${
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
                          {step.emoji}
                        </span>
                        <span
                          className={`max-w-full truncate px-0.5 text-center font-display text-base font-bold ${
                            done ? "text-white" : "text-[var(--ink)]"
                          }`}
                        >
                          {step.label}
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
                  })}
              </div>
            </section>
          );
        })
      ) : (
        <section className="rounded-3xl bg-white/60 px-4 py-6 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Ingen rutin för {child?.name ?? "detta barn"} just nu. Lägg till, eller
          ändra dagar och tider under Hantera → Rutiner.
        </section>
      )}
    </div>
  );
}
