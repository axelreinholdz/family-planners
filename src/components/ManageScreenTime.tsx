"use client";

import { useEffect, useState } from "react";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";
import { formatClock } from "@/lib/dates";
import {
  remainingSeconds,
  usedSecondsTotal,
} from "@/lib/screenTime";

function ScreenTimeEditor({ personId }: { personId: string }) {
  const {
    getScreenTimeSettings,
    getScreenTimeDay,
    ensureTodayScreenTime,
    saveScreenTimeSettings,
    addScreenTimeBonus,
    resetScreenTimeToday,
  } = useFamilyStore();

  const settings = getScreenTimeSettings(personId);
  const day = getScreenTimeDay(personId);
  const [dailyMinutes, setDailyMinutes] = useState(settings?.dailyMinutes ?? 45);
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void ensureTodayScreenTime(personId);
  }, [personId, ensureTodayScreenTime]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setDailyMinutes(settings?.dailyMinutes ?? 45);
    setEnabled(settings?.enabled ?? true);
  }, [settings?.dailyMinutes, settings?.enabled, personId]);

  const remaining = remainingSeconds(day, now);
  const used = usedSecondsTotal(day, now);

  return (
    <div className="flex flex-col gap-3">
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Minuter per dag
        <input
          type="number"
          min={0}
          max={240}
          value={dailyMinutes}
          onChange={(e) => setDailyMinutes(Number(e.target.value))}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-5 w-5"
        />
        Aktiverad
      </label>

      <button
        type="button"
        onClick={() =>
          void saveScreenTimeSettings({
            personId,
            dailyMinutes: Math.max(0, Math.floor(dailyMinutes || 0)),
            enabled,
          })
        }
        className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
      >
        Spara skärmtid
      </button>

      <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Idag
        </p>
        <p className="mt-2 text-lg font-bold text-[var(--ink)]">
          {formatClock(remaining)} kvar · {formatClock(used)} använt
        </p>
        <p className="text-sm text-[var(--ink-muted)]">
          Tillåtelse: {day?.allowanceMinutes ?? settings?.dailyMinutes ?? 45} min
          {day?.activeStartedAt ? " · pågår" : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void addScreenTimeBonus(personId, 15)}
            className="tap-target rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10"
          >
            +15 min
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Nollställa dagens skärmtid?")) {
                void resetScreenTimeToday(personId);
              }
            }}
            className="tap-target rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10"
          >
            Återställ idag
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManageScreenTime() {
  const { people, getScreenTimeSettings, getScreenTimeDay } = useFamilyStore();
  const children = people.filter((p) => p.role === "child");
  const [editingId, setEditingId] = useState<string | null>(
    () => children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div>
        <h3 className="font-display text-xl font-bold">Skärmtid</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Daglig tillåtelse. Barnet startar och stoppar på Idag-sidan.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga barn ännu.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {children.map((child) => {
            const settings = getScreenTimeSettings(child.id);
            const day = getScreenTimeDay(child.id);
            const remaining = remainingSeconds(day, now);
            const isEditing = editingId === child.id;
            return (
              <li
                key={child.id}
                className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    {child.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                      {child.name}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-muted)]">
                      {settings?.enabled === false
                        ? "Avstängd"
                        : `${settings?.dailyMinutes ?? 45} min/dag · ${formatClock(remaining)} kvar`}
                      {day?.activeStartedAt ? " · pågår" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingId((id) => (id === child.id ? null : child.id))
                    }
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {isEditing ? "Stäng" : "Ändra"}
                  </button>
                </div>
                {isEditing ? (
                  <div className="border-t border-black/5 px-4 py-4">
                    <ScreenTimeEditor key={child.id} personId={child.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
