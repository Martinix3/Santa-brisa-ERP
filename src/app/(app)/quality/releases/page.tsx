// "use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { getQualityReleasesSnapshot } from '@/server/actions/quality.data';
import { QualityReleasesClient } from './QualityReleasesClient';

export const dynamic = 'force-dynamic';

export default async function QualityReleasesPage() {
  const snapshot = await getQualityReleasesSnapshot();
  return <QualityReleasesClient {...snapshot} />;
}
