"use server";

import { SkuService } from '@/services/canonical';
import { normalizeTs } from '@/lib/dates';

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";

import type { GoodsReceiptCategory } from "@/domain/ssot";

export interface WarehouseSupplier {
  id: string;
  name: string;
  contactInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new warehouse supplier
 */
export async function createWarehouseSupplier(name: string) {
  try {
    const now = new Date();
    const supplierId = `SUP_${Date.now()}`;
    
    const supplierData: WarehouseSupplier = {
      id: supplierId,
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("warehouseSuppliers").doc(supplierId).set(supplierData);

    revalidatePath("/warehouse");

    return {
      success: true,
      supplier: supplierData,
    };
  } catch (error: any) {
    console.error("Error creating warehouse supplier:", error);
    return {
      success: false,
      error: error.message || "Error al crear el proveedor",
    };
  }
}

/**
 * Get all warehouse suppliers
 */
export async function getWarehouseSuppliers() {
  try {
    const snapshot = await db.collection("warehouseSuppliers").get();
    
    const suppliers: WarehouseSupplier[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data as WarehouseSupplier,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
      };
    });

    return {
      success: true,
      suppliers,
    };
  } catch (error: any) {
    console.error("Error getting warehouse suppliers:", error);
    return {
      success: false,
      suppliers: [],
      error: error.message,
    };
  }
}

/**
 * Map GoodsReceiptCategory to ItemCategory (SSOT)
 */
function mapCategoryToItemCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    raw: 'raw',
    finalGood: 'fg',
    merchandise: 'merch',
    intermediate: 'intermediate',
    packaging: 'pack',
    consumable: 'consumable',
  };
  return categoryMap[category] || 'raw';
}

/**
 * Create a new product in the items collection (SSOT)
 */
export async function createWarehouseProduct(
  name: string,
  sku?: string,
  category: string = "raw"
) {
  try {
    const now = new Date();
    const productId = `PROD_${Date.now()}`;
    
    // Use optimized SKU generator instead of timestamp
    const productSKU = sku?.trim() || SkuService.makeSku({ category: category.toUpperCase() as any });
    const itemCategory = mapCategoryToItemCategory(category);
    
    const productData = {
      id: productId,
      sku: productSKU,
      name: name.trim(),
      category: itemCategory,
      uom: 'kg',
      active: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Create in items collection (SSOT) instead of warehouseProducts
    await db.collection("items").doc(productId).set(productData);

    revalidatePath("/warehouse");
    revalidatePath("/production");

    return {
      success: true,
      product: productData,
    };
  } catch (error: any) {
    console.error("Error creating product in items:", error);
    return {
      success: false,
      error: error.message || "Error al crear el producto",
    };
  }
}

/**
 * Get all products from items collection (SSOT)
 */
export async function getWarehouseProducts() {
  try {
    // Get all active items from SSOT
    const snapshot = await db.collection("items").where("active", "==", true).get();
    
    const products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
      };
    });

    return {
      success: true,
      products,
    };
  } catch (error: any) {
    console.error("Error getting products from items:", error);
    return {
      success: false,
      products: [],
      error: error.message,
    };
  }
}
