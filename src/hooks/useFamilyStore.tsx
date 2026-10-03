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
  loadAll,
  newId,
  putEvent,
  putPerson,
  putTodo,
  resetToSeed,
} from "@/lib/db";
import type { Event, IconKey, Person, Todo } from "@/lib/types";

interface FamilyStoreValue {
  ready: boolean;
  people: Person[];
  events: Event[];
  todos: Todo[];
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
  resetData: () => Promise<void>;
}

const FamilyStoreContext = createContext<FamilyStoreValue | null>(null);

export function FamilyStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const refresh = useCallback(async () => {
    const data = await loadAll();
    setPeople(data.people);
    setEvents(data.events);
    setTodos(data.todos);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadAll();
      if (cancelled) return;
      setPeople(data.people);
      setEvents(data.events);
      setTodos(data.todos);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      refresh,
      savePerson,
      saveEvent,
      removeEvent,
      createEvent,
      saveTodo,
      createTodo,
      toggleTodo,
      removeTodo,
      resetData,
    }),
    [
      ready,
      people,
      events,
      todos,
      refresh,
      savePerson,
      saveEvent,
      removeEvent,
      createEvent,
      saveTodo,
      createTodo,
      toggleTodo,
      removeTodo,
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
