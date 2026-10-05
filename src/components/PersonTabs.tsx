"use client";

import type { Person } from "@/lib/types";

interface PersonTabsProps {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Default: only children (Idag-style). */
  roles?: Array<Person["role"]>;
  label?: string;
}

/** Avatar + name tabs for switching whose items are shown. */
export function PersonTabs({
  people,
  selectedId,
  onSelect,
  roles = ["child"],
  label = "Välj barn",
}: PersonTabsProps) {
  const options = people
    .filter((p) => roles.includes(p.role))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (options.length <= 1) return null;

  return (
    <div
      className="flex flex-wrap gap-2 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5"
      role="tablist"
      aria-label={label}
    >
      {options.map((person) => {
        const active = person.id === selectedId;
        return (
          <button
            key={person.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(person.id)}
            className={`tap-target flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              active
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
              style={{
                backgroundColor: active ? "#ffffff33" : `${person.color}33`,
              }}
              aria-hidden
            >
              {person.avatar}
            </span>
            {person.name}
          </button>
        );
      })}
    </div>
  );
}

/** Resolve a selected person id within an optional role filter. */
export function defaultPersonId(
  people: Person[],
  preferred?: string,
  roles: Array<Person["role"]> = ["child", "parent"],
): string {
  const options = people
    .filter((p) => roles.includes(p.role))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (preferred && options.some((p) => p.id === preferred)) return preferred;
  return options[0]?.id ?? "";
}

export function defaultChildId(people: Person[], preferred?: string): string {
  return defaultPersonId(people, preferred, ["child"]);
}
