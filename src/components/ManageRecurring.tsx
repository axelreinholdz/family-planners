"use client";

import { useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { todayKey, WEEKDAY_LABELS } from "@/lib/dates";
import {
  ACTIVITY_ICONS,
  getIconEmoji,
  resolveActivityEmoji,
} from "@/lib/icons";
import type { IconKey, RecurringTemplate } from "@/lib/types";

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "";
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `från ${startDate}`;
  return `till ${endDate}`;
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

  const children = people.filter((p) => p.role === "child");
  const [personId, setPersonId] = useState(children[0]?.id ?? "");
  const [title, setTitle] = useState("Förskola");
  const [iconKey, setIconKey] = useState<IconKey>("preschool");
  const [emoji, setEmoji] = useState(() => getIconEmoji("preschool"));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState(() => todayKey());
  const [endDate, setEndDate] = useState("");
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);

  const selectedPersonId =
    personId && people.some((p) => p.id === personId)
      ? personId
      : (children[0]?.id ?? people[0]?.id ?? "");

  const resetForm = () => {
    setEditing(null);
    setPersonId(children[0]?.id ?? "");
    setTitle("Förskola");
    setIconKey("preschool");
    setEmoji(getIconEmoji("preschool"));
    setWeekdays([0, 1, 2, 3, 4]);
    setAllDay(true);
    setStartTime("16:00");
    setEndTime("17:00");
    setStartDate(todayKey());
    setEndDate("");
  };

  const startEdit = (template: RecurringTemplate) => {
    setEditing(template);
    setPersonId(template.personId);
    setTitle(template.title);
    setIconKey(template.iconKey);
    setEmoji(resolveActivityEmoji(template.iconKey, template.emoji));
    setWeekdays([...template.weekdays]);
    setAllDay(template.allDay);
    setStartTime(template.startTime ?? "16:00");
    setEndTime(template.endTime ?? "17:00");
    setStartDate(template.startDate ?? todayKey());
    setEndDate(template.endDate ?? "");
  };

  const toggleDay = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !title.trim() || weekdays.length === 0) return;
    if (!startDate) return;
    if (endDate && endDate < startDate) return;
    const payload = {
      personId: selectedPersonId,
      title: title.trim(),
      iconKey,
      emoji,
      weekdays: [...weekdays].sort(),
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      startDate,
      endDate: endDate || undefined,
      enabled: editing?.enabled ?? true,
    };
    if (editing) {
      await saveRecurringTemplate({ ...editing, ...payload });
    } else {
      await createRecurringTemplate(payload);
    }
    resetForm();
  };

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-2">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
      >
        <h3 className="font-display text-xl font-bold">
          {editing ? "Redigera mall" : "Ny återkommande"}
        </h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Mallar fyller Vecka för hela perioden (från–till). Byt vecka för att
          se fler.
        </p>

        <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
          Vem
          <select
            value={selectedPersonId}
            onChange={(e) => setPersonId(e.target.value)}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="tap-target min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
            />
            <MicButton value={title} onTranscript={setTitle} />
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
            Ikon
          </legend>
          <IconPicker
            category="activity"
            value={emoji}
            onChange={(icon) => {
              setIconKey(icon.key as IconKey);
              setEmoji(icon.emoji);
              if (
                !title ||
                ACTIVITY_ICONS.some((i) => i.label === title) ||
                title === "Egen"
              ) {
                if (icon.label !== "Egen") setTitle(icon.label);
              }
            }}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
            Dagar
          </legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => {
              const on = weekdays.includes(day);
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Till datum
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
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
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-5 w-5"
          />
          Heldag
        </label>

        {!allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Starttid
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Sluttid
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 pt-2">
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="tap-target flex-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
            >
              Avbryt
            </button>
          ) : null}
          <button
            type="submit"
            className="tap-target flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white"
          >
            {editing ? "Spara mall" : "Lägg till mall"}
          </button>
        </div>
      </form>

      <div className="flex min-h-0 flex-col gap-3 rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold">Aktiva mallar</h3>
          <button
            type="button"
            onClick={() => void fillAllRecurringTemplates()}
            className="tap-target rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10"
          >
            Fyll perioden
          </button>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {recurringTemplates.length === 0 ? (
            <li className="py-8 text-center text-sm text-[var(--ink-muted)]">
              Inga mallar ännu.
            </li>
          ) : (
            recurringTemplates.map((template) => {
              const person = people.find((p) => p.id === template.personId);
              const days =
                template.weekdays.length > 0
                  ? template.weekdays
                      .map((d) => WEEKDAY_LABELS[d])
                      .join(", ")
                  : "inga dagar";
              const icon = resolveActivityEmoji(
                template.iconKey,
                template.emoji,
              );
              const range = formatDateRange(
                template.startDate,
                template.endDate,
              );
              return (
                <li
                  key={template.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-3 py-3"
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--ink)]">
                      {template.title}
                    </p>
                    <p className="text-xs font-medium text-[var(--ink-muted)]">
                      {person
                        ? `${person.avatar} ${person.name}`
                        : "?"}{" "}
                      · {days}
                      {template.startTime ? ` · ${template.startTime}` : ""}
                      {range ? ` · ${range}` : ""}
                      {!template.enabled ? " · pausad" : ""}
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
                    className="tap-target rounded-full px-3 py-1 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    {template.enabled ? "Pausa" : "Aktivera"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(template)}
                    className="tap-target rounded-full px-3 py-1 text-sm font-bold text-[var(--accent-deep)]"
                  >
                    Ändra
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Ta bort mallen?")) {
                        void removeRecurringTemplate(template.id);
                      }
                    }}
                    className="tap-target rounded-full px-3 py-1 text-sm font-bold text-red-700"
                  >
                    Ta bort
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <p className="text-xs text-[var(--ink-faint)]">
          Utan till-datum fylls ca 26 kommande veckor. Befintliga
          mallhändelser ändras inte när du pausar.
        </p>
      </div>
    </div>
  );
}
