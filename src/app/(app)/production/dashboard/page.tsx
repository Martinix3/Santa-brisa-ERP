/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import ProductionDashboard from '@/features/production/dashboard/components/ProductionDashboard';
import { getProductionData } from '@/features/production/dashboard/lib/data';

export const dynamic = 'force-dynamic';

const ProductionDashboardPage = async () => {
  const { orders, kpis } = await getProductionData();
  return <ProductionDashboard initialOrders={orders} initialKpis={kpis} />;
};

export default ProductionDashboardPage;
