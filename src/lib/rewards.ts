import { startOfWeek, toDateKey, weekDays } from "@/lib/dates";
import { ALL_WEEKDAYS, sanitizeWeekdays } from "@/lib/routines";
import type {
  RewardActivity,
  RewardAward,
  RewardMaxStars,
} from "@/lib/types";

export function rewardAwardId(activityId: string, date: string): string {
  return `${activityId}:${date}`;
}

export function clampMaxStars(value: unknown): RewardMaxStars {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n))) as RewardMaxStars;
}

export function clampAwardStars(stars: number, maxStars: RewardMaxStars): number {
  if (!Number.isFinite(stars)) return 0;
  return Math.min(maxStars, Math.max(0, Math.round(stars)));
}

export function normalizeRewardActivity(
  activity: RewardActivity,
): RewardActivity {
  const weekdays = sanitizeWeekdays(activity.weekdays);
  return {
    ...activity,
    title: activity.title.trim() || "Aktivitet",
    maxStars: clampMaxStars(activity.maxStars),
    weekdays: weekdays.length > 0 ? weekdays : [...ALL_WEEKDAYS],
    sortOrder:
      typeof activity.sortOrder === "number" && Number.isFinite(activity.sortOrder)
        ? activity.sortOrder
        : 0,
    enabled: activity.enabled !== false,
  };
}

export function compareRewardActivities(
  a: RewardActivity,
  b: RewardActivity,
): number {
  return (
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
    a.title.localeCompare(b.title, "sv")
  );
}

export function activityAvailableOnWeekday(
  activity: RewardActivity,
  weekday: number,
): boolean {
  return normalizeRewardActivity(activity).weekdays.includes(weekday);
}

export function sumStarsForActivity(
  awards: RewardAward[],
  activityId: string,
): number {
  return awards
    .filter((award) => award.activityId === activityId)
    .reduce((sum, award) => sum + Math.max(0, award.stars), 0);
}

export function sumStarsForPerson(
  awards: RewardAward[],
  personId: string,
  dateKeys?: Set<string>,
): number {
  return awards
    .filter((award) => {
      if (award.personId !== personId) return false;
      if (dateKeys && !dateKeys.has(award.date)) return false;
      return true;
    })
    .reduce((sum, award) => sum + Math.max(0, award.stars), 0);
}

export function weekDateKeys(anchor: Date = new Date()): string[] {
  return weekDays(startOfWeek(anchor)).map(toDateKey);
}

export function weekDateKeySet(anchor: Date = new Date()): Set<string> {
  return new Set(weekDateKeys(anchor));
}

/** Max stars earnable this week for a child (enabled activities × available days). */
export function weekPossibleStars(
  activities: RewardActivity[],
  personId: string,
  anchor: Date = new Date(),
): number {
  const days = weekDays(startOfWeek(anchor));
  let total = 0;
  for (const activity of activities) {
    const normalized = normalizeRewardActivity(activity);
    if (normalized.personId !== personId || !normalized.enabled) continue;
    for (const day of days) {
      const weekday = (day.getDay() + 6) % 7;
      if (normalized.weekdays.includes(weekday)) {
        total += normalized.maxStars;
      }
    }
  }
  return total;
}

/** Past ISO weeks with totals, newest first (excludes current week). */
export function pastWeekSummaries(
  awards: RewardAward[],
  personId: string,
  currentWeekKeys: Set<string>,
  limit = 8,
): { weekKey: string; label: string; stars: number }[] {
  const byWeek = new Map<string, { stars: number; anyDate: string }>();

  for (const award of awards) {
    if (award.personId !== personId) continue;
    if (currentWeekKeys.has(award.date)) continue;
    if (award.stars <= 0) continue;
    const weekKey = isoWeekKeyFromDateKey(award.date);
    const prev = byWeek.get(weekKey);
    if (prev) {
      prev.stars += award.stars;
    } else {
      byWeek.set(weekKey, { stars: award.stars, anyDate: award.date });
    }
  }

  return [...byWeek.entries()]
    .map(([weekKey, value]) => ({
      weekKey,
      label: weekSummaryLabel(value.anyDate),
      stars: value.stars,
    }))
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
    .slice(0, limit);
}

function isoWeekKeyFromDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekSummaryLabel(dateKey: string): string {
  const monday = startOfWeek(new Date(`${dateKey}T12:00:00`));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function findAward(
  awards: RewardAward[],
  activityId: string,
  date: string,
): RewardAward | undefined {
  return awards.find(
    (award) => award.activityId === activityId && award.date === date,
  );
}
