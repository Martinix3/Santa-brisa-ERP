// src/features/production/ssot-bridge.ts
import { useData } from '@/lib/dataprovider';
import type { BillOfMaterial, ProductionOrder, Item, OnHandView } from '@/domain/ssot';

export function useBridge() {
    const { data } = useData();
    return {
        data: data,
        recipes: (data?.billOfMaterials || []) as BillOfMaterial[],
        onHand: (data?.onHand || []) as OnHandView[],
        items: (data?.items || []) as Item[],
        orders: (data?.productionOrders || []) as ProductionOrder[],
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

export async function listItems(items: Item[]): Promise<Item[]> {
  return items;
}

export function listFinishedSkus(items: Item[]): { sku: string; name: string; packSizeMl: number; bottlesPerCase?: number }[] {
  return items
      .filter((p: Item) => p.category === 'fg')
      .map((p: Item) => ({
          sku: p.sku,
          name: p.name,
          packSizeMl: p.bottleMl || 0,
          bottlesPerCase: p.caseUnits
      }));
}

export async function listOnHand(onHand: OnHandView[]): Promise<OnHandView[]> {
  return onHand;
}

export async function getTrace(lotId: string) {
    // This function needs a more complex implementation, likely on the server side.
    // For now, it returns an empty object as a placeholder.
    console.warn("getTrace is not fully implemented on the client-side bridge yet.");
    return {};
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
    console.warn("updateItem is not implemented on the client-side bridge yet.");
    return { id, sku: '', name: 'Updated Item', category: 'raw', uom: 'uds', active: true, ...patch };
}

export async function createRecipe(data: { billOfMaterials: BillOfMaterial[] }, recipe: BillOfMaterial): Promise<void> {
    const updatedBoms = [...data.billOfMaterials, recipe];
    // This should call a centralized save function, like saveAllCollections from useData
    // For now, it's a placeholder. A proper implementation would be:
    // const { saveAllCollections } = useData();
    // await saveAllCollections({ billOfMaterials: updatedBoms });
    console.warn("createRecipe needs to be connected to a data provider save function.");
}

export async function updateRecipe(data: { billOfMaterials: BillOfMaterial[] }, id: string, patch: Partial<BillOfMaterial>): Promise<void> {
    const updatedBoms = data.billOfMaterials.map(b => b.id === id ? { ...b, ...patch } : b);
     // This should call a centralized save function
    console.warn("updateRecipe needs to be connected to a data provider save function.");
}

export async function deleteRecipe(data: { billOfMaterials: BillOfMaterial[] }, id: string): Promise<void> {
    const updatedBoms = data.billOfMaterials.filter(b => b.id !== id);
     // This should call a centralized save function
    console.warn("deleteRecipe needs to be connected to a data provider save function.");
}
