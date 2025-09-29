// src/app/(app)/orders/page.tsx

"use client";
import React from "react";
import { useSearchParams } from 'next/navigation';
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';

export type Flow = "DIRECT" | "PLACEMENT";

export default function OrdersPage() {
    const searchParams = useSearchParams();
    const flowParam = searchParams.get('flow')?.toUpperCase();
    const flow: Flow = flowParam === 'PLACEMENT' ? 'PLACEMENT' : 'DIRECT';
    
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
