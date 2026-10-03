"use client";

import { createClient } from "@/lib/supabase/client";
import {
  applySpanForTemplate,
  eventsFromTemplates,
  eventsFromTemplatesForWeeks,
  weekAnchorsBetween,
} from "@/lib/recurring";
import { todayKey } from "@/lib/dates";
import {
  buildSeedFamilyData,
  getMembership,
  loadFamilyPayload,
  saveFamilyPayload,
} from "@/lib/supabase/family";
import { routineProgressId, screenTimeDayId } from "@/lib/seed";
import type {
  DinnerPlan,
  Event,
  FamilyData,
  Person,
  RecurringTemplate,
  Routine,
  RoutineDayProgress,
  ScreenTimeDay,
  ScreenTimeSettings,
  Todo,
} from "@/lib/types";

type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

let cachedMembership: Membership | null = null;
let cachedPayload: FamilyData | null = null;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function requireMembership(): Promise<Membership> {
  if (cachedMembership) return cachedMembership;
  const supabase = createClient();
  const membership = await getMembership(supabase);
  if (!membership) {
    throw new Error("Ingen familj kopplad. Skapa eller gå med i en familj.");
  }
  cachedMembership = membership;
  return membership;
}

async function readPayload(): Promise<FamilyData> {
  if (cachedPayload) return structuredClone(cachedPayload);
  const membership = await requireMembership();
  const supabase = createClient();
  const payload = await loadFamilyPayload(supabase, membership.familyId);
  cachedPayload = payload;
  return structuredClone(payload);
}

async function writePayload(payload: FamilyData): Promise<FamilyData> {
  const membership = await requireMembership();
  const supabase = createClient();
  sortPayload(payload);
  await saveFamilyPayload(supabase, membership.familyId, payload);
  cachedPayload = payload;
  return structuredClone(payload);
}

function sortPayload(payload: FamilyData) {
  payload.people.sort((a, b) => a.sortOrder - b.sortOrder);
  payload.todos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  payload.dinners.sort((a, b) => a.weekday - b.weekday);
  payload.routines.sort((a, b) => a.title.localeCompare(b.title, "sv"));
  payload.recurringTemplates.sort((a, b) =>
    a.title.localeCompare(b.title, "sv"),
  );
}

export function clearCloudCache() {
  cachedMembership = null;
  cachedPayload = null;
}

export function getCachedMembership() {
  return cachedMembership;
}

export async function cloudLoadAll(): Promise<FamilyData> {
  clearCloudCache();
  const payload = await readPayload();
  const enabled = payload.recurringTemplates.filter((t) => t.enabled);
  if (enabled.length === 0) return payload;

  let fromKey = applySpanForTemplate(enabled[0]).fromKey;
  let toKey = applySpanForTemplate(enabled[0]).toKey;
  for (const template of enabled) {
    const span = applySpanForTemplate(template);
    if (span.fromKey < fromKey) fromKey = span.fromKey;
    if (span.toKey > toKey) toKey = span.toKey;
  }
  const created = eventsFromTemplatesForWeeks(
    enabled,
    payload.events,
    weekAnchorsBetween(fromKey, toKey),
    newId,
  );
  if (created.length > 0) {
    payload.events.push(...created);
    return writePayload(payload);
  }
  return payload;
}

async function update(
  mutator: (data: FamilyData) => void | Promise<void>,
): Promise<void> {
  const data = await readPayload();
  await mutator(data);
  await writePayload(data);
}

export async function cloudPutPerson(person: Person) {
  await update((data) => {
    const idx = data.people.findIndex((p) => p.id === person.id);
    if (idx >= 0) data.people[idx] = person;
    else data.people.push(person);
  });
}

export async function cloudPutEvent(event: Event) {
  await update((data) => {
    const idx = data.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) data.events[idx] = event;
    else data.events.push(event);
  });
}

export async function cloudDeleteEvent(id: string) {
  await update((data) => {
    data.events = data.events.filter((e) => e.id !== id);
  });
}

export async function cloudPutTodo(todo: Todo) {
  await update((data) => {
    const idx = data.todos.findIndex((t) => t.id === todo.id);
    if (idx >= 0) data.todos[idx] = todo;
    else data.todos.push(todo);
  });
}

export async function cloudDeleteTodo(id: string) {
  await update((data) => {
    data.todos = data.todos.filter((t) => t.id !== id);
  });
}

export async function cloudSaveDinnerMenu(dinners: DinnerPlan[]) {
  await update((data) => {
    data.dinners = dinners.map((d) => ({ ...d }));
  });
}

export async function cloudPutScreenTimeSettings(settings: ScreenTimeSettings) {
  await update((data) => {
    const idx = data.screenTimeSettings.findIndex(
      (s) => s.personId === settings.personId,
    );
    if (idx >= 0) data.screenTimeSettings[idx] = settings;
    else data.screenTimeSettings.push(settings);
  });
}

export async function cloudPutScreenTimeDay(day: ScreenTimeDay) {
  await update((data) => {
    const idx = data.screenTimeDays.findIndex((d) => d.id === day.id);
    if (idx >= 0) data.screenTimeDays[idx] = day;
    else data.screenTimeDays.push(day);
  });
}

export async function cloudEnsureScreenTimeDay(
  personId: string,
  date = todayKey(),
): Promise<ScreenTimeDay> {
  const data = await readPayload();
  const id = screenTimeDayId(personId, date);
  const existing = data.screenTimeDays.find((d) => d.id === id);
  if (existing) return existing;
  const settings = data.screenTimeSettings.find((s) => s.personId === personId);
  const day: ScreenTimeDay = {
    id,
    personId,
    date,
    allowanceMinutes: settings?.dailyMinutes ?? 45,
    usedSeconds: 0,
  };
  data.screenTimeDays.push(day);
  await writePayload(data);
  return day;
}

export async function cloudPutRoutine(routine: Routine) {
  await update((data) => {
    const idx = data.routines.findIndex((r) => r.id === routine.id);
    if (idx >= 0) data.routines[idx] = routine;
    else data.routines.push(routine);
  });
}

export async function cloudDeleteRoutine(id: string) {
  await update((data) => {
    data.routines = data.routines.filter((r) => r.id !== id);
    data.routineProgress = data.routineProgress.filter(
      (p) => p.routineId !== id,
    );
  });
}

export async function cloudPutRoutineProgress(progress: RoutineDayProgress) {
  await update((data) => {
    const idx = data.routineProgress.findIndex((p) => p.id === progress.id);
    if (idx >= 0) data.routineProgress[idx] = progress;
    else data.routineProgress.push(progress);
  });
}

export async function cloudEnsureRoutineProgress(
  routineId: string,
  date = todayKey(),
): Promise<RoutineDayProgress> {
  const data = await readPayload();
  const id = routineProgressId(routineId, date);
  const existing = data.routineProgress.find((p) => p.id === id);
  if (existing) return existing;
  const progress: RoutineDayProgress = {
    id,
    routineId,
    date,
    completedStepIds: [],
  };
  data.routineProgress.push(progress);
  await writePayload(data);
  return progress;
}

export async function cloudPutRecurringTemplate(template: RecurringTemplate) {
  await update((data) => {
    const idx = data.recurringTemplates.findIndex((t) => t.id === template.id);
    if (idx >= 0) data.recurringTemplates[idx] = template;
    else data.recurringTemplates.push(template);
  });
}

export async function cloudDeleteRecurringTemplate(id: string) {
  await update((data) => {
    data.recurringTemplates = data.recurringTemplates.filter((t) => t.id !== id);
  });
}

export async function cloudApplyTemplatesForWeek(weekAnchor = new Date()) {
  await update((data) => {
    const created = eventsFromTemplates(
      data.recurringTemplates,
      data.events,
      weekAnchor,
      newId,
    );
    data.events.push(...created);
  });
}

export async function cloudApplyTemplateSpan(template: RecurringTemplate) {
  await update((data) => {
    const { fromKey, toKey } = applySpanForTemplate(template);
    const anchors = weekAnchorsBetween(fromKey, toKey);
    const created = eventsFromTemplatesForWeeks(
      [template],
      data.events,
      anchors,
      newId,
    );
    data.events.push(...created);
  });
}

export async function cloudApplyAllTemplateSpans() {
  await update((data) => {
    const enabled = data.recurringTemplates.filter((t) => t.enabled);
    if (enabled.length === 0) return;
    let fromKey = applySpanForTemplate(enabled[0]).fromKey;
    let toKey = applySpanForTemplate(enabled[0]).toKey;
    for (const template of enabled) {
      const span = applySpanForTemplate(template);
      if (span.fromKey < fromKey) fromKey = span.fromKey;
      if (span.toKey > toKey) toKey = span.toKey;
    }
    const anchors = weekAnchorsBetween(fromKey, toKey);
    const created = eventsFromTemplatesForWeeks(
      enabled,
      data.events,
      anchors,
      newId,
    );
    data.events.push(...created);
  });
}

export async function cloudResetToSeed() {
  const membership = await requireMembership();
  const supabase = createClient();
  const payload = buildSeedFamilyData();
  await saveFamilyPayload(supabase, membership.familyId, payload);
  cachedPayload = payload;
}
