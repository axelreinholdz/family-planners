import type { IconKey } from "./types";

/** Where an icon is intended to be picked. */
export type IconCategory = "activity" | "routine" | "person" | "ui";

export interface AppIconDef {
  key: string;
  emoji: string;
  label: string;
  categories: IconCategory[];
}

/**
 * Shared icon library for the whole app.
 * Activities also map to typed `IconKey` values used on events/templates.
 */
export const APP_ICONS: AppIconDef[] = [
  // Activities
  {
    key: "preschool",
    emoji: "🏫",
    label: "Förskola",
    categories: ["activity"],
  },
  { key: "home", emoji: "🏠", label: "Hemma", categories: ["activity"] },
  { key: "outdoors", emoji: "🌳", label: "Ute", categories: ["activity"] },
  { key: "sport", emoji: "⚽", label: "Sport", categories: ["activity"] },
  { key: "friend", emoji: "👫", label: "Kompis", categories: ["activity"] },
  { key: "travel", emoji: "🚗", label: "Resa", categories: ["activity"] },
  { key: "doctor", emoji: "🩺", label: "Doktor", categories: ["activity"] },
  {
    key: "food",
    emoji: "🍎",
    label: "Mat",
    categories: ["activity", "routine"],
  },
  {
    key: "sleep",
    emoji: "😴",
    label: "Sova",
    categories: ["activity", "routine"],
  },
  {
    key: "play",
    emoji: "🧸",
    label: "Leka",
    categories: ["activity", "routine"],
  },
  {
    key: "music",
    emoji: "🎵",
    label: "Musik",
    categories: ["activity", "routine"],
  },
  {
    key: "other",
    emoji: "⭐",
    label: "Annat",
    categories: ["activity", "routine", "ui"],
  },

  // Routines
  {
    key: "clothes",
    emoji: "👕",
    label: "Kläder",
    categories: ["routine"],
  },
  {
    key: "teeth",
    emoji: "🪥",
    label: "Tänder",
    categories: ["routine"],
  },
  { key: "pack", emoji: "🎒", label: "Packa", categories: ["routine"] },
  { key: "shoes", emoji: "👟", label: "Skor", categories: ["routine"] },
  {
    key: "breakfast",
    emoji: "🥣",
    label: "Frukost",
    categories: ["routine"],
  },
  { key: "bath", emoji: "🛁", label: "Bada", categories: ["routine"] },
  { key: "book", emoji: "📖", label: "Bok", categories: ["routine"] },
  { key: "bed", emoji: "🛏️", label: "Säng", categories: ["routine"] },
  { key: "wash", emoji: "🧼", label: "Tvätta", categories: ["routine"] },
  {
    key: "toilet",
    emoji: "🚽",
    label: "Toa",
    categories: ["routine"],
  },
  {
    key: "jacket",
    emoji: "🧥",
    label: "Jacka",
    categories: ["routine"],
  },
  {
    key: "water",
    emoji: "💧",
    label: "Vatten",
    categories: ["routine"],
  },

  // People / avatars
  { key: "boy", emoji: "👦", label: "Pojke", categories: ["person"] },
  { key: "girl", emoji: "👧", label: "Flicka", categories: ["person"] },
  { key: "child", emoji: "🧒", label: "Barn", categories: ["person"] },
  { key: "man", emoji: "👨", label: "Man", categories: ["person"] },
  { key: "woman", emoji: "👩", label: "Kvinna", categories: ["person"] },
  {
    key: "person",
    emoji: "🧑",
    label: "Person",
    categories: ["person"],
  },
  { key: "baby", emoji: "👶", label: "Bebis", categories: ["person"] },
  {
    key: "grandpa",
    emoji: "👴",
    label: "Farfar",
    categories: ["person"],
  },
  {
    key: "grandma",
    emoji: "👵",
    label: "Farmor",
    categories: ["person"],
  },

  // UI
  { key: "check", emoji: "✓", label: "Klart", categories: ["ui"] },
  { key: "mic", emoji: "🎤", label: "Mikrofon", categories: ["ui"] },
  { key: "stop", emoji: "⏹", label: "Stopp", categories: ["ui"] },
  { key: "delete", emoji: "🗑️", label: "Ta bort", categories: ["ui"] },
  { key: "dinner", emoji: "🍽️", label: "Middag", categories: ["ui"] },
  {
    key: "screen",
    emoji: "📱",
    label: "Skärm",
    categories: ["ui"],
  },
];

const byKey = Object.fromEntries(
  APP_ICONS.map((icon) => [icon.key, icon]),
) as Record<string, AppIconDef>;

const byEmoji = Object.fromEntries(
  APP_ICONS.map((icon) => [icon.emoji, icon]),
) as Record<string, AppIconDef>;

export function iconsInCategory(category: IconCategory): AppIconDef[] {
  return APP_ICONS.filter((icon) => icon.categories.includes(category));
}

export function getIconByKey(key: string): AppIconDef | undefined {
  return byKey[key];
}

export function getIconByEmoji(emoji: string): AppIconDef | undefined {
  return byEmoji[emoji];
}

export function getIconEmoji(key: string, fallback = "⭐"): string {
  return byKey[key]?.emoji ?? fallback;
}

/** Activity icons (typed IconKey) — derived from the shared library. */
export type ActivityIconDef = AppIconDef & { key: IconKey };

const ACTIVITY_KEYS: IconKey[] = [
  "preschool",
  "home",
  "outdoors",
  "sport",
  "friend",
  "travel",
  "doctor",
  "food",
  "sleep",
  "play",
  "music",
  "other",
];

export const ACTIVITY_ICONS: ActivityIconDef[] = ACTIVITY_KEYS.map((key) => {
  const icon = byKey[key];
  return { ...icon, key } as ActivityIconDef;
});

export const ROUTINE_ICONS = iconsInCategory("routine");
export const PERSON_ICONS = iconsInCategory("person");
export const UI_ICONS = iconsInCategory("ui");

export function getActivityIcon(key: IconKey): ActivityIconDef {
  return (
    ACTIVITY_ICONS.find((icon) => icon.key === key) ??
    ACTIVITY_ICONS.find((icon) => icon.key === "other")!
  );
}

/** Default routine step presets from the shared library. */
export function defaultRoutineSteps(): {
  key: string;
  label: string;
  emoji: string;
}[] {
  return ["clothes", "teeth", "pack"].map((key) => {
    const icon = getIconByKey(key)!;
    return { key: icon.key, label: icon.label, emoji: icon.emoji };
  });
}
