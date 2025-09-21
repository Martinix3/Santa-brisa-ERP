// This file is intended to be a bridge between the UI and the data source.
// For the prototype, it will just re-export functions from the data provider or other services.
// In a real application, this could be where you place hooks for SWR, React Query, or other data fetching libraries.

"use client";
import { useData } from '@/lib/dataprovider';

export function useBridge() {
    const { data } = useData();

    return {
        data: data,
        recipes: data?.billOfMaterials || [],
        materials: data?.materials || [],
        inventory: data?.inventory || [],
        orders: data?.productionOrders || [],
        lots: data?.lots || [],
    };
}
