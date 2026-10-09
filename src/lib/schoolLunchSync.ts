import {
  isoWeekKey,
  schoolLunchRssUrl,
  type ParsedSchoolLunchFeed,
} from "@/lib/schoolLunchRss";
import type { SchoolLunchFeed } from "@/lib/types";

export type SchoolLunchFetchResponse = {
  schoolName?: string;
  weekKey?: string;
  days?: ParsedSchoolLunchFeed["days"];
  error?: string;
};

const THROTTLE_MS = 24 * 60 * 60 * 1000;

/** Sync when week changed, never synced, or last sync older than ~24h. */
export function shouldSyncSchoolLunch(
  feed: SchoolLunchFeed,
  now = Date.now(),
): boolean {
  if (!feed.enabled || !feed.schoolSlug) return false;
  const currentWeek = isoWeekKey(new Date(now));
  if (feed.weekKey !== currentWeek) return true;
  if (!feed.lastSyncedAt) return true;
  const last = Date.parse(feed.lastSyncedAt);
  if (Number.isNaN(last)) return true;
  return now - last >= THROTTLE_MS;
}

export async function fetchSchoolLunchWeek(
  schoolSlug: string,
): Promise<ParsedSchoolLunchFeed> {
  const response = await fetch("/api/school-lunch/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolSlug,
      url: schoolLunchRssUrl(schoolSlug),
    }),
  });

  const payload = (await response.json()) as SchoolLunchFetchResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Kunde inte hämta skolmat");
  }
  return {
    schoolName: payload.schoolName ?? "Skola",
    weekKey: payload.weekKey ?? isoWeekKey(),
    days: payload.days ?? [],
  };
}
