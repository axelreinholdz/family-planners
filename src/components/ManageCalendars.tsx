"use client";

import { useEffect, useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { ManageModal } from "@/components/ManageModal";
import { defaultChildId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { addDays, toDateKey, todayKey } from "@/lib/dates";
import { getIconEmoji, resolveActivityEmoji } from "@/lib/icons";
import type { CalendarSubscription, IconKey, Person } from "@/lib/types";

type CalendarFields = {
  personId: string;
  name: string;
  url: string;
  iconKey: IconKey;
  emoji: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
};

function defaultEndDate(): string {
  return toDateKey(addDays(new Date(), 90));
}

function defaultFields(people: Person[], preferredId?: string): CalendarFields {
  return {
    personId: defaultChildId(people, preferredId),
    name: "",
    url: "",
    iconKey: "preschool",
    emoji: getIconEmoji("preschool"),
    startDate: todayKey(),
    endDate: defaultEndDate(),
    enabled: true,
  };
}

function fieldsFromSubscription(
  subscription: CalendarSubscription,
): CalendarFields {
  return {
    personId: subscription.personId,
    name: subscription.name,
    url: subscription.url,
    iconKey: subscription.iconKey,
    emoji: resolveActivityEmoji(subscription.iconKey, subscription.emoji),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    enabled: subscription.enabled,
  };
}

function formatSyncMeta(subscription: CalendarSubscription): string {
  const range = `${subscription.startDate} – ${subscription.endDate}`;
  if (subscription.lastError) return `${range} · fel`;
  if (subscription.lastSyncedAt) {
    const when = new Date(subscription.lastSyncedAt);
    const label = Number.isNaN(when.getTime())
      ? "synkad"
      : when.toLocaleString("sv-SE", {
          dateStyle: "short",
          timeStyle: "short",
        });
    return `${range} · ${label}`;
  }
  return `${range} · inte synkad`;
}

function CalendarFormFields({
  people,
  fields,
  onChange,
}: {
  people: Person[];
  fields: CalendarFields;
  onChange: (next: CalendarFields) => void;
}) {
  const children = people.filter((p) => p.role === "child");

  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Barn
        <select
          value={fields.personId}
          onChange={(e) => onChange({ ...fields, personId: e.target.value })}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        >
          {children.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Namn
        <input
          value={fields.name}
          onChange={(e) => onChange({ ...fields, name: e.target.value })}
          placeholder="T.ex. Förskolan"
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        ICS-adress (URL)
        <input
          value={fields.url}
          onChange={(e) => onChange({ ...fields, url: e.target.value })}
          placeholder="https://…"
          inputMode="url"
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Från
          <input
            type="date"
            value={fields.startDate}
            onChange={(e) =>
              onChange({ ...fields, startDate: e.target.value })
            }
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Till
          <input
            type="date"
            value={fields.endDate}
            onChange={(e) => onChange({ ...fields, endDate: e.target.value })}
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
          Ikon
        </legend>
        <IconPicker
          category="activity"
          value={fields.emoji}
          onChange={(icon) =>
            onChange({
              ...fields,
              iconKey: icon.key as IconKey,
              emoji: icon.emoji,
            })
          }
        />
      </fieldset>
    </>
  );
}

function isValidFields(fields: CalendarFields): boolean {
  if (!fields.personId || !fields.name.trim() || !fields.url.trim()) {
    return false;
  }
  if (!fields.startDate || !fields.endDate) return false;
  if (fields.startDate > fields.endDate) return false;
  try {
    const parsed = new URL(fields.url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ManageCalendars() {
  const {
    people,
    calendarSubscriptions,
    createCalendarSubscription,
    saveCalendarSubscription,
    removeCalendarSubscription,
    syncCalendarSubscription,
    syncAllCalendarSubscriptions,
  } = useFamilyStore();

  const children = people.filter((p) => p.role === "child");
  const [filterPersonId, setFilterPersonId] = useState(() =>
    defaultChildId(people),
  );
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [createFields, setCreateFields] = useState(() =>
    defaultFields(people),
  );

  const activeFilterId = defaultChildId(people, filterPersonId);
  const filtered = calendarSubscriptions.filter(
    (subscription) => subscription.personId === activeFilterId,
  );
  const filterPerson = children.find((p) => p.id === activeFilterId);

  useEffect(() => {
    void syncAllCalendarSubscriptions();
  }, [syncAllCalendarSubscriptions]);

  const resetCreate = () => {
    setCreateFields(defaultFields(people, activeFilterId));
  };

  const closeCreate = () => {
    setCreating(false);
    resetCreate();
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidFields(createFields)) return;
    const emoji =
      createFields.emoji || getIconEmoji(createFields.iconKey) || undefined;
    await createCalendarSubscription({
      personId: createFields.personId,
      name: createFields.name.trim(),
      url: createFields.url.trim(),
      iconKey: createFields.iconKey,
      emoji,
      enabled: true,
      startDate: createFields.startDate,
      endDate: createFields.endDate,
    });
    closeCreate();
    await syncAllCalendarSubscriptions({ force: true });
  };

  const runSync = async (id: string) => {
    setSyncingId(id);
    try {
      await syncCalendarSubscription(id, { force: true });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Kalendrar</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Prenumerera på skol- eller lagkalender (ICS). Aktiviteter skapas och
            uppdateras inom valt datumintervall.
          </p>
        </div>
        <button
          type="button"
          disabled={children.length === 0}
          onClick={() => {
            resetCreate();
            setCreating(true);
          }}
          className="tap-target shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          + Ny kalender
        </button>
      </div>

      <PersonTabs
        people={people}
        selectedId={activeFilterId}
        roles={["child"]}
        label="Välj barn"
        onSelect={(id) => {
          setFilterPersonId(id);
          setEditingId(null);
        }}
      />

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Lägg till ett barn under Personer för att koppla kalendrar.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga kalendrar för {filterPerson?.name ?? "detta barn"} ännu.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((subscription) => {
            const isEditing = editingId === subscription.id;
            return (
              <CalendarRow
                key={subscription.id}
                people={people}
                subscription={subscription}
                isEditing={isEditing}
                syncing={syncingId === subscription.id}
                onToggleEdit={() =>
                  setEditingId((id) =>
                    id === subscription.id ? null : subscription.id,
                  )
                }
                onSync={() => void runSync(subscription.id)}
                onToggleEnabled={() =>
                  void saveCalendarSubscription({
                    ...subscription,
                    enabled: !subscription.enabled,
                  }).then(() => {
                    if (!subscription.enabled) {
                      void runSync(subscription.id);
                    }
                  })
                }
                onDelete={() => {
                  if (
                    window.confirm(
                      `Ta bort kalendern “${subscription.name}”? Synkade aktiviteter raderas.`,
                    )
                  ) {
                    void removeCalendarSubscription(subscription.id);
                  }
                }}
                onSave={(fields) => {
                  if (!isValidFields(fields)) return;
                  void saveCalendarSubscription({
                    ...subscription,
                    personId: fields.personId,
                    name: fields.name.trim(),
                    url: fields.url.trim(),
                    iconKey: fields.iconKey,
                    emoji:
                      fields.emoji ||
                      getIconEmoji(fields.iconKey) ||
                      undefined,
                    enabled: fields.enabled,
                    startDate: fields.startDate,
                    endDate: fields.endDate,
                  }).then(() => {
                    setEditingId(null);
                    void runSync(subscription.id);
                  });
                }}
              />
            );
          })}
        </ul>
      )}

      {creating ? (
        <ManageModal
          title="Ny kalender"
          description="Klistra in ICS-URL och välj datumintervall att synka."
          onClose={closeCreate}
        >
          <form
            onSubmit={(e) => void onCreate(e)}
            className="flex flex-col gap-3"
          >
            <CalendarFormFields
              people={people}
              fields={createFields}
              onChange={setCreateFields}
            />
            <button
              type="submit"
              disabled={!isValidFields(createFields)}
              className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Lägg till och synka
            </button>
          </form>
        </ManageModal>
      ) : null}
    </div>
  );
}

function CalendarRow({
  people,
  subscription,
  isEditing,
  syncing,
  onToggleEdit,
  onSync,
  onToggleEnabled,
  onDelete,
  onSave,
}: {
  people: Person[];
  subscription: CalendarSubscription;
  isEditing: boolean;
  syncing: boolean;
  onToggleEdit: () => void;
  onSync: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onSave: (fields: CalendarFields) => void;
}) {
  return (
    <li className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-2xl" aria-hidden>
          {resolveActivityEmoji(subscription.iconKey, subscription.emoji)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
            {subscription.name}
            {!subscription.enabled ? (
              <span className="ml-2 text-sm font-semibold text-[var(--ink-muted)]">
                (pausad)
              </span>
            ) : null}
          </p>
          <p className="truncate text-sm text-[var(--ink-muted)]">
            {formatSyncMeta(subscription)}
          </p>
          {subscription.lastError ? (
            <p className="truncate text-sm font-semibold text-red-700">
              {subscription.lastError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || !subscription.enabled}
          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)] disabled:opacity-40"
        >
          {syncing ? "Synkar…" : "Uppdatera"}
        </button>
        <button
          type="button"
          onClick={onToggleEnabled}
          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--ink-muted)]"
        >
          {subscription.enabled ? "Pausa" : "Aktivera"}
        </button>
        <button
          type="button"
          onClick={onToggleEdit}
          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
        >
          {isEditing ? "Stäng" : "Ändra"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
        >
          Ta bort
        </button>
      </div>
      {isEditing ? (
        <CalendarEditForm
          key={`${subscription.id}:${subscription.lastSyncedAt ?? ""}:${subscription.startDate}:${subscription.endDate}`}
          people={people}
          subscription={subscription}
          onSave={onSave}
        />
      ) : null}
    </li>
  );
}

function CalendarEditForm({
  people,
  subscription,
  onSave,
}: {
  people: Person[];
  subscription: CalendarSubscription;
  onSave: (fields: CalendarFields) => void;
}) {
  const [fields, setFields] = useState(() =>
    fieldsFromSubscription(subscription),
  );

  return (
    <form
      className="flex flex-col gap-3 border-t border-black/5 px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(fields);
      }}
    >
      <CalendarFormFields
        people={people}
        fields={fields}
        onChange={setFields}
      />
      <button
        type="submit"
        disabled={!isValidFields(fields)}
        className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
      >
        Spara och synka
      </button>
    </form>
  );
}
