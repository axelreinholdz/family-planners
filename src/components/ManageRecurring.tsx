"use client";

import { useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { ManageModal } from "@/components/ManageModal";
import { MicButton } from "@/components/MicButton";
import { defaultPersonId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { todayKey, WEEKDAY_LABELS } from "@/lib/dates";
import {
  ACTIVITY_ICONS,
  getIconEmoji,
  resolveActivityEmoji,
} from "@/lib/icons";
import type { IconKey, Person, RecurringTemplate } from "@/lib/types";

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "";
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `från ${startDate}`;
  return `till ${endDate}`;
}

type TemplateFields = {
  personId: string;
  title: string;
  iconKey: IconKey;
  emoji: string;
  weekdays: number[];
  allDay: boolean;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};

function defaultFields(people: Person[], preferredId?: string): TemplateFields {
  return {
    personId: defaultPersonId(people, preferredId),
    title: "Förskola",
    iconKey: "preschool",
    emoji: getIconEmoji("preschool"),
    weekdays: [0, 1, 2, 3, 4],
    allDay: true,
    startTime: "16:00",
    endTime: "17:00",
    startDate: todayKey(),
    endDate: "",
  };
}

function fieldsFromTemplate(template: RecurringTemplate): TemplateFields {
  return {
    personId: template.personId,
    title: template.title,
    iconKey: template.iconKey,
    emoji: resolveActivityEmoji(template.iconKey, template.emoji),
    weekdays: [...template.weekdays],
    allDay: template.allDay,
    startTime: template.startTime ?? "16:00",
    endTime: template.endTime ?? "17:00",
    startDate: template.startDate ?? todayKey(),
    endDate: template.endDate ?? "",
  };
}

function TemplateFormFields({
  people,
  fields,
  onChange,
}: {
  people: Person[];
  fields: TemplateFields;
  onChange: (next: TemplateFields) => void;
}) {
  const toggleDay = (day: number) => {
    const weekdays = fields.weekdays.includes(day)
      ? fields.weekdays.filter((d) => d !== day)
      : [...fields.weekdays, day].sort();
    onChange({ ...fields, weekdays });
  };

  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Vem
        <select
          value={fields.personId}
          onChange={(e) => onChange({ ...fields, personId: e.target.value })}
          className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
        Titel
        <span className="flex gap-2">
          <input
            value={fields.title}
            onChange={(e) => onChange({ ...fields, title: e.target.value })}
            className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
          />
          <MicButton
            value={fields.title}
            onTranscript={(text) => onChange({ ...fields, title: text })}
          />
        </span>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
          Ikon
        </legend>
        <IconPicker
          category="activity"
          value={fields.emoji}
          onChange={(icon) => {
            const nextTitle =
              !fields.title ||
              ACTIVITY_ICONS.some((i) => i.label === fields.title) ||
              fields.title === "Egen"
                ? icon.label !== "Egen"
                  ? icon.label
                  : fields.title
                : fields.title;
            onChange({
              ...fields,
              iconKey: icon.key as IconKey,
              emoji: icon.emoji,
              title: nextTitle,
            });
          }}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
          Dagar
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, day) => {
            const on = fields.weekdays.includes(day);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                className={`tap-target h-11 w-11 rounded-xl text-sm font-bold uppercase ${
                  on
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
                }`}
              >
                {label.slice(0, 1)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Från datum
          <input
            type="date"
            required
            value={fields.startDate}
            onChange={(e) => onChange({ ...fields, startDate: e.target.value })}
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Till datum
          <input
            type="date"
            value={fields.endDate}
            min={fields.startDate || undefined}
            onChange={(e) => onChange({ ...fields, endDate: e.target.value })}
            className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
          />
        </label>
      </div>
      <p className="text-xs text-[var(--ink-faint)]">
        Lämna till-datum tomt för att köra tills vidare — då fylls ca 26
        kommande veckor automatiskt.
      </p>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={fields.allDay}
          onChange={(e) => onChange({ ...fields, allDay: e.target.checked })}
          className="h-5 w-5"
        />
        Heldag
      </label>

      {!fields.allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Starttid
            <input
              type="time"
              value={fields.startTime}
              onChange={(e) =>
                onChange({ ...fields, startTime: e.target.value })
              }
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Sluttid
            <input
              type="time"
              value={fields.endTime}
              onChange={(e) => onChange({ ...fields, endTime: e.target.value })}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}

function payloadFromFields(fields: TemplateFields, enabled: boolean) {
  return {
    personId: fields.personId,
    title: fields.title.trim(),
    iconKey: fields.iconKey,
    emoji: fields.emoji,
    weekdays: [...fields.weekdays].sort(),
    allDay: fields.allDay,
    startTime: fields.allDay ? undefined : fields.startTime,
    endTime: fields.allDay ? undefined : fields.endTime,
    startDate: fields.startDate,
    endDate: fields.endDate || undefined,
    enabled,
  };
}

export function ManageRecurring() {
  const {
    people,
    recurringTemplates,
    createRecurringTemplate,
    saveRecurringTemplate,
    removeRecurringTemplate,
    fillAllRecurringTemplates,
  } = useFamilyStore();

  const [filterPersonId, setFilterPersonId] = useState(() =>
    defaultPersonId(people),
  );
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createFields, setCreateFields] = useState<TemplateFields>(() =>
    defaultFields(people),
  );
  const [editFields, setEditFields] = useState<TemplateFields | null>(null);

  const activeFilterId = defaultPersonId(people, filterPersonId);
  const filterPerson = people.find((p) => p.id === activeFilterId);
  const filteredTemplates = recurringTemplates.filter(
    (template) => template.personId === activeFilterId,
  );

  const closeCreate = () => {
    setCreating(false);
    setCreateFields(defaultFields(people, activeFilterId));
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !createFields.personId ||
      !createFields.title.trim() ||
      createFields.weekdays.length === 0 ||
      !createFields.startDate
    ) {
      return;
    }
    if (
      createFields.endDate &&
      createFields.endDate < createFields.startDate
    ) {
      return;
    }
    await createRecurringTemplate(payloadFromFields(createFields, true));
    closeCreate();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Återkommande</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Mallar fyller Vecka för hela perioden.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fillAllRecurringTemplates()}
            className="tap-target rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-sm ring-1 ring-black/10"
          >
            Fyll perioden
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateFields(defaultFields(people, activeFilterId));
              setCreating(true);
            }}
            className="tap-target rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
          >
            + Ny mall
          </button>
        </div>
      </div>

      <PersonTabs
        people={people}
        selectedId={activeFilterId}
        roles={["child", "parent"]}
        label="Välj person"
        onSelect={(id) => {
          setFilterPersonId(id);
          setEditingId(null);
          setEditFields(null);
        }}
      />

      {filteredTemplates.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga mallar för {filterPerson?.name ?? "denna person"} ännu.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredTemplates.map((template) => {
            const days =
              template.weekdays.length > 0
                ? template.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
                : "inga dagar";
            const icon = resolveActivityEmoji(
              template.iconKey,
              template.emoji,
            );
            const range = formatDateRange(
              template.startDate,
              template.endDate,
            );
            const isEditing = editingId === template.id;

            return (
              <li
                key={template.id}
                className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-[var(--ink)]">
                      {template.title}
                      {!template.enabled ? (
                        <span className="ml-2 text-sm font-semibold text-[var(--ink-muted)]">
                          (pausad)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-muted)]">
                      {days}
                      {template.startTime ? ` · ${template.startTime}` : ""}
                      {range ? ` · ${range}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void saveRecurringTemplate({
                        ...template,
                        enabled: !template.enabled,
                      })
                    }
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {template.enabled ? "Pausa" : "Aktivera"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        setEditingId(null);
                        setEditFields(null);
                      } else {
                        setEditingId(template.id);
                        setEditFields(fieldsFromTemplate(template));
                      }
                    }}
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {isEditing ? "Stäng" : "Ändra"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Ta bort mallen?")) {
                        void removeRecurringTemplate(template.id);
                      }
                    }}
                    className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-red-700"
                  >
                    Ta bort
                  </button>
                </div>

                {isEditing && editFields ? (
                  <form
                    className="flex flex-col gap-3 border-t border-black/5 px-4 py-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (
                        !editFields.personId ||
                        !editFields.title.trim() ||
                        editFields.weekdays.length === 0 ||
                        !editFields.startDate
                      ) {
                        return;
                      }
                      if (
                        editFields.endDate &&
                        editFields.endDate < editFields.startDate
                      ) {
                        return;
                      }
                      void saveRecurringTemplate({
                        ...template,
                        ...payloadFromFields(editFields, template.enabled),
                      }).then(() => {
                        setEditingId(null);
                        setEditFields(null);
                      });
                    }}
                  >
                    <TemplateFormFields
                      people={people}
                      fields={editFields}
                      onChange={setEditFields}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditFields(null);
                        }}
                        className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
                      >
                        Avbryt
                      </button>
                      <button
                        type="submit"
                        className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
                      >
                        Spara mall
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-[var(--ink-faint)]">
        Utan till-datum fylls ca 26 kommande veckor. Ändringar i mallen uppdaterar
        länkade aktiviteter.
      </p>

      {creating ? (
        <ManageModal
          title="Ny återkommande"
          description="Mallar fyller Vecka för hela perioden (från–till)."
          onClose={closeCreate}
        >
          <form
            onSubmit={(e) => void onCreate(e)}
            className="flex flex-col gap-3"
          >
            <TemplateFormFields
              people={people}
              fields={createFields}
              onChange={setCreateFields}
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
  );
}
