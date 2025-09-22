

"use client";

import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';


export default function OrdersPage() {
    return (
        <>
            <ModuleHeader title="Pedidos" icon={ShoppingCart} />
            <div className="p-6 bg-zinc-50 flex-grow">
               <OrdersDashboard />
            </div>
        </>
    );
}
