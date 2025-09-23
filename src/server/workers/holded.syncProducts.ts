import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';

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
    const ref = adminDb.collection('products').doc(sku);

    const product = {
      id: sku,
      sku,
      name: it.name || sku,
      barcode: it.barcode || null,
      priceList: [{ name: 'base', currency: 'EUR', price: Number(it.price || 0) }],
      defaultTaxRate: it.tax ?? 21,
      external: { holdedItemId: it.id },
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    if (!dryRun) {
      await ref.set(product, { merge: true });
    }
  }

  return { ok: true, count: items.length, nextPage: items.length === 200 ? page + 1 : null };
}
