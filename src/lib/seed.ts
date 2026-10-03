import { addDays, startOfWeek, toDateKey } from "./dates";
import type {
  DinnerPlan,
  Event,
  Person,
  ScreenTimeSettings,
  Todo,
} from "./types";

export const EBBE_ID = "child-ebbe";
export const LILLE_ID = "child-lille";

export const SEED_PEOPLE: Person[] = [
  {
    id: "parent-mamma",
    name: "Mamma",
    role: "parent",
    color: "#E07A5F",
    avatar: "👩",
    sortOrder: 0,
  },
  {
    id: "parent-pappa",
    name: "Pappa",
    role: "parent",
    color: "#3D5A80",
    avatar: "👨",
    sortOrder: 1,
  },
  {
    id: EBBE_ID,
    name: "Ebbe",
    role: "child",
    color: "#2A9D8F",
    avatar: "👦",
    sortOrder: 2,
  },
  {
    id: LILLE_ID,
    name: "Lillebror",
    role: "child",
    color: "#E9C46A",
    avatar: "🧒",
    sortOrder: 3,
  },
];

export const SEED_DINNERS: DinnerPlan[] = [
  { weekday: 0, title: "Fisk" },
  { weekday: 1, title: "Pasta" },
  { weekday: 2, title: "Gryta" },
  { weekday: 3, title: "Tacos" },
  { weekday: 4, title: "Pizza" },
  { weekday: 5, title: "Utemat" },
  { weekday: 6, title: "Helgmiddag" },
];

export const SEED_SCREEN_TIME: ScreenTimeSettings[] = [
  {
    personId: EBBE_ID,
    dailyMinutes: 45,
    enabled: true,
  },
];

function weekdayKeys(weekStart: Date): string[] {
  return Array.from({ length: 5 }, (_, i) => toDateKey(addDays(weekStart, i)));
}

export function buildSeedEvents(now = new Date()): Event[] {
  const weekStart = startOfWeek(now);
  const [mon, tue, wed, thu, fri] = weekdayKeys(weekStart);
  const sat = toDateKey(addDays(weekStart, 5));

  return [
    {
      id: "ev-ebbe-mon",
      personId: EBBE_ID,
      date: mon,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-ebbe-tue",
      personId: EBBE_ID,
      date: tue,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-ebbe-wed",
      personId: EBBE_ID,
      date: wed,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-ebbe-thu",
      personId: EBBE_ID,
      date: thu,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-ebbe-fri",
      personId: EBBE_ID,
      date: fri,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-ebbe-sport",
      personId: EBBE_ID,
      date: tue,
      title: "Fotboll",
      iconKey: "sport",
      startTime: "16:00",
      endTime: "17:00",
      allDay: false,
    },
    {
      id: "ev-lille-mon",
      personId: LILLE_ID,
      date: mon,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-tue",
      personId: LILLE_ID,
      date: tue,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-wed",
      personId: LILLE_ID,
      date: wed,
      title: "Hemma",
      iconKey: "home",
      allDay: true,
    },
    {
      id: "ev-lille-thu",
      personId: LILLE_ID,
      date: thu,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-fri",
      personId: LILLE_ID,
      date: fri,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-park",
      personId: LILLE_ID,
      date: sat,
      title: "Lekpark",
      iconKey: "outdoors",
      allDay: true,
    },
    {
      id: "ev-mamma-work",
      personId: "parent-mamma",
      date: mon,
      title: "Jobb",
      iconKey: "other",
      allDay: true,
    },
    {
      id: "ev-pappa-work",
      personId: "parent-pappa",
      date: mon,
      title: "Jobb",
      iconKey: "other",
      allDay: true,
    },
  ];
}

export function buildSeedTodos(): Todo[] {
  const now = new Date().toISOString();
  return [
    {
      id: "todo-1",
      title: "Handla mjölk",
      done: false,
      createdAt: now,
    },
    {
      id: "todo-2",
      title: "Packa gympapåse",
      done: false,
      createdAt: now,
    },
    {
      id: "todo-3",
      title: "Boka tandläkare",
      done: true,
      createdAt: now,
    },
  ];
}

export function screenTimeDayId(personId: string, date: string): string {
  return `${personId}:${date}`;
}
