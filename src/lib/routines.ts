import type { Routine } from "./types";

/** Default: every day (keeps older routines visible until edited). */
export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Deduplicate/sort valid weekday indexes (may be empty). */
export function sanitizeWeekdays(weekdays: number[]): number[] {
  return [...new Set(weekdays.filter((d) => d >= 0 && d <= 6))].sort(
    (a, b) => a - b,
  );
}

/**
 * Normalize stored weekdays. Missing/empty means every day so older
 * routines keep showing until the family picks specific days.
 */
export function normalizeRoutineWeekdays(
  weekdays: number[] | undefined | null,
): number[] {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return [...ALL_WEEKDAYS];
  }
  return sanitizeWeekdays(weekdays);
}

function sanitizeClock(value: string | undefined | null): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeRoutine(routine: Routine): Routine {
  const showFrom = sanitizeClock(routine.showFrom);
  const showUntil = sanitizeClock(routine.showUntil);
  const sortOrder =
    typeof routine.sortOrder === "number" && Number.isFinite(routine.sortOrder)
      ? routine.sortOrder
      : 0;
  return {
    ...routine,
    weekdays: normalizeRoutineWeekdays(routine.weekdays),
    showFrom,
    showUntil,
    sortOrder,
  };
}

/** Stable order for a child’s routines (sortOrder, then title). */
export function compareRoutines(a: Routine, b: Routine): number {
  const order =
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
    a.title.localeCompare(b.title, "sv");
  return order;
}

export function sortRoutines(routines: Routine[]): Routine[] {
  return routines
    .map(normalizeRoutine)
    .slice()
    .sort(compareRoutines);
}

export function routineActiveOnWeekday(
  routine: Routine,
  weekday: number,
): boolean {
  return normalizeRoutineWeekdays(routine.weekdays).includes(weekday);
}

function clockToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** True when current clock is within the routine’s optional show window. */
export function routineActiveAtTime(
  routine: Routine,
  now = new Date(),
): boolean {
  const from = sanitizeClock(routine.showFrom);
  const until = sanitizeClock(routine.showUntil);
  if (!from && !until) return true;

  const current = now.getHours() * 60 + now.getMinutes();
  const start = from ? clockToMinutes(from) : 0;
  const end = until ? clockToMinutes(until) : 24 * 60;

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  // Overnight window, e.g. 20:00–06:00
  return current >= start || current < end;
}

export function routineVisibleNow(
  routine: Routine,
  weekday: number,
  now = new Date(),
): boolean {
  return (
    routineActiveOnWeekday(routine, weekday) &&
    routineActiveAtTime(routine, now)
  );
}

export function formatRoutineTimeWindow(
  showFrom?: string,
  showUntil?: string,
): string {
  const from = sanitizeClock(showFrom);
  const until = sanitizeClock(showUntil);
  if (!from && !until) return "hela dagen";
  if (from && until) return `${from}–${until}`;
  if (from) return `från ${from}`;
  return `till ${until}`;
}
