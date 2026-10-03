"use client";

import { AppIcon } from "@/components/AppIcon";
import {
  iconsInCategory,
  type AppIconDef,
  type IconCategory,
} from "@/lib/icons";

interface IconPickerProps {
  /** Selected emoji value. */
  value: string;
  onChange: (icon: AppIconDef) => void;
  category: IconCategory | IconCategory[];
  /** When true, selecting an icon also suggests its Swedish label via callback. */
  onLabelSuggest?: (label: string) => void;
  columns?: "compact" | "wide";
}

export function IconPicker({
  value,
  onChange,
  category,
  onLabelSuggest,
  columns = "wide",
}: IconPickerProps) {
  const cats = Array.isArray(category) ? category : [category];
  const seen = new Set<string>();
  const icons: AppIconDef[] = [];
  for (const cat of cats) {
    for (const icon of iconsInCategory(cat)) {
      if (seen.has(icon.key)) continue;
      seen.add(icon.key);
      icons.push(icon);
    }
  }

  return (
    <div
      className={`grid gap-2 ${
        columns === "compact"
          ? "grid-cols-4 sm:grid-cols-6"
          : "grid-cols-4 sm:grid-cols-6"
      }`}
    >
      {icons.map((icon) => {
        const selected = value === icon.emoji;
        return (
          <button
            key={icon.key}
            type="button"
            onClick={() => {
              onChange(icon);
              onLabelSuggest?.(icon.label);
            }}
            className={`tap-target flex flex-col items-center rounded-2xl px-1 py-2 ring-2 ${
              selected
                ? "bg-[var(--accent-soft)] ring-[var(--accent)]"
                : "bg-[var(--surface-soft)] ring-transparent"
            }`}
            title={icon.label}
          >
            <AppIcon emoji={icon.emoji} size="md" showLabel title={icon.label} />
          </button>
        );
      })}
    </div>
  );
}
