
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db, infoAdmin } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Material, GoodsReceipt, Lot, StockMove, Uom } from '@/domain/ssot';
import { normText } from '@/lib/norm/text';

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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
  const slug = norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 12);
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
    // Smoke write for debugging permissions
    try {
        await db.collection('_perm_test').doc('ping').set({ t: Date.now() });
    } catch (e: any) {
        console.error('[SMOKE] write failed', { code: e?.code, message: e?.message, projectId: infoAdmin().projectId });
        throw e;
    }

    const { supplierId, newSupplierName, deliveryNote, lines, sendToQc } = payload;
    const now = new Date();
    const batch = db.batch();

    let finalSupplierId = supplierId;
    const newParties: Party[] = [];

    // 1. Create new supplier if needed
    if (newSupplierName && !supplierId) {
      const newPartyId = uid('party');
      const nowIso = now.toISOString();
      const newParty: Party = {
        id: newPartyId,
        name: newSupplierName,
        legalName: newSupplierName,
        kind: 'ORG',
        roles: ['SUPPLIER'],
        createdAt: nowIso,
        updatedAt: nowIso,
      } as Party;
      newParties.push(newParty);
      finalSupplierId = newPartyId;
    }

    if (!finalSupplierId) {
        throw new Error('Supplier ID is missing.');
    }

    const receiptRef = db.collection('goodsReceipts').doc();
    
    const materialsSnap = await db.collection('materials').get();
    const existingMaterials = materialsSnap.docs.map(d => d.data() as Material);
    const existingSkus = existingMaterials.map(m => m.sku);

    const finalLines: GoodsReceipt['lines'] = [];
    const newMaterials: Material[] = [];

    // 2. Process all lines: create materials, lots, and stock moves
    for (const [index, line] of lines.entries()) {
        let materialId = line.materialId;
        let sku = '';
        let uom: Uom = line.uom || 'uds';

        if (line.newMaterialName && !line.materialId) {
            const newMaterialId = uid('mat');
            const cat = line.newMaterialCategory || 'raw';
            const newSku = makeSku(line.newMaterialName, cat, existingSkus);

            const newMaterial: Material = {
                id: newMaterialId,
                sku: newSku,
                name: line.newMaterialName,
                category: cat,
                uom: ((line.uom as Uom) || 'uds') as Uom,
                standardCost: line.unitCost || 0,
            };

            newMaterials.push(newMaterial);
            existingSkus.push(newSku); // evita colisiones en siguientes líneas
            materialId = newMaterialId;
            sku = newSku;
            uom = newMaterial.uom as Uom;
        } else if (materialId) {
            const m = existingMaterials.find(mm => mm.id === materialId);
            sku = m?.sku || '';
            uom = (m?.uom as Uom) || 'uds';
        }

        if (!materialId) continue;

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
        batch.set(newLotRef.collection('lots'), { ...newLot, createdAt: now.toISOString() });

        const newStockMoveRef = db.collection('stockMoves').doc();
        const stockMove: StockMove = {
            id: newStockMoveRef.id,
            sku: newLot.sku!,
            lotId: newLot.id,
            qty: newLot.quantity!,
            uom: uom,
            reason: 'receipt',
            toLocation: sendToQc ? 'QC/AREA' : 'RM/MAIN',
            occurredAt: now.toISOString(),
            createdAt: now.toISOString(),
            ref: { goodsReceiptId: receiptRef.id },
            unitCost: line.unitCost,
        };
        batch.set(newStockMoveRef.collection('stockMoves'), { ...stockMove, createdAt: now.toISOString(), occurredAt: now.toISOString() });
        
        finalLines.push({
            materialId: materialId!,
            sku: sku,
            lotId: newLot.id!,
            qty: line.qty,
            uom: uom,
            unitCost: line.unitCost,
        });
    }

    // Create new entities if any
    if (newParties.length > 0) {
      for(const p of newParties) {
        batch.set(db.collection('parties').doc(p.id), { ...p, createdAt: now.toISOString(), updatedAt: now.toISOString() });
      }
    }
    if (newMaterials.length > 0) {
      for(const m of newMaterials) {
        batch.set(db.collection('materials').doc(m.id), { ...m, createdAt: now.toISOString(), updatedAt: now.toISOString() });
      }
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
    batch.set(receiptRef, { ...receipt, createdAt: now.toISOString() });

    await batch.commit();
    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');
}
