import React, { useId } from "react";

interface AshleyHouseIconProps {
  color?: string;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
  className?: string;
  /**
   * Fill color of the interior cutout. Defaults to "transparent" (true cutout).
   * Set to a color to fill the interior, e.g. for a pulse animation.
   */
  innerColor?: string;
}

// Outer house silhouette (full filled shape)
const OUTER_PATH =
  "M 161.75 163.33 L 0 326.48 0 491.74 L 0 657 323.92 657 C 502.07 657 648.55 656.73 649.42 656.39 C 650.85 655.84 651 640.28 651 490.33 C 651 391.1 650.64 325.11 650.09 325.45 C 649.59 325.75 576.4 252.66 487.45 163 C 398.5 73.35 325.22 0.04 324.61 0.09 C 324 0.14 250.71 73.6 161.75 163.33 Z";

// Inner cutout shape (the hole)
const INNER_PATH =
  "M 236.24 220.27 C 189.08 267.72 137.61 319.58 121.85 335.52 L 93.2 364.5 92.55 370 C 92.19 373.03 92.04 417.17 92.2 468.1 C 92.45 544.78 92.74 560.98 93.87 562.35 C 95.14 563.88 112.52 564 325.09 564 C 551.3 564 554.95 563.97 555.97 562.07 C 556.66 560.77 557 528.13 557 463.29 C 557 374.08 556.87 366.25 555.31 363.97 C 554.39 362.61 502.8 310.31 440.69 247.75 C 342.75 149.11 327.37 134 324.86 134 C 322.37 134 310.41 145.64 236.24 220.27 Z";

/**
 * Ashley Furniture house icon as inline SVG.
 * Traced from HouseIcon_primary.eps / HouseIcon_black.png.
 *
 * Default color is Ashley orange (#E87722).
 * Pass color="#FFFFFF" for white or color="#333333" for dark variant.
 */
export const AshleyHouseIcon: React.FC<AshleyHouseIconProps> = ({
  color = "#E87722",
  height = 60,
  width = "auto",
  style,
  className,
  innerColor = "transparent",
}) => {
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 651 657"
      style={{ height, width, display: "block", ...style }}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={maskId}>
          {/* White = visible, Black = hidden */}
          <rect width="100%" height="100%" fill="white" />
          <path d={INNER_PATH} fill="black" />
        </mask>
      </defs>

      {/* Outer shape with interior masked out */}
      <path d={OUTER_PATH} fill={color} mask={`url(#${maskId})`} />

      {/* Optional inner fill (transparent by default = true cutout) */}
      {innerColor !== "transparent" && (
        <path d={INNER_PATH} fill={innerColor} />
      )}
    </svg>
  );
};
