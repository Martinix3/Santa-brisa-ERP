/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getComplianceSchedule } from "@/server/actions/compliance.actions";
import { ComplianceDashboardClient } from "./ComplianceDashboardClient";

export const dynamic = 'force-dynamic';

export default async function Page() {
  const schedules = await getComplianceSchedule();
  const mappedSchedules = schedules.success
    ? schedules.data.map(s => ({ ...s, nextDueDate: new Date(s.nextDueDate).toISOString() }))
    : [];
  return <ComplianceDashboardClient schedules={mappedSchedules} />;
}
