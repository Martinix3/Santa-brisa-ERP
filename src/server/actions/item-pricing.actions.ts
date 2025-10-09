// src/server/actions/item-pricing.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { ok, fail, type ActionResult } from '@/lib/result';

interface PricingData {
  priceBase: number;
  priceList: Record<string, number>;
  costUnit: number;
  isActive: boolean;
  logistics: {
    unitsPerCase: number;
    casesPerPallet: number;
    weightPerUnit: number;
    volumePerUnit: number;
  };
}

/**
 * Actualiza los precios de un item
 */
export async function updateItemPricing(
  sku: string,
  pricing: PricingData
): Promise<ActionResult<void>> {
  try {
    const { priceBase, priceList, costUnit, isActive, logistics } = pricing;

    // Validaciones
    if (priceBase <= 0) {
      return fail('El precio base debe ser mayor a 0');
    }

    if (costUnit < 0) {
      return fail('El costo no puede ser negativo');
    }

    // Actualizar en Firestore
    await db.collection('items').doc(itemId).update({
      priceBase,
      priceUnit: priceBase, // Mantener compatibilidad
      priceList,
      costUnit,
      isActive,
      // Datos logísticos
      unitsPerCase: logistics.unitsPerCase,
      casesPerPallet: logistics.casesPerPallet,
      weightPerUnit: logistics.weightPerUnit,
      volumePerUnit: logistics.volumePerUnit,
      updatedAt: new Date().toISOString(),
    });

    return ok(undefined);
  } catch (error: any) {
    console.error('Error updating item pricing:', error);
    return fail(error.message || 'Error al actualizar precios');
  }
}
