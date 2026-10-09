import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { todayKey } from "./dates";
import {
  applySpanForTemplate,
  eventsFromTemplates,
  eventsFromTemplatesForWeeks,
  reconcileTemplateEvents,
  weekAnchorsBetween,
} from "./recurring";
import { normalizeIdagLayouts, setIdagLayoutForPerson } from "./idagLayout";
import { compareRoutines, normalizeRoutine } from "./routines";
import {
  buildSeedEvents,
  buildSeedTodos,
  EBBE_ID,
  routineProgressId,
  screenTimeDayId,
  SEED_DINNERS,
  SEED_PEOPLE,
  SEED_ROUTINES,
  SEED_SCREEN_TIME,
  SEED_TEMPLATES,
} from "./seed";
import type {
  CalendarSubscription,
  DinnerPlan,
  Event,
  IdagWidgetPlacement,
  Person,
  RecurringTemplate,
  Routine,
  RoutineDayProgress,
  SchoolLunchDay,
  SchoolLunchFeed,
  ScreenTimeDay,
  ScreenTimeSettings,
  Todo,
} from "./types";

const IDAG_LAYOUT_META_KEY = "idagLayout";
const IDAG_LAYOUT_LOCKED_META_KEY = "idagLayoutLocked";

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
  routines: {
    key: string;
    value: Routine;
  };
  routineProgress: {
    key: string;
    value: RoutineDayProgress;
  };
  recurringTemplates: {
    key: string;
    value: RecurringTemplate;
  };
  calendarSubscriptions: {
    key: string;
    value: CalendarSubscription;
  };
  schoolLunchFeeds: {
    key: string;
    value: SchoolLunchFeed;
  };
  schoolLunchDays: {
    key: string;
    value: SchoolLunchDay;
  };
}

const DB_NAME = "family-planners";
const DB_VERSION = 5;

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
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("routines")) {
            db.createObjectStore("routines", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("routineProgress")) {
            db.createObjectStore("routineProgress", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("recurringTemplates")) {
            db.createObjectStore("recurringTemplates", { keyPath: "id" });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("calendarSubscriptions")) {
            db.createObjectStore("calendarSubscriptions", { keyPath: "id" });
          }
        }
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("schoolLunchFeeds")) {
            db.createObjectStore("schoolLunchFeeds", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("schoolLunchDays")) {
            db.createObjectStore("schoolLunchDays", { keyPath: "id" });
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
  const settingsIds = new Set(settings.map((row) => row.personId));
  const missingSettings = SEED_SCREEN_TIME.filter(
    (row) => !settingsIds.has(row.personId),
  );
  if (missingSettings.length > 0) {
    const tx = db.transaction("screenTimeSettings", "readwrite");
    await Promise.all([
      ...missingSettings.map((row) => tx.store.put(row)),
      tx.done,
    ]);
  }

  const routines = await db.getAll("routines");
  const routineIds = new Set(routines.map((row) => row.id));
  const missingRoutines = SEED_ROUTINES.filter(
    (row) => !routineIds.has(row.id),
  );
  if (missingRoutines.length > 0) {
    const tx = db.transaction("routines", "readwrite");
    await Promise.all([
      ...missingRoutines.map((row) => tx.store.put(row)),
      tx.done,
    ]);
  }

  const templates = await db.getAll("recurringTemplates");
  if (templates.length === 0) {
    const tx = db.transaction("recurringTemplates", "readwrite");
    await Promise.all([
      ...SEED_TEMPLATES.map((row) => tx.store.put(row)),
      tx.done,
    ]);
  }

  const ebbe = await db.get("people", EBBE_ID);
  if (ebbe && ebbe.name === "Storebror") {
    await db.put("people", { ...ebbe, name: "Ebbe" });
  }
}

async function persistCreatedEvents(created: Event[]) {
  if (created.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("events", "readwrite");
  await Promise.all([
    ...created.map((event) => tx.store.put(event)),
    tx.done,
  ]);
}

export async function applyTemplatesForWeek(weekAnchor = new Date()) {
  const db = await getDb();
  const [templates, events] = await Promise.all([
    db.getAll("recurringTemplates"),
    db.getAll("events"),
  ]);
  const created = eventsFromTemplates(
    templates,
    events,
    weekAnchor,
    newId,
  );
  await persistCreatedEvents(created);
}

/** Materialize template events across every week in an inclusive date span. */
export async function applyTemplatesBetween(fromKey: string, toKey: string) {
  const anchors = weekAnchorsBetween(fromKey, toKey);
  if (anchors.length === 0) return;
  const db = await getDb();
  const [templates, events] = await Promise.all([
    db.getAll("recurringTemplates"),
    db.getAll("events"),
  ]);
  const created = eventsFromTemplatesForWeeks(
    templates,
    events,
    anchors,
    newId,
  );
  await persistCreatedEvents(created);
}

/** Sync linked events from a template, then materialize missing dates in span. */
export async function applyTemplateSpan(template: RecurringTemplate) {
  const db = await getDb();
  const events = await db.getAll("events");
  const { updated, deleteIds } = reconcileTemplateEvents(template, events);

  if (updated.length > 0 || deleteIds.length > 0) {
    const tx = db.transaction("events", "readwrite");
    await Promise.all([
      ...updated.map((event) => tx.store.put(event)),
      ...deleteIds.map((id) => tx.store.delete(id)),
      tx.done,
    ]);
  }

  const remaining = events
    .filter((event) => !deleteIds.includes(event.id))
    .map((event) => updated.find((row) => row.id === event.id) ?? event);

  const { fromKey, toKey } = applySpanForTemplate(template);
  const anchors = weekAnchorsBetween(fromKey, toKey);
  if (anchors.length === 0 || !template.enabled) return;

  const created = eventsFromTemplatesForWeeks(
    [template],
    remaining,
    anchors,
    newId,
  );
  await persistCreatedEvents(created);
}

/** Materialize all enabled templates across their apply spans (incl. upcoming). */
export async function applyAllTemplateSpans() {
  const db = await getDb();
  const [templates, events] = await Promise.all([
    db.getAll("recurringTemplates"),
    db.getAll("events"),
  ]);
  const enabled = templates.filter((template) => template.enabled);
  if (enabled.length === 0) return;

  let fromKey = applySpanForTemplate(enabled[0]).fromKey;
  let toKey = applySpanForTemplate(enabled[0]).toKey;
  for (const template of enabled) {
    const span = applySpanForTemplate(template);
    if (span.fromKey < fromKey) fromKey = span.fromKey;
    if (span.toKey > toKey) toKey = span.toKey;
  }

  const anchors = weekAnchorsBetween(fromKey, toKey);
  if (anchors.length === 0) return;
  const created = eventsFromTemplatesForWeeks(
    enabled,
    events,
    anchors,
    newId,
  );
  await persistCreatedEvents(created);
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
        "routines",
        "routineProgress",
        "recurringTemplates",
        "calendarSubscriptions",
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
      ...SEED_ROUTINES.map((row) => tx.objectStore("routines").put(row)),
      ...SEED_TEMPLATES.map((row) =>
        tx.objectStore("recurringTemplates").put(row),
      ),
      tx.objectStore("meta").put(true, "seeded"),
      tx.done,
    ]);
    await applyAllTemplateSpans();
    return;
  }

  await migrateLegacyPeople(db);
  await ensureExtrasSeeded(db);
  await applyAllTemplateSpans();
}

async function readIdagLayouts(
  db: IDBPDatabase<FamilyPlannerDB>,
): Promise<Record<string, IdagWidgetPlacement[]>> {
  const raw = await db.get("meta", IDAG_LAYOUT_META_KEY);
  if (typeof raw !== "string" || !raw) return {};
  try {
    return normalizeIdagLayouts(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

async function readIdagLayoutLocked(
  db: IDBPDatabase<FamilyPlannerDB>,
): Promise<boolean> {
  const raw = await db.get("meta", IDAG_LAYOUT_LOCKED_META_KEY);
  return raw === true || raw === "true" || raw === 1;
}

export async function loadAll(): Promise<{
  people: Person[];
  events: Event[];
  todos: Todo[];
  dinners: DinnerPlan[];
  screenTimeSettings: ScreenTimeSettings[];
  screenTimeDays: ScreenTimeDay[];
  routines: Routine[];
  routineProgress: RoutineDayProgress[];
  recurringTemplates: RecurringTemplate[];
  calendarSubscriptions: CalendarSubscription[];
  schoolLunchFeeds: SchoolLunchFeed[];
  schoolLunchDays: SchoolLunchDay[];
  idagLayouts: Record<string, IdagWidgetPlacement[]>;
  idagLayoutLocked: boolean;
}> {
  await ensureSeeded();
  const db = await getDb();
  const [
    people,
    events,
    todos,
    dinners,
    screenTimeSettings,
    screenTimeDays,
    routines,
    routineProgress,
    recurringTemplates,
    calendarSubscriptions,
    schoolLunchFeeds,
    schoolLunchDays,
    idagLayouts,
    idagLayoutLocked,
  ] = await Promise.all([
    db.getAll("people"),
    db.getAll("events"),
    db.getAll("todos"),
    db.getAll("dinners"),
    db.getAll("screenTimeSettings"),
    db.getAll("screenTimeDays"),
    db.getAll("routines"),
    db.getAll("routineProgress"),
    db.getAll("recurringTemplates"),
    db.getAll("calendarSubscriptions"),
    db.getAll("schoolLunchFeeds"),
    db.getAll("schoolLunchDays"),
    readIdagLayouts(db),
    readIdagLayoutLocked(db),
  ]);
  people.sort((a, b) => a.sortOrder - b.sortOrder);
  todos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  dinners.sort((a, b) => a.weekday - b.weekday);
  routines.sort(compareRoutines);
  recurringTemplates.sort((a, b) => a.title.localeCompare(b.title, "sv"));
  calendarSubscriptions.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  schoolLunchFeeds.sort((a, b) =>
    a.schoolSlug.localeCompare(b.schoolSlug, "sv"),
  );
  schoolLunchDays.sort((a, b) => a.date.localeCompare(b.date));
  return {
    people,
    events,
    todos,
    dinners,
    screenTimeSettings,
    screenTimeDays,
    routines: routines.map(normalizeRoutine),
    routineProgress,
    recurringTemplates,
    calendarSubscriptions,
    schoolLunchFeeds,
    schoolLunchDays,
    idagLayouts,
    idagLayoutLocked,
  };
}

export async function putPerson(person: Person) {
  const db = await getDb();
  await db.put("people", person);
}

export async function deletePerson(id: string) {
  const db = await getDb();
  const [
    events,
    routines,
    progress,
    templates,
    subscriptions,
    lunchFeeds,
    lunchDays,
    screenSettings,
    screenDays,
  ] = await Promise.all([
    db.getAll("events"),
    db.getAll("routines"),
    db.getAll("routineProgress"),
    db.getAll("recurringTemplates"),
    db.getAll("calendarSubscriptions"),
    db.getAll("schoolLunchFeeds"),
    db.getAll("schoolLunchDays"),
    db.getAll("screenTimeSettings"),
    db.getAll("screenTimeDays"),
  ]);

  const routineIds = new Set(
    routines.filter((row) => row.personId === id).map((row) => row.id),
  );

  const tx = db.transaction(
    [
      "people",
      "events",
      "routines",
      "routineProgress",
      "recurringTemplates",
      "calendarSubscriptions",
      "schoolLunchFeeds",
      "schoolLunchDays",
      "screenTimeSettings",
      "screenTimeDays",
    ],
    "readwrite",
  );

  await tx.objectStore("people").delete(id);
  await Promise.all([
    ...events
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("events").delete(row.id)),
    ...routines
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("routines").delete(row.id)),
    ...progress
      .filter((row) => routineIds.has(row.routineId))
      .map((row) => tx.objectStore("routineProgress").delete(row.id)),
    ...templates
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("recurringTemplates").delete(row.id)),
    ...subscriptions
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("calendarSubscriptions").delete(row.id)),
    ...lunchFeeds
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("schoolLunchFeeds").delete(row.id)),
    ...lunchDays
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("schoolLunchDays").delete(row.id)),
    ...screenSettings
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("screenTimeSettings").delete(row.personId)),
    ...screenDays
      .filter((row) => row.personId === id)
      .map((row) => tx.objectStore("screenTimeDays").delete(row.id)),
    tx.done,
  ]);
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

export async function putRoutine(routine: Routine) {
  const db = await getDb();
  await db.put("routines", routine);
}

export async function deleteRoutine(id: string) {
  const db = await getDb();
  const progress = await db.getAll("routineProgress");
  const tx = db.transaction(["routines", "routineProgress"], "readwrite");
  await tx.objectStore("routines").delete(id);
  await Promise.all([
    ...progress
      .filter((row) => row.routineId === id)
      .map((row) => tx.objectStore("routineProgress").delete(row.id)),
    tx.done,
  ]);
}

export async function putRoutineProgress(progress: RoutineDayProgress) {
  const db = await getDb();
  await db.put("routineProgress", progress);
}

export async function ensureRoutineProgress(
  routineId: string,
  date = todayKey(),
): Promise<RoutineDayProgress> {
  const db = await getDb();
  const id = routineProgressId(routineId, date);
  const existing = await db.get("routineProgress", id);
  if (existing) return existing;
  const progress: RoutineDayProgress = {
    id,
    routineId,
    date,
    completedStepIds: [],
  };
  await db.put("routineProgress", progress);
  return progress;
}

export async function putRecurringTemplate(template: RecurringTemplate) {
  const db = await getDb();
  await db.put("recurringTemplates", template);
}

export async function deleteRecurringTemplate(id: string) {
  const db = await getDb();
  await db.delete("recurringTemplates", id);
}

export async function putCalendarSubscription(
  subscription: CalendarSubscription,
) {
  const db = await getDb();
  await db.put("calendarSubscriptions", subscription);
}

export async function putIdagLayout(
  personId: string,
  layout: IdagWidgetPlacement[],
) {
  const db = await getDb();
  const current = await readIdagLayouts(db);
  const next = setIdagLayoutForPerson(current, personId, layout);
  await db.put("meta", JSON.stringify(next), IDAG_LAYOUT_META_KEY);
}

export async function putIdagLayoutLocked(locked: boolean) {
  const db = await getDb();
  await db.put("meta", locked, IDAG_LAYOUT_LOCKED_META_KEY);
}

export async function deleteCalendarSubscription(id: string) {
  const db = await getDb();
  const events = await db.getAll("events");
  const tx = db.transaction(
    ["calendarSubscriptions", "events"],
    "readwrite",
  );
  await tx.objectStore("calendarSubscriptions").delete(id);
  await Promise.all([
    ...events
      .filter((row) => row.calendarSubscriptionId === id)
      .map((row) => tx.objectStore("events").delete(row.id)),
    tx.done,
  ]);
}

export async function applyCalendarSubscriptionEvents(
  subscription: CalendarSubscription,
  nextEvents: Event[],
  deleteIds: string[],
) {
  const db = await getDb();
  const tx = db.transaction(
    ["calendarSubscriptions", "events"],
    "readwrite",
  );
  await tx.objectStore("calendarSubscriptions").put(subscription);
  await Promise.all([
    ...deleteIds.map((id) => tx.objectStore("events").delete(id)),
    ...nextEvents.map((event) => tx.objectStore("events").put(event)),
    tx.done,
  ]);
}

export async function putSchoolLunchFeed(feed: SchoolLunchFeed) {
  const db = await getDb();
  await db.put("schoolLunchFeeds", feed);
}

export async function deleteSchoolLunchFeed(id: string) {
  const db = await getDb();
  const days = await db.getAll("schoolLunchDays");
  const feed = await db.get("schoolLunchFeeds", id);
  const personId = feed?.personId;
  const tx = db.transaction(
    ["schoolLunchFeeds", "schoolLunchDays"],
    "readwrite",
  );
  await tx.objectStore("schoolLunchFeeds").delete(id);
  await Promise.all([
    ...(personId
      ? days
          .filter((row) => row.personId === personId)
          .map((row) => tx.objectStore("schoolLunchDays").delete(row.id))
      : []),
    tx.done,
  ]);
}

/** Upsert feed meta and replace that person's cached lunch days. */
export async function applySchoolLunchSync(
  feed: SchoolLunchFeed,
  days: SchoolLunchDay[],
) {
  const db = await getDb();
  const existing = await db.getAll("schoolLunchDays");
  const tx = db.transaction(
    ["schoolLunchFeeds", "schoolLunchDays"],
    "readwrite",
  );
  await tx.objectStore("schoolLunchFeeds").put(feed);
  await Promise.all([
    ...existing
      .filter((row) => row.personId === feed.personId)
      .map((row) => tx.objectStore("schoolLunchDays").delete(row.id)),
    ...days.map((day) => tx.objectStore("schoolLunchDays").put(day)),
    tx.done,
  ]);
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
      "routines",
      "routineProgress",
      "recurringTemplates",
      "calendarSubscriptions",
      "schoolLunchFeeds",
      "schoolLunchDays",
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
    tx.objectStore("routines").clear(),
    tx.objectStore("routineProgress").clear(),
    tx.objectStore("recurringTemplates").clear(),
    tx.objectStore("calendarSubscriptions").clear(),
    tx.objectStore("schoolLunchFeeds").clear(),
    tx.objectStore("schoolLunchDays").clear(),
    ...SEED_PEOPLE.map((person) => tx.objectStore("people").put(person)),
    ...buildSeedEvents().map((event) => tx.objectStore("events").put(event)),
    ...buildSeedTodos().map((todo) => tx.objectStore("todos").put(todo)),
    ...SEED_DINNERS.map((dinner) => tx.objectStore("dinners").put(dinner)),
    ...SEED_SCREEN_TIME.map((row) =>
      tx.objectStore("screenTimeSettings").put(row),
    ),
    ...SEED_ROUTINES.map((row) => tx.objectStore("routines").put(row)),
    ...SEED_TEMPLATES.map((row) =>
      tx.objectStore("recurringTemplates").put(row),
    ),
    tx.objectStore("meta").put(true, "seeded"),
    tx.objectStore("meta").put(JSON.stringify({}), IDAG_LAYOUT_META_KEY),
    tx.objectStore("meta").put(false, IDAG_LAYOUT_LOCKED_META_KEY),
    tx.done,
  ]);
  await applyAllTemplateSpans();
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
