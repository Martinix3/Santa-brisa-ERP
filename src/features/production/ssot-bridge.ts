
// src/features/production/ssot-bridge.ts
import { MemoryAdapter } from '@/domain/ssot.helpers';
import type { BillOfMaterial, Material, ProductionOrder, Lot } from '@/domain/ssot';

// Usamos un adaptador en memoria, pero las funciones podrían
// en el futuro apuntar a Firestore o una API sin cambiar la firma.
const adapter = new MemoryAdapter();

export async function listBoms(): Promise<BillOfMaterial[]> {
  return adapter.getBoms();
}

// Para la página de BOM, necesitamos la lista de recetas (que son BOMs)
export async function listRecipes(): Promise<BillOfMaterial[]> {
    return adapter.getBoms();
}

export async function listMaterials(): Promise<Material[]> {
  return adapter.getMaterials();
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  return adapter.getProductionOrders();
}

export async function listLots(): Promise<Lot[]> {
  return adapter.getLots();
}

export async function getTrace(lotId: string) {
    return adapter.getLotTrace(lotId);
}

export async function updateMaterial(id: string, patch: Partial<Material>): Promise<Material> {
    console.log("Pretending to update material", id, patch);
    const materials = await adapter.getMaterials();
    const mat = materials.find(m => m.id === id);
    if (!mat) throw new Error("Material not found");
    const updated = { ...mat, ...patch };
    // En una app real, aquí se guardaría en la base de datos.
    // Por ahora, solo devolvemos el objeto actualizado.
    return updated;
}

// Funciones placeholder para creación/actualización en la página de BOMs
export async function createRecipe(recipe: BillOfMaterial): Promise<void> {
    await adapter.createRecipe(recipe);
}

export async function updateRecipe(id: string, patch: Partial<BillOfMaterial>): Promise<void> {
    await adapter.updateRecipe(id, patch);
}

export async function deleteRecipe(id: string): Promise<void> {
    await adapter.deleteRecipe(id);
}
