import type { ParsedCalendarInstance } from "@/lib/calendarIcs";
import type { CalendarSubscription, Event } from "@/lib/types";

export type CalendarFetchResponse = {
  events?: ParsedCalendarInstance[];
  error?: string;
};

export function eventDetailsFromSubscription(
  subscription: CalendarSubscription,
  instance: ParsedCalendarInstance,
): Pick<
  Event,
  | "personId"
  | "title"
  | "iconKey"
  | "emoji"
  | "date"
  | "startTime"
  | "endTime"
  | "allDay"
  | "calendarSubscriptionId"
  | "externalUid"
  | "description"
  | "location"
  | "url"
> {
  return {
    personId: subscription.personId,
    title: instance.title,
    iconKey: subscription.iconKey,
    emoji: subscription.emoji,
    date: instance.date,
    startTime: instance.allDay ? undefined : instance.startTime,
    endTime: instance.allDay ? undefined : instance.endTime,
    allDay: instance.allDay,
    calendarSubscriptionId: subscription.id,
    externalUid: instance.uid,
    description: instance.description,
    location: instance.location,
    url: instance.url,
  };
}

function detailsDiffer(
  event: Event,
  details: ReturnType<typeof eventDetailsFromSubscription>,
): boolean {
  return (
    event.personId !== details.personId ||
    event.title !== details.title ||
    event.iconKey !== details.iconKey ||
    (event.emoji ?? undefined) !== (details.emoji ?? undefined) ||
    event.date !== details.date ||
    (event.startTime ?? undefined) !== (details.startTime ?? undefined) ||
    (event.endTime ?? undefined) !== (details.endTime ?? undefined) ||
    event.allDay !== details.allDay ||
    event.calendarSubscriptionId !== details.calendarSubscriptionId ||
    event.externalUid !== details.externalUid ||
    (event.description ?? undefined) !== (details.description ?? undefined) ||
    (event.location ?? undefined) !== (details.location ?? undefined) ||
    (event.url ?? undefined) !== (details.url ?? undefined)
  );
}

/**
 * Reconcile feed instances into local events for one subscription.
 * Upserts by externalUid; deletes linked events missing from the feed or
 * outside the subscription date range.
 */
export function reconcileCalendarEvents(
  subscription: CalendarSubscription,
  instances: ParsedCalendarInstance[],
  events: Event[],
  newId: (prefix: string) => string,
): { upserts: Event[]; deleteIds: string[] } {
  const inRange = instances.filter(
    (instance) =>
      instance.date >= subscription.startDate &&
      instance.date <= subscription.endDate,
  );

  const byUid = new Map(
    events
      .filter((event) => event.calendarSubscriptionId === subscription.id)
      .map((event) => [event.externalUid ?? "", event]),
  );

  const seen = new Set<string>();
  const upserts: Event[] = [];

  for (const instance of inRange) {
    seen.add(instance.uid);
    const details = eventDetailsFromSubscription(subscription, instance);
    const existing = byUid.get(instance.uid);
    if (existing) {
      if (detailsDiffer(existing, details)) {
        upserts.push({ ...existing, ...details });
      }
      continue;
    }
    upserts.push({
      id: newId("event"),
      ...details,
    });
  }

  const deleteIds: string[] = [];
  for (const event of events) {
    if (event.calendarSubscriptionId !== subscription.id) continue;
    const uid = event.externalUid ?? "";
    const outOfRange =
      event.date < subscription.startDate || event.date > subscription.endDate;
    if (!uid || !seen.has(uid) || outOfRange) {
      deleteIds.push(event.id);
    }
  }

  return { upserts, deleteIds };
}

export async function fetchCalendarInstances(
  subscription: CalendarSubscription,
): Promise<ParsedCalendarInstance[]> {
  const response = await fetch("/api/calendar/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: subscription.url,
      from: subscription.startDate,
      to: subscription.endDate,
    }),
  });

  const payload = (await response.json()) as CalendarFetchResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Kunde inte synka kalender");
  }
  return payload.events ?? [];
}

const THROTTLE_MS = 60 * 60 * 1000;

/** Whether an enabled subscription should sync again (hourly throttle). */
export function shouldSyncSubscription(
  subscription: CalendarSubscription,
  now = Date.now(),
): boolean {
  if (!subscription.enabled) return false;
  if (!subscription.lastSyncedAt) return true;
  const last = Date.parse(subscription.lastSyncedAt);
  if (Number.isNaN(last)) return true;
  return now - last >= THROTTLE_MS;
}
