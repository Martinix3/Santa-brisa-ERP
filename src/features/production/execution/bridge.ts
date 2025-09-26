// src/features/production/execution/bridge.ts
import { useData } from '@/lib/dataprovider';

export function useBridge() {
    const { data } = useData();

    return {
        data: data,
        recipes: data?.billOfMaterials || [],
        items: data?.items || [],
        onHand: data?.onHand || [],
        orders: data?.productionOrders || [],
    };
}
