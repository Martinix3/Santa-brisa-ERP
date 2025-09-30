// src/server/production/bom.service.ts
'use server';

import type { BillOfMaterial, Item, ProductionOrder, Uom, SalesUnit } from '@/domain/ssot';
import { adminDb } from '@/server/firebase';
import { ok, fail, type ActionResult } from '@/lib/result';
import { FieldPath } from 'firebase-admin/firestore';

type ProductionStage = 'PRODUCCION' | 'ENVASADO';
type ProductionIOLine = { itemId: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number };

async function readBOM(bomId: string): Promise<any> {
    const doc = await adminDb.collection('billOfMaterials').doc(bomId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function readItems(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    const snaps = await adminDb.collection('items').where(FieldPath.documentId(), 'in', ids).get();
    return snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * Explodes a Bill of Materials to calculate the required nominal components for a given quantity.
 * @param bomId The ID of the Bill of Materials.
 * @param plannedQty The target quantity to produce.
 * @returns An ActionResult with the calculated nominal components or an error.
 */
export async function explodeBOM(bomId: string, plannedQty: number): Promise<ActionResult<{ stage: ProductionStage; outputItemId: string; baseUnit: Uom; nominal: ProductionIOLine[] }>> {
  try {
    const bom = await readBOM(bomId);
    if (!bom) return fail('BOM inexistente');
    const stage: ProductionStage = bom.stage ?? 'PRODUCCION';
    const baseUnit: Uom = (stage === 'PRODUCCION' ? 'L' : 'unit');
    if (bom.baseUnit !== baseUnit) {
        console.warn(`[explodeBOM] BOM ${bomId} tiene baseUnit ${bom.baseUnit} pero la etapa es ${stage}. Se usará ${baseUnit}.`);
    }

    const ids = [bom.outputItemId, ...bom.items.map((i: any) => i.itemId)];
    const docs = await readItems(ids);
    const map = new Map(docs.map((d: any) => [d.id, d]));

    const nominal: ProductionIOLine[] = bom.items.map((l: any) => ({
      itemId: l.itemId,
      role: l.role,
      uom: (map.get(l.itemId)?.uom ?? l.uom ?? 'unit') as Uom,
      qty: Number((l.qty * plannedQty).toFixed(6)),
    }));

    return ok({ stage, outputItemId: bom.outputItemId, baseUnit, nominal });
  } catch (e:any) {
    return fail('No se pudo explotar el BOM.', { code: e?.code });
  }
}
