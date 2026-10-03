import type { IconKey } from "./types";

/** Where an icon is intended to be picked. */
export type IconCategory = "activity" | "routine" | "person" | "ui";

export interface AppIconDef {
  key: string;
  emoji: string;
  label: string;
  categories: IconCategory[];
  /** Extra Swedish search terms (label/key are always searchable). */
  keywords?: string[];
}

function icon(
  key: string,
  emoji: string,
  label: string,
  categories: IconCategory[],
  keywords?: string[],
): AppIconDef {
  return { key, emoji, label, categories, keywords };
}

/**
 * Shared icon library for the whole app.
 * Activities also map to typed `IconKey` values used on events/templates.
 */
export const APP_ICONS: AppIconDef[] = [
  // Activities (core + expanded)
  icon("preschool", "🏫", "Förskola", ["activity"], ["dagis", "skola"]),
  icon("school", "🎓", "Skola", ["activity"], ["utbildning"]),
  icon("home", "🏠", "Hemma", ["activity"], ["hem"]),
  icon("outdoors", "🌳", "Ute", ["activity"], ["utelek", "park", "skog"]),
  icon("sport", "⚽", "Sport", ["activity"], ["fotboll", "boll"]),
  icon("swim", "🏊", "Simning", ["activity"], ["simma", "bad"]),
  icon("bike", "🚲", "Cykel", ["activity", "routine"], ["cykla"]),
  icon("dance", "💃", "Dans", ["activity"], ["balett"]),
  icon("friend", "👫", "Kompis", ["activity"], ["vän", "lekkamrat"]),
  icon("party", "🎉", "Kalas", ["activity"], ["fest", "födelsedag"]),
  icon("travel", "🚗", "Resa", ["activity"], ["bil", "åka"]),
  icon("bus", "🚌", "Buss", ["activity"], ["skolskjuts"]),
  icon("train", "🚂", "Tåg", ["activity"]),
  icon("plane", "✈️", "Flyg", ["activity"], ["flyga"]),
  icon("doctor", "🩺", "Doktor", ["activity"], ["läkare", "vård"]),
  icon("dentist", "🦷", "Tandläkare", ["activity"], ["tand"]),
  icon("hospital", "🏥", "Sjukhus", ["activity"], ["akut"]),
  icon("food", "🍎", "Mat", ["activity", "routine"], ["äta", "frukt"]),
  icon("pizza", "🍕", "Pizza", ["activity", "ui"], ["middag"]),
  icon("cake", "🎂", "Tårta", ["activity"], ["bak", "fika"]),
  icon("ice_cream", "🍦", "Glass", ["activity"]),
  icon("sleep", "😴", "Sova", ["activity", "routine"], ["vila", "tupplur"]),
  icon("play", "🧸", "Leka", ["activity", "routine"], ["leksak"]),
  icon("music", "🎵", "Musik", ["activity", "routine"], ["sång"]),
  icon("art", "🎨", "Måla", ["activity", "routine"], ["rita", "pyssel"]),
  icon("game", "🎮", "Spel", ["activity"], ["tv-spel"]),
  icon("movie", "🎬", "Film", ["activity"], ["bio"]),
  icon("library", "📚", "Bibliotek", ["activity"], ["böcker"]),
  icon("shop", "🛒", "Handla", ["activity"], ["affär", "matbutik"]),
  icon("church", "⛪", "Kyrka", ["activity"]),
  icon("beach", "🏖️", "Strand", ["activity"], ["hav"]),
  icon("snow", "❄️", "Snö", ["activity"], ["vinter", "skidor"]),
  icon("camp", "⛺", "Campa", ["activity"], ["tält"]),
  icon("other", "⭐", "Annat", ["activity", "routine", "ui"], ["övrigt", "custom"]),

  // Routines
  icon("clothes", "👕", "Kläder", ["routine"], ["klä på"]),
  icon("pants", "👖", "Byxor", ["routine"]),
  icon("socks", "🧦", "Strumpor", ["routine"]),
  icon("hat", "🧢", "Keps", ["routine"], ["mössa"]),
  icon("teeth", "🪥", "Tänder", ["routine"], ["borsta"]),
  icon("pack", "🎒", "Packa", ["routine"], ["väska", "ryggsäck"]),
  icon("shoes", "👟", "Skor", ["routine"]),
  icon("boots", "🥾", "Stövlar", ["routine"]),
  icon("breakfast", "🥣", "Frukost", ["routine"], ["äta"]),
  icon("lunch", "🥪", "Lunch", ["routine"], ["smörgås"]),
  icon("snack", "🍌", "Mellanmål", ["routine"], ["frukt"]),
  icon("bath", "🛁", "Bada", ["routine"], ["dusch"]),
  icon("shower", "🚿", "Dusch", ["routine"]),
  icon("hair", "💇", "Hår", ["routine"], ["kamma"]),
  icon("book", "📖", "Bok", ["routine"], ["läsa", "saga"]),
  icon("bed", "🛏️", "Säng", ["routine"], ["godnatt"]),
  icon("wash", "🧼", "Tvätta", ["routine"], ["händer"]),
  icon("toilet", "🚽", "Toa", ["routine"], ["potta"]),
  icon("jacket", "🧥", "Jacka", ["routine"], ["ytterkläder"]),
  icon("water", "💧", "Vatten", ["routine"], ["dricka"]),
  icon("medicine", "💊", "Medicin", ["routine"], ["tablett"]),
  icon("homework", "✏️", "Läxa", ["routine"], ["skola"]),
  icon("trash_chore", "🗑️", "Sopor", ["routine"], ["städa"]),
  icon("dishes", "🍽️", "Disk", ["routine"], ["duka"]),
  icon("phone_put", "📵", "Lägg undan", ["routine"], ["mobil"]),

  // People / avatars
  icon("boy", "👦", "Pojke", ["person"]),
  icon("girl", "👧", "Flicka", ["person"]),
  icon("child", "🧒", "Barn", ["person"]),
  icon("man", "👨", "Man", ["person"], ["pappa"]),
  icon("woman", "👩", "Kvinna", ["person"], ["mamma"]),
  icon("person", "🧑", "Person", ["person"]),
  icon("baby", "👶", "Bebis", ["person"]),
  icon("grandpa", "👴", "Farfar", ["person"], ["morfar"]),
  icon("grandma", "👵", "Farmor", ["person"], ["mormor"]),
  icon("family", "👨‍👩‍👧", "Familj", ["person"]),
  icon("dog", "🐶", "Hund", ["person", "activity"]),
  icon("cat", "🐱", "Katt", ["person", "activity"]),
  icon("bear", "🐻", "Björn", ["person"]),
  icon("fox", "🦊", "Räv", ["person"]),
  icon("unicorn", "🦄", "Enhörning", ["person"]),
  icon("robot", "🤖", "Robot", ["person"]),
  icon("alien", "👽", "Alien", ["person"]),
  icon("ninja", "🥷", "Ninja", ["person"]),
  icon("superhero", "🦸", "Superhjälte", ["person"]),
  icon("princess", "👸", "Prinsessa", ["person"]),
  icon("wizard", "🧙", "Trollkarl", ["person"]),

  // UI
  icon("check", "✓", "Klart", ["ui"]),
  icon("mic", "🎤", "Mikrofon", ["ui"]),
  icon("stop", "⏹", "Stopp", ["ui"]),
  icon("delete", "🗑️", "Ta bort", ["ui"]),
  icon("dinner", "🍽️", "Middag", ["ui"]),
  icon("screen", "📱", "Skärm", ["ui"], ["padda", "mobil"]),
  icon("clock", "⏰", "Klocka", ["ui", "activity"], ["tid"]),
  icon("star", "🌟", "Stjärna", ["ui", "activity"]),
  icon("heart", "❤️", "Hjärta", ["ui", "person"]),
  icon("sun", "☀️", "Sol", ["ui", "activity"]),
  icon("moon", "🌙", "Måne", ["ui", "routine"]),
  icon("rain", "🌧️", "Regn", ["ui", "activity"]),
];

const byKey = Object.fromEntries(
  APP_ICONS.map((entry) => [entry.key, entry]),
) as Record<string, AppIconDef>;

const byEmoji = Object.fromEntries(
  APP_ICONS.map((entry) => [entry.emoji, entry]),
) as Record<string, AppIconDef>;

export function iconsInCategory(category: IconCategory): AppIconDef[] {
  return APP_ICONS.filter((entry) => entry.categories.includes(category));
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

/** Build a picker value for a custom (non-library) emoji. */
export function customIconDef(emoji: string, label = "Egen"): AppIconDef {
  return {
    key: "other",
    emoji,
    label,
    categories: ["activity", "routine", "person", "ui"],
  };
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("sv");
}

/** Filter icons by Swedish label / key / keywords. Empty query returns all. */
export function searchIcons(
  icons: AppIconDef[],
  query: string,
): AppIconDef[] {
  const q = normalizeSearch(query);
  if (!q) return icons;
  return icons.filter((entry) => {
    if (normalizeSearch(entry.label).includes(q)) return true;
    if (normalizeSearch(entry.key).includes(q)) return true;
    if (entry.emoji.includes(query.trim())) return true;
    return entry.keywords?.some((kw) => normalizeSearch(kw).includes(q)) ?? false;
  });
}

/** Activity icons — derived from the shared library. */
export type ActivityIconDef = AppIconDef & { key: IconKey };

export const ACTIVITY_ICONS: ActivityIconDef[] = iconsInCategory("activity").map(
  (entry) => ({ ...entry, key: entry.key as IconKey }),
);

export const ROUTINE_ICONS = iconsInCategory("routine");
export const PERSON_ICONS = iconsInCategory("person");
export const UI_ICONS = iconsInCategory("ui");

export function getActivityIcon(key: IconKey): ActivityIconDef {
  const fromLib = byKey[key];
  if (fromLib && fromLib.categories.includes("activity")) {
    return { ...fromLib, key: fromLib.key as IconKey };
  }
  if (fromLib) {
    return { ...fromLib, key: fromLib.key as IconKey };
  }
  return (
    ACTIVITY_ICONS.find((entry) => entry.key === "other") ?? {
      key: "other",
      emoji: "⭐",
      label: "Annat",
      categories: ["activity"],
    }
  );
}

/** Display emoji for an activity/event (custom emoji wins). */
export function resolveActivityEmoji(
  iconKey: IconKey,
  emoji?: string,
): string {
  if (emoji) return emoji;
  return getActivityIcon(iconKey).emoji;
}

/** Default routine step presets from the shared library. */
export function defaultRoutineSteps(): {
  key: string;
  label: string;
  emoji: string;
}[] {
  return ["clothes", "teeth", "pack"].map((key) => {
    const entry = getIconByKey(key)!;
    return { key: entry.key, label: entry.label, emoji: entry.emoji };
  });
}
