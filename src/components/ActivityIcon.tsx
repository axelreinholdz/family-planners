import { AppIcon, type AppIconSize } from "@/components/AppIcon";
import type { IconKey } from "@/lib/types";

interface ActivityIconProps {
  iconKey: IconKey;
  size?: AppIconSize;
  showLabel?: boolean;
  title?: string;
}

/** Activity-specific wrapper around the shared AppIcon library. */
export function ActivityIcon({
  iconKey,
  size = "md",
  showLabel = false,
  title,
}: ActivityIconProps) {
  return (
    <AppIcon iconKey={iconKey} size={size} showLabel={showLabel} title={title} />
  );
}
