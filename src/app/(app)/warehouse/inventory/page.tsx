/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/page.tsx
import { getInventorySnapshot } from '@/server/actions/inventory.actions';
import { InventoryClient } from './InventoryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const snapshot = await getInventorySnapshot();
  return (
    <ErrorBoundary>
      <InventoryClient {...snapshot} />
    </ErrorBoundary>
  );
}
