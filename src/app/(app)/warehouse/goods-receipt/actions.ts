// src/app/(app)/warehouse/goods-receipt/actions.ts
'use server';

// PASO 1: Esta Server Action se ejecuta en el servidor.
// Contiene toda la lógica de negocio para crear las entidades necesarias.

import { revalidatePath } from 'next/cache';
// PASO 2: Se importa la instancia del SDK de Admin, ya autenticada con la cuenta de servicio.
import { adminDb as db, infoAdmin } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Material, GoodsReceipt, Lot, StockMove, Uom, InventoryItem } from '@/domain/ssot';
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
    // PASO 3: Se crea un "batch" de Firestore para realizar todas las escrituras
    // de forma atómica. O se hacen todas, o no se hace ninguna.
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

    // 2. Procesar todas las líneas: crear materiales, lotes, movimientos de stock e inventario
    for (const line of lines) {
        let materialId = line.materialId;
        let sku = '';
        let uom: Uom = line.uom || 'uds';

        // Si es un nuevo material...
        if (line.newMaterialName && !line.materialId) {
            const newMaterialRef = db.collection('materials').doc();
            const cat = line.newMaterialCategory || 'raw';
            const newSku = makeSku(line.newMaterialName, cat, existingSkus);

            const newMaterial: Material = {
                id: newMaterialRef.id,
                sku: newSku,
                name: line.newMaterialName,
                category: cat,
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
        }

        if (!materialId) continue;

        // Crear Lote
        const newLotRef = db.collection('lots').doc();
        const newLot: Partial<Lot> = {
            id: newLotRef.id,
            sku: sku,
            quantity: line.qty,
            createdAt: now.toISOString(),
            supplierId: finalSupplierId,
            quality: { qcStatus: sendToQc ? 'hold' : 'release', results: {} },
            supplierBatch: line.supplierLot,
        };
        batch.set(newLotRef, { ...newLot, createdAt: now.toISOString() } as any);

        const location = sendToQc ? 'QC/AREA' : 'RM/MAIN';

        // Crear Movimiento de Stock (el "ledger")
        const newStockMoveRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: newStockMoveRef.id,
            sku: newLot.sku!,
            lotId: newLot.id,
            qty: newLot.quantity!,
            uom: uom,
            reason: 'receipt',
            toLocation: location,
            occurredAt: now.toISOString(),
            createdAt: now.toISOString(),
            ref: { goodsReceiptId: receiptRef.id },
            unitCost: line.unitCost,
        };
        batch.set(newStockMoveRef, { ...stockMove, createdAt: now.toISOString(), occurredAt: now.toISOString() } as any);
        
        // Crear/Actualizar el Inventario (el "balance")
        const inventoryItemRef = db.collection('inventory').doc(); // Firestore generará un ID único
        const inventoryItem: InventoryItem = {
            id: inventoryItemRef.id,
            sku: newLot.sku!,
            lotNumber: newLot.id,
            uom: uom,
            qty: newLot.quantity!,
            locationId: location,
            updatedAt: now.toISOString(),
        };
        batch.set(inventoryItemRef, inventoryItem);

        finalLines.push({
            materialId: materialId!,
            sku: sku,
            lotId: newLot.id!,
            qty: line.qty,
            uom: uom,
            unitCost: line.unitCost,
        } as GoodsReceipt['lines'][number]);
    }

    // 3. Crear el documento de Goods Receipt
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

    // PASO 4: Se confirma el batch, escribiendo todos los documentos a la vez.
    await batch.commit();

    // PASO 5: Se invalida la caché de Next.js para que las páginas relevantes
    // muestren los datos actualizados la próxima vez que se carguen.
    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');
}
