import ical, { type EventInstance, type VEvent } from "node-ical";

export type ParsedCalendarInstance = {
  uid: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  description?: string;
  location?: string;
  url?: string;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function isFullDayEvent(event: VEvent): boolean {
  const start = event.start as Date & { dateOnly?: boolean };
  return event.datetype === "date" || Boolean(start?.dateOnly);
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "val" in value &&
    typeof (value as { val: unknown }).val === "string"
  ) {
    return (value as { val: string }).val;
  }
  return "";
}

function instanceUid(baseUid: string, start: Date, allDay: boolean): string {
  if (allDay) return `${baseUid}:${toLocalDateKey(start)}`;
  return `${baseUid}:${start.toISOString()}`;
}

/** Parse ICS text and expand occurrences into [fromKey, toKey] inclusive. */
export function parseIcsWindow(
  icsText: string,
  fromKey: string,
  toKey: string,
): ParsedCalendarInstance[] {
  if (!isValidDateKey(fromKey) || !isValidDateKey(toKey) || fromKey > toKey) {
    throw new Error("Ogiltigt datumintervall");
  }

  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T23:59:59.999`);
  const parsed = ical.parseICS(icsText);
  const results: ParsedCalendarInstance[] = [];

  for (const item of Object.values(parsed)) {
    if (!item || item.type !== "VEVENT") continue;
    const event = item as VEvent;
    const status = asText(event.status).toUpperCase();
    if (status === "CANCELLED") continue;

    const baseUid = asText(event.uid).trim();
    if (!baseUid) continue;

    let instances: EventInstance[] = [];

    try {
      instances = ical.expandRecurringEvent(event, {
        from,
        to,
        includeOverrides: true,
        excludeExdates: true,
      });
    } catch {
      if (!event.start) continue;
      const start = new Date(event.start);
      if (Number.isNaN(start.getTime())) continue;
      const dateKey = toLocalDateKey(start);
      if (dateKey < fromKey || dateKey > toKey) continue;
      const end = event.end ? new Date(event.end) : start;
      instances = [
        {
          start: start as EventInstance["start"],
          end: end as EventInstance["end"],
          summary: event.summary,
          isFullDay: isFullDayEvent(event),
          isRecurring: false,
          isOverride: false,
          event,
        },
      ];
    }

    for (const instance of instances) {
      const start = new Date(instance.start);
      if (Number.isNaN(start.getTime())) continue;

      const allDay = instance.isFullDay ?? isFullDayEvent(instance.event);
      const date = toLocalDateKey(start);
      if (date < fromKey || date > toKey) continue;

      const title = asText(instance.summary).trim() || "Aktivitet";
      const end = instance.end ? new Date(instance.end) : undefined;
      const uid = instanceUid(baseUid, start, allDay);
      const source = instance.event ?? event;
      const description = asText(source.description).trim() || undefined;
      const location = asText(source.location).trim() || undefined;
      const url = asText(source.url).trim() || undefined;

      if (allDay) {
        results.push({
          uid,
          title,
          date,
          allDay: true,
          description,
          location,
          url,
        });
        continue;
      }

      results.push({
        uid,
        title,
        date,
        allDay: false,
        startTime: toLocalTime(start),
        endTime:
          end && !Number.isNaN(end.getTime()) ? toLocalTime(end) : undefined,
        description,
        location,
        url,
      });
    }
  }

  results.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
      a.title.localeCompare(b.title, "sv"),
  );

  return results;
}
