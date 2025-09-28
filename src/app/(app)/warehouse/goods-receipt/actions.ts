
// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, StockMove, Uom, QcStatus } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';

// -------------------------
// Helpers SKU / categoría
// -------------------------
const uniqueSku = (base: string, existingSkus: string[]) => {
  let candidate = base, i = 1;
  while (existingSkus.includes(candidate)) { i += 1; candidate = `${base}-${i}`; }
  return candidate;
};
const makeSku = (name: string, category: string, existingSkus: string[]) => {
  const cat = (category || 'raw').toUpperCase().slice(0, 3);
  const slug = normText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 12);
  return uniqueSku(`${cat}-${slug || 'ITEM'}`, existingSkus);
};

// Dónde aterriza físicamente el material (por categoría)
const landingLocationFor = (category: Item['category']) => {
  switch (category) {
    case 'raw': return 'RM/MAIN';
    case 'pack': return 'PKG/MAIN';
    case 'consumable': return 'RM/MAIN';
    case 'intermediate': return 'WIP/MAIN';
    case 'merch': return 'PKG/MAIN';
    default: return 'RM/MAIN';
  }
};

const initialQcStatusFor = (category: Item['category']): QcStatus => {
  const criticalCategories: Item['category'][] = ['raw', 'pack', 'fg'];
  return criticalCategories.includes(category) ? 'PENDING' : 'PASSED';
};

export async function createGoodsReceipt(payload: {
  supplierId?: string;
  newSupplierName?: string;
  deliveryNote: string;
  lines: Array<{
    key: string;
    itemId?: string;
    newItemName?: string;
    newItemCategory?: Item['category'];
    supplierLot: string;
    qty: number;
    unitCost: number;
    uom?: Uom;
    expiryAt?: string | null;
  }>;
}) {
  const { supplierId, newSupplierName, deliveryNote, lines } = payload;

  if ((!supplierId && !newSupplierName) || !deliveryNote || !lines?.length) {
    throw new Error('Proveedor, albarán y al menos una línea son obligatorios.');
  }
  if (lines.some(l => (!l.itemId && !l.newItemName) || !l.qty || !l.supplierLot)) {
    throw new Error('Completa Material, Lote proveedor y Cantidad en todas las líneas.');
  }

  const nowIso = new Date().toISOString();
  const batch = db.batch();

  let finalSupplierId = supplierId;
  if (newSupplierName && !supplierId) {
    const newPartyRef = db.collection('parties').doc();
    const newParty: Party = {
      id: newPartyRef.id,
      name: newSupplierName,
      legalName: newSupplierName,
      kind: 'ORG',
      createdAt: nowIso,
      updatedAt: nowIso,
    } as Party;
    batch.set(newPartyRef, newParty);
    finalSupplierId = newPartyRef.id;
  }
  if (!finalSupplierId) throw new Error('El proveedor es obligatorio.');

  const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
    .docs.map(d => d.data().receiptNumber).filter(Boolean);
  const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date());
  const receiptRef = db.collection('goodsReceipts').doc();

  const itemsSnap = await db.collection('items').get();
  const existingItems = itemsSnap.docs.map(d => d.data() as Item);
  const existingSkus = existingItems.map(m => m.sku).filter(Boolean) as string[];

  const finalLines: GoodsReceipt['lines'] = [];

  for (const line of lines) {
    let itemId = line.itemId;
    let item: Item | undefined;
    let uom: Uom = line.uom || 'unit';
    let category: Item['category'] = line.newItemCategory || 'raw';

    if (line.newItemName && !line.itemId) {
      const newItemRef = db.collection('items').doc();
      const newSku = makeSku(line.newItemName, category, existingSkus);
      const newItem: Item = {
        id: newItemRef.id,
        sku: newSku,
        name: line.newItemName,
        category,
        uom: uom,
        stdCost: line.unitCost || 0,
        active: true,
      };
      batch.set(newItemRef, { ...newItem, createdAt: nowIso, updatedAt: nowIso } as any);
      existingSkus.push(newSku);
      itemId = newItemRef.id;
      item = newItem;
    } else if (itemId) {
      item = existingItems.find(mm => mm.id === itemId);
      uom = (item?.uom as Uom) || uom;
      category = item?.category || category;
    }
    if (!itemId) continue;

    const lotNumber = line.supplierLot.trim();
    const qcStatus = initialQcStatusFor(category);

    const lotDoc = LotSchema.parse({
      lotNumber,
      itemId,
      qty: line.qty,
      uom,
      qcStatus,
      expiryAt: line.expiryAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const lotRef = db.collection('lots').doc(lotNumber);
    batch.set(lotRef, { ...lotDoc, supplierId: finalSupplierId } as any, { merge: true });

    const locationId = landingLocationFor(category);
    const onHandId = `${itemId}|${lotNumber}|${locationId}`;
    const onHandRef = db.collection('onHand').doc(onHandId);
    batch.set(onHandRef, {
      id: onHandId,
      itemId, lotNumber, locationId,
      qty: FieldValue.increment(line.qty),
      uom, qcStatus,
      createdAt: nowIso, updatedAt: nowIso,
    }, { merge: true });

    const smRef = db.collection('stockMoves').doc();
    const stockMove: StockMove = {
      id: smRef.id,
      itemId, lotNumber, uom,
      qty: line.qty,
      reason: 'receipt',
      toLocation: locationId,
      occurredAt: nowIso,
      createdAt: nowIso,
      ref: { goodsReceiptId: receiptRef.id },
      unitCost: line.unitCost,
    };
    batch.set(smRef, stockMove as any);

    finalLines.push({
      itemId,
      qty: line.qty,
      uom,
      unitCost: line.unitCost,
      lotNumber,
    } as GoodsReceipt['lines'][number]);
  }

  const receipt: GoodsReceipt = {
    id: receiptRef.id,
    receiptNumber,
    supplierPartyId: finalSupplierId!,
    deliveryNote,
    receivedAt: nowIso,
    status: lines.some(l => initialQcStatusFor(existingItems.find((i: Item) => i.id === l.itemId)?.category || 'raw') === 'PENDING') ? 'pending_qc' : 'completed',
    lines: finalLines,
  };
  batch.set(receiptRef, { ...receipt, createdAt: nowIso } as any);

  await batch.commit();
  revalidatePath('/warehouse/inventory');
  revalidatePath('/warehouse/goods-receipt');

  return { receiptId: receiptRef.id, receiptNumber };
}
