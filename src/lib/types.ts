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

export interface FamilyData {
  people: Person[];
  events: Event[];
  todos: Todo[];
}
