"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ActivityIcon } from "@/components/ActivityIcon";
import { dayLabel, parseDateKey } from "@/lib/dates";
import type { CalendarSubscription, Event, Person } from "@/lib/types";

const subscribeNoop = () => () => {};

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

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
  /** Remove a one-off activity, or one occurrence of a recurring series. */
  onRemoveOccurrence?: () => Promise<void> | void;
  /** Remove the whole recurring series (template + all linked activities). */
  onRemoveSeries?: () => Promise<void> | void;
}

export function ActivityDetailModal({
  event,
  person,
  subscription,
  onClose,
  onRemoveOccurrence,
  onRemoveSeries,
}: ActivityDetailModalProps) {
  const fromCalendar = Boolean(event.calendarSubscriptionId);
  const isRecurring = Boolean(event.templateId);
  const isClient = useIsClient();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isClient) return null;

  const runAction = async (action: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Stäng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-4">
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
              ) : isRecurring ? (
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--accent-deep)]">
                  Återkommande
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 [-webkit-overflow-scrolling:touch]">
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

          {!fromCalendar && onRemoveOccurrence ? (
            <div className="mt-4 flex flex-col gap-2">
              {isRecurring ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Ta bort “${event.title}” bara den här dagen? Övriga tillfällen behålls.`,
                        )
                      ) {
                        void runAction(onRemoveOccurrence);
                      }
                    }}
                    className="tap-target rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200 disabled:opacity-40"
                  >
                    Ta bort bara denna dag
                  </button>
                  {onRemoveSeries ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Ta bort hela serien “${event.title}”? Alla tillfällen raderas.`,
                          )
                        ) {
                          void runAction(onRemoveSeries);
                        }
                      }}
                      className="tap-target rounded-xl px-4 py-3 text-sm font-bold text-red-800 disabled:opacity-40"
                    >
                      Ta bort hela serien
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Ta bort “${event.title}”?`)) {
                      void runAction(onRemoveOccurrence);
                    }
                  }}
                  className="tap-target rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200 disabled:opacity-40"
                >
                  Ta bort
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
