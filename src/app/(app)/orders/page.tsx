
// src/app/(app)/orders/page.tsx

"use client";
import React from "react";
import { useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { readFlowFrom } from "@/lib/useFlow";
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';

export default function OrdersPage({ searchParams }: { searchParams?: Record<string, any> }) {
    const flow = readFlowFrom(searchParams);
    
    return (
        <>
            <ModuleHeader title="Pedidos de Venta Directa" icon={ShoppingCart} />
            <div className="p-6 bg-slate-50 flex-grow">
               <OrdersDashboard 
                 flow={flow}
               />
            </div>
        </>
    );
}
