import type { ScreenTimeDay } from "./types";

export function liveElapsedSeconds(
  day: ScreenTimeDay | null | undefined,
  now = Date.now(),
): number {
  if (!day?.activeStartedAt) return 0;
  const started = Date.parse(day.activeStartedAt);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function remainingSeconds(
  day: ScreenTimeDay | null | undefined,
  now = Date.now(),
): number {
  if (!day) return 0;
  const allowance = day.allowanceMinutes * 60;
  return Math.max(0, allowance - day.usedSeconds - liveElapsedSeconds(day, now));
}

export function usedSecondsTotal(
  day: ScreenTimeDay | null | undefined,
  now = Date.now(),
): number {
  if (!day) return 0;
  return day.usedSeconds + liveElapsedSeconds(day, now);
}

export function foldActiveSession(
  day: ScreenTimeDay,
  now = Date.now(),
): ScreenTimeDay {
  if (!day.activeStartedAt) return day;
  const elapsed = liveElapsedSeconds(day, now);
  return {
    ...day,
    usedSeconds: day.usedSeconds + elapsed,
    activeStartedAt: undefined,
  };
}
