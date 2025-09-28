// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, StockMove, Uom, QcStatus, PartyRole, ItemCategory, Incident } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';

// === Helpers ===
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

const initialQcStatusForItemCategory = (category?: ItemCategory): QcStatus => {
  const criticalCategories: ItemCategory[] = ['raw', 'pack', 'fg'];
  return criticalCategories.includes(category || 'raw') ? 'PENDING' : 'PASSED';
};

const landingLocationFor = (category?: ItemCategory) => {
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

// === Server Actions ===

export async function createSupplier(payload: { name: string; taxId?: string }): Promise<Party> {
    const { name, taxId } = payload;
    const nowIso = new Date().toISOString();
    
    const partyRef = db.collection('parties').doc();
    const newParty: Party = {
        id: partyRef.id,
        name,
        legalName: name,
        kind: 'ORG',
        taxId,
        createdAt: nowIso,
        updatedAt: nowIso,
    } as Party;

    const roleRef = db.collection('partyRoles').doc();
    const newRole: PartyRole = {
        id: roleRef.id,
        partyId: partyRef.id,
        role: 'SUPPLIER',
        isActive: true,
        createdAt: nowIso,
        data: {} as any
    };

    const batch = db.batch();
    batch.set(partyRef, newParty);
    batch.set(roleRef, newRole);
    await batch.commit();

    return newParty;
}

export async function createItem(payload: { name: string; sku?: string; uom: Uom; category?: ItemCategory; stdCost?: number }): Promise<Item> {
    const { name, sku, uom, category, stdCost } = payload;
    const itemsSnap = await db.collection('items').get();
    const existingSkus = itemsSnap.docs.map(d => d.data().sku).filter(Boolean);
    const catCode = category || 'raw';

    const itemRef = db.collection('items').doc();
    const newItem: Item = {
        id: itemRef.id,
        name,
        sku: sku || makeSku(name, catCode, existingSkus),
        uom,
        category: catCode,
        stdCost: stdCost || 0,
        active: true,
    };
    
    await itemRef.set({ ...newItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);
    return newItem;
}

export async function createGoodsReceipt(payload: {
  supplierId: string;
  deliveryNote: string;
  receiptDate: string;
  lines: Array<{
    itemId: string;
    supplierLot: string;
    qty: number;
    uom: Uom;
    unitCost?: number;
    locationId?: string;
    expiryAt?: string | null;
  }>;
}) {
  const { supplierId, deliveryNote, receiptDate, lines } = payload;

  if (!supplierId || !deliveryNote || !lines?.length) {
    throw new Error('Proveedor, albarán y al menos una línea son obligatorios.');
  }

  const nowIso = new Date(receiptDate).toISOString();
  const batch = db.batch();

  const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
    .docs.map(d => d.data().receiptNumber).filter(Boolean);
  const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date(receiptDate));
  const receiptRef = db.collection('goodsReceipts').doc();

  const itemIds = lines.map(l => l.itemId);
  const itemsSnap = await db.collection('items').where(FieldPath.documentId(), 'in', itemIds).get();
  const itemsById = new Map(itemsSnap.docs.map(d => [d.id, d.data() as Item]));

  const finalLines: GoodsReceipt['lines'] = [];

  for (const line of lines) {
    const item = itemsById.get(line.itemId);
    if (!item) continue;
    
    const lotNumber = line.supplierLot.trim();
    const qcStatus = initialQcStatusForItemCategory(item.category);

    const lotDoc = LotSchema.parse({
      lotNumber,
      itemId: line.itemId,
      qty: line.qty,
      uom: line.uom,
      qcStatus,
      expiryAt: line.expiryAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const lotRef = db.collection('lots').doc(lotNumber);
    batch.set(lotRef, { ...lotDoc, supplierId } as any, { merge: true });

    const locationId = line.locationId || landingLocationFor(item.category);
    const onHandId = `${line.itemId}|${lotNumber}|${locationId}`;
    const onHandRef = db.collection('onHand').doc(onHandId);
    batch.set(onHandRef, {
      id: onHandId,
      itemId: line.itemId, lotNumber, locationId,
      qty: FieldValue.increment(line.qty),
      uom: line.uom, qcStatus,
      createdAt: nowIso, updatedAt: nowIso,
    }, { merge: true });

    const smRef = db.collection('stockMoves').doc();
    const stockMove: StockMove = {
      id: smRef.id,
      itemId: line.itemId, lotNumber, uom: line.uom,
      qty: line.qty,
      reason: 'receipt',
      toLocationId: locationId,
      occurredAt: nowIso,
      createdAt: nowIso,
      ref: { goodsReceiptId: receiptRef.id },
      unitCost: line.unitCost,
    };
    batch.set(smRef, stockMove as any);

    finalLines.push({
      itemId: line.itemId,
      qty: line.qty,
      uom: line.uom,
      unitCost: line.unitCost,
      lotNumber,
    } as GoodsReceipt['lines'][number]);
  }

  const receipt: GoodsReceipt = {
    id: receiptRef.id,
    receiptNumber,
    supplierPartyId: supplierId,
    deliveryNote,
    receivedAt: nowIso,
    status: lines.some(l => initialQcStatusForItemCategory(itemsById.get(l.itemId)?.category) === 'PENDING') ? 'pending_qc' : 'completed',
    lines: finalLines,
  };
  batch.set(receiptRef, { ...receipt, createdAt: nowIso } as any);

  await batch.commit();
  revalidatePath('/warehouse/inventory');
  revalidatePath('/warehouse/goods-receipt');

  return { receiptId: receiptRef.id, receiptNumber };
}

export async function reportIncident(payload: {
  scope: 'GOODS_RECEIPT';
  refId: string;
  kind: "DAMAGED" | "MISSING" | "DOCUMENT" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
}) {
  const { scope, refId, ...data } = payload;
  
  const incidentRef = db.collection('incidents').doc();
  const incident: Partial<Incident> = {
      id: incidentRef.id,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      kind: 'QC_INBOUND', // Assuming all these are inbound QC issues
      severity: data.severity,
      description: data.notes,
      goodsReceiptId: refId,
  };

  await incidentRef.set(incident);
  
  // Link incident to the goods receipt
  await db.collection('goodsReceipts').doc(refId).update({
      incidentIds: FieldValue.arrayUnion(incidentRef.id)
  });
}
