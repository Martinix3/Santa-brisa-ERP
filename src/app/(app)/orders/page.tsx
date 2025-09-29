


"use client";

import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import { readFlowFrom } from "@/lib/useFlow";


export default function OrdersPage({ searchParams }: { searchParams?: Record<string, any> }) {
    const flow = readFlowFrom(searchParams);
    
    // Ahora puedes usar `flow` para filtrar datos y ajustar la UI
    // por ejemplo, pasándolo como prop a OrdersDashboard.
    // <OrdersDashboard flow={flow} />

    return (
        <>
            <ModuleHeader title="Pedidos" icon={ShoppingCart} />
            <div className="p-6 bg-zinc-50 flex-grow">
               <OrdersDashboard />
            </div>
        </>
    );
}

    
