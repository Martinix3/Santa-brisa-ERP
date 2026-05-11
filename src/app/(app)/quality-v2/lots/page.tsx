/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getQualityV2Snapshot } from "@/server/actions/quality-v2.actions";
import { LotsManagementClient } from "./LotsManagementClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Lotes QC | Santa Brisa ERP",
  description: "Gestión de lotes y control de calidad"
};

export default async function LotsPage() {
  const snapshot = await getQualityV2Snapshot();

  return (
    <LotsManagementClient
      lots={snapshot.lots}
      plans={snapshot.plans}
      parameters={snapshot.parameters}
      geminiAlerts={snapshot.geminiAlerts}
    />
  );
}
