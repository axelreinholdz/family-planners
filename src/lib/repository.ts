/**
 * Data access facade: Supabase cloud when configured + signed in with a family,
 * otherwise local IndexedDB.
 */
import * as local from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as cloud from "@/lib/supabase/cloud-db";
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

let cloudMode = false;

export function setCloudMode(enabled: boolean) {
  cloudMode = enabled && isSupabaseConfigured();
  if (!cloudMode) cloud.clearCloudCache();
}

export function isCloudMode() {
  return cloudMode;
}

export function newId(prefix: string) {
  return local.newId(prefix);
}

export async function loadAll(): Promise<FamilyData> {
  if (cloudMode) return cloud.cloudLoadAll();
  return local.loadAll();
}

export async function putPerson(person: Person) {
  if (cloudMode) return cloud.cloudPutPerson(person);
  return local.putPerson(person);
}

export async function deletePerson(id: string) {
  if (cloudMode) return cloud.cloudDeletePerson(id);
  return local.deletePerson(id);
}

export async function putEvent(event: Event) {
  if (cloudMode) return cloud.cloudPutEvent(event);
  return local.putEvent(event);
}

export async function deleteEvent(id: string) {
  if (cloudMode) return cloud.cloudDeleteEvent(id);
  return local.deleteEvent(id);
}

export async function putTodo(todo: Todo) {
  if (cloudMode) return cloud.cloudPutTodo(todo);
  return local.putTodo(todo);
}

export async function deleteTodo(id: string) {
  if (cloudMode) return cloud.cloudDeleteTodo(id);
  return local.deleteTodo(id);
}

export async function saveDinnerMenu(dinners: DinnerPlan[]) {
  if (cloudMode) return cloud.cloudSaveDinnerMenu(dinners);
  return local.saveDinnerMenu(dinners);
}

export async function putScreenTimeSettings(settings: ScreenTimeSettings) {
  if (cloudMode) return cloud.cloudPutScreenTimeSettings(settings);
  return local.putScreenTimeSettings(settings);
}

export async function putScreenTimeDay(day: ScreenTimeDay) {
  if (cloudMode) return cloud.cloudPutScreenTimeDay(day);
  return local.putScreenTimeDay(day);
}

export async function ensureScreenTimeDay(
  personId: string,
  date?: string,
): Promise<ScreenTimeDay> {
  if (cloudMode) return cloud.cloudEnsureScreenTimeDay(personId, date);
  return local.ensureScreenTimeDay(personId, date);
}

export async function putRoutine(routine: Routine) {
  if (cloudMode) return cloud.cloudPutRoutine(routine);
  return local.putRoutine(routine);
}

export async function deleteRoutine(id: string) {
  if (cloudMode) return cloud.cloudDeleteRoutine(id);
  return local.deleteRoutine(id);
}

export async function putRoutineProgress(progress: RoutineDayProgress) {
  if (cloudMode) return cloud.cloudPutRoutineProgress(progress);
  return local.putRoutineProgress(progress);
}

export async function ensureRoutineProgress(
  routineId: string,
  date?: string,
): Promise<RoutineDayProgress> {
  if (cloudMode) return cloud.cloudEnsureRoutineProgress(routineId, date);
  return local.ensureRoutineProgress(routineId, date);
}

export async function putRecurringTemplate(template: RecurringTemplate) {
  if (cloudMode) return cloud.cloudPutRecurringTemplate(template);
  return local.putRecurringTemplate(template);
}

export async function deleteRecurringTemplate(id: string) {
  if (cloudMode) return cloud.cloudDeleteRecurringTemplate(id);
  return local.deleteRecurringTemplate(id);
}

export async function applyTemplatesForWeek(weekAnchor?: Date) {
  if (cloudMode) return cloud.cloudApplyTemplatesForWeek(weekAnchor);
  return local.applyTemplatesForWeek(weekAnchor);
}

export async function applyTemplateSpan(template: RecurringTemplate) {
  if (cloudMode) return cloud.cloudApplyTemplateSpan(template);
  return local.applyTemplateSpan(template);
}

export async function applyAllTemplateSpans() {
  if (cloudMode) return cloud.cloudApplyAllTemplateSpans();
  return local.applyAllTemplateSpans();
}

export async function resetToSeed() {
  if (cloudMode) return cloud.cloudResetToSeed();
  return local.resetToSeed();
}

export { getCachedMembership } from "@/lib/supabase/cloud-db";
