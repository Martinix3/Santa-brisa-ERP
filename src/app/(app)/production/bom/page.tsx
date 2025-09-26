
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { upsertBOM, upsertMinimalProduct, upsertMinimalMaterial } from "./actions";
import type { BillOfMaterial as RecipeBom, Item } from "@/domain/ssot";
import { RecipeList } from "@/features/bom/RecipeList";
import { RecipeForm } from "@/features/bom/RecipeForm";
import { FormStatusBar } from "@/components/ui/FormStatusBar";

type BomStage = 'PRODUCCION' | 'ENVASADO';
type BomWithStage = RecipeBom & { stage?: BomStage };

export default function BomPage() {
  const { data: santaData } = useData();
  const [openRecipe, setOpenRecipe] = useState<BomWithStage | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const recipes = useMemo(() => (santaData?.billOfMaterials as BomWithStage[] || []).filter(b => (b as any).isActive !== false), [santaData]);
  const allItems = useMemo(() => santaData?.items || [], [santaData]);

  const handleSave = async (values: BomWithStage) => {
    setLastError(null);
    const result = await upsertBOM(values);
    if (result.ok) {
      setOpenRecipe(null);
    } else {
      setLastError(result.message);
      // Los fieldErrors se manejan dentro del useBomForm, no es necesario pasarlos aquí.
      throw result;
    }
  };

  const createNew = () => {
    setOpenRecipe({
      id: `bom_${Date.now()}`,
      outputItemId: "",
      name: "",
      batchSize: 1,
      baseUnit: "L",
      stage: "PRODUCCION",
      items: [],
    } as unknown as BomWithStage);
  };
  
  const handleCreateProduct = async (data: { sku: string; name: string; packSizeMl?: number }) => {
    const result = await upsertMinimalProduct(data);
    if (result.ok) return result.data;
    throw new Error(result.message);
  };
  
  const handleCreateMaterial = async (data: { sku: string; name: string }) => {
    const result = await upsertMinimalMaterial(data);
    if (result.ok) return result.data;
    throw new Error(result.message);
  };

  return (
    <div className="flex gap-6 h-full">
      <aside className="w-1/3 min-w-[320px] max-w-[400px] h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recetas (BOMs)</h2>
          <button onClick={createNew} className="flex items-center gap-2 text-sm bg-zinc-900 text-white rounded-md px-3 py-1.5 font-semibold hover:bg-zinc-800 transition-colors">
            <Plus size={16} /> Nueva Receta
          </button>
        </div>
        <RecipeList
          recipes={recipes}
          onSelect={(r) => setOpenRecipe(r as BomWithStage)}
          selectedId={openRecipe?.id || null}
          allItems={allItems}
        />
      </aside>
      <main className="flex-1 min-w-0">
        {openRecipe ? (
          <RecipeForm
            key={openRecipe.id}
            initialValues={openRecipe}
            onSave={handleSave}
            onCancel={() => setOpenRecipe(null)}
            allItems={allItems}
            lastError={lastError}
            onCreateProduct={handleCreateProduct}
            onCreateMaterial={handleCreateMaterial}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <p>Selecciona una receta para verla o editarla,</p>
              <p>o crea una nueva.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
