"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ActivityIcon } from "@/components/ActivityIcon";
import { IconPicker } from "@/components/IconPicker";
import { ManageBeloning } from "@/components/ManageBeloning";
import { ManageCalendars } from "@/components/ManageCalendars";
import { ManageDinners } from "@/components/ManageDinners";
import { ManageModal } from "@/components/ManageModal";
import { ManageRecurring } from "@/components/ManageRecurring";
import { ManageRoutines } from "@/components/ManageRoutines";
import { ManageSchoolLunch } from "@/components/ManageSchoolLunch";
import { ManageNattning } from "@/components/ManageNattning";
import { ManageScreenTime } from "@/components/ManageScreenTime";
import { ManageSettings } from "@/components/ManageSettings";
import { MicButton } from "@/components/MicButton";
import { defaultPersonId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import {
  addDays,
  dayLabel,
  startOfWeek,
  toDateKey,
  weekDays,
  weekRangeLabel,
} from "@/lib/dates";
import { ACTIVITY_ICONS, getIconEmoji, resolveActivityEmoji } from "@/lib/icons";
import type { Event, IconKey, Person } from "@/lib/types";

interface ManageViewProps {
  onBack: () => void;
}

type Tab =
  | "activities"
  | "recurring"
  | "calendars"
  | "routines"
  | "beloning"
  | "dinners"
  | "schoolLunch"
  | "screentime"
  | "nattning"
  | "settings";

export function ManageView({ onBack }: ManageViewProps) {
  const {
    people,
    events,
    ready,
    createEvent,
    saveEvent,
    removeEvent,
  } = useFamilyStore();

  const [tab, setTab] = useState<Tab>("activities");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPersonId, setFilterPersonId] = useState(() =>
    defaultPersonId(people),
  );

  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [title, setTitle] = useState("");
  const [iconKey, setIconKey] = useState<IconKey>("preschool");
  const [emoji, setEmoji] = useState(() => getIconEmoji("preschool"));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");

  const activeFilterId = defaultPersonId(people, filterPersonId);
  const filterPerson = people.find((p) => p.id === activeFilterId);

  const selectedPersonId =
    personId && people.some((p) => p.id === personId)
      ? personId
      : activeFilterId || people[0]?.id || "";

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);

  const weekEvents = useMemo(() => {
    const keys = new Set(days.map(toDateKey));
    return events
      .filter((e) => keys.has(e.date) && e.personId === activeFilterId)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
      );
  }, [events, days, activeFilterId]);

  const resetCreateForm = () => {
    setPersonId(activeFilterId || people[0]?.id || "");
    setDate(toDateKey(new Date()));
    setTitle("");
    setIconKey("preschool");
    setEmoji(getIconEmoji("preschool"));
    setAllDay(true);
    setStartTime("16:00");
    setEndTime("17:00");
  };

  const closeCreate = () => {
    setCreating(false);
    resetCreateForm();
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim()) return;
    await createEvent({
      personId: selectedPersonId,
      date,
      title: title.trim(),
      iconKey,
      emoji,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
    });
    closeCreate();
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
            ["calendars", "Kalendrar"],
            ["routines", "Rutiner"],
            ["beloning", "Belöning"],
            ["dinners", "Middagsmeny"],
            ["schoolLunch", "Skolmat"],
            ["screentime", "Skärmtid"],
            ["nattning", "Nattning"],
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
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="tap-target rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-black/5"
                onClick={() => setWeekAnchor((d) => addDays(d, -7))}
              >
                ←
              </button>
              <p className="text-sm font-bold text-[var(--ink)]">
                {weekRangeLabel(weekAnchor)}
              </p>
              <button
                type="button"
                className="tap-target rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-black/5"
                onClick={() => setWeekAnchor((d) => addDays(d, 7))}
              >
                →
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setCreating(true);
              }}
              className="tap-target shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
            >
              + Ny aktivitet
            </button>
          </div>

          <PersonTabs
            people={people}
            selectedId={activeFilterId}
            roles={["child", "parent"]}
            label="Välj person"
            onSelect={(id) => {
              setFilterPersonId(id);
              setEditingId(null);
            }}
          />

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-0.5">
            {weekEvents.length === 0 ? (
              <li className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
                Inga aktiviteter för {filterPerson?.name ?? "denna person"} den
                här veckan.
              </li>
            ) : (
              weekEvents.map((event) => {
                const day = days.find((d) => toDateKey(d) === event.date);
                const isEditing = editingId === event.id;
                return (
                  <li
                    key={event.id}
                    className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
                  >
                    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                      <ActivityIcon
                        iconKey={event.iconKey}
                        emoji={event.emoji}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                          {event.title}
                        </p>
                        <p className="truncate text-sm text-[var(--ink-muted)]">
                          {day ? dayLabel(day) : event.date}
                          {event.startTime
                            ? ` · ${event.startTime}`
                            : event.allDay
                              ? " · Heldag"
                              : ""}
                          {event.calendarSubscriptionId ? " · kalender" : ""}
                        </p>
                      </div>
                      {event.calendarSubscriptionId ? null : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId((id) =>
                              id === event.id ? null : event.id,
                            )
                          }
                          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                        >
                          {isEditing ? "Stäng" : "Ändra"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeEvent(event.id)}
                        className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
                      >
                        Ta bort
                      </button>
                    </div>
                    {isEditing && !event.calendarSubscriptionId ? (
                      <div className="border-t border-black/5 px-4 py-4">
                        <ActivityEditor
                          people={people}
                          event={event}
                          onCancel={() => setEditingId(null)}
                          onSave={async (next) => {
                            await saveEvent(next);
                            setEditingId(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>

          {creating ? (
            <ManageModal
              title="Ny aktivitet"
              description="Lägg till en engångsaktivitet för veckan."
              onClose={closeCreate}
            >
              <form
                onSubmit={(e) => void onCreate(e)}
                className="flex flex-col gap-3"
              >
                <ActivityFormFields
                  people={people}
                  personId={selectedPersonId}
                  onPersonId={setPersonId}
                  date={date}
                  onDate={setDate}
                  title={title}
                  onTitle={setTitle}
                  emoji={emoji}
                  onIcon={(key, nextEmoji, label) => {
                    setIconKey(key);
                    setEmoji(nextEmoji);
                    if (
                      !title ||
                      ACTIVITY_ICONS.some((i) => i.label === title) ||
                      title === "Egen"
                    ) {
                      if (label !== "Egen") setTitle(label);
                    }
                  }}
                  allDay={allDay}
                  onAllDay={setAllDay}
                  startTime={startTime}
                  onStartTime={setStartTime}
                  endTime={endTime}
                  onEndTime={setEndTime}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
                  >
                    Lägg till
                  </button>
                </div>
              </form>
            </ManageModal>
          ) : null}
        </div>
      ) : null}

      {tab === "recurring" ? <ManageRecurring /> : null}

      {tab === "calendars" ? <ManageCalendars /> : null}

      {tab === "routines" ? <ManageRoutines /> : null}

      {tab === "beloning" ? <ManageBeloning /> : null}

      {tab === "dinners" ? <ManageDinners /> : null}

      {tab === "schoolLunch" ? <ManageSchoolLunch /> : null}

      {tab === "screentime" ? <ManageScreenTime /> : null}

      {tab === "nattning" ? <ManageNattning /> : null}

      {tab === "settings" ? <ManageSettings /> : null}
    </div>
  );
}

function ActivityFormFields({
  people,
  personId,
  onPersonId,
  date,
  onDate,
  title,
  onTitle,
  emoji,
  onIcon,
  allDay,
  onAllDay,
  startTime,
  onStartTime,
  endTime,
  onEndTime,
}: {
  people: Person[];
  personId: string;
  onPersonId: (id: string) => void;
  date: string;
  onDate: (value: string) => void;
  title: string;
  onTitle: (value: string) => void;
  emoji: string;
  onIcon: (key: IconKey, emoji: string, label: string) => void;
  allDay: boolean;
  onAllDay: (value: boolean) => void;
  startTime: string;
  onStartTime: (value: string) => void;
  endTime: string;
  onEndTime: (value: string) => void;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Vem
        <select
          value={personId}
          onChange={(e) => onPersonId(e.target.value)}
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
          onChange={(e) => onDate(e.target.value)}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
        />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Titel
        <span className="flex gap-2">
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="t.ex. Förskola"
            className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-[var(--ink)]"
          />
          <MicButton
            value={title}
            append
            onTranscript={onTitle}
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
          value={emoji}
          onChange={(icon) =>
            onIcon(icon.key as IconKey, icon.emoji, icon.label)
          }
        />
      </fieldset>

      <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => onAllDay(e.target.checked)}
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
              onChange={(e) => onStartTime(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Slut
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTime(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}

function ActivityEditor({
  people,
  event,
  onSave,
  onCancel,
}: {
  people: Person[];
  event: Event;
  onSave: (event: Event) => Promise<void>;
  onCancel: () => void;
}) {
  const [personId, setPersonId] = useState(event.personId);
  const [date, setDate] = useState(event.date);
  const [title, setTitle] = useState(event.title);
  const [iconKey, setIconKey] = useState<IconKey>(event.iconKey);
  const [emoji, setEmoji] = useState(() =>
    resolveActivityEmoji(event.iconKey, event.emoji),
  );
  const [allDay, setAllDay] = useState(event.allDay);
  const [startTime, setStartTime] = useState(event.startTime ?? "16:00");
  const [endTime, setEndTime] = useState(event.endTime ?? "17:00");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!personId || !title.trim()) return;
        void onSave({
          ...event,
          personId,
          date,
          title: title.trim(),
          iconKey,
          emoji,
          allDay,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
        });
      }}
    >
      <ActivityFormFields
        people={people}
        personId={personId}
        onPersonId={setPersonId}
        date={date}
        onDate={setDate}
        title={title}
        onTitle={setTitle}
        emoji={emoji}
        onIcon={(key, nextEmoji, label) => {
          setIconKey(key);
          setEmoji(nextEmoji);
          if (
            !title ||
            ACTIVITY_ICONS.some((i) => i.label === title) ||
            title === "Egen"
          ) {
            if (label !== "Egen") setTitle(label);
          }
        }}
        allDay={allDay}
        onAllDay={setAllDay}
        startTime={startTime}
        onStartTime={setStartTime}
        endTime={endTime}
        onEndTime={setEndTime}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
        >
          Spara
        </button>
      </div>
    </form>
  );
}

