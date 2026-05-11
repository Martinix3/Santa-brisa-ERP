// "use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { getQualityPlansSnapshot } from '@/server/actions/quality.data';
import { QualityPlansClient } from './QualityPlansClient';

export const dynamic = 'force-dynamic';

export default async function QualityPlansPage() {
  const snapshot = await getQualityPlansSnapshot();
  return <QualityPlansClient {...snapshot} />;
}
