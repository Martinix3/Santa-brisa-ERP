/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getQualityV2Snapshot } from "@/server/actions/quality-v2.actions";
import { QualityDashboardExecutive } from "./QualityDashboardExecutive";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Quality Dashboard | Santa Brisa ERP",
  description: "Dashboard ejecutivo de control de calidad"
};

export default async function QualityDashboardPage() {
  const snapshot = await getQualityV2Snapshot();

  return (
    <QualityDashboardExecutive
      lots={snapshot.lots}
      plans={snapshot.plans}
      parameters={snapshot.parameters}
      geminiAlerts={snapshot.geminiAlerts}
    />
  );
}
