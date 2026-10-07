"use client";

import { useEffect, type ReactNode } from "react";
import { ActivityIcon } from "@/components/ActivityIcon";
import { dayLabel, parseDateKey } from "@/lib/dates";
import type { CalendarSubscription, Event, Person } from "@/lib/types";

function formatEventWhen(event: Event): string {
  const date = parseDateKey(event.date);
  const day = dayLabel(date);
  if (event.allDay) return `${day} ${event.date} · Heldag`;
  if (event.startTime && event.endTime) {
    return `${day} ${event.date} · ${event.startTime}–${event.endTime}`;
  }
  if (event.startTime) return `${day} ${event.date} · ${event.startTime}`;
  return `${day} ${event.date}`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </p>
      <div className="text-base font-semibold text-[var(--ink)]">{children}</div>
    </div>
  );
}

interface ActivityDetailModalProps {
  event: Event;
  person?: Person;
  subscription?: CalendarSubscription;
  onClose: () => void;
}

export function ActivityDetailModal({
  event,
  person,
  subscription,
  onClose,
}: ActivityDetailModalProps) {
  const fromCalendar = Boolean(event.calendarSubscriptionId);

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Stäng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `${person?.color ?? "#2A9D8F"}33`,
              }}
            >
              <ActivityIcon
                iconKey={event.iconKey}
                emoji={event.emoji}
                size="lg"
                showLabel={false}
                title={event.title}
              />
            </span>
            <div className="min-w-0">
              <h3
                id="activity-detail-title"
                className="font-display text-2xl font-bold text-[var(--ink)]"
              >
                {event.title}
              </h3>
              <p className="text-sm font-medium text-[var(--ink-muted)]">
                {formatEventWhen(event)}
              </p>
              {fromCalendar ? (
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--accent-deep)]">
                  Från kalender
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-target shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-[var(--ink-muted)]"
          >
            Stäng
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-[var(--surface-soft)] p-4">
          {person ? (
            <DetailRow label="Person">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>{person.avatar}</span>
                {person.name}
              </span>
            </DetailRow>
          ) : null}

          <DetailRow label="När">{formatEventWhen(event)}</DetailRow>

          {event.location ? (
            <DetailRow label="Plats">{event.location}</DetailRow>
          ) : null}

          {event.description ? (
            <DetailRow label="Beskrivning">
              <p className="whitespace-pre-wrap font-medium leading-relaxed">
                {event.description}
              </p>
            </DetailRow>
          ) : null}

          {event.url ? (
            <DetailRow label="Länk">
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-bold text-[var(--accent-deep)] underline"
              >
                {event.url}
              </a>
            </DetailRow>
          ) : null}

          {fromCalendar && subscription ? (
            <DetailRow label="Kalender">{subscription.name}</DetailRow>
          ) : null}

          {fromCalendar &&
          !event.location &&
          !event.description &&
          !event.url ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Inga extra detaljer i kalenderhändelsen.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
