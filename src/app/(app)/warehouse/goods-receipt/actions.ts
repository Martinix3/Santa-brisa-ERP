
// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, StockMove, Uom, ItemCategory, PartyRole, Lot, QcStatus } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';

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
const generateLotNumber = (item: Item | undefined) => {
  const dt = new Date();
  const y = String(dt.getUTCFullYear()).slice(2);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const base = item?.id?.split("_").pop()?.toUpperCase().slice(0, 3) ?? "ITM";
  const prefix = item?.category?.startsWith("raw") ? "L" + base : "FG-" + base;
  const rand = Math.floor(Math.random() * 89) + 10;
  return `${prefix}-${y}${m}${d}-${rand}`;
}
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

    const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
      .docs.map(d => d.data().receiptNumber).filter(Boolean);
    const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date(receiptDate));
    const receiptRef = db.collection('goodsReceipts').doc();

    const itemIdsInPayload = lines.map(l => l.itemId).filter(Boolean) as string[];
    const itemsData = itemIdsInPayload.length ? await db.collection('items').where(FieldPath.documentId(), 'in', itemIdsInPayload).get() : { docs: [] };
    const existingItems = itemsData.docs.map(d => d.data() as Item);


    const finalLines: GoodsReceipt['lines'] = [];

    for (const line of lines) {
      let itemId = line.itemId;
      
      if (line.newItemName && !itemId) {
        const newItem = await createItem({
          name: line.newItemName,
          category: line.newItemCategory || 'raw',
          uom: line.uom || 'unit',
          stdCost: line.unitCost || 0,
        });
        itemId = newItem.id;
        existingItems.push(newItem); // Add to local cache
      }
      
      const item = existingItems.find(it => it.id === itemId);
      if (!item || !itemId) continue;

      const lotNumber = line.supplierLot.trim() || (line.autoLot ? generateLotNumber(item) : "");
      if (!lotNumber) throw new Error(`El lote de proveedor es obligatorio para la línea con ${item.name}.`);

      const qcStatus = initialQcStatusForItemCategory(item.category);

      const lotData = LotSchema.parse({
        lotNumber: lotNumber,
        itemId: itemId,
        quantity: line.qty,
        uom: item.uom,
        qcStatus: qcStatus,
        expiryAt: line.expiryAt ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      const lotRef = db.collection('lots').doc(lotNumber);
      batch.set(lotRef, { ...lotData, supplierId: finalSupplierId }, { merge: true });

      const locationId = line.locationId || landingLocationFor(item.category);
      const onHandId = `${itemId}|${lotNumber}|${locationId}`;
      const onHandRef = db.collection('onHand').doc(onHandId);
      batch.set(onHandRef, {
        id: onHandId, itemId, lotNumber, locationId,
        qty: FieldValue.increment(line.qty),
        uom: item.uom, qcStatus,
        createdAt: nowIso, updatedAt: nowIso,
      }, { merge: true });

      const smRef = db.collection('stockMoves').doc();
      const stockMove: StockMove = {
        id: smRef.id,
        itemId, lotNumber, uom: item.uom,
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
        uom: item.uom,
        unitCost: line.unitCost,
        lotNumber,
      } as any);
    }
    
    const requiresQc = finalLines.some(l => {
        const item = existingItems.find(i => i.id === (l as any).itemId);
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

    return { ...receipt, id: receiptRef.id, supplierId: finalSupplierId };
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
