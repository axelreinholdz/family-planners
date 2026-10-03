import {
  addDays,
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
        personId: template.personId,
        date,
        title: template.title,
        iconKey: template.iconKey,
        startTime: template.allDay ? undefined : template.startTime,
        endTime: template.allDay ? undefined : template.endTime,
        allDay: template.allDay,
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
