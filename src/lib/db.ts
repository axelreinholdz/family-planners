import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  buildSeedEvents,
  buildSeedTodos,
  SEED_PEOPLE,
} from "./seed";
import type { Event, Person, Todo } from "./types";

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
}

const DB_NAME = "family-planners";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FamilyPlannerDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<FamilyPlannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("meta");
        db.createObjectStore("people", { keyPath: "id" });
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("by-date", "date");
        events.createIndex("by-person", "personId");
        db.createObjectStore("todos", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

async function ensureSeeded() {
  const db = await getDb();
  const seeded = await db.get("meta", "seeded");
  if (seeded) return;

  const tx = db.transaction(["meta", "people", "events", "todos"], "readwrite");
  await Promise.all([
    ...SEED_PEOPLE.map((person) => tx.objectStore("people").put(person)),
    ...buildSeedEvents().map((event) => tx.objectStore("events").put(event)),
    ...buildSeedTodos().map((todo) => tx.objectStore("todos").put(todo)),
    tx.objectStore("meta").put(true, "seeded"),
    tx.done,
  ]);
}

export async function loadAll(): Promise<{
  people: Person[];
  events: Event[];
  todos: Todo[];
}> {
  await ensureSeeded();
  const db = await getDb();
  const [people, events, todos] = await Promise.all([
    db.getAll("people"),
    db.getAll("events"),
    db.getAll("todos"),
  ]);
  people.sort((a, b) => a.sortOrder - b.sortOrder);
  todos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { people, events, todos };
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

export async function resetToSeed() {
  const db = await getDb();
  const tx = db.transaction(["meta", "people", "events", "todos"], "readwrite");
  await Promise.all([
    tx.objectStore("people").clear(),
    tx.objectStore("events").clear(),
    tx.objectStore("todos").clear(),
    ...SEED_PEOPLE.map((person) => tx.objectStore("people").put(person)),
    ...buildSeedEvents().map((event) => tx.objectStore("events").put(event)),
    ...buildSeedTodos().map((todo) => tx.objectStore("todos").put(todo)),
    tx.objectStore("meta").put(true, "seeded"),
    tx.done,
  ]);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
