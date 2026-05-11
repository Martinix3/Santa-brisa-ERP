// src/server/actions/placement.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { OrderService } from '@/services/canonical/order.service';
import type { OrderSellOut, OrderLine } from '@/domain/ssot';

const orderService = new OrderService();

type PlacementLineInput = {
  itemId: string;
  qty: number;
  uom?: 'unit' | 'bottle' | 'case' | 'pallet';
  priceUnit?: number;
  discountPct?: number;
};

export async function createPlacementOrder(input: {
  accountId: string;
  distributorPartyId: string;
  ownerId?: string;
  ownerName?: string;
  notes?: string;
  lines: PlacementLineInput[];
  status?: OrderSellOut['status'];
}) {
  try {
    if (!input.accountId) throw new Error('accountId requerido');
    if (!input.distributorPartyId) throw new Error('distributorPartyId requerido');
    if (!input.lines || input.lines.length === 0) throw new Error('Debe incluir al menos una línea');

    // Completar líneas con precio HORECA por defecto si falta priceUnit
    const completedLines: OrderLine[] = [];
    for (const l of input.lines) {
      if (l.priceUnit === undefined) {
        const itemDoc = await db.collection('items').doc(l.itemId).get();
        if (!itemDoc.exists) throw new Error(`Item no encontrado: ${l.itemId}`);
        const item = itemDoc.data() as any;
        const priceUnit = item?.priceList?.HORECA ?? item?.priceBase ?? item?.priceUnit ?? 0;
        completedLines.push({ itemId: l.itemId, name: item?.name, qty: l.qty, uom: (l.uom || 'unit') as any, priceUnit, discountPct: l.discountPct || 0 });
      } else {
        completedLines.push({ itemId: l.itemId, qty: l.qty, uom: (l.uom || 'unit') as any, priceUnit: l.priceUnit, discountPct: l.discountPct || 0 });
      }
    }

    const saved = await orderService.createOrder({
      orderNumber: `PLC-${Date.now()}`,
      orderDate: new Date().toISOString(),
      lines: completedLines,
      distributorPartyId: input.distributorPartyId,
      accountId: input.accountId,
      channel: 'DISTRIBUTOR',
      flow: 'PLACEMENT',
      status: input.status || 'open',
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      notes: input.notes,
    });

    // Marcar sell-out reportado
    await db.collection('ordersSellOut').doc(saved.id).set({ isSellOutReported: true }, { merge: true });

    return { success: true, orderId: saved.id };
  } catch (error: any) {
    console.error('[createPlacementOrder] Error:', error);
    return { success: false, error: error.message || 'Error creando pedido de colocación' };
  }
}

