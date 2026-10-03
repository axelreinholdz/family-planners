import { addDays, startOfWeek, toDateKey } from "./dates";
import type {
  DinnerPlan,
  Event,
  Person,
  RecurringTemplate,
  Routine,
  ScreenTimeSettings,
  Todo,
} from "./types";

export const EBBE_ID = "child-ebbe";
export const LILLE_ID = "child-lille";

export const TEMPLATE_EBBE_PRESCHOOL = "tpl-ebbe-preschool";
export const TEMPLATE_LILLE_PRESCHOOL = "tpl-lille-preschool";
export const TEMPLATE_EBBE_FOOTBALL = "tpl-ebbe-football";
export const ROUTINE_EBBE_MORNING = "routine-ebbe-morning";
export const ROUTINE_LILLE_MORNING = "routine-lille-morning";

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
  {
    personId: LILLE_ID,
    dailyMinutes: 30,
    enabled: true,
  },
];

export const SEED_ROUTINES: Routine[] = [
  {
    id: ROUTINE_EBBE_MORNING,
    personId: EBBE_ID,
    title: "Morgon",
    steps: [
      { id: "step-clothes", label: "Kläder", emoji: "👕", sortOrder: 0 },
      { id: "step-teeth", label: "Tänder", emoji: "🪥", sortOrder: 1 },
      { id: "step-pack", label: "Packa", emoji: "🎒", sortOrder: 2 },
      { id: "step-shoes", label: "Skor", emoji: "👟", sortOrder: 3 },
    ],
  },
  {
    id: ROUTINE_LILLE_MORNING,
    personId: LILLE_ID,
    title: "Morgon",
    steps: [
      { id: "step-lille-clothes", label: "Kläder", emoji: "👕", sortOrder: 0 },
      { id: "step-lille-teeth", label: "Tänder", emoji: "🪥", sortOrder: 1 },
      { id: "step-lille-breakfast", label: "Frukost", emoji: "🥣", sortOrder: 2 },
      { id: "step-lille-shoes", label: "Skor", emoji: "👟", sortOrder: 3 },
    ],
  },
];

export const SEED_TEMPLATES: RecurringTemplate[] = [
  {
    id: TEMPLATE_EBBE_PRESCHOOL,
    personId: EBBE_ID,
    title: "Förskola",
    iconKey: "preschool",
    weekdays: [0, 1, 2, 3, 4],
    allDay: true,
    enabled: true,
    startDate: "2026-01-01",
    endDate: "2026-06-12",
  },
  {
    id: TEMPLATE_LILLE_PRESCHOOL,
    personId: LILLE_ID,
    title: "Förskola",
    iconKey: "preschool",
    weekdays: [0, 1, 3, 4],
    allDay: true,
    enabled: true,
    startDate: "2026-01-01",
    endDate: "2026-06-12",
  },
  {
    id: TEMPLATE_EBBE_FOOTBALL,
    personId: EBBE_ID,
    title: "Fotboll",
    iconKey: "sport",
    weekdays: [1],
    startTime: "16:00",
    endTime: "17:00",
    allDay: false,
    enabled: true,
    startDate: "2026-01-01",
    endDate: "2026-06-12",
  },
];

export function buildSeedEvents(now = new Date()): Event[] {
  const weekStart = startOfWeek(now);
  const wed = toDateKey(addDays(weekStart, 2));
  const sat = toDateKey(addDays(weekStart, 5));
  const mon = toDateKey(weekStart);

  return [
    {
      id: "ev-lille-wed-home",
      personId: LILLE_ID,
      date: wed,
      title: "Hemma",
      iconKey: "home",
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

export function routineProgressId(routineId: string, date: string): string {
  return `${routineId}:${date}`;
}
