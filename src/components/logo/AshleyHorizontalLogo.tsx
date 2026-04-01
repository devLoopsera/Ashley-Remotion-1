import React from "react";
import { AshleyHouseIcon } from "./AshleyHouseIcon";
import { AshleyWordmark } from "./AshleyWordmark";

/**
 * Locked size ratios derived from the official Ashley horizontal logo asset
 * (Ashley-Logo-Horizontal_PNG_et54ya.png, 1576×225 px).
 *
 * The house icon height matches the oversized "A" cap height, which spans
 * 266 of 283 SVG viewBox units in AshleyWordmark → 94% of wordmark height.
 * The gap between icon and wordmark is ~25% of the icon height.
 */
export const LOGO_ICON_HEIGHT_RATIO = 0.94; // iconHeight / wordmarkHeight
export const LOGO_GAP_RATIO = 0.25; // gap / iconHeight

interface AshleyHorizontalLogoProps {
  /** Wordmark rendered height in px — the base sizing unit. Icon and gap scale from this. */
  height?: number;
  iconColor?: string;
  wordmarkColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Ashley horizontal logo: house icon + "ASHLEY" wordmark side by side,
 * with icon and gap sizes locked to the official brand proportions.
 *
 * Usage:
 *   <AshleyHorizontalLogo height={100} iconColor="#E87722" wordmarkColor="#FFFFFF" />
 *
 * The `height` prop sets the wordmark height. Icon and gap are derived automatically.
 */
export const AshleyHorizontalLogo: React.FC<AshleyHorizontalLogoProps> = ({
  height = 60,
  iconColor = "#E87722",
  wordmarkColor = "#FFFFFF",
  style,
  className,
}) => {
  const iconHeight = Math.round(height * LOGO_ICON_HEIGHT_RATIO);
  const gap = Math.round(iconHeight * LOGO_GAP_RATIO);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap,
        ...style,
      }}
      className={className}
    >
      <AshleyHouseIcon color={iconColor} height={iconHeight} />
      <AshleyWordmark color={wordmarkColor} height={height} />
    </div>
  );
};
