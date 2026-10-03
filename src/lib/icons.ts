import type { IconKey } from "./types";

export interface ActivityIconDef {
  key: IconKey;
  emoji: string;
  label: string;
}

export const ACTIVITY_ICONS: ActivityIconDef[] = [
  { key: "preschool", emoji: "🏫", label: "Förskola" },
  { key: "home", emoji: "🏠", label: "Hemma" },
  { key: "outdoors", emoji: "🌳", label: "Ute" },
  { key: "sport", emoji: "⚽", label: "Sport" },
  { key: "friend", emoji: "👫", label: "Kompis" },
  { key: "travel", emoji: "🚗", label: "Resa" },
  { key: "doctor", emoji: "🩺", label: "Doktor" },
  { key: "food", emoji: "🍎", label: "Mat" },
  { key: "sleep", emoji: "😴", label: "Sova" },
  { key: "play", emoji: "🧸", label: "Leka" },
  { key: "music", emoji: "🎵", label: "Musik" },
  { key: "other", emoji: "⭐", label: "Annat" },
];

const byKey = Object.fromEntries(
  ACTIVITY_ICONS.map((icon) => [icon.key, icon]),
) as Record<IconKey, ActivityIconDef>;

export function getActivityIcon(key: IconKey): ActivityIconDef {
  return byKey[key] ?? byKey.other;
}
