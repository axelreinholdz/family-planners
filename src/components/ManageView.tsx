"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/components/ActivityIcon";
import { IconPicker } from "@/components/IconPicker";
import { ManageDinners } from "@/components/ManageDinners";
import { ManageRecurring } from "@/components/ManageRecurring";
import { ManageRoutines } from "@/components/ManageRoutines";
import { ManageScreenTime } from "@/components/ManageScreenTime";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import {
  addDays,
  dayLabel,
  startOfWeek,
  toDateKey,
  weekDays,
  weekRangeLabel,
} from "@/lib/dates";
import { ACTIVITY_ICONS, getActivityIcon } from "@/lib/icons";
import {
  getCachedMembership,
  isCloudMode,
  setCloudMode,
} from "@/lib/repository";
import {
  isDefaultManagePin,
  setManagePin,
  verifyManagePin,
} from "@/lib/managePin";
import { createClient } from "@/lib/supabase/client";
import { clearCloudCache } from "@/lib/supabase/cloud-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Event, IconKey, Person } from "@/lib/types";

interface ManageViewProps {
  onBack: () => void;
}

type Tab =
  | "activities"
  | "recurring"
  | "routines"
  | "dinners"
  | "screentime"
  | "people"
  | "settings";

export function ManageView({ onBack }: ManageViewProps) {
  const {
    people,
    events,
    ready,
    createEvent,
    saveEvent,
    removeEvent,
    savePerson,
    resetData,
  } = useFamilyStore();

  const [tab, setTab] = useState<Tab>("activities");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [editing, setEditing] = useState<Event | null>(null);

  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [title, setTitle] = useState("");
  const [iconKey, setIconKey] = useState<IconKey>("preschool");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");

  const selectedPersonId =
    personId && people.some((p) => p.id === personId)
      ? personId
      : (people.find((p) => p.role === "child")?.id ?? people[0]?.id ?? "");

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);

  const weekEvents = useMemo(() => {
    const keys = new Set(days.map(toDateKey));
    return events
      .filter((e) => keys.has(e.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [events, days]);

  const personMap = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people],
  );

  const resetForm = (nextPersonId?: string) => {
    setEditing(null);
    setPersonId(nextPersonId ?? people.find((p) => p.role === "child")?.id ?? people[0]?.id ?? "");
    setDate(toDateKey(new Date()));
    setTitle("");
    setIconKey("preschool");
    setAllDay(true);
    setStartTime("16:00");
    setEndTime("17:00");
  };

  const startEdit = (event: Event) => {
    setEditing(event);
    setPersonId(event.personId);
    setDate(event.date);
    setTitle(event.title);
    setIconKey(event.iconKey);
    setAllDay(event.allDay);
    setStartTime(event.startTime ?? "16:00");
    setEndTime(event.endTime ?? "17:00");
    setTab("activities");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim()) return;

    const payload = {
      personId: selectedPersonId,
      date,
      title: title.trim(),
      iconKey,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
    };

    if (editing) {
      await saveEvent({ ...editing, ...payload });
    } else {
      await createEvent(payload);
    }
    resetForm(selectedPersonId);
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-3 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="tap-target rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-black/5"
        >
          ← Tillbaka
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
            Hantera
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Föräldraläge — lägg till och ändra
          </p>
        </div>
        <div className="w-24" />
      </header>

      <nav className="flex flex-wrap gap-2 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5">
        {(
          [
            ["activities", "Aktiviteter"],
            ["recurring", "Återkommande"],
            ["routines", "Rutiner"],
            ["dinners", "Middagsmeny"],
            ["screentime", "Skärmtid"],
            ["people", "Personer"],
            ["settings", "Inställningar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`tap-target min-w-[6.5rem] flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
              tab === id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "activities" ? (
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
          >
            <h3 className="font-display text-xl font-bold">
              {editing ? "Redigera aktivitet" : "Ny aktivitet"}
            </h3>

            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Vem
              <select
                value={selectedPersonId}
                onChange={(e) => setPersonId(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.avatar} {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Dag
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Titel
              <span className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="t.ex. Förskola"
                  className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
                />
                <MicButton
                  value={title}
                  append
                  onTranscript={setTitle}
                  label="Tala in aktivitetstitel"
                />
              </span>
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
                Ikon
              </legend>
              <IconPicker
                category="activity"
                value={getActivityIcon(iconKey).emoji}
                onChange={(icon) => {
                  setIconKey(icon.key as IconKey);
                  if (!title || ACTIVITY_ICONS.some((i) => i.label === title)) {
                    setTitle(icon.label);
                  }
                }}
              />
            </fieldset>

            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-5 w-5"
              />
              Heldag
            </label>

            {!allDay ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                  Start
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                  Slut
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-auto flex gap-2 pt-2">
              {editing ? (
                <button
                  type="button"
                  onClick={() => resetForm(selectedPersonId)}
                  className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
                >
                  Avbryt
                </button>
              ) : null}
              <button
                type="submit"
                className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
              >
                {editing ? "Spara" : "Lägg till"}
              </button>
            </div>
          </form>

          <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="tap-target rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-black/5"
                onClick={() => setWeekAnchor((d) => addDays(d, -7))}
              >
                ←
              </button>
              <p className="text-sm font-bold text-[var(--ink)]">
                {weekRangeLabel(weekAnchor)}
              </p>
              <button
                type="button"
                className="tap-target rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-black/5"
                onClick={() => setWeekAnchor((d) => addDays(d, 7))}
              >
                →
              </button>
            </div>

            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {weekEvents.length === 0 ? (
                <li className="py-8 text-center text-sm text-[var(--ink-muted)]">
                  Inga aktiviteter den här veckan.
                </li>
              ) : (
                weekEvents.map((event) => {
                  const person = personMap[event.personId] as Person | undefined;
                  const day = days.find((d) => toDateKey(d) === event.date);
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-2"
                    >
                      <ActivityIcon iconKey={event.iconKey} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[var(--ink)]">
                          {event.title}
                        </p>
                        <p className="text-xs font-medium text-[var(--ink-muted)]">
                          {person ? `${person.avatar} ${person.name}` : "?"}
                          {day ? ` · ${dayLabel(day)}` : ""}
                          {event.startTime ? ` · ${event.startTime}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(event)}
                        className="tap-target rounded-full px-3 py-1 text-sm font-bold text-[var(--accent-deep)]"
                      >
                        Ändra
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeEvent(event.id)}
                        className="tap-target rounded-full px-3 py-1 text-sm font-bold text-red-700"
                      >
                        Ta bort
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "recurring" ? <ManageRecurring /> : null}

      {tab === "routines" ? <ManageRoutines /> : null}

      {tab === "dinners" ? <ManageDinners /> : null}

      {tab === "screentime" ? <ManageScreenTime /> : null}

      {tab === "people" ? (
        <div className="grid gap-3 overflow-y-auto sm:grid-cols-2">
          {people.map((person) => (
            <PersonEditor
              key={person.id}
              person={person}
              onSave={(next) => void savePerson(next)}
            />
          ))}
        </div>
      ) : null}

      {tab === "settings" ? (
        <SettingsPanel onReset={() => void resetData()} />
      ) : null}
    </div>
  );
}

function SettingsPanel({ onReset }: { onReset: () => void }) {
  const router = useRouter();
  const cloud = isCloudMode();
  const membership = getCachedMembership();
  const configured = isSupabaseConfigured();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
      <h3 className="font-display text-xl font-bold">Inställningar</h3>

      <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
        <h4 className="font-display text-lg font-bold">PIN till Hantera</h4>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Skyddar föräldraläget på den här enheten.
          {isDefaultManagePin() ? " Standardkod: 1234." : ""}
        </p>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPinMessage(null);
            setPinError(null);
            try {
              if (!verifyManagePin(currentPin)) {
                setPinError("Nuvarande PIN är fel");
                return;
              }
              if (newPin !== confirmPin) {
                setPinError("Nya PIN-koderna matchar inte");
                return;
              }
              setManagePin(newPin);
              setCurrentPin("");
              setNewPin("");
              setConfirmPin("");
              setPinMessage("PIN sparad");
            } catch (err) {
              setPinError(
                err instanceof Error ? err.message : "Kunde inte spara PIN",
              );
            }
          }}
        >
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Nuvarande PIN
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={currentPin}
              onChange={(e) =>
                setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Ny PIN (4–6 siffror)
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Bekräfta ny PIN
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base tracking-widest"
            />
          </label>
          {pinError ? (
            <p className="text-sm font-semibold text-red-700">{pinError}</p>
          ) : null}
          {pinMessage ? (
            <p className="text-sm font-semibold text-[var(--accent-deep)]">
              {pinMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={
              currentPin.length < 4 ||
              newPin.length < 4 ||
              confirmPin.length < 4
            }
            className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Byt PIN
          </button>
        </form>
      </div>

      {cloud && membership ? (
        <>
          <p className="text-sm text-[var(--ink-muted)]">
            Data synkas via Supabase för familjen{" "}
            <strong>{membership.familyName}</strong>. Dela koden nedan för att
            logga in från telefon eller annan dator.
          </p>
          <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Inbjudningskod
            </p>
            <p className="font-display text-3xl font-bold tracking-[0.2em] text-[var(--ink)]">
              {membership.inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                clearCloudCache();
                setCloudMode(false);
                router.replace("/");
                router.refresh();
              })();
            }}
            className="tap-target rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
          >
            Logga ut
          </button>
        </>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          {configured
            ? "Du kör lokalt just nu. Logga in för att synka mellan enheter."
            : "Data sparas lokalt på den här enheten (IndexedDB). Lägg till Supabase-nycklar för molnsynk."}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              "Vill du återställa till exempeldata? Allt ni har lagt in raderas.",
            )
          ) {
            onReset();
          }
        }}
        className="tap-target rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"
      >
        Återställ exempeldata
      </button>
    </div>
  );
}

function PersonEditor({
  person,
  onSave,
}: {
  person: Person;
  onSave: (person: Person) => void;
}) {
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [avatar, setAvatar] = useState(person.avatar);

  return (
    <form
      className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...person, name: name.trim() || person.name, color, avatar });
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-3xl"
          style={{ backgroundColor: `${color}33` }}
        >
          {avatar}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {person.role === "child" ? "Barn" : "Förälder"}
          </p>
          <p className="font-display text-lg font-bold">{person.name}</p>
        </div>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Namn
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
          Ikon
        </legend>
        <IconPicker
          category="person"
          value={avatar}
          onChange={(icon) => setAvatar(icon.emoji)}
        />
      </fieldset>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Färg
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-black/10 bg-white"
        />
      </label>
      <button
        type="submit"
        className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
      >
        Spara person
      </button>
    </form>
  );
}
