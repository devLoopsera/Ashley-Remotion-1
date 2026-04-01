import React from "react";
import { AshleyLogoReveal } from "../components/logo/AshleyLogoReveal";

export type LogoValidationProps = {
  tagline?: string;
  disclaimer?: string;
};

/**
 * Logo Reveal template: full choreographed Ashley logo animation.
 *
 * 8-phase animation (150 frames @ 30fps = 5s):
 *   Phase 1 (0-12f):  Horizontal line extends right from house base
 *   Phase 2 (8-22f):  Left wall draws UP
 *   Phase 3 (18-35f): Roof draws across (left -> peak -> right)
 *   Phase 4 (30-42f): Right wall draws DOWN
 *   Phase 5 (40-58f): Extended line retracts
 *   Phase 6 (12-40f): ASHLEY letters rise + disperse outward then settle
 *   Phase 7 (30-50f): Tagline bar expands horizontally
 *   Phase 8 (95-119f): House icon single pulse (scale 1.0 -> 1.25 -> 1.0)
 *   Disclaimer fades in during frames 20-38
 */
export const LogoValidation: React.FC<LogoValidationProps> = ({
  tagline = "SHOP IN-STORE & ONLINE",
  disclaimer = "© 2026 Ashley Global Retail, LLC. All rights reserved.",
}) => {
  return (
    <AshleyLogoReveal
      tagline={tagline}
      disclaimer={disclaimer}
    />
  );
};
