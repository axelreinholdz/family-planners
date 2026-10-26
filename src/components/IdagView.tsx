"use client";

import { useEffect, useState } from "react";
import { IdagWidgetGrid } from "@/components/idag/IdagWidgetGrid";
import { TimelinePanel } from "@/components/idag/TimelinePanel";
import { RoutinesWidget } from "@/components/idag/widgets/RoutinesWidget";
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="relative flex shrink-0 items-center justify-center gap-3">
        {editing || idagLayoutLocked ? (
          <p className="absolute left-0 max-w-[40%] truncate text-sm font-medium text-[var(--ink-muted)]">
            {editing
              ? `Ordnar sidopanel för ${child?.name ?? "barn"}`
              : "Sidopanelen är låst"}
          </p>
        ) : null}

        {children.length > 1 ? (
          <div
            className="flex gap-2 rounded-2xl bg-white/75 p-1.5 shadow-sm ring-1 ring-black/5"
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
                  className={`tap-target flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
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
                idagLayoutLocked ? "Ordna (kräver PIN)" : "Ordna sidopanel"
              }
            >
              {idagLayoutLocked ? "Ordna · låst" : "Ordna"}
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3.5 overflow-hidden">
        <TimelinePanel child={child} />
        <aside className="flex w-[min(100%,22rem)] shrink-0 flex-col overflow-hidden sm:w-[min(38%,24rem)]">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] bg-white/50 p-2 ring-1 ring-black/5">
            <IdagWidgetGrid
              key={personId}
              layout={layout}
              child={child}
              editing={editing}
              onChange={(next) => void saveIdagLayout(personId, next)}
            />
          </div>
        </aside>
      </div>

      <section className="shrink-0 rounded-[1.75rem] bg-white/78 p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
        <div className="min-h-[7.5rem]">
          <RoutinesWidget child={child} orientation="horizontal" />
        </div>
      </section>
    </div>
  );
}
