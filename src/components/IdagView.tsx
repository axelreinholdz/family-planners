"use client";

import { useState } from "react";
import { IdagWidgetGrid } from "@/components/idag/IdagWidgetGrid";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";

export function IdagView() {
  const { ready, people, idagLayout, saveIdagLayout } = useFamilyStore();
  const children = people.filter((p) => p.role === "child");
  const defaultChildId =
    children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? EBBE_ID;
  const [selectedChildId, setSelectedChildId] = useState(defaultChildId);
  const [editing, setEditing] = useState(false);

  const personId = children.some((p) => p.id === selectedChildId)
    ? selectedChildId
    : defaultChildId;
  const child = children.find((p) => p.id === personId) ?? children[0];

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar idag…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Idag
          </h2>
          <p className="text-sm font-medium text-[var(--ink-muted)]">
            {editing
              ? "Dra, ändra storlek eller lägg till widgets"
              : "Skärmtid, middag, nästa och rutiner"}
          </p>
        </div>

        <div className="relative flex w-full items-center justify-center">
          {children.length > 1 ? (
            <div
              className="flex gap-2 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5"
              role="tablist"
              aria-label="Välj barn"
            >
              {children.map((kid) => {
                const active = kid.id === personId;
                return (
                  <button
                    key={kid.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedChildId(kid.id)}
                    className={`tap-target flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--ink-muted)]"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                      style={{
                        backgroundColor: active
                          ? "#ffffff33"
                          : `${kid.color}33`,
                      }}
                      aria-hidden
                    >
                      {kid.avatar}
                    </span>
                    {kid.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`tap-target absolute right-0 shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold ${
              editing
                ? "bg-[var(--ink)] text-white"
                : "bg-white/80 text-[var(--ink)] shadow-sm ring-1 ring-black/5"
            }`}
          >
            {editing ? "Klar" : "Ordna"}
          </button>
        </div>
      </div>

      <IdagWidgetGrid
        layout={idagLayout}
        child={child}
        editing={editing}
        onChange={(next) => void saveIdagLayout(next)}
      />
    </div>
  );
}
