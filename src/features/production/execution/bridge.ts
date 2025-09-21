// src/features/production/execution/bridge.ts
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
