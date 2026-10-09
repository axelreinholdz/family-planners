"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCalendarInstances,
  reconcileCalendarEvents,
  shouldSyncSubscription,
} from "@/lib/calendarSync";
import {
  applyAllTemplateSpans,
  applyCalendarSubscriptionEvents,
  applySchoolLunchSync,
  applyTemplatesForWeek,
  applyTemplateSpan,
  deleteCalendarSubscription as dbDeleteCalendarSubscription,
  deleteEvent as dbDeleteEvent,
  deletePerson as dbDeletePerson,
  deleteRecurringTemplate as dbDeleteRecurringTemplate,
  deleteRoutine as dbDeleteRoutine,
  deleteSchoolLunchFeed as dbDeleteSchoolLunchFeed,
  deleteTodo as dbDeleteTodo,
  ensureScreenTimeDay,
  loadAll,
  newId,
  putCalendarSubscription,
  putEvent,
  putIdagLayout,
  putIdagLayoutLocked,
  putPerson,
  putRecurringTemplate,
  putRoutine,
  putRoutineProgress,
  putSchoolLunchFeed,
  putScreenTimeDay,
  putScreenTimeSettings,
  putTodo,
  resetToSeed,
  saveDinnerMenu,
} from "@/lib/repository";
import { todayKey } from "@/lib/dates";
import { schoolLunchDayId } from "@/lib/schoolLunchRss";
import {
  fetchSchoolLunchWeek,
  shouldSyncSchoolLunch,
} from "@/lib/schoolLunchSync";
import {
  getIdagLayoutForPerson,
  normalizeIdagLayout,
  normalizeIdagLayouts,
  setIdagLayoutForPerson,
} from "@/lib/idagLayout";
import {
  EBBE_ID,
  routineProgressId,
  screenTimeDayId,
  SEED_DINNERS,
} from "@/lib/seed";
import { foldActiveSession, liveElapsedSeconds } from "@/lib/screenTime";
import type {
  CalendarSubscription,
  DinnerPlan,
  Event,
  IconKey,
  IdagWidgetPlacement,
  Person,
  PersonRole,
  RecurringTemplate,
  Routine,
  RoutineDayProgress,
  SchoolLunchDay,
  SchoolLunchFeed,
  ScreenTimeDay,
  ScreenTimeSettings,
  Todo,
} from "@/lib/types";

interface FamilyStoreValue {
  ready: boolean;
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
  getIdagLayout: (personId: string) => IdagWidgetPlacement[];
  refresh: () => Promise<void>;
  savePerson: (person: Person) => Promise<void>;
  createPerson: (input: {
    name: string;
    role: PersonRole;
    color: string;
    avatar: string;
  }) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  saveEvent: (event: Event) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  createEvent: (input: {
    personId: string;
    date: string;
    title: string;
    iconKey: IconKey;
    emoji?: string;
    startTime?: string;
    endTime?: string;
    allDay: boolean;
  }) => Promise<void>;
  saveTodo: (todo: Todo) => Promise<void>;
  createTodo: (title: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  saveDinners: (dinners: DinnerPlan[]) => Promise<void>;
  resetDinnerMenu: () => Promise<void>;
  getScreenTimeSettings: (personId: string) => ScreenTimeSettings | undefined;
  getScreenTimeDay: (personId: string, date?: string) => ScreenTimeDay | undefined;
  ensureTodayScreenTime: (personId: string) => Promise<ScreenTimeDay>;
  saveScreenTimeSettings: (settings: ScreenTimeSettings) => Promise<void>;
  startScreenTime: (personId: string) => Promise<void>;
  stopScreenTime: (personId: string) => Promise<void>;
  addScreenTimeBonus: (personId: string, minutes: number) => Promise<void>;
  /** Change remaining time today without changing daily allowance. Positive = more left. */
  adjustScreenTimeUsed: (
    personId: string,
    deltaMinutes: number,
  ) => Promise<void>;
  resetScreenTimeToday: (personId: string) => Promise<void>;
  toggleRoutineStep: (routineId: string, stepId: string) => Promise<void>;
  saveRoutine: (routine: Routine) => Promise<void>;
  createRoutine: (input: Omit<Routine, "id">) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;
  saveRecurringTemplate: (template: RecurringTemplate) => Promise<void>;
  createRecurringTemplate: (
    input: Omit<RecurringTemplate, "id">,
  ) => Promise<void>;
  removeRecurringTemplate: (id: string) => Promise<void>;
  fillWeekFromTemplates: (weekAnchor?: Date) => Promise<void>;
  fillAllRecurringTemplates: () => Promise<void>;
  saveCalendarSubscription: (
    subscription: CalendarSubscription,
  ) => Promise<void>;
  createCalendarSubscription: (
    input: Omit<
      CalendarSubscription,
      "id" | "lastSyncedAt" | "lastError"
    >,
  ) => Promise<void>;
  removeCalendarSubscription: (id: string) => Promise<void>;
  syncCalendarSubscription: (
    id: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  syncAllCalendarSubscriptions: (options?: {
    force?: boolean;
  }) => Promise<void>;
  getSchoolLunchFeed: (personId: string) => SchoolLunchFeed | undefined;
  getSchoolLunchDay: (
    personId: string,
    date?: string,
  ) => SchoolLunchDay | undefined;
  saveSchoolLunchFeed: (feed: SchoolLunchFeed) => Promise<void>;
  upsertSchoolLunchFeed: (input: {
    personId: string;
    schoolSlug: string;
    enabled?: boolean;
  }) => Promise<SchoolLunchFeed>;
  removeSchoolLunchFeed: (id: string) => Promise<void>;
  syncSchoolLunch: (
    personId: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  saveIdagLayout: (
    personId: string,
    layout: IdagWidgetPlacement[],
  ) => Promise<void>;
  saveIdagLayoutLocked: (locked: boolean) => Promise<void>;
  resetData: () => Promise<void>;
}

const FamilyStoreContext = createContext<FamilyStoreValue | null>(null);

export function FamilyStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dinners, setDinners] = useState<DinnerPlan[]>([]);
  const [screenTimeSettings, setScreenTimeSettings] = useState<
    ScreenTimeSettings[]
  >([]);
  const [screenTimeDays, setScreenTimeDays] = useState<ScreenTimeDay[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineProgress, setRoutineProgress] = useState<RoutineDayProgress[]>(
    [],
  );
  const [recurringTemplates, setRecurringTemplates] = useState<
    RecurringTemplate[]
  >([]);
  const [calendarSubscriptions, setCalendarSubscriptions] = useState<
    CalendarSubscription[]
  >([]);
  const [schoolLunchFeeds, setSchoolLunchFeeds] = useState<SchoolLunchFeed[]>(
    [],
  );
  const [schoolLunchDays, setSchoolLunchDays] = useState<SchoolLunchDay[]>([]);
  const [idagLayouts, setIdagLayouts] = useState<
    Record<string, IdagWidgetPlacement[]>
  >({});
  const [idagLayoutLocked, setIdagLayoutLocked] = useState(false);

  const applyData = useCallback(
    (data: Awaited<ReturnType<typeof loadAll>>) => {
      setPeople(data.people);
      setEvents(data.events);
      setTodos(data.todos);
      setDinners(data.dinners);
      setScreenTimeSettings(data.screenTimeSettings);
      setScreenTimeDays(data.screenTimeDays);
      setRoutines(data.routines);
      setRoutineProgress(data.routineProgress);
      setRecurringTemplates(data.recurringTemplates);
      setCalendarSubscriptions(data.calendarSubscriptions ?? []);
      setSchoolLunchFeeds(data.schoolLunchFeeds ?? []);
      setSchoolLunchDays(data.schoolLunchDays ?? []);
      setIdagLayouts(normalizeIdagLayouts(data.idagLayouts));
      setIdagLayoutLocked(Boolean(data.idagLayoutLocked));
      setReady(true);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const data = await loadAll();
    applyData(data);
  }, [applyData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadAll();
      if (cancelled) return;
      applyData(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyData]);

  const savePerson = useCallback(
    async (person: Person) => {
      await putPerson(person);
      await refresh();
    },
    [refresh],
  );

  const createPerson = useCallback(
    async (input: {
      name: string;
      role: PersonRole;
      color: string;
      avatar: string;
    }) => {
      const name = input.name.trim();
      if (!name) return;
      const maxOrder = people.reduce(
        (max, person) => Math.max(max, person.sortOrder),
        -1,
      );
      await putPerson({
        id: newId(input.role === "child" ? "child" : "parent"),
        name,
        role: input.role,
        color: input.color,
        avatar: input.avatar,
        sortOrder: maxOrder + 1,
      });
      await refresh();
    },
    [people, refresh],
  );

  const removePerson = useCallback(
    async (id: string) => {
      await dbDeletePerson(id);
      await refresh();
    },
    [refresh],
  );

  const saveEvent = useCallback(
    async (event: Event) => {
      await putEvent(event);
      await refresh();
    },
    [refresh],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      await dbDeleteEvent(id);
      await refresh();
    },
    [refresh],
  );

  const createEvent = useCallback(
    async (input: {
      personId: string;
      date: string;
      title: string;
      iconKey: IconKey;
      emoji?: string;
      startTime?: string;
      endTime?: string;
      allDay: boolean;
    }) => {
      await putEvent({ id: newId("ev"), ...input });
      await refresh();
    },
    [refresh],
  );

  const saveTodo = useCallback(
    async (todo: Todo) => {
      await putTodo(todo);
      await refresh();
    },
    [refresh],
  );

  const createTodo = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await putTodo({
        id: newId("todo"),
        title: trimmed,
        done: false,
        createdAt: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await putTodo({ ...todo, done: !todo.done });
      await refresh();
    },
    [refresh, todos],
  );

  const removeTodo = useCallback(
    async (id: string) => {
      await dbDeleteTodo(id);
      await refresh();
    },
    [refresh],
  );

  const saveDinners = useCallback(
    async (next: DinnerPlan[]) => {
      await saveDinnerMenu(next);
      await refresh();
    },
    [refresh],
  );

  const resetDinnerMenu = useCallback(async () => {
    await saveDinnerMenu(SEED_DINNERS);
    await refresh();
  }, [refresh]);

  const getScreenTimeSettings = useCallback(
    (personId: string) =>
      screenTimeSettings.find((row) => row.personId === personId),
    [screenTimeSettings],
  );

  const getScreenTimeDay = useCallback(
    (personId: string, date = todayKey()) =>
      screenTimeDays.find(
        (row) => row.personId === personId && row.date === date,
      ),
    [screenTimeDays],
  );

  const ensureTodayScreenTime = useCallback(async (personId: string) => {
    const day = await ensureScreenTimeDay(personId, todayKey());
    setScreenTimeDays((prev) => {
      const others = prev.filter((row) => row.id !== day.id);
      return [...others, day];
    });
    return day;
  }, []);

  const saveScreenTimeSettings = useCallback(
    async (settings: ScreenTimeSettings) => {
      await putScreenTimeSettings(settings);
      const today = await ensureScreenTimeDay(settings.personId, todayKey());
      if (!today.activeStartedAt && today.usedSeconds === 0) {
        const next = { ...today, allowanceMinutes: settings.dailyMinutes };
        setScreenTimeDays((prev) => {
          const others = prev.filter((row) => row.id !== next.id);
          return [...others, next];
        });
        await putScreenTimeDay(next);
      }
      await refresh();
    },
    [refresh],
  );

  const startScreenTime = useCallback(
    async (personId: string) => {
      const settings = screenTimeSettings.find(
        (row) => row.personId === personId,
      );
      if (settings && !settings.enabled) return;

      const date = todayKey();
      const id = screenTimeDayId(personId, date);
      const existing = screenTimeDays.find((row) => row.id === id);
      const base: ScreenTimeDay = existing ?? {
        id,
        personId,
        date,
        allowanceMinutes: settings?.dailyMinutes ?? 45,
        usedSeconds: 0,
      };
      if (base.activeStartedAt) return;
      if (base.allowanceMinutes * 60 - base.usedSeconds <= 0) return;

      const next: ScreenTimeDay = {
        ...base,
        activeStartedAt: new Date().toISOString(),
      };
      setScreenTimeDays((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putScreenTimeDay(next);
      } catch {
        await refresh();
      }
    },
    [refresh, screenTimeDays, screenTimeSettings],
  );

  const stopScreenTime = useCallback(
    async (personId: string) => {
      const date = todayKey();
      const id = screenTimeDayId(personId, date);
      const existing = screenTimeDays.find((row) => row.id === id);
      if (!existing?.activeStartedAt) {
        // Fall back to storage if local state is stale.
        const day = await ensureScreenTimeDay(personId, date);
        if (!day.activeStartedAt) return;
        const next = foldActiveSession(day);
        setScreenTimeDays((prev) => {
          const others = prev.filter((row) => row.id !== id);
          return [...others, next];
        });
        try {
          await putScreenTimeDay(next);
        } catch {
          await refresh();
        }
        return;
      }

      const next = foldActiveSession(existing);
      setScreenTimeDays((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putScreenTimeDay(next);
      } catch {
        await refresh();
      }
    },
    [refresh, screenTimeDays],
  );

  const addScreenTimeBonus = useCallback(
    async (personId: string, minutes: number) => {
      const date = todayKey();
      const id = screenTimeDayId(personId, date);
      const existing = screenTimeDays.find((row) => row.id === id);
      const settings = screenTimeSettings.find(
        (row) => row.personId === personId,
      );
      const base: ScreenTimeDay = existing ?? {
        id,
        personId,
        date,
        allowanceMinutes: settings?.dailyMinutes ?? 45,
        usedSeconds: 0,
      };
      const next: ScreenTimeDay = {
        ...base,
        allowanceMinutes: Math.max(0, base.allowanceMinutes + minutes),
      };
      setScreenTimeDays((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putScreenTimeDay(next);
      } catch {
        await refresh();
      }
    },
    [refresh, screenTimeDays, screenTimeSettings],
  );

  const adjustScreenTimeUsed = useCallback(
    async (personId: string, deltaMinutes: number) => {
      if (!deltaMinutes) return;
      const date = todayKey();
      const id = screenTimeDayId(personId, date);
      const existing = screenTimeDays.find((row) => row.id === id);
      const settings = screenTimeSettings.find(
        (row) => row.personId === personId,
      );
      const base: ScreenTimeDay = existing ?? {
        id,
        personId,
        date,
        allowanceMinutes: settings?.dailyMinutes ?? 45,
        usedSeconds: 0,
      };
      const live = liveElapsedSeconds(base);
      const allowanceSeconds = base.allowanceMinutes * 60;
      const maxUsed = Math.max(0, allowanceSeconds - live);
      const nextUsed = Math.max(
        0,
        Math.min(maxUsed, base.usedSeconds - deltaMinutes * 60),
      );
      if (nextUsed === base.usedSeconds) return;
      const next: ScreenTimeDay = {
        ...base,
        usedSeconds: nextUsed,
      };
      setScreenTimeDays((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putScreenTimeDay(next);
      } catch {
        await refresh();
      }
    },
    [refresh, screenTimeDays, screenTimeSettings],
  );

  const resetScreenTimeToday = useCallback(
    async (personId: string) => {
      const settings = screenTimeSettings.find(
        (row) => row.personId === personId,
      ) ?? {
        personId,
        dailyMinutes: 45,
        enabled: true,
      };
      const date = todayKey();
      const id = screenTimeDayId(personId, date);
      const next: ScreenTimeDay = {
        id,
        personId,
        date,
        allowanceMinutes: settings.dailyMinutes,
        usedSeconds: 0,
        activeStartedAt: undefined,
      };
      setScreenTimeDays((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putScreenTimeDay(next);
      } catch {
        await refresh();
      }
    },
    [refresh, screenTimeSettings],
  );

  const toggleRoutineStep = useCallback(
    async (routineId: string, stepId: string) => {
      const date = todayKey();
      const id = routineProgressId(routineId, date);
      const existing = routineProgress.find((row) => row.id === id) ?? {
        id,
        routineId,
        date,
        completedStepIds: [] as string[],
      };
      const has = existing.completedStepIds.includes(stepId);
      const next: RoutineDayProgress = {
        ...existing,
        completedStepIds: has
          ? existing.completedStepIds.filter((sid) => sid !== stepId)
          : [...existing.completedStepIds, stepId],
      };
      setRoutineProgress((prev) => {
        const others = prev.filter((row) => row.id !== id);
        return [...others, next];
      });
      try {
        await putRoutineProgress(next);
      } catch {
        await refresh();
      }
    },
    [refresh, routineProgress],
  );

  const saveRoutine = useCallback(
    async (routine: Routine) => {
      await putRoutine(routine);
      await refresh();
    },
    [refresh],
  );

  const createRoutine = useCallback(
    async (input: Omit<Routine, "id">) => {
      const person = people.find((p) => p.id === input.personId);
      if (!person || person.role !== "child") return;
      await putRoutine({ id: newId("routine"), ...input });
      await refresh();
    },
    [people, refresh],
  );

  const removeRoutine = useCallback(
    async (id: string) => {
      await dbDeleteRoutine(id);
      await refresh();
    },
    [refresh],
  );

  const saveRecurringTemplate = useCallback(
    async (template: RecurringTemplate) => {
      await putRecurringTemplate(template);
      await applyTemplateSpan(template);
      await refresh();
    },
    [refresh],
  );

  const createRecurringTemplate = useCallback(
    async (input: Omit<RecurringTemplate, "id">) => {
      const template = { id: newId("tpl"), ...input };
      await putRecurringTemplate(template);
      await applyTemplateSpan(template);
      await refresh();
    },
    [refresh],
  );

  const removeRecurringTemplate = useCallback(
    async (id: string) => {
      await dbDeleteRecurringTemplate(id);
      await refresh();
    },
    [refresh],
  );

  const fillWeekFromTemplates = useCallback(
    async (weekAnchor = new Date()) => {
      await applyTemplatesForWeek(weekAnchor);
      await refresh();
    },
    [refresh],
  );

  const fillAllRecurringTemplates = useCallback(async () => {
    await applyAllTemplateSpans();
    await refresh();
  }, [refresh]);

  const saveCalendarSubscription = useCallback(
    async (subscription: CalendarSubscription) => {
      await putCalendarSubscription(subscription);
      await refresh();
    },
    [refresh],
  );

  const createCalendarSubscription = useCallback(
    async (
      input: Omit<
        CalendarSubscription,
        "id" | "lastSyncedAt" | "lastError"
      >,
    ) => {
      const subscription: CalendarSubscription = {
        id: newId("cal"),
        ...input,
      };
      await putCalendarSubscription(subscription);
      await refresh();
    },
    [refresh],
  );

  const removeCalendarSubscription = useCallback(
    async (id: string) => {
      await dbDeleteCalendarSubscription(id);
      await refresh();
    },
    [refresh],
  );

  const syncCalendarSubscription = useCallback(
    async (id: string, options?: { force?: boolean }) => {
      const data = await loadAll();
      const subscription = data.calendarSubscriptions.find((s) => s.id === id);
      if (!subscription || !subscription.enabled) return;
      if (!options?.force && !shouldSyncSubscription(subscription)) return;

      try {
        const instances = await fetchCalendarInstances(subscription);
        const { upserts, deleteIds } = reconcileCalendarEvents(
          subscription,
          instances,
          data.events,
          newId,
        );
        const next: CalendarSubscription = {
          ...subscription,
          lastSyncedAt: new Date().toISOString(),
          lastError: undefined,
        };
        await applyCalendarSubscriptionEvents(next, upserts, deleteIds);
      } catch (err) {
        const next: CalendarSubscription = {
          ...subscription,
          lastError:
            err instanceof Error ? err.message : "Kunde inte synka kalender",
        };
        await putCalendarSubscription(next);
      }
      await refresh();
    },
    [refresh],
  );

  const syncAllCalendarSubscriptions = useCallback(
    async (options?: { force?: boolean }) => {
      const data = await loadAll();
      const enabled = data.calendarSubscriptions.filter((s) => s.enabled);
      let changed = false;
      for (const subscription of enabled) {
        if (!options?.force && !shouldSyncSubscription(subscription)) continue;
        changed = true;
        try {
          const instances = await fetchCalendarInstances(subscription);
          const latest = await loadAll();
          const { upserts, deleteIds } = reconcileCalendarEvents(
            subscription,
            instances,
            latest.events,
            newId,
          );
          const next: CalendarSubscription = {
            ...subscription,
            lastSyncedAt: new Date().toISOString(),
            lastError: undefined,
          };
          await applyCalendarSubscriptionEvents(next, upserts, deleteIds);
        } catch (err) {
          const next: CalendarSubscription = {
            ...subscription,
            lastError:
              err instanceof Error ? err.message : "Kunde inte synka kalender",
          };
          await putCalendarSubscription(next);
        }
      }
      if (changed) await refresh();
    },
    [refresh],
  );

  const getSchoolLunchFeed = useCallback(
    (personId: string) =>
      schoolLunchFeeds.find((feed) => feed.personId === personId),
    [schoolLunchFeeds],
  );

  const getSchoolLunchDay = useCallback(
    (personId: string, date = todayKey()) =>
      schoolLunchDays.find(
        (day) => day.personId === personId && day.date === date,
      ),
    [schoolLunchDays],
  );

  const saveSchoolLunchFeed = useCallback(
    async (feed: SchoolLunchFeed) => {
      await putSchoolLunchFeed(feed);
      await refresh();
    },
    [refresh],
  );

  const upsertSchoolLunchFeed = useCallback(
    async (input: {
      personId: string;
      schoolSlug: string;
      enabled?: boolean;
    }) => {
      const data = await loadAll();
      const existing = (data.schoolLunchFeeds ?? []).find(
        (feed) => feed.personId === input.personId,
      );
      const feed: SchoolLunchFeed = existing
        ? {
            ...existing,
            schoolSlug: input.schoolSlug,
            enabled: input.enabled ?? existing.enabled,
            lastError: undefined,
          }
        : {
            id: newId("skolmat"),
            personId: input.personId,
            schoolSlug: input.schoolSlug,
            enabled: input.enabled ?? true,
          };
      await putSchoolLunchFeed(feed);
      await refresh();
      return feed;
    },
    [refresh],
  );

  const removeSchoolLunchFeed = useCallback(
    async (id: string) => {
      await dbDeleteSchoolLunchFeed(id);
      await refresh();
    },
    [refresh],
  );

  const syncSchoolLunch = useCallback(
    async (personId: string, options?: { force?: boolean }) => {
      const data = await loadAll();
      const feed = (data.schoolLunchFeeds ?? []).find(
        (row) => row.personId === personId,
      );
      if (!feed || !feed.enabled) return;
      if (!options?.force && !shouldSyncSchoolLunch(feed)) return;

      try {
        const parsed = await fetchSchoolLunchWeek(feed.schoolSlug);
        const days: SchoolLunchDay[] = parsed.days.map((day) => ({
          id: schoolLunchDayId(personId, day.date),
          personId,
          date: day.date,
          dishes: day.dishes,
        }));
        const next: SchoolLunchFeed = {
          ...feed,
          schoolName: parsed.schoolName,
          weekKey: parsed.weekKey,
          lastSyncedAt: new Date().toISOString(),
          lastError: undefined,
        };
        await applySchoolLunchSync(next, days);
      } catch (err) {
        const next: SchoolLunchFeed = {
          ...feed,
          lastError:
            err instanceof Error ? err.message : "Kunde inte synka skolmat",
        };
        await putSchoolLunchFeed(next);
      }
      await refresh();
    },
    [refresh],
  );

  const getIdagLayout = useCallback(
    (personId: string) => getIdagLayoutForPerson(idagLayouts, personId),
    [idagLayouts],
  );

  const saveIdagLayout = useCallback(
    async (personId: string, layout: IdagWidgetPlacement[]) => {
      const normalized = normalizeIdagLayout(layout);
      setIdagLayouts((prev) =>
        setIdagLayoutForPerson(prev, personId, normalized),
      );
      try {
        await putIdagLayout(personId, normalized);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const saveIdagLayoutLocked = useCallback(
    async (locked: boolean) => {
      setIdagLayoutLocked(locked);
      try {
        await putIdagLayoutLocked(locked);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const resetData = useCallback(async () => {
    await resetToSeed();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
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
      getIdagLayout,
      refresh,
      savePerson,
      createPerson,
      removePerson,
      saveEvent,
      removeEvent,
      createEvent,
      saveTodo,
      createTodo,
      toggleTodo,
      removeTodo,
      saveDinners,
      resetDinnerMenu,
      getScreenTimeSettings,
      getScreenTimeDay,
      ensureTodayScreenTime,
      saveScreenTimeSettings,
      startScreenTime,
      stopScreenTime,
      addScreenTimeBonus,
      adjustScreenTimeUsed,
      resetScreenTimeToday,
      toggleRoutineStep,
      saveRoutine,
      createRoutine,
      removeRoutine,
      saveRecurringTemplate,
      createRecurringTemplate,
      removeRecurringTemplate,
      fillWeekFromTemplates,
      fillAllRecurringTemplates,
      saveCalendarSubscription,
      createCalendarSubscription,
      removeCalendarSubscription,
      syncCalendarSubscription,
      syncAllCalendarSubscriptions,
      getSchoolLunchFeed,
      getSchoolLunchDay,
      saveSchoolLunchFeed,
      upsertSchoolLunchFeed,
      removeSchoolLunchFeed,
      syncSchoolLunch,
      saveIdagLayout,
      saveIdagLayoutLocked,
      resetData,
    }),
    [
      ready,
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
      getIdagLayout,
      refresh,
      savePerson,
      createPerson,
      removePerson,
      saveEvent,
      removeEvent,
      createEvent,
      saveTodo,
      createTodo,
      toggleTodo,
      removeTodo,
      saveDinners,
      resetDinnerMenu,
      getScreenTimeSettings,
      getScreenTimeDay,
      ensureTodayScreenTime,
      saveScreenTimeSettings,
      startScreenTime,
      stopScreenTime,
      addScreenTimeBonus,
      adjustScreenTimeUsed,
      resetScreenTimeToday,
      toggleRoutineStep,
      saveRoutine,
      createRoutine,
      removeRoutine,
      saveRecurringTemplate,
      createRecurringTemplate,
      removeRecurringTemplate,
      fillWeekFromTemplates,
      fillAllRecurringTemplates,
      saveCalendarSubscription,
      createCalendarSubscription,
      removeCalendarSubscription,
      syncCalendarSubscription,
      syncAllCalendarSubscriptions,
      getSchoolLunchFeed,
      getSchoolLunchDay,
      saveSchoolLunchFeed,
      upsertSchoolLunchFeed,
      removeSchoolLunchFeed,
      syncSchoolLunch,
      saveIdagLayout,
      saveIdagLayoutLocked,
      resetData,
    ],
  );

  return (
    <FamilyStoreContext.Provider value={value}>
      {children}
    </FamilyStoreContext.Provider>
  );
}

export function useFamilyStore() {
  const ctx = useContext(FamilyStoreContext);
  if (!ctx) {
    throw new Error("useFamilyStore must be used within FamilyStoreProvider");
  }
  return ctx;
}

export { EBBE_ID };
