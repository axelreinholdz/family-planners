import { todayKey } from "./dates";
import type { Event } from "./types";

function timeValue(event: Event): number {
  if (event.allDay || !event.startTime) return -1;
  const [h, m] = event.startTime.split(":").map(Number);
  return h * 60 + m;
}

/** Upcoming events for a person today: next timed event, then remaining all-day. */
export function nextEventsForPerson(
  events: Event[],
  personId: string,
  date = todayKey(),
  now = new Date(),
): { current: Event | null; upcoming: Event[] } {
  const todays = events
    .filter((e) => e.personId === personId && e.date === date)
    .sort((a, b) => {
      const ta = timeValue(a);
      const tb = timeValue(b);
      if (ta !== tb) return ta - tb;
      return a.title.localeCompare(b.title, "sv");
    });

  if (todays.length === 0) {
    return { current: null, upcoming: [] };
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const timed = todays.filter((e) => !e.allDay && e.startTime);
  const allDay = todays.filter((e) => e.allDay || !e.startTime);

  const futureTimed = timed.filter((e) => timeValue(e) >= minutesNow);
  const current =
    futureTimed[0] ??
    timed.find((e) => {
      const start = timeValue(e);
      const end = e.endTime
        ? (() => {
            const [h, m] = e.endTime.split(":").map(Number);
            return h * 60 + m;
          })()
        : start + 60;
      return start <= minutesNow && minutesNow < end;
    }) ??
    allDay[0] ??
    null;

  const upcoming = todays.filter((e) => e.id !== current?.id).slice(0, 3);
  return { current, upcoming };
}
