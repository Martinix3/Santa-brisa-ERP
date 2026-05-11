// src/server/actions/bom.actions.ts
'use server';

import { ok, fail, type ActionResult } from '@/lib/result';
import { adminDb } from '@/server/firebase';
import { normalizeUom } from '@/domain/uom';
import type { BillOfMaterial, Item, ProductionOrder, Uom, ItemCategory } from '@/domain/ssot';
import type { BomWithKPIs, BomKPIs } from '@/types/bom';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const zStage = z.enum(['PRODUCCION', 'ENVASADO']);
const zRole = z.enum(['FORMULA', 'PACKAGING', 'COST_ONLY']);

const zBomLine = z.object({
  itemId: z.string().min(1, 'Material requerido'),
  qty: z.coerce.number().positive('Cantidad > 0'),
  uom: z.string().min(1, 'UoM requerido'),
  role: zRole.optional(),
});

const zBOM = z.object({
  id: z.string().min(1, 'Id requerido'),
  stage: zStage.optional(),
  outputItemId: z.string().min(1, 'Producto de salida requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  batchSize: z.coerce.number().positive('Batch > 0').default(1),
  baseUnit: z.string().min(1, 'Unidad base requerida'),
  items: z.array(zBomLine).min(1, 'Añade al menos una línea'),
  version: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().optional(),
  supersedesId: z.string().optional(),
  changeNote: z.string().max(280).optional(),
});

const zMinimalProduct = z.object({
  sku: z.string().trim().min(1, 'SKU requerido').optional(),
  name: z.string().trim().min(1, 'Nombre requerido'),
  packSizeMl: z.coerce.number().positive().optional(),
  category: z.enum(['fg', 'raw', 'pack', 'label', 'intermediate', 'consumable', 'merch']).default('fg'),
});

const defaultUomByCategory: Record<ItemCategory, Uom> = {
  fg: 'unit',
  raw: 'kg',
  pack: 'unit',
  label: 'unit',
  intermediate: 'L',
  consumable: 'unit',
  merch: 'unit',
};

export async function upsertBOM(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = zBOM.parse(input);
    const stage = parsed.stage ?? 'PRODUCCION';

    if (stage === 'PRODUCCION' && parsed.baseUnit !== 'L') {
      return fail("Producción debe usar unidad base L (1 L).");
    }
    if (stage === 'ENVASADO' && parsed.baseUnit !== 'unit') {
      return fail("Envasado debe usar unidad base unit (1 unidad).");
    }

    const normalizedItems = parsed.items.map(({ itemId, qty, uom, role }) => ({
      itemId,
      qty: Number(qty),
      uom: normalizeUom(uom),
      role: role ?? 'FORMULA',
    }));

    const now = new Date().toISOString();
    const docRef = adminDb.collection('billOfMaterials').doc(parsed.id);
    const existing = await docRef.get();
    const createdAt = existing.exists ? existing.data()?.createdAt ?? now : now;

    const payload: BillOfMaterial & {
      updatedAt: string;
      createdAt: string;
      version?: number;
      validFrom?: string;
      supersedesId?: string;
      changeNote?: string;
    } = {
      id: parsed.id,
      stage,
      outputItemId: parsed.outputItemId,
      name: parsed.name,
      batchSize: 1,
      baseUnit: normalizeUom(parsed.baseUnit),
      items: normalizedItems,
      isActive: parsed.isActive ?? true,
      version: parsed.version,
      validFrom: parsed.validFrom,
      supersedesId: parsed.supersedesId,
      changeNote: parsed.changeNote,
      createdAt,
      updatedAt: now,
    };

    await docRef.set(payload, { merge: true });
    revalidatePath('/production/bom');
    return ok({ id: parsed.id });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      const fieldErrors = Object.fromEntries(error.issues.map((issue: any) => [issue.path.join('.'), issue.message]));
      return fail("Revisa los campos marcados", { fieldErrors });
    }
    if (error?.code === 'permission-denied') {
      return fail("Sin permisos para guardar la receta.", { code: error.code });
    }
    console.error('[upsertBOM] Error:', error);
    return fail("No se pudo guardar la receta.", { code: error?.code, retryable: true });
  }
}

export async function archiveBOM(input: { bomId: string }): Promise<ActionResult<{ archived: boolean }>> {
  try {
    if (!input?.bomId) return fail("Falta id de receta.");
    const bomRef = adminDb.collection('billOfMaterials').doc(input.bomId);
    const snap = await bomRef.get();
    if (!snap.exists) return fail("La receta no existe.");

    const now = new Date().toISOString();
    await bomRef.set({ isActive: false, archivedAt: now, updatedAt: now }, { merge: true });
    revalidatePath('/production/bom');
    return ok({ archived: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      return fail("Sin permisos para archivar la receta.", { code: error.code });
    }
    console.error('[archiveBOM] Error:', error);
    return fail("No se pudo archivar la receta.", { code: error?.code, retryable: true });
  }
}

export async function upsertMinimalProduct(input: unknown): Promise<ActionResult<{ id: string; sku: string }>> {
  try {
    const parsed = zMinimalProduct.parse(input ?? {});

    if (parsed.sku) {
      const duplicated = await adminDb.collection('items').where('sku', '==', parsed.sku).limit(1).get();
      if (!duplicated.empty) {
        return fail("Ese SKU ya existe.");
      }
    }

    const now = new Date().toISOString();
    const id = `item_${Date.now()}`;
    const sku = parsed.sku ?? id;
    const uom = defaultUomByCategory[parsed.category] ?? 'unit';

    const payload: Item & {
      createdAt: string;
      updatedAt: string;
      bottleMl?: number;
      isActive: boolean;
    } = {
      id,
      sku,
      name: parsed.name,
      category: parsed.category,
      uom,
      active: true,
      isActive: true,
      bottleMl: parsed.category === 'fg' ? parsed.packSizeMl ?? undefined : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('items').doc(id).set(payload, { merge: true });
    revalidatePath('/production/bom');
    return ok({ id, sku });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      const fieldErrors = Object.fromEntries(error.issues.map((issue: any) => [issue.path.join('.'), issue.message]));
      return fail("Revisa los datos del producto", { fieldErrors });
    }
    if (error?.code === 'permission-denied') {
      return fail("Sin permisos para crear producto.", { code: error.code });
    }
    console.error('[upsertMinimalProduct] Error:', error);
    return fail("No se pudo crear el producto.", { code: error?.code, retryable: true });
  }
}

/**
 * Obtiene todos los BOMs con KPIs calculados server-side
 */
export async function getBOMsWithKPIs(): Promise<ActionResult<{
  boms: BomWithKPIs[];
  kpis: BomKPIs;
}>> {
  try {
    // Fetch BOMs
    const bomsSnapshot = await adminDb.collection('billOfMaterials').get();
    const boms = bomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BillOfMaterial[];

    // Fetch related data for enrichment
    const itemsSnapshot = await adminDb.collection('items').get();
    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Item[];
    
    const itemsMap = new Map(items.map((item: any) => [item.id, item]));

    // Fetch production orders to calculate usage stats
    const ordersSnapshot = await adminDb.collection('productionOrders').get();
    const orders = ordersSnapshot.docs.map(doc => doc.data()) as ProductionOrder[];

    // Calculate usage count per BOM
    const usageCountMap = new Map<string, number>();
    const lastUsedMap = new Map<string, string>();
    
    orders.forEach(order => {
      if (order.bomId) {
        usageCountMap.set(order.bomId, (usageCountMap.get(order.bomId) || 0) + 1);
        
        const orderDate = order.createdAt || order.scheduledFor;
        if (orderDate) {
          const currentLast = lastUsedMap.get(order.bomId);
          if (!currentLast || orderDate > currentLast) {
            lastUsedMap.set(order.bomId, orderDate);
          }
        }
      }
    });

    // Enrich BOMs with KPIs
    const bomsWithKPIs: BomWithKPIs[] = boms
      .filter(bom => bom.isActive !== false)
      .map(bom => {
        const outputItem = itemsMap.get(bom.outputItemId);
        const itemsCount = bom.items?.length || 0;
        
        // Calculate complexity based on number of items
        let complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (itemsCount > 10) complexity = 'HIGH';
        else if (itemsCount > 5) complexity = 'MEDIUM';

        // Usage stats
        const usageCount = usageCountMap.get(bom.id) || 0;
        const lastUsed = lastUsedMap.get(bom.id);

        return {
          ...bom,
          outputItemName: outputItem?.name,
          outputItemSku: outputItem?.sku,
          itemsCount,
          complexity,
          usageCount,
          lastUsed,
          // TODO: Calculate costs when item costs are available
          totalCost: undefined,
          costPerUnit: undefined,
        };
      });

    // Calculate global KPIs
    const kpis: BomKPIs = {
      total: bomsWithKPIs.length,
      produccion: bomsWithKPIs.filter(b => b.stage === 'PRODUCCION').length,
      envasado: bomsWithKPIs.filter(b => b.stage === 'ENVASADO').length,
      avgComplexity: bomsWithKPIs.reduce((sum, b) => {
        const val = b.complexity === 'LOW' ? 1 : b.complexity === 'MEDIUM' ? 2 : 3;
        return sum + val;
      }, 0) / bomsWithKPIs.length || 0,
      totalRecipes: bomsWithKPIs.length,
      recentlyUsed: bomsWithKPIs.filter(b => {
        if (!b.lastUsed) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(b.lastUsed) >= thirtyDaysAgo;
      }).length,
    };

    return ok({ boms: bomsWithKPIs, kpis });
  } catch (error: any) {
    console.error('[getBOMsWithKPIs] Error:', error);
    return fail('Error al obtener BOMs: ' + error?.message);
  }
}
