

import { adminDb as db } from '@/server/firebase';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';
import type { Item, Uom } from '@/domain/ssot.v7';

type HoldedItem = {
  id: string;
  name?: string;
  reference?: string; // SKU
  barcode?: string;
  price?: number;
  tax?: number;       // % IVA por defecto
  updatedAt?: number;
};

export async function handleSyncHoldedProducts({ page = 1, dryRun = false }: { page?: number; dryRun?: boolean }) {
  // ⚠️ Ajusta la ruta si tu tenant usa otra (documentación Holded inventario).
  const items: HoldedItem[] = await callHoldedApi(`/inventory/v1/items?limit=200&page=${page}`, 'GET') as HoldedItem[];

  for (const it of items) {
    const sku = it.reference || it.id;
    const ref = db.collection('items').doc(sku); // Use SKU as document ID for items

    const item: Partial<Item> = {
      id: sku,
      sku,
      name: it.name || sku,
      // category and uom would need to be mapped or defaulted
      uom: 'uds' as Uom,
      active: true,
      stdCost: Number(it.price || 0),
    };

    if (!dryRun) {
      await ref.set({
        ...item,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      }, { merge: true });
    }
  }

  const processedNames = items.map(it => it.name || it.id).filter(Boolean);
  return { ok: true, count: items.length, nextPage: items.length === 200 ? page + 1 : null, dryRun, processedNames };
}
