// src/features/bom/RecipeList.tsx
"use client";
import React from 'react';
import type { BillOfMaterial as RecipeBom, Item } from '@/domain/ssot';

type BomWithStage = RecipeBom & { stage?: 'PRODUCCION' | 'ENVASADO' };

interface RecipeListProps {
    recipes: BomWithStage[];
    onSelect: (recipe: BomWithStage) => void;
    selectedId: string | null;
    allItems: Item[];
}

export function RecipeList({ recipes, onSelect, selectedId, allItems }: RecipeListProps) {
    return (
        <div className="border rounded-lg overflow-hidden bg-white flex-1">
            <div className="divide-y">
                {recipes.map((r) => {
                    const outputItem = allItems.find((it) => it.id === r.outputItemId);
                    const isSelected = r.id === selectedId;
                    return (
                        <button
                            key={r.id}
                            onClick={() => onSelect(r)}
                            className={`w-full text-left px-3 py-2 transition-colors ${isSelected ? 'bg-yellow-50' : 'hover:bg-zinc-50'}`}
                        >
                            <div className="font-semibold text-sm">{r.name}</div>
                            <div className="text-xs text-zinc-500">
                                Produce: {outputItem?.name || r.outputItemId}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
