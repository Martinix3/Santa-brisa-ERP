/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Metadata } from "next";
import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Analytics | Santa Brisa ERP",
  description: "Análisis de ventas, sell-out y forecasting con IA",
};

export default async function AnalyticsPage() {
  return (
    <div className="sb-page">
      <AnalyticsContent />
    </div>
  );
}
