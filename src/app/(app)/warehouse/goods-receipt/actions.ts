// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, StockMove, Uom, QcStatus } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators'; // <- Zod del plan
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
    case 'fg': return 'FG/MAIN';
    default: return 'RM/MAIN';
  }
};

// Decide el estado QC inicial basado en la categoría.
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
    expiryAt?: string | null; // opcional para FEFO
  }>;
}) {
  const { supplierId, newSupplierName, deliveryNote, lines } = payload;

  // Validación mínima UI
  if ((!supplierId && !newSupplierName) || !deliveryNote || !lines?.length) {
    throw new Error('Proveedor, albarán y al menos una línea son obligatorios.');
  }
  if (lines.some(l => (!l.itemId && !l.newItemName) || !l.qty || !l.supplierLot)) {
    throw new Error('Completa Material, Lote proveedor y Cantidad en todas las líneas.');
  }

  const nowIso = new Date().toISOString();
  const batch = db.batch();

  // 1) Proveedor (alta si es nuevo)
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

  // 2) Items existentes + generar código de recibo
  const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
    .docs.map(d => d.data().receiptNumber).filter(Boolean);
  const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date());
  const receiptRef = db.collection('goodsReceipts').doc();

  const itemsSnap = await db.collection('items').get();
  const existingItems = itemsSnap.docs.map(d => d.data() as Item);
  const existingSkus = existingItems.map(m => m.sku).filter(Boolean) as string[];

  // 3) Procesar líneas: crear item si procede, crear lot, onHand, stockMove
  const finalLines: GoodsReceipt['lines'] = [];

  for (const line of lines) {
    // 3.1 Item
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

    // 3.2 Lote (SSOT: qcStatus nace aquí; sin "status" operativo)
    const lotNumber = line.supplierLot.trim();
    const qcStatus: QcStatus = initialQcStatusFor(category);

    // Valida/normaliza con Zod (LotSchema del plan: qty, uom, qcStatus, expiryAt, created/updated)
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

    // Usamos el lotNumber como id documental (opcional, o doc() auto)
    const lotRef = db.collection('lots').doc(lotNumber);
    batch.set(lotRef, { ...lotDoc, supplierId: finalSupplierId } as any, { merge: true });

    // 3.3 OnHand (clave: item|lot|location)
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

    // 3.4 Movimiento de stock (ledger)
    const smRef = db.collection('stockMoves').doc();
    const stockMove: StockMove = {
      id: smRef.id,
      itemId, lotNumber, uom,
      qty: line.qty,
      reason: 'receipt',
      toLocationId: locationId,
      occurredAt: nowIso,
      createdAt: nowIso,
      ref: { goodsReceiptId: receiptRef.id },
      unitCost: line.unitCost,
    };
    batch.set(smRef, stockMove as any);

    // 3.5 Línea para el documento de recibo
    finalLines.push({
      itemId,
      qty: line.qty,
      uom,
      unitCost: line.unitCost,
      lotNumber,
    } as GoodsReceipt['lines'][number]);
  }

  // 4) Documento de recibo
  const receipt: GoodsReceipt = {
    id: receiptRef.id,
    receiptNumber,
    supplierPartyId: finalSupplierId!,
    deliveryNote,
    receivedAt: nowIso,
    status: 'completed', // El estado de QC del lote individual es lo que importa
    lines: finalLines,
  };
  batch.set(receiptRef, { ...receipt, createdAt: nowIso } as any);

  // 5) Persistir + revalidar
  await batch.commit();
  revalidatePath('/warehouse/inventory');
  revalidatePath('/warehouse/goods-receipt');

  return { receiptId: receiptRef.id, receiptNumber };
}
