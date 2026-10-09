"use client";

import { useEffect, useState } from "react";
import { IdagWidgetGrid } from "@/components/idag/IdagWidgetGrid";
import { ManagePinGate } from "@/components/ManagePinGate";
import { useFamilyStore, EBBE_ID } from "@/hooks/useFamilyStore";

export function IdagView({
  onEditingChange,
}: {
  onEditingChange?: (editing: boolean) => void;
} = {}) {
  const {
    ready,
    people,
    idagLayoutLocked,
    getIdagLayout,
    saveIdagLayout,
    saveIdagLayoutLocked,
  } = useFamilyStore();
  const children = people.filter((p) => p.role === "child");
  const defaultChildId =
    children.find((p) => p.id === EBBE_ID)?.id ?? children[0]?.id ?? EBBE_ID;
  const [selectedChildId, setSelectedChildId] = useState(defaultChildId);
  const [editing, setEditing] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);

  const personId = children.some((p) => p.id === selectedChildId)
    ? selectedChildId
    : defaultChildId;
  const child = children.find((p) => p.id === personId) ?? children[0];
  const layout = getIdagLayout(personId);

  useEffect(() => {
    onEditingChange?.(editing);
    return () => onEditingChange?.(false);
  }, [editing, onEditingChange]);

  const requestOrdna = () => {
    if (idagLayoutLocked) {
      setPinPrompt(true);
      return;
    }
    setEditing(true);
  };

  const exitOrdna = () => setEditing(false);

  const lockLayout = () => {
    void saveIdagLayoutLocked(true);
    setEditing(false);
  };

  const unlockLayout = () => {
    void saveIdagLayoutLocked(false);
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar idag…
      </div>
    );
  }

  if (pinPrompt) {
    return (
      <ManagePinGate
        eyebrow="Ordna"
        title="Ange PIN-kod"
        description="Widgetlayouten är låst. Ange samma PIN som till Hantera för att ändra."
        onUnlock={() => {
          setPinPrompt(false);
          setEditing(true);
        }}
        onCancel={() => setPinPrompt(false)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain">
      <div className="flex shrink-0 flex-col items-center gap-3">
        {editing || idagLayoutLocked ? (
          <p className="text-sm font-medium text-[var(--ink-muted)]">
            {editing
              ? `Ordnar widgets för ${child?.name ?? "barn"}`
              : "Widgetlayouten är låst"}
          </p>
        ) : null}

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

          <div className="absolute right-0 flex items-center gap-2">
            {editing ? (
              <>
                {idagLayoutLocked ? (
                  <button
                    type="button"
                    onClick={unlockLayout}
                    className="tap-target rounded-2xl bg-white/80 px-3 py-2.5 text-sm font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/5"
                    title="Ta bort lås så Ordna inte kräver PIN"
                  >
                    Lås upp
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={lockLayout}
                    className="tap-target rounded-2xl bg-white/80 px-3 py-2.5 text-sm font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/5"
                    title="Lås layouten med Hantera-PIN"
                  >
                    Lås
                  </button>
                )}
                <button
                  type="button"
                  onClick={exitOrdna}
                  className="tap-target shrink-0 rounded-2xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Klar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={requestOrdna}
                className="tap-target shrink-0 rounded-2xl bg-white/80 px-4 py-2.5 text-sm font-bold text-[var(--ink)] shadow-sm ring-1 ring-black/5"
                title={
                  idagLayoutLocked
                    ? "Ordna (kräver PIN)"
                    : "Ordna widgets"
                }
              >
                {idagLayoutLocked ? "Ordna · låst" : "Ordna"}
              </button>
            )}
          </div>
        </div>
      </div>

      <IdagWidgetGrid
        key={personId}
        layout={layout}
        child={child}
        editing={editing}
        onChange={(next) => void saveIdagLayout(personId, next)}
      />
    </div>
  );
}
