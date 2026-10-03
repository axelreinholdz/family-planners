import { addDays, startOfWeek, toDateKey } from "./dates";
import type { Event, Person, Todo } from "./types";

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
    id: "child-store",
    name: "Storebror",
    role: "child",
    color: "#2A9D8F",
    avatar: "👦",
    sortOrder: 2,
  },
  {
    id: "child-lille",
    name: "Lillebror",
    role: "child",
    color: "#E9C46A",
    avatar: "🧒",
    sortOrder: 3,
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
      id: "ev-store-mon",
      personId: "child-store",
      date: mon,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-store-tue",
      personId: "child-store",
      date: tue,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-store-wed",
      personId: "child-store",
      date: wed,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-store-thu",
      personId: "child-store",
      date: thu,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-store-fri",
      personId: "child-store",
      date: fri,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-store-sport",
      personId: "child-store",
      date: tue,
      title: "Fotboll",
      iconKey: "sport",
      startTime: "16:00",
      endTime: "17:00",
      allDay: false,
    },
    {
      id: "ev-lille-mon",
      personId: "child-lille",
      date: mon,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-tue",
      personId: "child-lille",
      date: tue,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-wed",
      personId: "child-lille",
      date: wed,
      title: "Hemma",
      iconKey: "home",
      allDay: true,
    },
    {
      id: "ev-lille-thu",
      personId: "child-lille",
      date: thu,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-fri",
      personId: "child-lille",
      date: fri,
      title: "Förskola",
      iconKey: "preschool",
      allDay: true,
    },
    {
      id: "ev-lille-park",
      personId: "child-lille",
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
