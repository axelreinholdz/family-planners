import {
  addDays,
  mondayWeekdayIndex,
  parseDateKey,
  startOfWeek,
  toDateKey,
  todayKey,
} from "./dates";
import type { Event, RecurringTemplate } from "./types";

/** Cap how far ahead open-ended templates are materialized at once. */
const MAX_APPLY_WEEKS = 52;
const OPEN_ENDED_WEEKS = 26;

function isWithinTemplateRange(
  date: string,
  template: RecurringTemplate,
): boolean {
  if (template.startDate && date < template.startDate) return false;
  if (template.endDate && date > template.endDate) return false;
  return true;
}

/** Shared activity fields copied from a recurring template. */
export function eventDetailsFromTemplate(
  template: RecurringTemplate,
): Pick<
  Event,
  "personId" | "title" | "iconKey" | "emoji" | "startTime" | "endTime" | "allDay"
> {
  return {
    personId: template.personId,
    title: template.title,
    iconKey: template.iconKey,
    emoji: template.emoji,
    startTime: template.allDay ? undefined : template.startTime,
    endTime: template.allDay ? undefined : template.endTime,
    allDay: template.allDay,
  };
}

function eventMatchesTemplateSchedule(
  event: Event,
  template: RecurringTemplate,
): boolean {
  if (!isWithinTemplateRange(event.date, template)) return false;
  const weekday = mondayWeekdayIndex(parseDateKey(event.date));
  return template.weekdays.includes(weekday);
}

function eventDetailsDiffer(
  event: Event,
  details: ReturnType<typeof eventDetailsFromTemplate>,
): boolean {
  return (
    event.personId !== details.personId ||
    event.title !== details.title ||
    event.iconKey !== details.iconKey ||
    (event.emoji ?? undefined) !== (details.emoji ?? undefined) ||
    (event.startTime ?? undefined) !== (details.startTime ?? undefined) ||
    (event.endTime ?? undefined) !== (details.endTime ?? undefined) ||
    event.allDay !== details.allDay
  );
}

/**
 * Push template edits onto existing linked events.
 * Removes events that no longer fall on the template’s days/date range.
 */
export function reconcileTemplateEvents(
  template: RecurringTemplate,
  events: Event[],
): { updated: Event[]; deleteIds: string[] } {
  const details = eventDetailsFromTemplate(template);
  const updated: Event[] = [];
  const deleteIds: string[] = [];

  for (const event of events) {
    if (event.templateId !== template.id) continue;
    if (!eventMatchesTemplateSchedule(event, template)) {
      deleteIds.push(event.id);
      continue;
    }
    if (eventDetailsDiffer(event, details)) {
      updated.push({ ...event, ...details });
    }
  }

  return { updated, deleteIds };
}

export function eventsFromTemplates(
  templates: RecurringTemplate[],
  existing: Event[],
  weekAnchor = new Date(),
  newId: (prefix: string) => string,
): Event[] {
  const weekStart = startOfWeek(weekAnchor);
  const created: Event[] = [];

  for (const template of templates) {
    if (!template.enabled) continue;
    const details = eventDetailsFromTemplate(template);
    for (const weekday of template.weekdays) {
      const date = toDateKey(addDays(weekStart, weekday));
      if (!isWithinTemplateRange(date, template)) continue;
      const already = existing.some(
        (event) =>
          event.templateId === template.id && event.date === date,
      );
      const pending = created.some(
        (event) =>
          event.templateId === template.id && event.date === date,
      );
      if (already || pending) continue;

      created.push({
        id: newId("ev"),
        date,
        ...details,
        templateId: template.id,
      });
    }
  }

  return created;
}

/** Week-start anchors covering an inclusive YYYY-MM-DD span. */
export function weekAnchorsBetween(fromKey: string, toKey: string): Date[] {
  if (!fromKey || !toKey || toKey < fromKey) return [];
  let cursor = startOfWeek(parseDateKey(fromKey));
  const end = startOfWeek(parseDateKey(toKey));
  const anchors: Date[] = [];
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < MAX_APPLY_WEEKS) {
    anchors.push(new Date(cursor));
    cursor = addDays(cursor, 7);
    guard += 1;
  }
  return anchors;
}

/**
 * Date span to materialize for a template.
 * With an end date: start → end.
 * Without: current week (or future start) → ~26 upcoming weeks.
 * Past weeks are filled on demand when browsing Vecka.
 */
export function applySpanForTemplate(template: RecurringTemplate): {
  fromKey: string;
  toKey: string;
} {
  if (template.endDate) {
    const fromKey = template.startDate ?? todayKey();
    return {
      fromKey,
      toKey: template.endDate < fromKey ? fromKey : template.endDate,
    };
  }

  const weekStartKey = toDateKey(startOfWeek(new Date()));
  const upcomingEnd = toDateKey(
    addDays(startOfWeek(new Date()), 7 * OPEN_ENDED_WEEKS),
  );
  const start = template.startDate ?? weekStartKey;
  // Future start → wait until then; past start → fill from this week forward.
  const fromKey = start > weekStartKey ? start : weekStartKey;
  return {
    fromKey,
    toKey: upcomingEnd < fromKey ? fromKey : upcomingEnd,
  };
}

export function eventsFromTemplatesForWeeks(
  templates: RecurringTemplate[],
  existing: Event[],
  weekAnchors: Date[],
  newId: (prefix: string) => string,
): Event[] {
  const created: Event[] = [];
  const known = [...existing];
  for (const anchor of weekAnchors) {
    const batch = eventsFromTemplates(templates, known, anchor, newId);
    created.push(...batch);
    known.push(...batch);
  }
  return created;
}
