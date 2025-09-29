
"use client";

import React, { useState } from 'react';
import KpiCard from '@/components/ui/KpiCard';
import OrdersTable from '@/features/orders/components/OrdersTable';
import NewOrderModal from '@/features/orders/components/NewOrderModal';
import { Plus } from 'lucide-react';

// Datos de ejemplo para la tabla. En tu caso, vendrían de `props` o `useData`.
const sampleOrders = [
    { id: '#SB-0078', client: 'La Terraza del Mar', date: '28/09/2025', status: 'delivered', total: '€ 450.00' },
    { id: '#SB-0077', client: 'El Chiringuito', date: '27/09/2025', status: 'shipped', total: '€ 320.50' },
    { id: '#SB-0076', client: 'Distribuciones Sol', date: '25/09/2025', status: 'pending', total: '€ 1,200.00' },
];

export default function OrdersDashboard({ flow }: { flow: any }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreateOrder = (orderData: any) => {
        console.log("Creando nuevo pedido:", orderData);
        // Aquí llamarías a tu server action `placeOrder`
        // placeOrder(orderData);
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
            <OrdersTable orders={sampleOrders} />
            
            {/* Modal */}
            <NewOrderModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />
        </div>
    );
}
