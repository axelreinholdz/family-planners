"use client";

import { useEffect, useState } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { resolveActivityEmoji } from "@/lib/icons";
import { nextEventsForPerson } from "@/lib/nextEvents";
import type { Person } from "@/lib/types";

export function NextEventsWidget({ child }: { child: Person | undefined }) {
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Nästa
        </h3>
      </div>
      {current ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 ring-1 ring-[var(--accent)]/30">
          <span className="text-4xl" aria-hidden>
            {resolveActivityEmoji(current.iconKey, current.emoji)}
          </span>
          <div className="min-w-0">
            <p className="font-display text-xl font-bold text-[var(--ink)]">
              {current.title}
            </p>
            <p className="text-sm font-medium text-[var(--ink-muted)]">
              {current.startTime
                ? current.endTime
                  ? `${current.startTime}–${current.endTime}`
                  : `Från ${current.startTime}`
                : "Heldag"}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--ink-muted)]">
          Inget mer inlagt idag.
        </p>
      )}

      {upcoming.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-2"
            >
              <span className="text-xl" aria-hidden>
                {resolveActivityEmoji(event.iconKey, event.emoji)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                {event.title}
              </span>
              <span className="text-xs font-medium text-[var(--ink-muted)]">
                {event.startTime ?? "Heldag"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
