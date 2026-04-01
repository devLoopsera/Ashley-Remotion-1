import React from "react";
import { AshleyHouseIcon } from "./AshleyHouseIcon";
import { AshleyWordmark } from "./AshleyWordmark";

/**
 * Locked size ratios derived from the official Ashley vertical logo asset
 * (Ashley-Logo-Vertical_PNG_gztzfy.png, 1633×780 px).
 *
 * The wordmark SVG fills the full 1633px width at 283px height.
 * The house icon is centered above the wordmark, sized to ≈1.55× the wordmark height.
 * The gap between icon bottom and wordmark top is ≈0.15× the wordmark height.
 */
export const LOGO_VERTICAL_ICON_HEIGHT_RATIO = 1.55; // iconHeight / wordmarkHeight
export const LOGO_VERTICAL_GAP_RATIO = 0.15;         // gap / wordmarkHeight

interface AshleyVerticalLogoProps {
  /** Wordmark rendered height in px — the base sizing unit. Icon and gap scale from this. */
  height?: number;
  iconColor?: string;
  wordmarkColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Ashley vertical logo: house icon centered above "ASHLEY" wordmark,
 * with icon and gap sizes locked to the official brand proportions.
 *
 * Usage:
 *   <AshleyVerticalLogo height={60} iconColor="#E87722" wordmarkColor="#FFFFFF" />
 *
 * The `height` prop sets the wordmark height. Icon and gap are derived automatically.
 */
export const AshleyVerticalLogo: React.FC<AshleyVerticalLogoProps> = ({
  height = 60,
  iconColor = "#E87722",
  wordmarkColor = "#FFFFFF",
  style,
  className,
}) => {
  const iconHeight = Math.round(height * LOGO_VERTICAL_ICON_HEIGHT_RATIO);
  const gap = Math.round(height * LOGO_VERTICAL_GAP_RATIO);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
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
