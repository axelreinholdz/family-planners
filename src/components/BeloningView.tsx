"use client";

import { useMemo, useState } from "react";
import { defaultChildId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import {
  startOfWeek,
  toDateKey,
  WEEKDAY_LABELS,
  weekDays,
} from "@/lib/dates";
import {
  activityAvailableOnWeekday,
  compareRewardActivities,
  findAward,
  normalizeRewardActivity,
  pastWeekSummaries,
  sumStarsForActivity,
  sumStarsForPerson,
  weekDateKeySet,
} from "@/lib/rewards";

function mondayWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function starLabel(stars: number): string {
  if (stars <= 0) return "·";
  if (stars > 3) return `${stars} ★`;
  return "★".repeat(stars);
}

export function BeloningView() {
  const {
    people,
    ready,
    rewardActivities,
    rewardAwards,
    setRewardAward,
  } = useFamilyStore();

  const [personId, setPersonId] = useState(() => defaultChildId(people));
  const activePersonId = defaultChildId(people, personId);
  const activePerson = people.find((p) => p.id === activePersonId);

  const weekAnchor = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const weekKeys = useMemo(() => weekDateKeySet(weekAnchor), [weekAnchor]);

  const activities = useMemo(
    () =>
      rewardActivities
        .filter(
          (a) =>
            a.personId === activePersonId &&
            normalizeRewardActivity(a).enabled,
        )
        .slice()
        .sort(compareRewardActivities)
        .map(normalizeRewardActivity),
    [rewardActivities, activePersonId],
  );

  const weekTotal = useMemo(
    () => sumStarsForPerson(rewardAwards, activePersonId, weekKeys),
    [rewardAwards, activePersonId, weekKeys],
  );

  const lifetimeTotal = useMemo(
    () => sumStarsForPerson(rewardAwards, activePersonId),
    [rewardAwards, activePersonId],
  );

  const pastWeeks = useMemo(
    () => pastWeekSummaries(rewardAwards, activePersonId, weekKeys, 8),
    [rewardAwards, activePersonId, weekKeys],
  );

  const cycleStars = (activityId: string, date: string, maxStars: number) => {
    const current = findAward(rewardAwards, activityId, date)?.stars ?? 0;
    const next = current >= maxStars ? 0 : current + 1;
    void setRewardAward(activityId, date, next);
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar belöningar…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-0.5">
      <PersonTabs
        people={people}
        selectedId={activePersonId}
        roles={["child"]}
        label="Välj barn"
        onSelect={setPersonId}
      />

      {activities.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-10 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga belöningsaktiviteter för{" "}
          {activePerson?.name ?? "detta barn"} ännu. Lägg till dem under Hantera
          → Belöning.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
          <table className="w-full min-w-[36rem] border-separate border-spacing-y-1 text-center">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white/95 px-2 py-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Aktivitet
                </th>
                {days.map((day, i) => (
                  <th
                    key={toDateKey(day)}
                    className="px-1 py-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                  >
                    {WEEKDAY_LABELS[i]}
                  </th>
                ))}
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Totalt
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => {
                const lifetime = sumStarsForActivity(
                  rewardAwards,
                  activity.id,
                );
                return (
                  <tr key={activity.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 whitespace-nowrap bg-white/95 px-2 py-1 pr-4 text-left align-middle"
                    >
                      <p className="font-display text-base font-bold text-[var(--ink)]">
                        {activity.title}
                      </p>
                      <p className="text-xs font-normal text-[var(--ink-muted)]">
                        max {activity.maxStars} ★
                      </p>
                    </th>
                    {days.map((day) => {
                      const dateKey = toDateKey(day);
                      const weekday = mondayWeekdayIndex(day);
                      const available = activityAvailableOnWeekday(
                        activity,
                        weekday,
                      );
                      const stars =
                        findAward(rewardAwards, activity.id, dateKey)?.stars ??
                        0;

                      if (!available) {
                        return (
                          <td
                            key={dateKey}
                            className="px-1 py-1 align-middle"
                          >
                            <div
                              className="mx-auto h-12 min-w-14 rounded-xl bg-[var(--surface-soft)]/50"
                              aria-hidden
                            />
                          </td>
                        );
                      }

                      const label = starLabel(stars);
                      const multiGlyph = stars >= 2 && stars <= 3;

                      return (
                        <td key={dateKey} className="px-1 py-1 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              cycleStars(
                                activity.id,
                                dateKey,
                                activity.maxStars,
                              )
                            }
                            aria-label={`${activity.title} ${WEEKDAY_LABELS[weekday]}: ${stars} av ${activity.maxStars} stjärnor`}
                            className={`tap-target mx-auto flex h-12 min-w-14 items-center justify-center rounded-xl px-2 font-bold transition ${
                              multiGlyph ? "text-sm tracking-wide" : "text-base"
                            } ${
                              stars > 0
                                ? "bg-[var(--accent)] text-white shadow-sm"
                                : "bg-[var(--surface-soft)] text-[var(--ink-muted)] ring-1 ring-black/5"
                            }`}
                          >
                            {label}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 align-middle">
                      <span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] px-2 py-2 text-sm font-bold text-[var(--ink)]">
                        {lifetime}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Denna vecka
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">
            {weekTotal}{" "}
            <span className="text-lg font-semibold text-[var(--ink-muted)]">
              ★
            </span>
          </p>
        </div>
        <div className="rounded-3xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Totalt alla tider
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">
            {lifetimeTotal}{" "}
            <span className="text-lg font-semibold text-[var(--ink-muted)]">
              ★
            </span>
          </p>
        </div>
      </section>

      {pastWeeks.length > 0 ? (
        <section className="rounded-3xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-black/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Tidigare veckor
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {pastWeeks.map((week) => (
              <li
                key={week.weekKey}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {week.label}
                </span>
                <span className="text-sm font-bold text-[var(--ink)]">
                  {week.stars} ★
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
