
// src/features/production/ssot-bridge.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { BillOfMaterial, Material, ProductionOrder, Lot, Creator, InfluencerCollab, EventMarketing, OnlineCampaign } from '@/domain/ssot';

async function listCollection<T>(name: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, name));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function listBoms(): Promise<BillOfMaterial[]> {
  return listCollection<BillOfMaterial>('billOfMaterials');
}

export async function listRecipes(): Promise<BillOfMaterial[]> {
    return listBoms();
}

export async function listMaterials(): Promise<Material[]> {
  return listCollection<Material>('materials');
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
export async function listEvents(): Promise<EventMarketing[]> {
  return listCollection<EventMarketing>('mktEvents');
}

export async function listOnlineCampaigns(): Promise<OnlineCampaign[]> {
  return listCollection<OnlineCampaign>('onlineCampaigns');
}

// Influencer functions that were in duplicated files
export async function listCreators(): Promise<Creator[]> {
  return listCollection<Creator>('creators');
}

export async function listCollabs(): Promise<InfluencerCollab[]> {
  return listCollection<InfluencerCollab>('influencerCollabs');
}
