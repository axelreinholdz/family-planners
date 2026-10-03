"use client";

import { useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import {
  customIconDef,
  iconsInCategory,
  searchIcons,
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

/** Extract a single emoji (or short grapheme) from free text. */
function extractEmoji(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Prefer an emoji-like grapheme; fall back to first character cluster.
  const match = trimmed.match(
    /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u,
  );
  if (match?.[0]) return match[0];
  const chars = [...trimmed];
  return chars[0] ?? "";
}

export function IconPicker({
  value,
  onChange,
  category,
  onLabelSuggest,
  columns = "wide",
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [customDraft, setCustomDraft] = useState("");

  const allIcons = useMemo(() => {
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
    return icons;
  }, [category]);

  const icons = useMemo(
    () => searchIcons(allIcons, query),
    [allIcons, query],
  );

  const inLibrary = allIcons.some((icon) => icon.emoji === value);
  const customPreview = extractEmoji(customDraft);

  const applyCustom = () => {
    const emoji = extractEmoji(customDraft);
    if (!emoji) return;
    const icon = customIconDef(emoji);
    onChange(icon);
    onLabelSuggest?.(icon.label);
    setCustomDraft("");
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
          Sök ikon
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="t.ex. simning, cykel…"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
        />
      </label>

      <div
        className={`grid max-h-52 gap-2 overflow-y-auto pr-0.5 ${
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

      {icons.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Inga ikoner matchade.</p>
      ) : null}

      <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--ink-muted)]">
          Egen emoji
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyCustom();
              }
            }}
            placeholder="Klistra in emoji"
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            inputMode="text"
            autoComplete="off"
          />
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-2xl"
            aria-hidden
          >
            {customPreview || (!inLibrary && value ? value : "➕")}
          </span>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customPreview}
            className="tap-target shrink-0 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Använd
          </button>
        </div>
        {!inLibrary && value ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Vald: <span className="text-base">{value}</span> (egen)
          </p>
        ) : null}
      </div>
    </div>
  );
}
