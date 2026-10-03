import { getIconByEmoji, getIconByKey } from "@/lib/icons";

export type AppIconSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<AppIconSize, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-6xl",
};

interface AppIconProps {
  /** Library key, e.g. "clothes" or "preschool". */
  iconKey?: string;
  /** Raw emoji — used when no key, or as override. */
  emoji?: string;
  size?: AppIconSize;
  showLabel?: boolean;
  title?: string;
  className?: string;
}

export function AppIcon({
  iconKey,
  emoji,
  size = "md",
  showLabel = false,
  title,
  className = "",
}: AppIconProps) {
  const fromKey = iconKey ? getIconByKey(iconKey) : undefined;
  const fromEmoji = emoji ? getIconByEmoji(emoji) : undefined;
  const def = fromEmoji ?? fromKey;
  // Custom/override emoji wins over library key (needed for "other" + own emoji).
  const glyph = emoji ?? fromKey?.emoji ?? "⭐";
  const label = title ?? def?.label ?? glyph;

  return (
    <span
      className={`inline-flex flex-col items-center gap-0.5 leading-none ${className}`}
      title={label}
    >
      <span className={sizeClass[size]} aria-hidden>
        {glyph}
      </span>
      {showLabel ? (
        <span className="max-w-[4.5rem] truncate text-center text-[0.7rem] font-semibold tracking-wide text-[var(--ink-muted)]">
          {label}
        </span>
      ) : null}
    </span>
  );
}
