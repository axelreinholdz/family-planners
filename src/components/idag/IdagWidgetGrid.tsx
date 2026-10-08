"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DinnerWidget } from "@/components/idag/widgets/DinnerWidget";
import { NextEventsWidget } from "@/components/idag/widgets/NextEventsWidget";
import { RoutinesWidget } from "@/components/idag/widgets/RoutinesWidget";
import { ScreenTimeWidget } from "@/components/idag/widgets/ScreenTimeWidget";
import {
  IDAG_GRID_COLUMNS,
  IDAG_WIDGET_ORIENTATIONS,
  IDAG_WIDGET_ORIENTATION_LABELS,
  IDAG_WIDGET_SIZE_HINTS,
  IDAG_WIDGET_SIZE_LABELS,
  addWidgetToLayout,
  allowedSizesForWidget,
  availablePhase1Types,
  canPlaceAt,
  catalogEntryFor,
  idagGridRowCount,
  idagWidgetFootprint,
  idagWidgetIsCompact,
  moveWidgetToCell,
  parseSlotId,
  resizeWidget,
  resolveOrientation,
  slotId,
} from "@/lib/idagLayout";
import type {
  IdagWidgetOrientation,
  IdagWidgetPlacement,
  IdagWidgetSize,
  IdagWidgetType,
  Person,
} from "@/lib/types";

function WidgetBody({
  type,
  child,
  size,
  orientation,
}: {
  type: IdagWidgetType;
  child: Person | undefined;
  size: IdagWidgetSize;
  orientation: IdagWidgetOrientation;
}) {
  switch (type) {
    case "screenTime":
      return <ScreenTimeWidget child={child} />;
    case "dinner":
      return <DinnerWidget />;
    case "nextEvents":
      return <NextEventsWidget child={child} />;
    case "routines":
      return (
        <RoutinesWidget child={child} size={size} orientation={orientation} />
      );
    default:
      return null;
  }
}

function SizeChrome({
  type,
  size,
  orientation,
  onSize,
  onOrientation,
}: {
  type: IdagWidgetType;
  size: IdagWidgetSize;
  orientation: IdagWidgetOrientation;
  onSize: (size: IdagWidgetSize) => void;
  onOrientation: (orientation: IdagWidgetOrientation) => void;
}) {
  const sizes = allowedSizesForWidget(type);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        className="flex rounded-xl bg-[var(--surface-soft)] p-0.5"
        role="group"
        aria-label="Storlek"
      >
        {sizes.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSize(value)}
            title={IDAG_WIDGET_SIZE_HINTS[value]}
            className={`tap-target rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              size === value
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            {IDAG_WIDGET_SIZE_LABELS[value]}
          </button>
        ))}
      </div>
      {size === "XL" ? (
        <div
          className="flex rounded-xl bg-[var(--surface-soft)] p-0.5"
          role="group"
          aria-label="Riktning"
        >
          {IDAG_WIDGET_ORIENTATIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onOrientation(value)}
              title={
                value === "horizontal"
                  ? "Fyll hela raden"
                  : "Fyll en hel kolumn"
              }
              className={`tap-target rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                orientation === value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              {IDAG_WIDGET_ORIENTATION_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GridSlot({
  col,
  row,
  active,
  valid,
  editing,
}: {
  col: number;
  row: number;
  active: boolean;
  valid: boolean;
  editing: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId(col, row),
    disabled: !editing,
  });

  return (
    <div
      ref={setNodeRef}
      aria-hidden={!editing}
      className={`h-full min-h-0 w-full rounded-2xl transition ${
        editing
          ? isOver && valid
            ? "bg-[var(--accent)]/25 ring-2 ring-[var(--accent)]"
            : isOver && !valid
              ? "bg-[#c45c4a]/15 ring-2 ring-[#c45c4a]/50"
              : active && valid
                ? "bg-[var(--accent)]/10 ring-1 ring-dashed ring-[var(--accent)]/40"
                : "bg-black/[0.03] ring-1 ring-dashed ring-black/10"
          : "bg-transparent"
      }`}
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
      }}
    />
  );
}

function DraggableWidgetCard({
  placement,
  child,
  editing,
  onSizeChange,
  onOrientationChange,
  onRemove,
}: {
  placement: IdagWidgetPlacement;
  child: Person | undefined;
  editing: boolean;
  onSizeChange: (id: string, size: IdagWidgetSize) => void;
  onOrientationChange: (id: string, orientation: IdagWidgetOrientation) => void;
  onRemove: (id: string) => void;
}) {
  const orientation = resolveOrientation(placement);
  const footprint = idagWidgetFootprint(placement.size, orientation);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: placement.id,
      disabled: !editing,
      data: { placement },
    });

  const label = catalogEntryFor(placement.type)?.label ?? placement.type;
  const compact = idagWidgetIsCompact(placement.size);

  const style = {
    gridColumn: `${placement.col + 1} / span ${footprint.cols}`,
    gridRow: `${placement.row + 1} / span ${footprint.rows}`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 30 : 10,
    opacity: isDragging ? 0.35 : 1,
    alignSelf: "stretch" as const,
    justifySelf: "stretch" as const,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`flex h-full min-h-0 w-full flex-col self-stretch overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-black/5 ${
        compact ? "p-2.5" : "p-4"
      } ${editing ? "ring-[var(--accent)]/40" : ""}`}
    >
      {editing ? (
        <div
          className={`mb-2 flex flex-wrap items-center gap-1.5 border-b border-black/5 pb-2 ${
            compact ? "" : "mb-3 gap-2 pb-3"
          }`}
        >
          <button
            type="button"
            className={`tap-target flex items-center justify-center rounded-xl bg-[var(--surface-soft)] font-bold text-[var(--ink-muted)] touch-none ${
              compact ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg"
            }`}
            aria-label={`Flytta ${label}`}
            title="Flytta till en ruta"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          {!compact ? (
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--ink)]">
              {label}
            </span>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <SizeChrome
            type={placement.type}
            size={placement.size}
            orientation={orientation}
            onSize={(next) => onSizeChange(placement.id, next)}
            onOrientation={(next) => onOrientationChange(placement.id, next)}
          />
          <button
            type="button"
            onClick={() => onRemove(placement.id)}
            className={`tap-target flex items-center justify-center rounded-xl bg-[#c45c4a]/15 text-[#c45c4a] ${
              compact ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg"
            }`}
            aria-label={`Ta bort ${label}`}
            title="Ta bort"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <WidgetBody
          type={placement.type}
          child={child}
          size={placement.size}
          orientation={orientation}
        />
      </div>
    </section>
  );
}

function WidgetPreview({
  placement,
  child,
}: {
  placement: IdagWidgetPlacement;
  child: Person | undefined;
}) {
  const orientation = resolveOrientation(placement);
  const compact = idagWidgetIsCompact(placement.size);
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-2 ring-[var(--accent)] ${
        compact ? "p-2.5" : "p-4"
      }`}
      style={{
        width: `min(${(idagWidgetFootprint(placement.size, orientation).cols / IDAG_GRID_COLUMNS) * 100}vw, 28rem)`,
      }}
    >
      <WidgetBody
        type={placement.type}
        child={child}
        size={placement.size}
        orientation={orientation}
      />
    </section>
  );
}

export function IdagWidgetGrid({
  layout,
  child,
  editing,
  onChange,
}: {
  layout: IdagWidgetPlacement[];
  child: Person | undefined;
  editing: boolean;
  onChange: (next: IdagWidgetPlacement[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const available = useMemo(() => availablePhase1Types(layout), [layout]);
  const rowCount = useMemo(
    () =>
      idagGridRowCount(layout, {
        editing,
        extraEmptyRows: editing ? 2 : 0,
      }),
    [layout, editing],
  );

  const activePlacement = useMemo(
    () => layout.find((p) => p.id === activeId) ?? null,
    [layout, activeId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const slots = useMemo(() => {
    const cells: { col: number; row: number }[] = [];
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < IDAG_GRID_COLUMNS; col++) {
        cells.push({ col, row });
      }
    }
    return cells;
  }, [rowCount]);

  const slotValid = (col: number, row: number) => {
    if (!activePlacement) return false;
    return canPlaceAt(
      layout,
      col,
      row,
      activePlacement.size,
      resolveOrientation(activePlacement),
      activePlacement.id,
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    const slot = overId ? parseSlotId(overId) : null;
    const id = String(event.active.id);
    setActiveId(null);
    if (!slot) return;
    onChange(moveWidgetToCell(layout, id, slot.col, slot.row));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const setSize = (id: string, size: IdagWidgetSize) => {
    const current = layout.find((p) => p.id === id);
    onChange(
      resizeWidget(
        layout,
        id,
        size,
        size === "XL" ? (current?.orientation ?? "horizontal") : undefined,
      ),
    );
  };

  const setOrientation = (id: string, orientation: IdagWidgetOrientation) => {
    const current = layout.find((p) => p.id === id);
    if (!current || current.size !== "XL") return;
    onChange(resizeWidget(layout, id, "XL", orientation));
  };

  const remove = (id: string) => {
    onChange(layout.filter((placement) => placement.id !== id));
  };

  const add = (type: IdagWidgetType) => {
    onChange(addWidgetToLayout(layout, type));
    setAddOpen(false);
  };

  const showBoard = editing || layout.length > 0;

  return (
    <div className={`flex flex-col gap-3 ${editing ? "" : "min-h-0"}`}>
      {editing && available.length > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="tap-target rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
          >
            Lägg till widget
          </button>
        </div>
      ) : null}

      {!showBoard ? (
        <section className="rounded-3xl bg-white/60 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Inga widgets. Tryck Ordna för att lägga till.
        </section>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            className="grid w-full gap-3"
            style={{
              gridTemplateColumns: `repeat(${IDAG_GRID_COLUMNS}, minmax(0, 1fr))`,
              // Equal row fracs + board aspect ⇒ square cells for every size (S–XL).
              gridTemplateRows:
                rowCount > 0
                  ? `repeat(${rowCount}, minmax(0, 1fr))`
                  : undefined,
              aspectRatio:
                rowCount > 0
                  ? `${IDAG_GRID_COLUMNS} / ${rowCount}`
                  : undefined,
            }}
          >
            {/*
              Slots + stretched widgets share the same cell geometry in view and Ordna.
              Viewing uses content row count only (no empty filler board → no needless scroll).
            */}
            {slots.map((cell) => (
              <GridSlot
                key={slotId(cell.col, cell.row)}
                col={cell.col}
                row={cell.row}
                editing={editing}
                active={Boolean(activePlacement)}
                valid={
                  activePlacement ? slotValid(cell.col, cell.row) : false
                }
              />
            ))}

            {layout.map((placement) => (
              <DraggableWidgetCard
                key={placement.id}
                placement={placement}
                child={child}
                editing={editing}
                onSizeChange={setSize}
                onOrientationChange={setOrientation}
                onRemove={remove}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activePlacement ? (
              <WidgetPreview placement={activePlacement} child={child} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {editing ? (
        <p className="text-center text-xs font-medium text-[var(--ink-muted)]">
          Dra i ⋮⋮ och släpp på en ruta. Tomma rutor får lämnas kvar.
        </p>
      ) : null}

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-label="Lägg till widget"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-bold text-[var(--ink)]">
                Lägg till widget
              </h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="tap-target rounded-xl px-3 py-1.5 text-sm font-bold text-[var(--ink-muted)]"
              >
                Stäng
              </button>
            </div>
            {available.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Alla widgets är redan tillagda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {available.map((type) => {
                  const entry = catalogEntryFor(type);
                  return (
                    <li key={type}>
                      <button
                        type="button"
                        onClick={() => add(type)}
                        className="tap-target flex w-full flex-col items-start rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-left ring-1 ring-black/5"
                      >
                        <span className="font-display text-lg font-bold text-[var(--ink)]">
                          {entry?.label ?? type}
                        </span>
                        <span className="text-sm text-[var(--ink-muted)]">
                          {entry?.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
