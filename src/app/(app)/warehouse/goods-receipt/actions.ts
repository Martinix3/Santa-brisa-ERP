// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Item, GoodsReceipt, OnHandView, StockMove, Uom, Lot } from '@/domain/ssot';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';

const uniqueSku = (base: string, existingSkus: string[]) => {
  let candidate = base;
  let i = 1;
  while (existingSkus.includes(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
};

const makeSku = (name: string, category: string, existingSkus: string[]) => {
  const cat = (category || 'raw').toUpperCase().slice(0, 3);
  const slug = normText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 12);
  const base = `${cat}-${slug || 'ITEM'}`;
  return uniqueSku(base, existingSkus);
};

export async function createGoodsReceipt(payload: {
    supplierId?: string;
    newSupplierName?: string;
    deliveryNote: string;
    lines: {
        key: string;
        itemId?: string;
        newMaterialName?: string;
        newItemCategory?: Item['category'];
        supplierLot: string;
        qty: number;
        unitCost: number;
        uom?: Uom;
    }[];
    sendToQc: boolean;
}) {
    const { supplierId, newSupplierName, deliveryNote, lines, sendToQc } = payload;
    const now = new Date();
    const batch = db.batch();

    let finalSupplierId = supplierId;

    // 1. Crear nuevo proveedor si es necesario
    if (newSupplierName && !supplierId) {
        const newPartyRef = db.collection('parties').doc();
        const nowIso = now.toISOString();
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

    if (!finalSupplierId) {
        throw new Error('El proveedor es obligatorio.');
    }

    const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get()).docs.map(d => d.data().receiptNumber).filter(Boolean);
    const receiptNumber = makeGoodsReceiptCode(allReceipts, new Date());
    const receiptRef = db.collection('goodsReceipts').doc();
    
    const itemsSnap = await db.collection('items').get();
    const existingItems = itemsSnap.docs.map(d => d.data() as Item);
    const existingSkus = existingItems.map(m => m.sku).filter(Boolean) as string[];

    const finalLines: GoodsReceipt['lines'] = [];

    // 2. Procesar todas las líneas
    for (const line of lines) {
        let itemId = line.itemId;
        let sku = '';
        let uom: Uom = line.uom || 'unit';
        let category: Item['category'] = line.newItemCategory || 'raw';

        if (line.newMaterialName && !line.itemId) {
            const newItemRef = db.collection('items').doc();
            category = line.newItemCategory || 'raw';
            const newSku = makeSku(line.newMaterialName, category, existingSkus);

            const newItem: Item = {
                id: newItemRef.id,
                sku: newSku,
                name: line.newMaterialName,
                category: category,
                uom: (line.uom || 'unit'),
                stdCost: line.unitCost || 0,
                active: true,
            };
            batch.set(newItemRef, { ...newItem, createdAt: now.toISOString(), updatedAt: now.toISOString() } as any);
            existingSkus.push(newSku);
            itemId = newItemRef.id;
            sku = newSku;
            uom = newItem.uom as Uom;
        } else if (itemId) {
            const m = existingItems.find(mm => mm.id === itemId);
            sku = m?.sku || '';
            uom = (m?.uom as Uom) || 'unit';
            category = m?.category || 'raw';
        }

        if (!itemId) continue;
        
        const lotNumber = line.supplierLot;

        const lotRef = db.collection('lots').doc(lotNumber);
        const newLot: Lot = {
            id: lotNumber,
            lotNumber: lotNumber,
            itemId: itemId,
            quantity: line.qty,
            createdAt: now.toISOString(),
            receivedAt: now.toISOString(),
            supplierId: finalSupplierId,
            qcStatus: sendToQc ? 'PENDING' : 'RELEASED',
            status: sendToQc ? 'ON_HOLD_QC' : 'RELEASED',
            locationId: sendToQc ? 'QC/AREA' : (category === 'raw' ? 'RM/MAIN' : 'PKG/MAIN')
        };
        batch.set(lotRef, newLot, { merge: true });
        
        const onHandItemRef = db.collection('onHand').doc();
        const locationId = sendToQc ? 'QC/AREA' : (category === 'raw' ? 'RM/MAIN' : 'PKG/MAIN');

        const onHandItem: OnHandView = {
            id: onHandItemRef.id,
            itemId: itemId,
            lotNumber: lotNumber,
            qty: line.qty,
            uom: uom,
            locationId: locationId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        batch.set(onHandItemRef, onHandItem);

        // Crear Movimiento de Stock (ledger)
        const newStockMoveRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: newStockMoveRef.id,
            itemId: itemId,
            lotNumber: lotNumber,
            uom: uom,
            qty: line.qty,
            reason: 'receipt',
            toLocation: locationId,
            occurredAt: now.toISOString(),
            createdAt: now.toISOString(),
            ref: { goodsReceiptId: receiptRef.id },
            unitCost: line.unitCost,
        };
        batch.set(newStockMoveRef, stockMove as any);

        finalLines.push({
            itemId: itemId!,
            qty: line.qty,
            uom: uom,
            unitCost: line.unitCost,
            lotNumber: lotNumber,
        } as GoodsReceipt['lines'][number]);
    }

    const receipt: GoodsReceipt = {
        id: receiptRef.id,
        receiptNumber: receiptNumber,
        supplierPartyId: finalSupplierId!,
        deliveryNote,
        receivedAt: now.toISOString(),
        status: sendToQc ? 'pending_qc' : 'completed',
        lines: finalLines,
    };
    batch.set(receiptRef, { ...receipt, createdAt: now.toISOString() } as any);

    await batch.commit();

    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');
}
