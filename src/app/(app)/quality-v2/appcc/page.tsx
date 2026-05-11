/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getQualityV2Snapshot } from "@/server/actions/quality-v2.actions";
import { AppccDashboardClient } from "./AppccDashboardClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "APPCC - Control de Puntos Críticos",
  description: "Sistema de Análisis de Peligros y Puntos de Control Crítico"
};

export default async function AppccPage() {
  const snapshot = await getQualityV2Snapshot();
  
  return <AppccDashboardClient {...snapshot} />;
}
