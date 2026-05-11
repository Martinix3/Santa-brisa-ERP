"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { SBCard } from "@/components/ui/ui-primitives";
export default function ShippingPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Shipping</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Shipping (dummy)</p></div></SBCard></div>
    </div>
  );
}
