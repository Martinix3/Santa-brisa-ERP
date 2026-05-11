"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { SBCard } from "@/components/ui/ui-primitives";
import { Truck } from "lucide-react";
export default function LogisticsDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Truck className="h-6 w-6" />Dashboard Almacén
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Almacén (dummy)</p></div></SBCard></div>
    </div>
  );
}
