"use client";

import { useState, type FormEvent } from "react";
import { IconPicker } from "@/components/IconPicker";
import { ManageModal } from "@/components/ManageModal";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { getIconEmoji } from "@/lib/icons";
import type { Person, PersonRole } from "@/lib/types";

export function ManagePeople() {
  const { people, savePerson, createPerson, removePerson } = useFamilyStore();
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<PersonRole>("child");
  const [newPersonColor, setNewPersonColor] = useState("#2A9D8F");
  const [newPersonAvatar, setNewPersonAvatar] = useState(() =>
    getIconEmoji("boy"),
  );

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-0.5">
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
