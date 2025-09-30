// src/features/orders/components/OrdersDashboard.tsx
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OrderSellOut } from '@/domain/ssot';
import OrdersTable from './OrdersTable';
import { KPI, SBCard } from '@/components/ui/ui-primitives';
import { Package, Truck, FileText, CheckCircle, Clock } from 'lucide-react';
import { SB_COLORS } from '@/domain/ssot';

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
        <div className="p-6 bg-background min-h-full">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Pedidos de Venta Directa</h1>
                <p className="text-sm text-slate-600">Supervisa el ciclo de vida completo de los pedidos gestionados por Santa Brisa.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KPI icon={Clock} label="Pendiente de Confirmar" value={kpis.pendingConfirmation} color={SB_COLORS.state.info} />
                <KPI icon={Package} label="Pendiente de Enviar" value={kpis.pendingShipment} color={SB_COLORS.primary.teal} />
                <KPI icon={Truck} label="Pendiente de Facturar" value={kpis.pendingInvoice} color={SB_COLORS.state.success} />
                <KPI icon={FileText} label="Pendiente de Cobrar" value={kpis.pendingPayment} color={SB_COLORS.primary.copper} />
            </div>

            <SBCard>
                <OrdersTable orders={orders as any[]} />
            </SBCard>
        </div>
    );
};

export default OrdersDashboard;