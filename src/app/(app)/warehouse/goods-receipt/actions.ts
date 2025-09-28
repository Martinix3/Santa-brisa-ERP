// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, StockMove, Uom, ItemCategory, PartyRole, Lot, QcStatus } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';
import { findNextLotNumber } from '../inventory/actions';

// --- Helpers ---
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
  const criticalCategories: (ItemCategory | undefined)[] = ['raw', 'pack', 'fg', 'intermediate'];
  return criticalCategories.includes(category) ? 'PENDING' : 'PASSED';
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
    
    const batch = db.batch();

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

    batch.set(partyRef, newParty);
    batch.set(roleRef, newRole);
    await batch.commit();

    revalidatePath('/contacts');
    revalidatePath('/warehouse/goods-receipt');

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
    revalidatePath('/items');
    revalidatePath('/warehouse/goods-receipt');
    return newItem;
}

export async function createGoodsReceipt(payload: {
  supplierId?: string;
  newSupplierName?: string;
  deliveryNote: string;
  receiptDate: string;
  lines: Array<{
    itemId?: string;
    newItemName?: string;
    newItemCategory?: Item['category'];
    supplierLot: string;
    qty: number;
    unitCost?: number;
    uom?: Uom;
    expiryAt?: string | null;
    autoLot?: boolean;
    locationId?: string;
  }>;
}) {
  const { supplierId, newSupplierName, deliveryNote, receiptDate, lines } = payload;

  if ((!supplierId && !newSupplierName) || !deliveryNote || !lines?.length) {
    throw new Error('Proveedor, albarán y al menos una línea son obligatorios.');
  }

  try {
    const batch = db.batch();
    const nowIso = new Date(receiptDate).toISOString();

    let finalSupplierId = supplierId;
    if (newSupplierName && !supplierId) {
      const newParty = await createSupplier({ name: newSupplierName });
      finalSupplierId = newParty.id;
    }
    if (!finalSupplierId) throw new Error('El proveedor es obligatorio.');

    const allItemsSnap = await db.collection('items').get();
    const existingItems = allItemsSnap.docs.map(doc => doc.data() as Item);
    const existingItemsMap = new Map(existingItems.map(it => [it.id, it]));

    const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
      .docs.map(d => d.data().receiptNumber).filter(Boolean);
    const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date(receiptDate));
    const receiptRef = db.collection('goodsReceipts').doc();

    const finalLines: GoodsReceipt['lines'] = [];

    for (const line of lines) {
        let itemId = line.itemId;
        let currentItem = itemId ? existingItemsMap.get(itemId) : undefined;

        if (!itemId && line.newItemName) {
            const itemRef = db.collection('items').doc();
            itemId = itemRef.id;
            const newItem: Item = {
                id: itemId,
                name: line.newItemName,
                sku: makeSku(line.newItemName, line.newItemCategory || 'raw', existingItems.map(it => it.sku)),
                uom: line.uom || 'unit',
                category: line.newItemCategory || 'raw',
                stdCost: line.unitCost || 0,
                active: true,
            };
            batch.set(itemRef, { ...newItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any, { merge: true });
            existingItemsMap.set(itemId, newItem); 
            currentItem = newItem;
        }
        
        if (!itemId || !currentItem) continue;

        if (!currentItem.uom) throw new Error(`El item ${currentItem.id} (${currentItem.name}) no tiene una unidad de medida (uom) definida.`);
        
        const lotNumber = line.supplierLot.trim() || (line.autoLot ? await findNextLotNumber(itemId, currentItem.sku) : "");
        if (!lotNumber) throw new Error(`El lote de proveedor es obligatorio para la línea con ${currentItem.name}.`);

        const lotData = LotSchema.parse({
            lotNumber: lotNumber,
            itemId: itemId,
            quantity: line.qty,
            uom: currentItem.uom,
            qcStatus: initialQcStatusForItemCategory(currentItem.category),
            expiryAt: line.expiryAt ?? null,
            createdAt: nowIso,
            updatedAt: nowIso,
        });
        const lotRef = db.collection('lots').doc(lotNumber);
        batch.set(lotRef, { ...lotData, supplierId: finalSupplierId }, { merge: true });

        const locationId = line.locationId || landingLocationFor(currentItem.category);
        const onHandId = `${itemId}|${lotNumber}|${locationId}`;
        const onHandRef = db.collection('onHand').doc(onHandId);
        batch.set(onHandRef, {
            id: onHandId, itemId, lotNumber, locationId,
            qty: FieldValue.increment(line.qty),
            uom: currentItem.uom, qcStatus: lotData.qcStatus,
            createdAt: nowIso, updatedAt: nowIso,
        }, { merge: true });

        const smRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: smRef.id,
            itemId, lotNumber, uom: currentItem.uom,
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
            itemId,
            qty: line.qty,
            uom: currentItem.uom,
            unitCost: line.unitCost,
            lotNumber,
        } as any);
    }
    
    const itemsForQcCheck = finalLines.map(l => (l as any).itemId).map(id => existingItemsMap.get(id));
    const requiresQc = itemsForQcCheck.some(item => {
        const cat = item?.category;
        return cat === 'raw' || cat === 'pack' || cat === 'fg';
    });

    const receipt: GoodsReceipt = {
        id: receiptRef.id,
        receiptNumber,
        supplierPartyId: finalSupplierId!,
        deliveryNote,
        receivedAt: nowIso,
        status: requiresQc ? 'pending_qc' : 'completed',
        lines: finalLines,
    };
    batch.set(receiptRef, { ...receipt, createdAt: nowIso } as any);

    await batch.commit();
    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');

    return { ...receipt, id: receiptRef.id, supplierId: finalSupplierId, receiptId: receiptRef.id, receiptNumber };
  } catch(e: any) {
      console.error(`[ACTION:createGoodsReceipt] Failed. Payload:`, JSON.stringify(payload, null, 2), `Error:`, e);
      throw new Error(e.message || "Error interno del servidor al crear la recepción.");
  }
}

export async function reportIncident(payload: {
  scope: 'GOODS_RECEIPT';
  refId: string;
  kind: "DAMAGED" | "MISSING" | "DOCUMENT" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
}) {
  // Logic to report an incident
}
