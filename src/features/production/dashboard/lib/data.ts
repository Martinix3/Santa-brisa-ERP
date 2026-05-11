/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { adminDb as db } from '@/server/firebase';
import { ProductionOrderSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

export async function getProductionData() {
  const ordersSnapshot = await db.collection('productionOrders').get();
  const orders = ordersSnapshot.docs.map(doc => doc.data() as ProductionOrder);

  const openOrders = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const pausedOrders = orders.filter(o => o.status === 'PAUSED').length;

  // TODO: Calculate waste and performance for the last 7 days
  const kpis = {
    openOrders,
    pausedOrders,
    waste7d: 0,
    performance7d: 0,
    fgStock: 0,
  };

  return { orders, kpis };
}
