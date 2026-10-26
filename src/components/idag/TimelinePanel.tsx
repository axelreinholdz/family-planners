"use client";

import { useEffect, useState } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { resolveActivityEmoji } from "@/lib/icons";
import { nextEventsForPerson } from "@/lib/nextEvents";
import type { Event, Person } from "@/lib/types";

function eventMeta(event: Event): string {
  if (event.allDay || !event.startTime) return "Heldag";
  if (event.endTime) return `${event.startTime}–${event.endTime}`;
  return event.startTime;
}

function TimelineCard({
  event,
  current,
}: {
  event: Event;
  current: boolean;
}) {
  const emoji = resolveActivityEmoji(event.iconKey, event.emoji);
  return (
    <div
      className={`flex min-h-[5.5rem] items-center gap-4 rounded-[1.35rem] px-4 py-4 ring-1 ${
        current
          ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/40"
          : "bg-[var(--surface-soft)]/90 ring-transparent"
      }`}
    >
      <div className="w-14 shrink-0 text-center">
        <p
          className={`text-sm font-extrabold tabular-nums ${
            current ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
          }`}
        >
          {event.startTime ?? "Heldag"}
        </p>
      </div>
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.15rem] text-3xl ${
          current ? "bg-white/95" : "bg-white/70"
        }`}
        aria-hidden
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-2xl font-bold leading-tight text-[var(--ink)]">
          {event.title}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--ink-muted)]">
          {eventMeta(event)}
        </p>
      </div>
      {current ? (
        <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white">
          Nu
        </span>
      ) : null}
    </div>
  );
}

export function TimelinePanel({ child }: { child: Person | undefined }) {
  const { events } = useFamilyStore();
  const [now, setNow] = useState(() => Date.now());
  const personId = child?.id ?? "";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { current, upcoming } = nextEventsForPerson(
    events,
    personId,
    undefined,
    new Date(now),
  );

  const rows: { event: Event; current: boolean }[] = [];
  if (current) rows.push({ event: current, current: true });
  for (const event of upcoming) {
    rows.push({ event, current: false });
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-white/78 p-4 shadow-sm ring-1 ring-black/5">
      <h3 className="mb-3 shrink-0 text-sm font-extrabold uppercase tracking-wide text-[var(--ink-muted)]">
        Tidslinje
      </h3>
      {rows.length === 0 ? (
        <p className="rounded-[1.35rem] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          Inget inlagt idag för {child?.name ?? "detta barn"}.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain">
          {rows.map(({ event, current: isCurrent }) => (
            <li key={event.id}>
              <TimelineCard event={event} current={isCurrent} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
