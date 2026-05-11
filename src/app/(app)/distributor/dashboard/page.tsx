/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/distributor/dashboard/page.tsx
import { DistributorDashboardClient } from './DistributorDashboardClient';
import {
  getDistributorOrders,
  getDistributorOrderKPIs,
  getDistributorStockSummary,
  getPlvMaterials,
  getDistributorFinances
} from '@/server/actions/distributor-dashboard';

export const dynamic = 'force-dynamic';

export default async function DistributorDashboardPage() {
  // TODO: Obtener distributorPartyId y locationId de la sesión del usuario
  // Por ahora usamos valores mock para desarrollo
  const distributorPartyId = 'DIST-CENTRAL-MADRID';
  const locationId = 'LOC-DIST-MADRID';

  // Obtener datos con manejo de errores individual
  // Esto permite que la página funcione aunque algunos datos fallen
  const [orders, kpis, stockSummary, plvMaterials, finances] = await Promise.all([
    getDistributorOrders(distributorPartyId, { limit: 10 }).catch(err => {
      console.error('Error loading orders:', err);
      return [];
    }),
    getDistributorOrderKPIs(distributorPartyId).catch(err => {
      console.error('Error loading KPIs:', err);
      return {
        ordersCount: { pending: 0, inTransit: 0, delivered: 0 },
        otifPercentage: 0
      };
    }),
    getDistributorStockSummary(locationId).catch(err => {
      console.error('Error loading stock summary:', err);
      return {
        totalValue: 0,
        skuCount: 0,
        avgRotation: 0,
        avgCoverage: 0
      };
    }),
    getPlvMaterials().catch(err => {
      console.error('Error loading PLV materials:', err);
      return [];
    }),
    getDistributorFinances(distributorPartyId).catch(err => {
      console.error('Error loading finances:', err);
      return {
        creditLimit: 0,
        creditUsed: 0,
        creditAvailable: 0,
        openInvoices: [],
        bonusAvailable: 0
      };
    })
  ]);

  return (
    <DistributorDashboardClient
      distributorPartyId={distributorPartyId}
      locationId={locationId}
      initialData={{
        orders,
        kpis,
        stockSummary,
        plvMaterials,
        finances
      }}
    />
  );
}
