export type PersonRole = "parent" | "child";

/** Key into APP_ICONS; use "other" with `emoji` for custom icons. */
export type IconKey = string;

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  color: string;
  avatar: string;
  sortOrder: number;
}

export interface Event {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  title: string;
  iconKey: IconKey;
  /** Display emoji; when set, overrides the library icon for this event. */
  emoji?: string;
  startTime?: string; // HH:mm
  endTime?: string;
  allDay: boolean;
  /** Set when generated from a recurring template */
  templateId?: string;
}

export interface RoutineStep {
  id: string;
  label: string;
  emoji: string;
  sortOrder: number;
}

export interface Routine {
  id: string;
  personId: string;
  title: string;
  /** Monday-start weekdays 0–6. Empty/missing = every day. */
  weekdays: number[];
  /** Optional HH:mm window when the routine is shown on Idag. Missing = all day. */
  showFrom?: string;
  showUntil?: string;
  /** Display order among a child’s routines (lower first). */
  sortOrder: number;
  steps: RoutineStep[];
}

export interface RoutineDayProgress {
  /** Composite key: `${routineId}:${date}` */
  id: string;
  routineId: string;
  date: string;
  completedStepIds: string[];
}

export interface RecurringTemplate {
  id: string;
  personId: string;
  title: string;
  iconKey: IconKey;
  /** Display emoji; when set, overrides the library icon. */
  emoji?: string;
  /** Monday-start weekdays 0–6 */
  weekdays: number[];
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  enabled: boolean;
  /** Inclusive range (YYYY-MM-DD). Missing = open-ended. */
  startDate?: string;
  endDate?: string;
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: string; // ISO
  dueDate?: string; // YYYY-MM-DD
}

export interface ScreenTimeSettings {
  personId: string;
  dailyMinutes: number;
  enabled: boolean;
}

export interface ScreenTimeDay {
  /** Composite key: `${personId}:${date}` */
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  allowanceMinutes: number;
  usedSeconds: number;
  activeStartedAt?: string; // ISO if a session is running
}

export interface DinnerPlan {
  weekday: number; // 0=mån … 6=sön
  title: string;
}

export interface FamilyData {
  people: Person[];
  events: Event[];
  todos: Todo[];
  dinners: DinnerPlan[];
  screenTimeSettings: ScreenTimeSettings[];
  screenTimeDays: ScreenTimeDay[];
  routines: Routine[];
  routineProgress: RoutineDayProgress[];
  recurringTemplates: RecurringTemplate[];
}
