import { addDays, startOfWeek, toDateKey } from "./dates";
import type { Event, RecurringTemplate } from "./types";

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
