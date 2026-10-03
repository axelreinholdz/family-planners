import { AppIcon, type AppIconSize } from "@/components/AppIcon";
import type { IconKey } from "@/lib/types";

interface ActivityIconProps {
  iconKey: IconKey;
  /** When set, overrides the library emoji for this activity. */
  emoji?: string;
  size?: AppIconSize;
  showLabel?: boolean;
  title?: string;
}

/** Activity-specific wrapper around the shared AppIcon library. */
export function ActivityIcon({
  iconKey,
  emoji,
  size = "md",
  showLabel = false,
  title,
}: ActivityIconProps) {
  return (
    <AppIcon
      iconKey={iconKey}
      emoji={emoji}
      size={size}
      showLabel={showLabel}
      title={title}
    />
  );
}
