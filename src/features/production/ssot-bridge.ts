// src/features/production/ssot-bridge.ts
import { useData } from '@/lib/dataprovider';
import type { BillOfMaterial, Material, ProductionOrder, Lot, InfluencerCollab, MarketingEvent, OnlineCampaign, Product, InventoryItem } from '@/domain/ssot';

export function useBridge() {
    const { data } = useData();
    return {
        data: data,
        recipes: (data?.billOfMaterials || []) as BillOfMaterial[],
        materials: (data?.materials || []) as Material[],
        inventory: (data?.inventory || []) as InventoryItem[],
        orders: (data?.productionOrders || []) as ProductionOrder[],
        lots: (data?.lots || []) as Lot[],
    };
}


// These functions will use the client-side Firebase SDK. 
// For a real app, you'd want to manage data fetching and state with a provider.
// The useData hook is not used here to keep this file as a pure data access layer.

export async function listBoms(boms: BillOfMaterial[]): Promise<BillOfMaterial[]> {
  return boms;
}

export async function listRecipes(boms: BillOfMaterial[]): Promise<BillOfMaterial[]> {
    return listBoms(boms);
}

export async function listMaterials(materials: Material[]): Promise<Material[]> {
  return materials;
}

export function listFinishedSkus(products: Product[]): { sku: string; name: string; packSizeMl: number; bottlesPerCase?: number }[] {
  return products
      .filter((p: Product) => p.active)
      .map((p: Product) => ({
          sku: p.sku,
          name: p.name,
          packSizeMl: p.bottleMl || 0,
          bottlesPerCase: p.caseUnits
      }));
}

export async function listLots(lots: Lot[]): Promise<Lot[]> {
  return lots;
}

export async function getTrace(lotId: string) {
    // This function needs a more complex implementation, likely on the server side.
    // For now, it returns an empty object as a placeholder.
    console.warn("getTrace is not fully implemented on the client-side bridge yet.");
    return {};
}

export async function updateMaterial(id: string, patch: Partial<Material>): Promise<Material> {
    console.warn("updateMaterial is not implemented on the client-side bridge yet.");
    return { id, sku: '', name: 'Updated Material', category: 'raw', ...patch };
}

export async function createRecipe(recipe: BillOfMaterial): Promise<void> {
    console.warn("createRecipe is not implemented on the client-side bridge yet.");
}

export async function updateRecipe(id: string, patch: Partial<BillOfMaterial>): Promise<void> {
    console.warn("updateRecipe is not implemented on the client-side bridge yet.");
}

export async function deleteRecipe(id: string): Promise<void> {
    console.warn("deleteRecipe is not implemented on the client-side bridge yet.");
}
