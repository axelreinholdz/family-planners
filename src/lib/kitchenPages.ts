import type { KitchenPageId } from "@/lib/types";

export type { KitchenPageId };

export const KITCHEN_PAGE_OPTIONS: {
  id: KitchenPageId;
  label: string;
}[] = [
  { id: "week", label: "Veckans Schema" },
  { id: "idag", label: "Idag" },
  { id: "beloning", label: "Belöning" },
  { id: "todos", label: "Att göra" },
];

export const DEFAULT_VISIBLE_KITCHEN_PAGES: KitchenPageId[] =
  KITCHEN_PAGE_OPTIONS.map((page) => page.id);

const PAGE_IDS = new Set<string>(DEFAULT_VISIBLE_KITCHEN_PAGES);

export function isKitchenPageId(value: unknown): value is KitchenPageId {
  return typeof value === "string" && PAGE_IDS.has(value);
}

/** Keep canonical swipe order; require at least one page. */
export function normalizeVisibleKitchenPages(
  value: unknown,
): KitchenPageId[] {
  const enabled = new Set<KitchenPageId>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isKitchenPageId(item)) enabled.add(item);
    }
  }
  const ordered = KITCHEN_PAGE_OPTIONS.map((page) => page.id).filter((id) =>
    enabled.has(id),
  );
  return ordered.length > 0 ? ordered : [...DEFAULT_VISIBLE_KITCHEN_PAGES];
}

export function toggleVisibleKitchenPage(
  current: KitchenPageId[],
  pageId: KitchenPageId,
): KitchenPageId[] {
  const normalized = normalizeVisibleKitchenPages(current);
  const next = normalized.includes(pageId)
    ? normalized.filter((id) => id !== pageId)
    : normalizeVisibleKitchenPages([...normalized, pageId]);
  // Never allow turning off the last remaining page.
  return next.length > 0 ? next : normalized;
}
