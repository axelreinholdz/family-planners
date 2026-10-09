import type {
  IdagWidgetOrientation,
  IdagWidgetPlacement,
  IdagWidgetSize,
  IdagWidgetType,
} from "./types";

/** Catalog keys include Phase 2 suggestions not yet placeable. */
export type IdagWidgetCatalogType =
  | IdagWidgetType
  | "todosToday"
  | "weekStrip"
  | "calendarHighlights"
  | "familyNote"
  | "weather"
  | "chores"
  | "screenTimeOverview";

export type IdagWidgetCatalogEntry = {
  type: IdagWidgetCatalogType;
  label: string;
  description: string;
  defaultSize: IdagWidgetSize;
  defaultOrientation?: IdagWidgetOrientation;
  phase: 1 | 2;
};

/** 8-column home-screen style snap grid. */
export const IDAG_GRID_COLUMNS = 8;
/** Always show at least this many rows so empty space is usable. */
export const IDAG_GRID_MIN_ROWS = 8;

export const IDAG_WIDGET_SIZES: IdagWidgetSize[] = ["S", "M", "L", "XL"];

/**
 * Sizes offered in Ordna.
 * - dinner: none (always 2×1 — width 2, height 1)
 * - screenTime: none (always M / 2×2)
 * - routines: none (always XL; only Rad/Kolumn)
 * - others: M–XL
 */
export function allowedSizesForWidget(
  type: IdagWidgetType | IdagWidgetCatalogType,
): IdagWidgetSize[] {
  if (
    type === "routines" ||
    type === "screenTime" ||
    type === "dinner"
  ) {
    return [];
  }
  return IDAG_WIDGET_SIZES.filter((size) => size !== "S");
}

export function clampWidgetSize(
  type: IdagWidgetType | IdagWidgetCatalogType,
  size: IdagWidgetSize,
): IdagWidgetSize {
  if (type === "routines") return "XL";
  if (type === "screenTime") return "M";
  // Stored as S; footprint overrides to 2×1 for dinner.
  if (type === "dinner") return "S";
  const allowed = allowedSizesForWidget(type);
  return allowed.includes(size) ? size : (allowed[0] ?? "M");
}

/** Whether Ordna shows Rad/Kolumn for this widget. */
export function widgetShowsOrientation(
  type: IdagWidgetType | IdagWidgetCatalogType,
  size: IdagWidgetSize,
): boolean {
  return type === "routines" || size === "XL";
}

export const IDAG_WIDGET_ORIENTATIONS: IdagWidgetOrientation[] = [
  "horizontal",
  "vertical",
];

export const IDAG_WIDGET_SIZE_LABELS: Record<IdagWidgetSize, string> = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
};

export const IDAG_WIDGET_SIZE_HINTS: Record<IdagWidgetSize, string> = {
  S: "1×1 (1/8)",
  M: "2×2 (2/8)",
  L: "4×4 (halva raden)",
  XL: "Hel rad eller kolumn",
};

export const IDAG_WIDGET_ORIENTATION_LABELS: Record<
  IdagWidgetOrientation,
  string
> = {
  horizontal: "Rad",
  vertical: "Kolumn",
};

export type IdagWidgetFootprint = { cols: number; rows: number };

/** Optional content metrics for type-specific footprints (e.g. routines). */
export type IdagFootprintContext = {
  type?: IdagWidgetType;
  /** Routine step cards (and similar) that drive column height. */
  contentUnits?: number;
};

export function resolveOrientation(
  placement: Pick<IdagWidgetPlacement, "type" | "size" | "orientation">,
): IdagWidgetOrientation {
  if (placement.type === "routines") {
    return placement.orientation === "vertical" ? "vertical" : "horizontal";
  }
  if (placement.size !== "XL") return "horizontal";
  return placement.orientation === "vertical" ? "vertical" : "horizontal";
}

/**
 * Discrete cell footprint on the snap grid.
 * Type-specific overrides: dinner 1×2, routines XL rad/kolumn, etc.
 */
export function idagWidgetFootprint(
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation = "horizontal",
  ctx?: IdagFootprintContext,
): IdagWidgetFootprint {
  if (ctx?.type === "dinner") {
    return { cols: 2, rows: 1 };
  }
  if (ctx?.type === "routines") {
    if (orientation === "horizontal") return { cols: 8, rows: 2 };
    const units = Math.max(1, ctx.contentUnits ?? 3);
    // Placement footprint ≈ content; card itself hugs steps (see IdagWidgetGrid).
    return { cols: 2, rows: Math.min(14, Math.max(2, units)) };
  }

  switch (size) {
    case "S":
      return { cols: 1, rows: 1 };
    case "M":
      return { cols: 2, rows: 2 };
    case "L":
      return { cols: 4, rows: 4 };
    case "XL":
      return orientation === "vertical"
        ? { cols: 2, rows: 6 }
        : { cols: 8, rows: 2 };
  }
}

export function idagWidgetColSpan(
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation = "horizontal",
  ctx?: IdagFootprintContext,
): number {
  return idagWidgetFootprint(size, orientation, ctx).cols;
}

export function idagWidgetIsCompact(size: IdagWidgetSize): boolean {
  return size === "S" || size === "M";
}

export function idagWidgetPreferVertical(
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation = "horizontal",
  type?: IdagWidgetType,
): boolean {
  if (type === "routines") return orientation === "vertical";
  if (size === "XL") return orientation === "vertical";
  return size === "S" || size === "M";
}

export function slotId(col: number, row: number): string {
  return `slot:${col}:${row}`;
}

export function parseSlotId(
  id: string,
): { col: number; row: number } | null {
  const match = /^slot:(\d+):(\d+)$/.exec(id);
  if (!match) return null;
  return { col: Number(match[1]), row: Number(match[2]) };
}

type Rect = { col: number; row: number; cols: number; rows: number };

function footprintCtxFor(
  placement: IdagWidgetPlacement,
  contentUnitsById?: Record<string, number>,
): IdagFootprintContext {
  return {
    type: placement.type,
    contentUnits: contentUnitsById?.[placement.id],
  };
}

function placementRect(
  placement: IdagWidgetPlacement,
  contentUnitsById?: Record<string, number>,
): Rect {
  const orientation = resolveOrientation(placement);
  const { cols, rows } = idagWidgetFootprint(
    placement.size,
    orientation,
    footprintCtxFor(placement, contentUnitsById),
  );
  return {
    col: placement.col,
    row: placement.row,
    cols,
    rows,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.col + a.cols <= b.col ||
    b.col + b.cols <= a.col ||
    a.row + a.rows <= b.row ||
    b.row + b.rows <= a.row
  );
}

export function canPlaceAt(
  layout: IdagWidgetPlacement[],
  col: number,
  row: number,
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation,
  excludeId?: string,
  ctx?: IdagFootprintContext,
  contentUnitsById?: Record<string, number>,
): boolean {
  const { cols, rows } = idagWidgetFootprint(size, orientation, ctx);
  if (col < 0 || row < 0) return false;
  if (col + cols > IDAG_GRID_COLUMNS) return false;

  const candidate: Rect = { col, row, cols, rows };
  for (const placement of layout) {
    if (excludeId && placement.id === excludeId) continue;
    if (rectsOverlap(candidate, placementRect(placement, contentUnitsById))) {
      return false;
    }
  }
  return true;
}

/** First free top-left cell that fits, scanning row-major. */
export function findFirstFit(
  layout: IdagWidgetPlacement[],
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation,
  excludeId?: string,
  maxRows = 24,
  ctx?: IdagFootprintContext,
  contentUnitsById?: Record<string, number>,
): { col: number; row: number } | null {
  const { cols, rows } = idagWidgetFootprint(size, orientation, ctx);
  for (let row = 0; row <= maxRows - rows; row++) {
    for (let col = 0; col <= IDAG_GRID_COLUMNS - cols; col++) {
      if (
        canPlaceAt(
          layout,
          col,
          row,
          size,
          orientation,
          excludeId,
          ctx,
          contentUnitsById,
        )
      ) {
        return { col, row };
      }
    }
  }
  return null;
}

/** Nearest valid top-left to a preferred cell (for snap). */
export function findNearestFit(
  layout: IdagWidgetPlacement[],
  preferredCol: number,
  preferredRow: number,
  size: IdagWidgetSize,
  orientation: IdagWidgetOrientation,
  excludeId?: string,
  maxRows = 24,
  ctx?: IdagFootprintContext,
  contentUnitsById?: Record<string, number>,
): { col: number; row: number } | null {
  if (
    canPlaceAt(
      layout,
      preferredCol,
      preferredRow,
      size,
      orientation,
      excludeId,
      ctx,
      contentUnitsById,
    )
  ) {
    return { col: preferredCol, row: preferredRow };
  }

  const { cols, rows } = idagWidgetFootprint(size, orientation, ctx);
  let best: { col: number; row: number; dist: number } | null = null;

  for (let row = 0; row <= maxRows - rows; row++) {
    for (let col = 0; col <= IDAG_GRID_COLUMNS - cols; col++) {
      if (
        !canPlaceAt(
          layout,
          col,
          row,
          size,
          orientation,
          excludeId,
          ctx,
          contentUnitsById,
        )
      ) {
        continue;
      }
      const dist =
        Math.abs(col - preferredCol) + Math.abs(row - preferredRow) * 2;
      if (!best || dist < best.dist) {
        best = { col, row, dist };
      }
    }
  }

  return best ? { col: best.col, row: best.row } : null;
}

export function moveWidgetToCell(
  layout: IdagWidgetPlacement[],
  id: string,
  col: number,
  row: number,
  contentUnitsById?: Record<string, number>,
): IdagWidgetPlacement[] {
  const target = layout.find((p) => p.id === id);
  if (!target) return layout;
  const orientation = resolveOrientation(target);
  const ctx = footprintCtxFor(target, contentUnitsById);
  const snapped =
    findNearestFit(
      layout,
      col,
      row,
      target.size,
      orientation,
      id,
      24,
      ctx,
      contentUnitsById,
    ) ??
    findFirstFit(
      layout,
      target.size,
      orientation,
      id,
      24,
      ctx,
      contentUnitsById,
    );
  if (!snapped) return layout;

  return layout.map((placement) =>
    placement.id === id
      ? {
          ...placement,
          col: snapped.col,
          row: snapped.row,
          sortOrder: snapped.row * IDAG_GRID_COLUMNS + snapped.col,
        }
      : placement,
  );
}

export function resizeWidget(
  layout: IdagWidgetPlacement[],
  id: string,
  size: IdagWidgetSize,
  orientation?: IdagWidgetOrientation,
  contentUnitsById?: Record<string, number>,
): IdagWidgetPlacement[] {
  const target = layout.find((p) => p.id === id);
  if (!target) return layout;

  size = clampWidgetSize(target.type, size);

  const usesOrientation = widgetShowsOrientation(target.type, size);
  const orient = usesOrientation
    ? (orientation ?? target.orientation ?? "horizontal")
    : "horizontal";

  const ctx: IdagFootprintContext = {
    type: target.type,
    contentUnits: contentUnitsById?.[id],
  };

  let col = target.col;
  let row = target.row;
  if (
    !canPlaceAt(layout, col, row, size, orient, id, ctx, contentUnitsById)
  ) {
    const fit =
      findNearestFit(
        layout,
        col,
        row,
        size,
        orient,
        id,
        24,
        ctx,
        contentUnitsById,
      ) ??
      findFirstFit(layout, size, orient, id, 24, ctx, contentUnitsById);
    if (!fit) return layout;
    col = fit.col;
    row = fit.row;
  }

  return layout.map((placement) => {
    if (placement.id !== id) return placement;
    const next: IdagWidgetPlacement = {
      ...placement,
      size,
      col,
      row,
      sortOrder: row * IDAG_GRID_COLUMNS + col,
    };
    if (usesOrientation) {
      next.orientation = orient;
    } else {
      delete next.orientation;
    }
    return next;
  });
}

/**
 * How many rows the board should render.
 * Viewing: only rows occupied by widgets (no empty filler).
 * Editing: at least IDAG_GRID_MIN_ROWS plus optional trailing empty rows for drops.
 */
export function idagGridRowCount(
  layout: IdagWidgetPlacement[],
  options: {
    editing?: boolean;
    extraEmptyRows?: number;
    contentUnitsById?: Record<string, number>;
  } = {},
): number {
  const editing = Boolean(options.editing);
  const extraEmptyRows = options.extraEmptyRows ?? 0;
  let occupied = 0;
  for (const placement of layout) {
    const rect = placementRect(placement, options.contentUnitsById);
    occupied = Math.max(occupied, rect.row + rect.rows);
  }
  if (!editing) return Math.max(occupied, layout.length > 0 ? 1 : 0);
  return Math.max(occupied, IDAG_GRID_MIN_ROWS) + extraEmptyRows;
}

/** Pack widgets without positions into non-overlapping cells (legacy migration). */
export function packIdagLayout(
  placements: Omit<IdagWidgetPlacement, "col" | "row">[] | IdagWidgetPlacement[],
): IdagWidgetPlacement[] {
  const packed: IdagWidgetPlacement[] = [];
  const sorted = placements
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const item of sorted) {
    const size = clampWidgetSize(item.type, item.size);
    const orientation = resolveOrientation({ ...item, size });
    const ctx: IdagFootprintContext = { type: item.type };
    const existingCol =
      "col" in item && typeof item.col === "number" ? item.col : undefined;
    const existingRow =
      "row" in item && typeof item.row === "number" ? item.row : undefined;

    const base = {
      ...item,
      size,
      ...(widgetShowsOrientation(item.type, size)
        ? { orientation }
        : { orientation: undefined }),
    };
    if (!widgetShowsOrientation(item.type, size)) {
      delete (base as IdagWidgetPlacement).orientation;
    } else {
      base.orientation = orientation;
    }

    if (
      existingCol !== undefined &&
      existingRow !== undefined &&
      canPlaceAt(
        packed,
        existingCol,
        existingRow,
        size,
        orientation,
        undefined,
        ctx,
      )
    ) {
      packed.push({
        ...base,
        col: existingCol,
        row: existingRow,
        sortOrder: existingRow * IDAG_GRID_COLUMNS + existingCol,
      });
      continue;
    }

    const fit = findFirstFit(
      packed,
      size,
      orientation,
      undefined,
      24,
      ctx,
    );
    const col = fit?.col ?? 0;
    const row = fit?.row ?? packed.length;
    packed.push({
      ...base,
      col,
      row,
      sortOrder: row * IDAG_GRID_COLUMNS + col,
    });
  }

  return packed;
}

/** Phase 1 widgets (implemented) + Phase 2 suggestions (catalog only). */
export const IDAG_WIDGET_CATALOG: IdagWidgetCatalogEntry[] = [
  {
    type: "screenTime",
    label: "Skärmtid",
    description: "Timer med start/stopp och ±5 minuter",
    defaultSize: "M",
    phase: 1,
  },
  {
    type: "dinner",
    label: "Middag",
    description: "Dagens rätt från middagsmenyn",
    defaultSize: "S", // footprint forced to 2×1
    phase: 1,
  },
  {
    type: "nextEvents",
    label: "Nästa",
    description: "Pågående och kommande aktiviteter",
    defaultSize: "M",
    phase: 1,
  },
  {
    type: "routines",
    label: "Rutiner",
    description: "Dagens synliga rutiner för valt barn",
    defaultSize: "XL",
    defaultOrientation: "horizontal",
    phase: 1,
  },
  // Phase 2 — not built yet
  {
    type: "todosToday",
    label: "Att göra idag",
    description: "Osakerade / dagens att-göra",
    defaultSize: "M",
    phase: 2,
  },
  {
    type: "weekStrip",
    label: "Veckoöversikt",
    description: "Kompakt rad för dagens veckokolumn",
    defaultSize: "XL",
    defaultOrientation: "horizontal",
    phase: 2,
  },
  {
    type: "calendarHighlights",
    label: "Kalenderhighlights",
    description: "Nästa synkade ICS-händelser med plats",
    defaultSize: "M",
    phase: 2,
  },
  {
    type: "familyNote",
    label: "Meddelande",
    description: "Familjens meddelande för dagen",
    defaultSize: "L",
    phase: 2,
  },
  {
    type: "weather",
    label: "Väder",
    description: "Lokalt väder (kräver API)",
    defaultSize: "S",
    phase: 2,
  },
  {
    type: "chores",
    label: "Sysslor",
    description: "Enkel checklista per barn",
    defaultSize: "M",
    phase: 2,
  },
  {
    type: "screenTimeOverview",
    label: "Skärmtid översikt",
    description: "Alla barns kvarvarande tid i en ruta",
    defaultSize: "XL",
    defaultOrientation: "horizontal",
    phase: 2,
  },
];

export const PHASE1_WIDGET_TYPES: IdagWidgetType[] = [
  "screenTime",
  "dinner",
  "nextEvents",
  "routines",
];

/** Default layout with explicit snap positions (gaps allowed). */
export function defaultIdagLayout(): IdagWidgetPlacement[] {
  return [
    {
      id: "w-screenTime",
      type: "screenTime",
      size: "M",
      col: 0,
      row: 0,
      sortOrder: 0,
    },
    {
      id: "w-dinner",
      type: "dinner",
      size: "S",
      col: 2,
      row: 0,
      sortOrder: 1,
    },
    {
      id: "w-nextEvents",
      type: "nextEvents",
      size: "M",
      col: 5,
      row: 0,
      sortOrder: 2,
    },
    {
      id: "w-routines",
      type: "routines",
      size: "XL",
      orientation: "horizontal",
      col: 0,
      row: 4,
      sortOrder: 3,
    },
  ];
}

function isWidgetType(value: unknown): value is IdagWidgetType {
  return (
    typeof value === "string" &&
    (PHASE1_WIDGET_TYPES as string[]).includes(value)
  );
}

function isWidgetSize(value: unknown): value is IdagWidgetSize {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function isOrientation(value: unknown): value is IdagWidgetOrientation {
  return value === "horizontal" || value === "vertical";
}

export function resolvePlacementSize(
  record: Record<string, unknown>,
): IdagWidgetSize {
  const catalogType = isWidgetType(record.type) ? record.type : undefined;
  const catalog = catalogType ? catalogEntryFor(catalogType) : undefined;

  if (isWidgetSize(record.size)) {
    return record.size;
  }

  if (record.size === "half" || record.size === "full") {
    const height = isWidgetSize(record.height) ? record.height : undefined;
    if (record.size === "full") {
      return height === "S" ? "L" : "XL";
    }
    return height ?? "M";
  }

  if (record.width === "full") {
    const height = isWidgetSize(record.height) ? record.height : undefined;
    return height === "S" || height === "M" ? "L" : "XL";
  }
  if (record.width === "half") {
    if (isWidgetSize(record.height)) return record.height;
    return "M";
  }

  if (isWidgetSize(record.height)) {
    return record.height;
  }

  return catalog?.defaultSize ?? "M";
}

export function resolvePlacementOrientation(
  record: Record<string, unknown>,
  size: IdagWidgetSize,
  type?: IdagWidgetType,
): IdagWidgetOrientation | undefined {
  const catalogType =
    type ?? (isWidgetType(record.type) ? record.type : undefined);
  if (!catalogType || !widgetShowsOrientation(catalogType, size)) {
    return undefined;
  }
  if (isOrientation(record.orientation)) return record.orientation;
  const catalog = catalogEntryFor(catalogType);
  return catalog?.defaultOrientation ?? "horizontal";
}

export function catalogEntryFor(
  type: IdagWidgetCatalogType,
): IdagWidgetCatalogEntry | undefined {
  return IDAG_WIDGET_CATALOG.find((entry) => entry.type === type);
}

/**
 * Keep only Phase 1 widgets, unique by type.
 * Assigns snap col/row (migrates legacy layouts without positions).
 */
export function normalizeIdagLayout(input: unknown): IdagWidgetPlacement[] {
  if (input === undefined || input === null) {
    return defaultIdagLayout();
  }
  if (!Array.isArray(input)) {
    return defaultIdagLayout();
  }
  if (input.length === 0) {
    return [];
  }

  const seen = new Set<IdagWidgetType>();
  const draft: IdagWidgetPlacement[] = [];

  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const type = record.type;
    if (!isWidgetType(type)) continue;
    if (!PHASE1_WIDGET_TYPES.includes(type)) continue;
    if (seen.has(type)) continue;
    seen.add(type);

    const size = clampWidgetSize(type, resolvePlacementSize(record));
    const orientation = resolvePlacementOrientation(record, size, type);
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `w-${type}`;
    const sortOrder =
      typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
        ? record.sortOrder
        : draft.length;
    const col =
      typeof record.col === "number" && Number.isFinite(record.col)
        ? Math.max(0, Math.floor(record.col))
        : -1;
    const rowIndex =
      typeof record.row === "number" && Number.isFinite(record.row)
        ? Math.max(0, Math.floor(record.row))
        : -1;

    draft.push({
      id,
      type,
      size,
      ...(orientation ? { orientation } : {}),
      col,
      row: rowIndex,
      sortOrder,
    });
  }

  if (draft.length === 0) return defaultIdagLayout();

  return packIdagLayout(draft);
}

/** Legacy shared layout key used while migrating array → per-child map. */
export const IDAG_LAYOUT_LEGACY_KEY = "";

/**
 * Normalize per-child layouts.
 * Accepts a map `{ [personId]: placements[] }` or a legacy shared array.
 */
export function normalizeIdagLayouts(
  input: unknown,
): Record<string, IdagWidgetPlacement[]> {
  if (input === undefined || input === null) return {};
  if (Array.isArray(input)) {
    return { [IDAG_LAYOUT_LEGACY_KEY]: normalizeIdagLayout(input) };
  }
  if (typeof input !== "object") return {};

  const result: Record<string, IdagWidgetPlacement[]> = {};
  for (const [personId, layout] of Object.entries(
    input as Record<string, unknown>,
  )) {
    if (typeof personId !== "string") continue;
    result[personId] = normalizeIdagLayout(layout);
  }
  return result;
}

export function getIdagLayoutForPerson(
  layouts: Record<string, IdagWidgetPlacement[]>,
  personId: string,
): IdagWidgetPlacement[] {
  if (Object.prototype.hasOwnProperty.call(layouts, personId)) {
    return layouts[personId]!;
  }
  if (Object.prototype.hasOwnProperty.call(layouts, IDAG_LAYOUT_LEGACY_KEY)) {
    return layouts[IDAG_LAYOUT_LEGACY_KEY]!;
  }
  return defaultIdagLayout();
}

/** Upsert one child's layout; drops the legacy shared key once a real child is saved. */
export function setIdagLayoutForPerson(
  layouts: Record<string, IdagWidgetPlacement[]>,
  personId: string,
  layout: IdagWidgetPlacement[],
): Record<string, IdagWidgetPlacement[]> {
  const next: Record<string, IdagWidgetPlacement[]> = { ...layouts };
  next[personId] = normalizeIdagLayout(layout);
  if (personId !== IDAG_LAYOUT_LEGACY_KEY) {
    delete next[IDAG_LAYOUT_LEGACY_KEY];
  }
  return next;
}

export function availablePhase1Types(
  layout: IdagWidgetPlacement[],
): IdagWidgetType[] {
  const used = new Set(layout.map((p) => p.type));
  return PHASE1_WIDGET_TYPES.filter((type) => !used.has(type));
}

export function addWidgetToLayout(
  layout: IdagWidgetPlacement[],
  type: IdagWidgetType,
  contentUnitsById?: Record<string, number>,
): IdagWidgetPlacement[] {
  if (layout.some((p) => p.type === type)) return layout;
  const entry = catalogEntryFor(type);
  const size = clampWidgetSize(type, entry?.defaultSize ?? "M");
  const orientation = widgetShowsOrientation(type, size)
    ? (entry?.defaultOrientation ?? "horizontal")
    : "horizontal";
  const ctx: IdagFootprintContext = { type };
  const fit = findFirstFit(
    layout,
    size,
    orientation,
    undefined,
    24,
    ctx,
    contentUnitsById,
  );
  if (!fit) return layout;

  return [
    ...layout,
    {
      id: `w-${type}-${Date.now()}`,
      type,
      size,
      ...(widgetShowsOrientation(type, size) ? { orientation } : {}),
      col: fit.col,
      row: fit.row,
      sortOrder: fit.row * IDAG_GRID_COLUMNS + fit.col,
    },
  ];
}
