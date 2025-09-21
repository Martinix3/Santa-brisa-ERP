// src/features/production/ssot-bridge.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { BillOfMaterial, Material, ProductionOrder, Lot, InfluencerCollab, MarketingEvent, OnlineCampaign, Product } from '@/domain';

async function listCollection<T>(name: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, name));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
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
      .filter((p: Product) => p.category === 'finished_good' && p.active)
      .map((p: Product) => ({
          sku: p.sku,
          name: p.name,
          packSizeMl: p.bottleMl || 0,
          bottlesPerCase: p.caseUnits
      }));
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  return listCollection<ProductionOrder>('productionOrders');
}

export async function listLots(): Promise<Lot[]> {
  return listCollection<Lot>('lots');
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

// Marketing functions that were in duplicated files
export async function listEvents(): Promise<MarketingEvent[]> {
  return listCollection<MarketingEvent>('marketingEvents');
}

export async function listOnlineCampaigns(): Promise<OnlineCampaign[]> {
  return listCollection<OnlineCampaign>('onlineCampaigns');
}

// Influencer functions that were in duplicated files
export async function listCreators(): Promise<any[]> {
  return listCollection<any>('creators');
}

export async function listCollabs(): Promise<InfluencerCollab[]> {
  return listCollection<InfluencerCollab>('influencerCollabs');
}
