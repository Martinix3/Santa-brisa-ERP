
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Material, GoodsReceipt, Lot, StockMove, Uom } from '@/domain/ssot';
import { normText } from '@/lib/norm/text';
import { listMaterials } from '@/features/production/ssot-bridge'; // We can use this to get materials

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
        materialId?: string;
        newMaterialName?: string;
        newMaterialCategory?: Material['category'];
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

    // 1. Create new supplier if needed
    if (newSupplierName && !supplierId) {
        const newPartyRef = db.collection('parties').doc();
        const nowIso = now.toISOString();
        const newParty: Party = {
            id: newPartyRef.id,
            name: newSupplierName,
            legalName: newSupplierName,
            kind: 'ORG',
            roles: ['SUPPLIER'],
            createdAt: nowIso,
            updatedAt: nowIso,
        } as Party;
        batch.set(newPartyRef, newParty);
        finalSupplierId = newPartyRef.id;
    }

    if (!finalSupplierId) {
        throw new Error('Supplier ID is missing.');
    }

    const receiptRef = db.collection('goodsReceipts').doc();
    
    const materialsSnap = await db.collection('materials').get();
    const existingMaterials = materialsSnap.docs.map(d => d.data() as Material);
    const existingSkus = existingMaterials.map(m => m.sku);

    const finalLines: GoodsReceipt['lines'] = [];

    // 2. Process all lines: create materials, lots, and stock moves
    for (const [index, line] of lines.entries()) {
        let materialId = line.materialId;
        let sku = '';
        let uom: Uom = line.uom || 'uds';

        if (line.newMaterialName && !line.materialId) {
            const newMaterialRef = db.collection('materials').doc();
            const cat = line.newMaterialCategory || 'raw';
            const newSku = makeSku(line.newMaterialName, cat, existingSkus);

            const newMaterial: Material = {
                id: newMaterialRef.id,
                sku: newSku,
                name: line.newMaterialName,
                category: cat,
                uom: line.uom || 'uds',
                standardCost: line.unitCost || 0,
            };
            batch.set(newMaterialRef, { ...newMaterial, createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now) });
            existingSkus.push(newSku);
            materialId = newMaterialRef.id;
            sku = newSku;
            uom = newMaterial.uom as Uom;
        } else if (materialId) {
            const m = existingMaterials.find(mm => mm.id === materialId);
            sku = m?.sku || '';
            uom = m?.uom as Uom || 'uds';
        }

        if (!materialId) continue;

        const newLotRef = db.collection('lots').doc();
        const newLot: Lot = {
            id: newLotRef.id,
            sku: sku,
            quantity: line.qty,
            createdAt: now.toISOString(),
            supplierId: finalSupplierId,
            quality: { qcStatus: sendToQc ? 'hold' : 'release', results: {} },
            supplierBatch: line.supplierLot,
        };
        batch.set(newLotRef, { ...newLot, createdAt: Timestamp.fromDate(now) });

        const newStockMoveRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: newStockMoveRef.id,
            sku: newLot.sku,
            lotId: newLot.id,
            qty: newLot.quantity,
            uom: uom,
            reason: 'receipt',
            toLocation: sendToQc ? 'QC/AREA' : 'RM/MAIN',
            occurredAt: now.toISOString(),
            createdAt: now.toISOString(),
            ref: { goodsReceiptId: receiptRef.id },
            unitCost: line.unitCost,
        };
        batch.set(newStockMoveRef, { ...stockMove, createdAt: Timestamp.fromDate(now), occurredAt: Timestamp.fromDate(now) });
        
        finalLines.push({
            materialId: materialId!,
            sku: sku,
            lotId: newLot.id,
            qty: line.qty,
            uom: uom,
            unitCost: line.unitCost,
        });
    }

    // 3. Create the Goods Receipt document
    const receipt: GoodsReceipt = {
        id: receiptRef.id,
        receiptNumber: `GR-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
        supplierPartyId: finalSupplierId!,
        deliveryNote,
        receivedAt: now.toISOString(),
        status: sendToQc ? 'pending_qc' : 'completed',
        lines: finalLines,
    };
    batch.set(receiptRef, { ...receipt, createdAt: Timestamp.fromDate(now) });

    await batch.commit();
    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');
}
