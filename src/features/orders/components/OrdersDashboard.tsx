// src/features/orders/components/OrdersDashboard.tsx

"use client";

import React, { useState } from 'react';
import KpiCard from '@/components/ui/KpiCard';
import OrdersTable from '@/features/orders/components/OrdersTable';
import NewOrderModal from '@/features/orders/components/NewOrderModal';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { placeOrder } from '@/app/(app)/orders/actions';
import { toast } from "sonner";


export default function OrdersDashboard({ flow }: { flow: any }) {
    const { data } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Filtra los pedidos para mostrar solo los de Venta Directa
    const directOrders = (data?.ordersSellOut || []).filter(o => o.flow === 'DIRECT');

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
        <div className="max-w-7xl mx-auto">
            {/* Cabecera con botones de acción */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Venta Directa</h1>
                <div className="flex items-center space-x-3">
                    <button className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        Exportar
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white py-2 px-4 flex items-center gap-2 border border-transparent rounded-lg shadow-sm text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Nuevo pedido
                    </button>
                </div>
            </div>

            {/* Pestañas (si las necesitas) */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="flex space-x-6">
                    <a href="#" className="py-2 px-1 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">Todos</a>
                    <a href="#" className="py-2 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Abiertos</a>
                    <a href="#" className="py-2 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Cerrados</a>
                </nav>
            </div>

            {/* Sección de KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-6">
                <KpiCard title="Pendiente de Confirmar" value="0" variant="primary" />
                <KpiCard title="Pendiente de Enviar" value="0" variant="primary" />
                <KpiCard title="Unidades en Consigna" value="0" />
                <KpiCard title="Pendiente de Facturar" value="0" />
                <KpiCard title="Pendiente de Cobrar" value="0" />
            </div>

            {/* Tabla de Pedidos */}
            <OrdersTable orders={directOrders as any[]} />
            
            {/* Modal */}
            <NewOrderModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />
        </div>
    );
}
