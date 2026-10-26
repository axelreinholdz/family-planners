"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActivityDetailModal } from "@/components/ActivityDetailModal";
import { ActivityIcon } from "@/components/ActivityIcon";
import {
  addDays,
  dayLabel,
  dayNumber,
  isSameDay,
  startOfWeek,
  toDateKey,
  weekDays,
} from "@/lib/dates";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import type { Event, Person } from "@/lib/types";

/** Max movement (px) still counted as a tap — iPad Safari often cancels click inside SwipePager. */
const TAP_MOVE_THRESHOLD_PX = 10;

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

function NavPill({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-target rounded-full px-4 py-2.5 text-sm font-bold shadow-sm ring-1 transition ${
        active
          ? "bg-[var(--accent)] text-white ring-[var(--accent)]"
          : "bg-white/85 text-[var(--ink)] ring-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function ActivityCellButton({
  event,
  person,
  emphasize,
  onSelect,
}: {
  event: Event;
  person: Person;
  emphasize: boolean;
  onSelect: (event: Event) => void;
}) {
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const openedByPointer = useRef(false);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointerOrigin.current = { x: e.clientX, y: e.clientY };
        openedByPointer.current = false;
      }}
      onPointerUp={(e) => {
        const origin = pointerOrigin.current;
        pointerOrigin.current = null;
        if (!origin) return;
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        if (Math.hypot(dx, dy) <= TAP_MOVE_THRESHOLD_PX) {
          openedByPointer.current = true;
          onSelect(event);
        }
      }}
      onPointerCancel={() => {
        pointerOrigin.current = null;
      }}
      onClick={() => {
        if (openedByPointer.current) {
          openedByPointer.current = false;
          return;
        }
        onSelect(event);
      }}
      className={`tap-target touch-manipulation flex w-full flex-col items-center justify-center rounded-[1.25rem] px-1.5 py-2 text-left ${
        emphasize ? "min-h-[5.5rem] gap-1" : "min-h-[3rem] gap-0.5"
      }`}
      style={{ backgroundColor: `${person.color}4D` }}
      aria-label={`Visa detaljer för ${event.title}`}
    >
      <ActivityIcon
        iconKey={event.iconKey}
        emoji={event.emoji}
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
        <span className="text-[0.65rem] font-semibold text-[var(--ink-muted)]">
          {event.startTime}
        </span>
      ) : null}
    </button>
  );
}

function PersonRow({
  person,
  days,
  events,
  emphasize,
  onSelectEvent,
}: {
  person: Person;
  days: Date[];
  events: Event[];
  emphasize: boolean;
  onSelectEvent: (event: Event) => void;
}) {
  return (
    <div
      className={`grid min-h-0 grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-2.5 ${
        emphasize ? "flex-[1.4]" : "flex-1"
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-2 rounded-[1.75rem] bg-white/80 px-2 py-3 shadow-sm ring-1 ring-black/5">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${
            emphasize ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl"
          }`}
          style={{ backgroundColor: `${person.color}33` }}
          aria-hidden
        >
          {person.avatar}
        </span>
        <p
          className={`min-w-0 text-center font-extrabold leading-snug text-[var(--ink)] ${
            emphasize ? "text-base" : "text-sm"
          }`}
        >
          {person.name}
        </p>
      </div>

      {days.map((day) => {
        const key = toDateKey(day);
        const cellEvents = eventsForCell(events, person.id, key);
        const today = isSameDay(day, new Date());
        return (
          <div
            key={key}
            className={`flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-[1.5rem] p-2 ring-1 ${
              today
                ? "bg-white shadow-md ring-2 ring-[var(--accent)]/50"
                : "bg-white/55 ring-black/5"
            }`}
          >
            {cellEvents.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-lg text-[var(--ink-faint)]">
                ·
              </div>
            ) : (
              cellEvents.map((event) => (
                <ActivityCellButton
                  key={event.id}
                  event={event}
                  person={person}
                  emphasize={emphasize}
                  onSelect={onSelectEvent}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WeekView() {
  const {
    people,
    events,
    calendarSubscriptions,
    ready,
    fillWeekFromTemplates,
    syncAllCalendarSubscriptions,
    removeEvent,
    removeRecurringTemplate,
    removeCalendarSubscription,
  } = useFamilyStore();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [parentsExpanded, setParentsExpanded] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const children = people.filter((p) => p.role === "child");
  const parents = people.filter((p) => p.role === "parent");
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;
  const selectedPerson = selectedEvent
    ? people.find((person) => person.id === selectedEvent.personId)
    : undefined;
  const selectedSubscription = selectedEvent?.calendarSubscriptionId
    ? calendarSubscriptions.find(
        (subscription) =>
          subscription.id === selectedEvent.calendarSubscriptionId,
      )
    : undefined;

  useEffect(() => {
    if (!ready) return;
    void fillWeekFromTemplates(weekAnchor);
    void syncAllCalendarSubscriptions();
  }, [ready, weekAnchor, fillWeekFromTemplates, syncAllCalendarSubscriptions]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar schemat…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <NavPill onClick={() => setWeekAnchor((d) => addDays(d, -7))}>
          ←
        </NavPill>
        <NavPill
          active
          onClick={() => setWeekAnchor(startOfWeek(new Date()))}
        >
          Idag
        </NavPill>
        <NavPill onClick={() => setWeekAnchor((d) => addDays(d, 7))}>
          →
        </NavPill>
      </div>

      <div className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-2.5">
        <div />
        {days.map((day) => {
          const today = isSameDay(day, new Date());
          return (
            <div
              key={toDateKey(day)}
              className={`flex flex-col items-center justify-center rounded-2xl px-1 py-2.5 text-center ${
                today
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-white/60 text-[var(--ink)]"
              }`}
            >
              <div
                className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${
                  today ? "text-white/85" : "text-[var(--ink-muted)]"
                }`}
              >
                {dayLabel(day)}
              </div>
              <div className="font-display text-2xl font-bold leading-none">
                {dayNumber(day)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-0.5 pb-1">
        {children.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            days={days}
            events={events}
            emphasize
            onSelectEvent={(event) => setSelectedEventId(event.id)}
          />
        ))}
        {parents.length > 0 ? (
          <div className="mt-1 flex flex-col gap-2">
            <button
              type="button"
              className="tap-target flex w-full items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-2.5 text-left text-sm font-semibold text-[var(--ink)] shadow-sm ring-1 ring-black/5"
              aria-expanded={parentsExpanded}
              onClick={() => setParentsExpanded((open) => !open)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block text-[var(--ink-muted)] transition-transform duration-200"
                  style={{
                    transform: parentsExpanded
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                  }}
                  aria-hidden
                >
                  ›
                </span>
                <span>Föräldrar</span>
                <span className="font-medium text-[var(--ink-muted)]">
                  ({parents.length})
                </span>
              </span>
              <span className="shrink-0 text-[var(--ink-muted)]">
                {parentsExpanded ? "Dölj" : "Visa"}
              </span>
            </button>
            {parentsExpanded
              ? parents.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    days={days}
                    events={events}
                    emphasize={false}
                    onSelectEvent={(event) => setSelectedEventId(event.id)}
                  />
                ))
              : null}
          </div>
        ) : null}
      </div>

      {selectedEvent ? (
        <ActivityDetailModal
          event={selectedEvent}
          person={selectedPerson}
          subscription={selectedSubscription}
          onClose={() => setSelectedEventId(null)}
          onRemoveOccurrence={
            selectedEvent.calendarSubscriptionId
              ? undefined
              : () => removeEvent(selectedEvent.id)
          }
          onRemoveSeries={
            selectedEvent.templateId
              ? () => removeRecurringTemplate(selectedEvent.templateId!)
              : undefined
          }
          onRemoveCalendar={
            selectedEvent.calendarSubscriptionId
              ? () =>
                  removeCalendarSubscription(
                    selectedEvent.calendarSubscriptionId!,
                  )
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
