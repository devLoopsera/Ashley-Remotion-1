import React from "react";
import { AshleyLogoReveal } from "./components/logo/AshleyLogoReveal";

/**
 * Validation composition: full logo reveal animation.
 */
export const LogoValidation: React.FC = () => {
  return (
    <AshleyLogoReveal
      tagline="SHOP IN-STORE & ONLINE"
      disclaimer="© 2026 Ashley Global Retail, LLC. All rights reserved."
    />
  );
};
