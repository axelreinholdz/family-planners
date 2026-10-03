import { getActivityIcon } from "@/lib/icons";
import type { IconKey } from "@/lib/types";

interface ActivityIconProps {
  iconKey: IconKey;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  title?: string;
}

const sizeClass = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
} as const;

export function ActivityIcon({
  iconKey,
  size = "md",
  showLabel = false,
  title,
}: ActivityIconProps) {
  const icon = getActivityIcon(iconKey);
  return (
    <span
      className="inline-flex flex-col items-center gap-0.5 leading-none"
      title={title ?? icon.label}
    >
      <span className={sizeClass[size]} aria-hidden>
        {icon.emoji}
      </span>
      {showLabel ? (
        <span className="max-w-[4.5rem] truncate text-center text-[0.7rem] font-semibold tracking-wide text-[var(--ink-muted)]">
          {title ?? icon.label}
        </span>
      ) : null}
    </span>
  );
}
