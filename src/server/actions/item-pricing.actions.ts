// src/server/actions/item-pricing.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { ok, fail, type ActionResult } from '@/lib/result';

interface PricingData {
  priceBase: number;
  priceList: Record<string, number>;
  costUnit: number;
  isActive: boolean;
  eanCode?: string;
  packagingType?: string;
  logistics: {
    unitsPerCase: number;
    casesPerPallet: number;
    weightPerUnit: number;
    volumePerUnit: number;
    bottleMl?: number;
  };
}

/**
 * Actualiza los precios de un item
 */
export async function updateItemPricing(
  itemId: string,
  pricing: PricingData
): Promise<ActionResult<void>> {
  try {
    const { priceBase, priceList, costUnit, isActive, eanCode, packagingType, logistics } = pricing;

    // Validaciones
    if (priceBase <= 0) {
      return fail('El precio base debe ser mayor a 0');
    }

    if (costUnit < 0) {
      return fail('El costo no puede ser negativo');
    }

    // Actualizar en Firestore
    const updates: Record<string, any> = {
      priceBase,
      priceUnit: priceBase, // Mantener compatibilidad
      priceList,
      costUnit,
      stdCost: costUnit, // Mantener compatibilidad
      isActive,
      active: isActive, // Mantener compatibilidad
      // Datos logísticos
      unitsPerCase: logistics.unitsPerCase,
      caseUnits: logistics.unitsPerCase, // Mantener compatibilidad
      casesPerPallet: logistics.casesPerPallet,
      weightPerUnit: logistics.weightPerUnit,
      volumePerUnit: logistics.volumePerUnit,
      updatedAt: new Date().toISOString(),
    };

    if (eanCode !== undefined) updates.eanCode = eanCode;
    if (packagingType !== undefined) updates.packagingType = packagingType;
    if (logistics.bottleMl !== undefined) updates.bottleMl = logistics.bottleMl;

    await db.collection('items').doc(itemId).update(updates);

    return ok(undefined);
  } catch (error: any) {
    console.error('Error updating item pricing:', error);
    return fail(error.message || 'Error al actualizar precios');
  }
}
