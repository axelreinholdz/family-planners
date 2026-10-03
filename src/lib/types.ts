export type PersonRole = "parent" | "child";

export type IconKey =
  | "preschool"
  | "home"
  | "outdoors"
  | "sport"
  | "friend"
  | "travel"
  | "doctor"
  | "food"
  | "sleep"
  | "play"
  | "music"
  | "other";

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
  startTime?: string; // HH:mm
  endTime?: string;
  allDay: boolean;
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
}
