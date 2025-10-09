// src/server/actions/goods-receipt.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, StockMove, Uom, Lot, QcStatus } from '@/domain/ssot';

// Tipos legacy locales (a migrar progresivamente)
type ItemCategory = string;
type PartyRole = { id: string; partyId: string; role: string; isActive: boolean; createdAt: string; data?: any };
type GoodsReceipt = { 
  id: string; 
  receiptNumber: string; 
  supplierPartyId: string; 
  deliveryNote: string; 
  receivedAt: string; 
  status: string; 
  lines: Array<{ sku: string; qty: number; uom: string; unitCost?: number; lotNumber: string }>;
  notes?: string;
};
type TraceEventPhase = 'RECEIPT' | 'PRODUCTION' | 'LOGISTICS' | 'QUALITY';
type TraceEventKind = 'ARRIVED' | 'CONSUME' | 'OUTPUT' | 'MOVE' | 'QC';
type TraceEvent = {
  id: string;
  at: string;
  phase: TraceEventPhase;
  kind: TraceEventKind;
  title: string;
  details?: string;
  links?: { lotNumber?: string; receiptId?: string; prodOrderId?: string; orderId?: string };
  data?: Record<string, unknown>;
};
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';
import { findNextLotNumber } from '@/server/actions/inventory.actions';
import { makeOnHandId } from '@/domain/id-helpers';
import { normalizeUom } from '@/domain/uom';

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

function getLocationForCategory(category?: ItemCategory): string {
    if (!category) return 'DEFAULT/UNKNOWN';
    
    const cat = category.toUpperCase();
    if (cat.startsWith('RAW')) return 'RM/MAIN';
    if (cat.startsWith('PACK')) return 'PKG/MAIN';
    if (cat.startsWith('FG')) return 'FG/MAIN';
    
    return 'DEFAULT/GENERAL';
}

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
        uom: normalizeUom(uom), // ✅ SSOT COMPLIANCE: Normalizar UOM
        kind: 'PRODUCT',
        trackStock: true,
        category: catCode,
        stdCost: stdCost || 0,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as Item;
    
    await itemRef.set(
      { ...newItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    revalidatePath('/items');
    revalidatePath('/warehouse/goods-receipt');
    return newItem;
}

export async function createGoodsReceipt(payload: {
  supplierId?: string;
  newSupplierName?: string;
  deliveryNote: string;
  receiptDate: string;
  notes?: string;
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
  }>;
}) {
  const { supplierId, newSupplierName, deliveryNote, receiptDate, notes, lines } = payload;

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
    const itemsById = new Map(existingItems.map(it => [it.id, it]));

    const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
      .docs.map((d: any) => d.data().receiptNumber).filter(Boolean);
    const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date(receiptDate));
    const receiptRef = db.collection('goodsReceipts').doc();

    const finalLines: GoodsReceipt['lines'] = [];

    for (const line of lines) {
        let itemId = line.itemId;
        let currentItem = itemId ? itemsById.get(itemId) : undefined;

        if (!itemId && line.newItemName) {
            const itemRef = db.collection('items').doc();
            itemId = itemRef.id;
            const newItem: Item = {
                id: itemId,
                name: line.newItemName,
                sku: makeSku(line.newItemName, line.newItemCategory || 'raw', existingItems.map(it => it.sku)),
                uom: normalizeUom(line.uom || 'UNIT'), // ✅ SSOT COMPLIANCE: Normalizar UOM
                kind: 'PRODUCT',
                trackStock: true,
                category: line.newItemCategory || 'raw',
                stdCost: line.unitCost || 0,
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as Item;
            batch.set(itemRef, { ...newItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
            itemsById.set(itemId, newItem); // Add to local map for subsequent lines
            currentItem = newItem;
        }
        
        if (!itemId || !currentItem) continue;

        if (!currentItem.uom) throw new Error(`El item ${currentItem.id} (${currentItem.name}) no tiene una unidad de medida (uom) definida.`);
        
        const lotNumber = line.supplierLot.trim() || (line.autoLot ? await findNextLotNumber(itemId, currentItem.sku) : "");
        if (!lotNumber) throw new Error(`El lote de proveedor es obligatorio para la línea con ${currentItem.name}.`);

        // ✅ Sanitizar expiryAt: convertir string vacío o undefined a null
        const sanitizedExpiryAt = line.expiryAt && typeof line.expiryAt === 'string' && line.expiryAt.trim() 
          ? line.expiryAt.trim() 
          : null;

        const lotData = LotSchema.parse({
            lotNumber: lotNumber,
            sku: itemId,
            quantity: line.qty,
            uom: normalizeUom(currentItem.uom), // ✅ SSOT COMPLIANCE: Normalizar UOM
            qcStatus: initialQcStatusForItemCategory(currentItem.category),
            expiryAt: sanitizedExpiryAt,
            createdAt: nowIso,
            updatedAt: nowIso,
        });
        const lotRef = db.collection('lots').doc(lotNumber);
        batch.set(lotRef, { ...lotData, supplierId: finalSupplierId }, { merge: true });

        const locationId = getLocationForCategory(currentItem.category);
        const onHandId = makeOnHandId(itemId, lotNumber, locationId);
        const onHandRef = db.collection('onHand').doc(onHandId);
        batch.set(onHandRef, {
            id: onHandId, itemId, lotNumber, locationId,
            qty: FieldValue.increment(line.qty),
            uom: normalizeUom(currentItem.uom), // ✅ SSOT COMPLIANCE: Normalizar UOM
            qcStatus: lotData.qcStatus,
            createdAt: nowIso, updatedAt: nowIso,
            expiryAt: sanitizedExpiryAt,
        }, { merge: true });

        const smRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: smRef.id,
            date: nowIso,
            type: 'IN',
            reason: 'PURCHASE',
            warehouseId: locationId,
            items: [{ sku: currentItem.sku, quantity: line.qty, cost: line.unitCost, lotNumber }],
            createdAt: nowIso,
            updatedAt: nowIso,
            // Legacy compat fields
            itemId, lotNumber, 
            uom: normalizeUom(currentItem.uom),
            qty: line.qty,
            toLocationId: locationId,
            occurredAt: nowIso,
            ref: { goodsReceiptId: receiptRef.id },
            unitCost: line.unitCost,
        } as StockMove;
        batch.set(smRef, stockMove as any);

        const traceEventRef = db.collection('traceEvents').doc();
        const traceEvent: TraceEvent = {
            id: traceEventRef.id,
            at: nowIso,
            phase: 'RECEIPT',
            kind: 'ARRIVED',
            title: `Recepción de Lote ${lotNumber}`,
            details: `Recibido de proveedor ${finalSupplierId}`,
            links: { lotNumber: lotNumber, receiptId: receiptRef.id },
            data: {
                supplierId: finalSupplierId,
                deliveryNote: deliveryNote,
                qty: line.qty,
                uom: normalizeUom(currentItem.uom) // ✅ SSOT COMPLIANCE: Normalizar UOM
            }
        };
        batch.set(traceEventRef, traceEvent as any);


        finalLines.push({
            itemId,
            qty: line.qty,
            uom: normalizeUom(currentItem.uom), // ✅ SSOT COMPLIANCE: Normalizar UOM
            unitCost: line.unitCost,
            lotNumber,
        } as any);
    }
    
    const itemsForQcCheck = finalLines.map((l: any) => l.itemId).map((id: string) => itemsById.get(id));
    const requiresQc = itemsForQcCheck.some(item => {
        const cat = item?.category;
        return cat === 'raw' || cat === 'pack' || cat === 'fg';
    });

    const receipt: Omit<GoodsReceipt, 'createdAt'|'updatedAt'> & {notes?: string} = {
        id: receiptRef.id,
        receiptNumber,
        supplierPartyId: finalSupplierId!,
        deliveryNote,
        receivedAt: nowIso,
        status: requiresQc ? 'pending_qc' : 'completed',
        lines: finalLines,
        notes: notes || undefined,
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
