/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/quality/traceability/page.tsx
// "use server";
import { getQualityTraceabilitySnapshot } from "@/server/actions/quality.data";
import { QualityTraceabilityClient } from "./QualityTraceabilityClient";

export const dynamic = 'force-dynamic';

export default async function QualityTraceabilityPage() {
  const snapshot = await getQualityTraceabilitySnapshot();
  return <QualityTraceabilityClient {...snapshot} />;
}
