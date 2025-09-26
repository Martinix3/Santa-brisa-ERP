// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Material, GoodsReceipt, InventoryItem, StockMove, Uom } from '@/domain/ssot';
import { normText } from '@/lib/norm/text';

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

    // 1. Crear nuevo proveedor si es necesario
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
        throw new Error('El proveedor es obligatorio.');
    }

    const receiptRef = db.collection('goodsReceipts').doc();
    
    const materialsSnap = await db.collection('materials').get();
    const existingMaterials = materialsSnap.docs.map(d => d.data() as Material);
    const existingSkus = existingMaterials.map(m => m.sku).filter(Boolean) as string[];

    const finalLines: GoodsReceipt['lines'] = [];

    // 2. Procesar todas las líneas
    for (const line of lines) {
        let materialId = line.materialId;
        let sku = '';
        let uom: Uom = line.uom || 'uds';
        let category: Material['category'] = line.newMaterialCategory || 'raw';

        if (line.newMaterialName && !line.materialId) {
            const newMaterialRef = db.collection('materials').doc();
            category = line.newMaterialCategory || 'raw';
            const newSku = makeSku(line.newMaterialName, category, existingSkus);

            const newMaterial: Material = {
                id: newMaterialRef.id,
                sku: newSku,
                name: line.newMaterialName,
                category: category,
                uom: (line.uom || 'uds'),
                standardCost: line.unitCost || 0,
            };
            batch.set(newMaterialRef, { ...newMaterial, createdAt: now.toISOString(), updatedAt: now.toISOString() } as any);
            existingSkus.push(newSku);
            materialId = newMaterialRef.id;
            sku = newSku;
            uom = newMaterial.uom as Uom;
        } else if (materialId) {
            const m = existingMaterials.find(mm => mm.id === materialId);
            sku = m?.sku || '';
            uom = (m?.uom as Uom) || 'uds';
            category = m?.category || 'raw';
        }

        if (!materialId) continue;
        
        const newLotId = `lot_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`;
        const inventoryItemRef = db.collection('inventory').doc(newLotId);
        const locationId = sendToQc ? 'QC/AREA' : (category === 'raw' ? 'RM/MAIN' : 'PKG/MAIN');

        // Crear InventoryItem en lugar de Lot
        const inventoryItem: InventoryItem = {
            id: inventoryItemRef.id,
            sku: sku,
            materialId: materialId,
            category: category,
            lotNumber: line.supplierLot,
            qty: line.qty,
            uom: uom,
            locationId: locationId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            quality: { qcStatus: sendToQc ? 'hold' : 'release' },
            source: { type: "PURCHASE_ORDER", id: receiptRef.id },
        };
        batch.set(inventoryItemRef, inventoryItem);

        // Crear Movimiento de Stock (ledger)
        const newStockMoveRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: newStockMoveRef.id,
            sku: sku,
            lotId: inventoryItemRef.id, // Usa el ID del nuevo item de inventario como referencia de lote
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
            materialId: materialId!,
            sku: sku,
            lotId: inventoryItemRef.id,
            qty: line.qty,
            uom: uom,
            unitCost: line.unitCost,
        } as GoodsReceipt['lines'][number]);
    }

    const receipt: GoodsReceipt = {
        id: receiptRef.id,
        receiptNumber: `GR-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
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
