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
  deleteEvent as dbDeleteEvent,
  deleteTodo as dbDeleteTodo,
  ensureScreenTimeDay,
  loadAll,
  newId,
  putEvent,
  putPerson,
  putScreenTimeDay,
  putScreenTimeSettings,
  putTodo,
  resetToSeed,
  saveDinnerMenu,
} from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { EBBE_ID, SEED_DINNERS } from "@/lib/seed";
import { foldActiveSession } from "@/lib/screenTime";
import type {
  DinnerPlan,
  Event,
  IconKey,
  Person,
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
  refresh: () => Promise<void>;
  savePerson: (person: Person) => Promise<void>;
  saveEvent: (event: Event) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  createEvent: (input: {
    personId: string;
    date: string;
    title: string;
    iconKey: IconKey;
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

  const applyData = useCallback(
    (data: Awaited<ReturnType<typeof loadAll>>) => {
      setPeople(data.people);
      setEvents(data.events);
      setTodos(data.todos);
      setDinners(data.dinners);
      setScreenTimeSettings(data.screenTimeSettings);
      setScreenTimeDays(data.screenTimeDays);
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
      startTime?: string;
      endTime?: string;
      allDay: boolean;
    }) => {
      const event: Event = {
        id: newId("ev"),
        ...input,
      };
      await putEvent(event);
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
      const todo: Todo = {
        id: newId("todo"),
        title: trimmed,
        done: false,
        createdAt: new Date().toISOString(),
      };
      await putTodo(todo);
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
      screenTimeDays.find((row) => row.personId === personId && row.date === date),
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
      const settings = screenTimeSettings.find((row) => row.personId === personId);
      if (settings && !settings.enabled) return;

      let day = await ensureScreenTimeDay(personId, todayKey());
      if (day.activeStartedAt) return;

      const remaining =
        day.allowanceMinutes * 60 - day.usedSeconds;
      if (remaining <= 0) return;

      day = {
        ...day,
        activeStartedAt: new Date().toISOString(),
      };
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
      const settings =
        screenTimeSettings.find((row) => row.personId === personId) ??
        ({
          personId,
          dailyMinutes: 45,
          enabled: true,
        } satisfies ScreenTimeSettings);
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
