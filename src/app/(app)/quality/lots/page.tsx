// "use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { getQualityLotsSnapshot } from '@/server/actions/quality.data';
import { QualityLotsClient } from './QualityLotsClient';

export const dynamic = 'force-dynamic';

export default async function QualityLotsPage() {
  const snapshot = await getQualityLotsSnapshot();
  return <QualityLotsClient {...snapshot} />;
}
