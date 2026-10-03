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

  const remaining = remainingSeconds(day, now);
  const used = usedSecondsTotal(day, now);

  return (
    <>
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
    </>
  );
}

export function ManageScreenTime() {
  const { people } = useFamilyStore();
  const children = people.filter((p) => p.role === "child");
  const defaultId =
    children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? EBBE_ID;
  const [personId, setPersonId] = useState(defaultId);

  const selectedId = children.some((p) => p.id === personId)
    ? personId
    : defaultId;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="font-display text-xl font-bold">Skärmtid</h3>
      <p className="text-sm text-[var(--ink-muted)]">
        Daglig tillåtelse. Barnet startar och stoppar på Idag-sidan.
      </p>

      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Barn
        <select
          value={selectedId}
          onChange={(e) => setPersonId(e.target.value)}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.avatar} {child.name}
            </option>
          ))}
        </select>
      </label>

      <ScreenTimeEditor key={selectedId} personId={selectedId} />
    </div>
  );
}
