import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { todayKey } from "./dates";
import {
  buildSeedEvents,
  buildSeedTodos,
  EBBE_ID,
  screenTimeDayId,
  SEED_DINNERS,
  SEED_PEOPLE,
  SEED_SCREEN_TIME,
} from "./seed";
import type {
  DinnerPlan,
  Event,
  Person,
  ScreenTimeDay,
  ScreenTimeSettings,
  Todo,
} from "./types";

interface FamilyPlannerDB extends DBSchema {
  meta: {
    key: string;
    value: string | number | boolean;
  };
  people: {
    key: string;
    value: Person;
  };
  events: {
    key: string;
    value: Event;
    indexes: { "by-date": string; "by-person": string };
  };
  todos: {
    key: string;
    value: Todo;
  };
  dinners: {
    key: number;
    value: DinnerPlan;
  };
  screenTimeSettings: {
    key: string;
    value: ScreenTimeSettings;
  };
  screenTimeDays: {
    key: string;
    value: ScreenTimeDay;
  };
}

const DB_NAME = "family-planners";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FamilyPlannerDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<FamilyPlannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("meta");
          db.createObjectStore("people", { keyPath: "id" });
          const events = db.createObjectStore("events", { keyPath: "id" });
          events.createIndex("by-date", "date");
          events.createIndex("by-person", "personId");
          db.createObjectStore("todos", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("dinners")) {
            db.createObjectStore("dinners", { keyPath: "weekday" });
          }
          if (!db.objectStoreNames.contains("screenTimeSettings")) {
            db.createObjectStore("screenTimeSettings", { keyPath: "personId" });
          }
          if (!db.objectStoreNames.contains("screenTimeDays")) {
            db.createObjectStore("screenTimeDays", { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

async function migrateLegacyPeople(db: IDBPDatabase<FamilyPlannerDB>) {
  const legacy = await db.get("people", "child-store");
  if (!legacy) return;

  const ebbe: Person = {
    ...legacy,
    id: EBBE_ID,
    name: legacy.name === "Storebror" ? "Ebbe" : legacy.name,
  };
  const tx = db.transaction(["people", "events"], "readwrite");
  await tx.objectStore("people").put(ebbe);
  await tx.objectStore("people").delete("child-store");
  const events = await tx.objectStore("events").getAll();
  await Promise.all(
    events
      .filter((event) => event.personId === "child-store")
      .map((event) =>
        tx.objectStore("events").put({ ...event, personId: EBBE_ID }),
      ),
  );
  await tx.done;
}

async function ensureExtrasSeeded(db: IDBPDatabase<FamilyPlannerDB>) {
  const dinners = await db.getAll("dinners");
  if (dinners.length === 0) {
    const tx = db.transaction("dinners", "readwrite");
    await Promise.all([
      ...SEED_DINNERS.map((dinner) => tx.store.put(dinner)),
      tx.done,
    ]);
  }

  const settings = await db.getAll("screenTimeSettings");
  if (settings.length === 0) {
    const tx = db.transaction("screenTimeSettings", "readwrite");
    await Promise.all([
      ...SEED_SCREEN_TIME.map((row) => tx.store.put(row)),
      tx.done,
    ]);
  }

  const ebbe = await db.get("people", EBBE_ID);
  if (ebbe && ebbe.name === "Storebror") {
    await db.put("people", { ...ebbe, name: "Ebbe" });
  }
}

async function ensureSeeded() {
  const db = await getDb();
  const seeded = await db.get("meta", "seeded");
  if (!seeded) {
    const tx = db.transaction(
      [
        "meta",
        "people",
        "events",
        "todos",
        "dinners",
        "screenTimeSettings",
        "screenTimeDays",
      ],
      "readwrite",
    );
    await Promise.all([
      ...SEED_PEOPLE.map((person) => tx.objectStore("people").put(person)),
      ...buildSeedEvents().map((event) => tx.objectStore("events").put(event)),
      ...buildSeedTodos().map((todo) => tx.objectStore("todos").put(todo)),
      ...SEED_DINNERS.map((dinner) => tx.objectStore("dinners").put(dinner)),
      ...SEED_SCREEN_TIME.map((row) =>
        tx.objectStore("screenTimeSettings").put(row),
      ),
      tx.objectStore("meta").put(true, "seeded"),
      tx.done,
    ]);
    return;
  }

  await migrateLegacyPeople(db);
  await ensureExtrasSeeded(db);
}

export async function loadAll(): Promise<{
  people: Person[];
  events: Event[];
  todos: Todo[];
  dinners: DinnerPlan[];
  screenTimeSettings: ScreenTimeSettings[];
  screenTimeDays: ScreenTimeDay[];
}> {
  await ensureSeeded();
  const db = await getDb();
  const [people, events, todos, dinners, screenTimeSettings, screenTimeDays] =
    await Promise.all([
      db.getAll("people"),
      db.getAll("events"),
      db.getAll("todos"),
      db.getAll("dinners"),
      db.getAll("screenTimeSettings"),
      db.getAll("screenTimeDays"),
    ]);
  people.sort((a, b) => a.sortOrder - b.sortOrder);
  todos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  dinners.sort((a, b) => a.weekday - b.weekday);
  return {
    people,
    events,
    todos,
    dinners,
    screenTimeSettings,
    screenTimeDays,
  };
}

export async function putPerson(person: Person) {
  const db = await getDb();
  await db.put("people", person);
}

export async function putEvent(event: Event) {
  const db = await getDb();
  await db.put("events", event);
}

export async function deleteEvent(id: string) {
  const db = await getDb();
  await db.delete("events", id);
}

export async function putTodo(todo: Todo) {
  const db = await getDb();
  await db.put("todos", todo);
}

export async function deleteTodo(id: string) {
  const db = await getDb();
  await db.delete("todos", id);
}

export async function putDinner(dinner: DinnerPlan) {
  const db = await getDb();
  await db.put("dinners", dinner);
}

export async function saveDinnerMenu(dinners: DinnerPlan[]) {
  const db = await getDb();
  const tx = db.transaction("dinners", "readwrite");
  await Promise.all([
    ...dinners.map((dinner) => tx.store.put(dinner)),
    tx.done,
  ]);
}

export async function putScreenTimeSettings(settings: ScreenTimeSettings) {
  const db = await getDb();
  await db.put("screenTimeSettings", settings);
}

export async function putScreenTimeDay(day: ScreenTimeDay) {
  const db = await getDb();
  await db.put("screenTimeDays", day);
}

export async function ensureScreenTimeDay(
  personId: string,
  date = todayKey(),
): Promise<ScreenTimeDay> {
  const db = await getDb();
  const id = screenTimeDayId(personId, date);
  const existing = await db.get("screenTimeDays", id);
  if (existing) return existing;

  const settings = await db.get("screenTimeSettings", personId);
  const day: ScreenTimeDay = {
    id,
    personId,
    date,
    allowanceMinutes: settings?.dailyMinutes ?? 45,
    usedSeconds: 0,
  };
  await db.put("screenTimeDays", day);
  return day;
}

export async function resetToSeed() {
  const db = await getDb();
  const tx = db.transaction(
    [
      "meta",
      "people",
      "events",
      "todos",
      "dinners",
      "screenTimeSettings",
      "screenTimeDays",
    ],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("people").clear(),
    tx.objectStore("events").clear(),
    tx.objectStore("todos").clear(),
    tx.objectStore("dinners").clear(),
    tx.objectStore("screenTimeSettings").clear(),
    tx.objectStore("screenTimeDays").clear(),
    ...SEED_PEOPLE.map((person) => tx.objectStore("people").put(person)),
    ...buildSeedEvents().map((event) => tx.objectStore("events").put(event)),
    ...buildSeedTodos().map((todo) => tx.objectStore("todos").put(todo)),
    ...SEED_DINNERS.map((dinner) => tx.objectStore("dinners").put(dinner)),
    ...SEED_SCREEN_TIME.map((row) =>
      tx.objectStore("screenTimeSettings").put(row),
    ),
    tx.objectStore("meta").put(true, "seeded"),
    tx.done,
  ]);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
