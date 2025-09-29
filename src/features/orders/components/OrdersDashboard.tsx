// src/features/orders/components/OrdersDashboard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import KpiCard from './KpiCard';
import OrdersTable from './OrdersTable';
import NewOrderModal from './NewOrderModal';
import { Plus, ShoppingCart } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { placeOrder } from '@/app/(app)/orders/actions';
import { toast } from "sonner";
import { ModuleHeader } from '@/components/ui/ModuleHeader';


export default function OrdersDashboard({ flow }: { flow: any }) {
    const { data } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const directOrders = (data?.ordersSellOut || []).filter(o => o.flow !== 'PLACEMENT');
    
    const kpis = useMemo(() => {
        const pendingConfirmation = directOrders.filter(o => o.status === 'open').length;
        const pendingShipment = directOrders.filter(o => o.status === 'confirmed').length;
        const pendingInvoice = directOrders.filter(o => o.status === 'shipped').length;
        const pendingPayment = directOrders.filter(o => o.status === 'invoiced').length;

        // Lógica de consigna a implementar
        const unitsOnConsignment = 0;

        return { pendingConfirmation, pendingShipment, pendingInvoice, pendingPayment, unitsOnConsignment };
    }, [directOrders]);

    const handleCreateOrder = (orderData: any) => {
        placeOrder({
          ...orderData,
          createdById: 'u_admin', // Reemplazar con el ID del usuario actual
        }).then(() => {
          toast.success("Pedido creado con éxito.");
        }).catch(e => {
          toast.error(`Error: ${e.message}`);
        });
    };

    return (
        <div className="space-y-6">
            <ModuleHeader title="Pedidos de Venta Directa" icon={ShoppingCart}>
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{backgroundColor: '#F4C542'}}
                    className="text-black py-2 px-4 flex items-center gap-2 border border-transparent rounded-lg shadow-sm text-sm font-medium hover:opacity-90 transition-colors"
                >
                    <Plus size={16} />
                    Nuevo pedido
                </button>
            </ModuleHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                <KpiCard title="Pendiente de Confirmar" value={kpis.pendingConfirmation} />
                <KpiCard title="Pendiente de Enviar" value={kpis.pendingShipment} />
                <KpiCard title="Unidades en Consigna" value={kpis.unitsOnConsignment} />
                <KpiCard title="Pendiente de Facturar" value={kpis.pendingInvoice} />
                <KpiCard title="Pendiente de Cobrar" value={kpis.pendingPayment} />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <OrdersTable orders={directOrders as any[]} />
            </div>
            
            <NewOrderModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />
        </div>
    );
}
