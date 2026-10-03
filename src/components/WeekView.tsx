"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityIcon } from "@/components/ActivityIcon";
import {
  addDays,
  dayLabel,
  dayNumber,
  isSameDay,
  startOfWeek,
  toDateKey,
  weekDays,
  weekRangeLabel,
} from "@/lib/dates";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import type { Event, Person } from "@/lib/types";

function eventsForCell(
  events: Event[],
  personId: string,
  dateKey: string,
): Event[] {
  return events
    .filter((e) => e.personId === personId && e.date === dateKey)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
}

function PersonRow({
  person,
  days,
  events,
  emphasize,
}: {
  person: Person;
  days: Date[];
  events: Event[];
  emphasize: boolean;
}) {
  return (
    <div
      className={`grid min-h-0 grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-1.5 ${
        emphasize ? "flex-[1.35]" : "flex-1"
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${person.color}33` }}
          aria-hidden
        >
          {person.avatar}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--ink)]">
            {person.name}
          </p>
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
            {person.role === "child" ? "Barn" : "Förälder"}
          </p>
        </div>
      </div>

      {days.map((day) => {
        const key = toDateKey(day);
        const cellEvents = eventsForCell(events, person.id, key);
        const today = isSameDay(day, new Date());
        return (
          <div
            key={key}
            className={`flex min-h-0 flex-col gap-1 overflow-hidden rounded-2xl p-1.5 ring-1 ${
              today
                ? "bg-white shadow-md ring-[var(--accent)]/40"
                : "bg-white/55 ring-black/5"
            }`}
          >
            {cellEvents.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[var(--ink-faint)]">
                ·
              </div>
            ) : (
              cellEvents.map((event) => (
                <div
                  key={event.id}
                  className={`flex flex-col items-center justify-center rounded-xl px-1 py-1 ${
                    emphasize ? "min-h-[4.25rem]" : "min-h-[2.75rem]"
                  }`}
                  style={{ backgroundColor: `${person.color}22` }}
                >
                  <ActivityIcon
                    iconKey={event.iconKey}
                    size={emphasize ? "lg" : "sm"}
                    showLabel={emphasize || person.role === "child"}
                    title={event.title}
                  />
                  {!emphasize && person.role === "parent" ? (
                    <span className="mt-0.5 max-w-full truncate text-[0.65rem] font-semibold text-[var(--ink-muted)]">
                      {event.title}
                    </span>
                  ) : null}
                  {event.startTime ? (
                    <span className="text-[0.6rem] font-medium text-[var(--ink-muted)]">
                      {event.startTime}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WeekView() {
  const { people, events, ready, fillWeekFromTemplates } = useFamilyStore();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const children = people.filter((p) => p.role === "child");
  const parents = people.filter((p) => p.role === "parent");

  useEffect(() => {
    if (!ready) return;
    void fillWeekFromTemplates(weekAnchor);
  }, [ready, weekAnchor, fillWeekFromTemplates]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar schemat…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="tap-target rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5"
          onClick={() => setWeekAnchor((d) => addDays(d, -7))}
        >
          ← Förra
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Veckans schema
          </h2>
          <p className="text-sm font-medium text-[var(--ink-muted)]">
            {weekRangeLabel(weekAnchor)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="tap-target rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5"
            onClick={() => setWeekAnchor(startOfWeek(new Date()))}
          >
            Idag
          </button>
          <button
            type="button"
            className="tap-target rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5"
            onClick={() => setWeekAnchor((d) => addDays(d, 7))}
          >
            Nästa →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <div />
        {days.map((day) => {
          const today = isSameDay(day, new Date());
          return (
            <div
              key={toDateKey(day)}
              className={`rounded-xl px-1 py-2 text-center ${
                today ? "bg-[var(--accent)] text-white" : "bg-white/60"
              }`}
            >
              <div className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">
                {dayLabel(day)}
              </div>
              <div className="font-display text-xl font-bold leading-none">
                {dayNumber(day)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1">
        {children.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            days={days}
            events={events}
            emphasize
          />
        ))}
        {parents.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            days={days}
            events={events}
            emphasize={false}
          />
        ))}
      </div>
    </div>
  );
}
