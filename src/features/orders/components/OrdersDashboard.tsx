// src/features/orders/components/OrdersDashboard.tsx
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OrderSellOut } from '@/domain/ssot';
import OrdersTable from './OrdersTable';
import KpiCard from './KpiCard';
import { Package, Truck, FileText, CheckCircle, Clock } from 'lucide-react';

const OrdersDashboard = () => {
    const { data } = useData();
    const orders = useMemo(() => (data?.ordersSellOut || []).filter(o => o.flow === 'DIRECT'), [data?.ordersSellOut]);

    const kpis = useMemo(() => {
        const pendingConfirmation = orders.filter(o => o.status === 'open').length;
        const pendingShipment = orders.filter(o => o.status === 'confirmed').length;
        const pendingInvoice = orders.filter(o => o.status === 'shipped').length;
        const pendingPayment = orders.filter(o => o.status === 'invoiced').length;
        
        return { pendingConfirmation, pendingShipment, pendingInvoice, pendingPayment };
    }, [orders]);

    return (
        <div className="p-6 bg-slate-50 min-h-full">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Pedidos de Venta Directa</h1>
                <p className="text-sm text-slate-600">Supervisa el ciclo de vida completo de los pedidos gestionados por Santa Brisa.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KpiCard icon={Clock} title="Pendiente de Confirmar" value={kpis.pendingConfirmation} />
                <KpiCard icon={Package} title="Pendiente de Enviar" value={kpis.pendingShipment} />
                <KpiCard icon={Truck} title="Pendiente de Facturar" value={kpis.pendingInvoice} />
                <KpiCard icon={FileText} title="Pendiente de Cobrar" value={kpis.pendingPayment} />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <OrdersTable orders={orders as any[]} />
            </div>
        </div>
    );
};

export default OrdersDashboard;
