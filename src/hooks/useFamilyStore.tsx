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
  applyAllTemplateSpans,
  applyTemplatesForWeek,
  applyTemplateSpan,
  deleteEvent as dbDeleteEvent,
  deleteRecurringTemplate as dbDeleteRecurringTemplate,
  deleteRoutine as dbDeleteRoutine,
  deleteTodo as dbDeleteTodo,
  ensureRoutineProgress,
  ensureScreenTimeDay,
  loadAll,
  newId,
  putEvent,
  putPerson,
  putRecurringTemplate,
  putRoutine,
  putRoutineProgress,
  putScreenTimeDay,
  putScreenTimeSettings,
  putTodo,
  resetToSeed,
  saveDinnerMenu,
} from "@/lib/repository";
import { todayKey } from "@/lib/dates";
import { EBBE_ID, SEED_DINNERS } from "@/lib/seed";
import { foldActiveSession } from "@/lib/screenTime";
import type {
  DinnerPlan,
  Event,
  IconKey,
  Person,
  RecurringTemplate,
  Routine,
  RoutineDayProgress,
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
  refresh: () => Promise<void>;
  savePerson: (person: Person) => Promise<void>;
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
        await putScreenTimeDay({
          ...today,
          allowanceMinutes: settings.dailyMinutes,
        });
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
      let day = await ensureScreenTimeDay(personId, todayKey());
      if (day.activeStartedAt) return;
      if (day.allowanceMinutes * 60 - day.usedSeconds <= 0) return;
      day = { ...day, activeStartedAt: new Date().toISOString() };
      await putScreenTimeDay(day);
      await refresh();
    },
    [refresh, screenTimeSettings],
  );

  const stopScreenTime = useCallback(
    async (personId: string) => {
      const day = await ensureScreenTimeDay(personId, todayKey());
      if (!day.activeStartedAt) return;
      await putScreenTimeDay(foldActiveSession(day));
      await refresh();
    },
    [refresh],
  );

  const addScreenTimeBonus = useCallback(
    async (personId: string, minutes: number) => {
      const day = await ensureScreenTimeDay(personId, todayKey());
      await putScreenTimeDay({
        ...day,
        allowanceMinutes: day.allowanceMinutes + minutes,
      });
      await refresh();
    },
    [refresh],
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
      const day = await ensureScreenTimeDay(personId, todayKey());
      await putScreenTimeDay({
        ...day,
        allowanceMinutes: settings.dailyMinutes,
        usedSeconds: 0,
        activeStartedAt: undefined,
      });
      await refresh();
    },
    [refresh, screenTimeSettings],
  );

  const toggleRoutineStep = useCallback(
    async (routineId: string, stepId: string) => {
      const progress = await ensureRoutineProgress(routineId, todayKey());
      const has = progress.completedStepIds.includes(stepId);
      const completedStepIds = has
        ? progress.completedStepIds.filter((id) => id !== stepId)
        : [...progress.completedStepIds, stepId];
      await putRoutineProgress({ ...progress, completedStepIds });
      await refresh();
    },
    [refresh],
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
      await putRoutine({ id: newId("routine"), ...input });
      await refresh();
    },
    [refresh],
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
      refresh,
      savePerson,
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
      refresh,
      savePerson,
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
