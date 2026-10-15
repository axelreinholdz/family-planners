import type { NattningDayOverride, NattningSchedule } from "./types";

export const EMPTY_NATTNING_WEEK: (string | null)[] = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

export function nattningDayId(personId: string, date: string): string {
  return `${personId}:${date}`;
}

export function normalizeParentByWeekday(
  value: (string | null)[] | undefined | null,
): (string | null)[] {
  const next = [...EMPTY_NATTNING_WEEK];
  if (!Array.isArray(value)) return next;
  for (let i = 0; i < 7; i += 1) {
    const entry = value[i];
    next[i] = typeof entry === "string" && entry.length > 0 ? entry : null;
  }
  return next;
}

export function resolveNattningParentId(
  schedule: NattningSchedule | undefined,
  override: NattningDayOverride | undefined,
  weekday: number,
): string | null {
  if (override?.parentId) return override.parentId;
  if (!schedule) return null;
  const day = weekday >= 0 && weekday <= 6 ? weekday : 0;
  return schedule.parentByWeekday[day] ?? null;
}

/** First grapheme of the name, uppercased. */
export function parentInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const first = [...trimmed][0] ?? "?";
  return first.toLocaleUpperCase("sv-SE");
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    const r = Number.parseInt(raw[0]! + raw[0]!, 16);
    const g = Number.parseInt(raw[1]! + raw[1]!, 16);
    const b = Number.parseInt(raw[2]! + raw[2]!, 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (raw.length === 6) {
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Light or dark ink that stays readable on a solid background. */
export function readableInkOn(bgHex: string): string {
  const rgb = parseHexColor(bgHex);
  if (!rgb) return "#1a1a1a";
  return relativeLuminance(rgb) > 0.45 ? "#1a1a1a" : "#ffffff";
}
