"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/components/ActivityIcon";
import { IconPicker } from "@/components/IconPicker";
import { ManageDinners } from "@/components/ManageDinners";
import { ManageModal } from "@/components/ManageModal";
import { ManageRecurring } from "@/components/ManageRecurring";
import { ManageRoutines } from "@/components/ManageRoutines";
import { ManageScreenTime } from "@/components/ManageScreenTime";
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
import type { Event, IconKey, Person, PersonRole } from "@/lib/types";

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
    createPerson,
    removePerson,
    resetData,
  } = useFamilyStore();

  const [tab, setTab] = useState<Tab>("activities");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [creating, setCreating] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);
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

  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<PersonRole>("child");
  const [newPersonColor, setNewPersonColor] = useState("#2A9D8F");
  const [newPersonAvatar, setNewPersonAvatar] = useState(() =>
    getIconEmoji("boy"),
  );

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

  const resetCreatePersonForm = () => {
    setNewPersonName("");
    setNewPersonRole("child");
    setNewPersonColor("#2A9D8F");
    setNewPersonAvatar(getIconEmoji("boy"));
  };

  const closeCreatePerson = () => {
    setCreatingPerson(false);
    resetCreatePersonForm();
  };

  const onCreatePerson = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    await createPerson({
      name: newPersonName,
      role: newPersonRole,
      color: newPersonColor,
      avatar: newPersonAvatar,
    });
    closeCreatePerson();
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
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

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
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
                        </p>
                      </div>
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
                      <button
                        type="button"
                        onClick={() => void removeEvent(event.id)}
                        className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
                      >
                        Ta bort
                      </button>
                    </div>
                    {isEditing ? (
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

      {tab === "routines" ? <ManageRoutines /> : null}

      {tab === "dinners" ? <ManageDinners /> : null}

      {tab === "screentime" ? <ManageScreenTime /> : null}

      {tab === "people" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold">Personer</h3>
              <p className="text-sm text-[var(--ink-muted)]">
                Lägg till, ta bort och ändra typ (förälder eller barn).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCreatePersonForm();
                setCreatingPerson(true);
              }}
              className="tap-target shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
            >
              + Ny person
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {people
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  canDelete={people.length > 1}
                  onSave={(next) => void savePerson(next)}
                  onDelete={() => {
                    if (
                      !window.confirm(
                        `Ta bort ${person.name}? Aktiviteter, rutiner och skärmtid för personen raderas.`,
                      )
                    ) {
                      return;
                    }
                    void removePerson(person.id);
                  }}
                />
              ))}
          </ul>

          {creatingPerson ? (
            <ManageModal
              title="Ny person"
              description="Välj namn, typ, ikon och färg."
              onClose={closeCreatePerson}
            >
              <form
                onSubmit={(e) => void onCreatePerson(e)}
                className="flex flex-col gap-3"
              >
                <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                  Namn
                  <input
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
                    placeholder="T.ex. Ebbe"
                    autoFocus
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
                    Typ
                  </legend>
                  <div className="flex gap-2">
                    {(
                      [
                        ["child", "Barn"],
                        ["parent", "Förälder"],
                      ] as const
                    ).map(([role, label]) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewPersonRole(role)}
                        className={`tap-target flex-1 rounded-xl px-3 py-2.5 text-sm font-bold ${
                          newPersonRole === role
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
                    Ikon
                  </legend>
                  <IconPicker
                    category="person"
                    value={newPersonAvatar}
                    onChange={(icon) => setNewPersonAvatar(icon.emoji)}
                  />
                </fieldset>
                <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
                  Färg
                  <input
                    type="color"
                    value={newPersonColor}
                    onChange={(e) => setNewPersonColor(e.target.value)}
                    className="h-12 w-full cursor-pointer rounded-xl border border-black/10 bg-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!newPersonName.trim()}
                  className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  Lägg till person
                </button>
              </form>
            </ManageModal>
          ) : null}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <SettingsPanel onReset={() => void resetData()} />
        </div>
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
          {cloud
            ? "Skyddar föräldraläget för ditt konto (synkas mellan enheter). Soft gate — inte hög säkerhet."
            : "Skyddar föräldraläget på den här enheten."}
          {isDefaultManagePin() ? " Standardkod: 1234." : ""}
        </p>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPinMessage(null);
            setPinError(null);
            void (async () => {
              try {
                if (!(await verifyManagePin(currentPin))) {
                  setPinError("Nuvarande PIN är fel");
                  return;
                }
                if (newPin !== confirmPin) {
                  setPinError("Nya PIN-koderna matchar inte");
                  return;
                }
                await setManagePin(newPin);
                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
                setPinMessage(
                  cloud ? "PIN sparad och synkad" : "PIN sparad",
                );
              } catch (err) {
                const message =
                  err instanceof Error
                    ? err.message
                    : err &&
                        typeof err === "object" &&
                        "message" in err &&
                        typeof (err as { message: unknown }).message === "string"
                      ? (err as { message: string }).message
                      : "Kunde inte spara PIN";
                setPinError(message);
              }
            })();
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

function PersonRow({
  person,
  canDelete,
  onSave,
  onDelete,
}: {
  person: Person;
  canDelete: boolean;
  onSave: (person: Person) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState<PersonRole>(person.role);
  const [color, setColor] = useState(person.color);
  const [avatar, setAvatar] = useState(person.avatar);

  return (
    <li className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${person.color}33` }}
        >
          {person.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
            {person.name}
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            {person.role === "child" ? "Barn" : "Förälder"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setName(person.name);
            setRole(person.role);
            setColor(person.color);
            setAvatar(person.avatar);
            setOpen((value) => !value);
          }}
          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
        >
          {open ? "Stäng" : "Ändra"}
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
          >
            Ta bort
          </button>
        ) : null}
      </div>
      {open ? (
        <form
          className="flex flex-col gap-3 border-t border-black/5 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...person,
              name: name.trim() || person.name,
              role,
              color,
              avatar,
            });
            setOpen(false);
          }}
        >
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
              Typ
            </legend>
            <div className="flex gap-2">
              {(
                [
                  ["child", "Barn"],
                  ["parent", "Förälder"],
                ] as const
              ).map(([nextRole, label]) => (
                <button
                  key={nextRole}
                  type="button"
                  onClick={() => setRole(nextRole)}
                  className={`tap-target flex-1 rounded-xl px-3 py-2.5 text-sm font-bold ${
                    role === nextRole
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
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
      ) : null}
    </li>
  );
}
