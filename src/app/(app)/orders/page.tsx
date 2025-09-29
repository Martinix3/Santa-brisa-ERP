
"use client";
import React from "react";
import { useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { readFlowFrom } from "@/lib/useFlow";
import { getInteractionsForOrder, getLastAndNextInteractionDates } from "@/features/orders/interactions.helpers";
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';

export default function OrdersPage({ searchParams }: { searchParams?: Record<string, any> }) {
    const flow = readFlowFrom(searchParams);
    const { data } = useData();

    // Esta lógica de negocio se mantiene igual
    const orderVisitMetrics = useMemo(() => {
        if (!data?.interactions || !data.ordersSellOut) return {};
        const map: Record<string, {last:string|null; next:string|null}> = {};
        for (const o of data.ordersSellOut) {
            const inters = getInteractionsForOrder(data.interactions, o.id);
            map[o.id] = getLastAndNextInteractionDates(inters);
        }
        return map;
    }, [data?.interactions, data?.ordersSellOut]);

    return (
        <>
            <ModuleHeader title="Pedidos" icon={ShoppingCart} />
            <div className="p-6 bg-slate-50 flex-grow">
               <OrdersDashboard 
                 flow={flow}
               />
            </div>
        </>
    );
}
