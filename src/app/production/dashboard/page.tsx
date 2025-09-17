
"use client";
import React from 'react';
import { ProductionDashboard } from '@/features/production/components/ui';
import { useData } from '@/lib/dataprovider';

function ProductionDashboardPage() {
    const { data: santaData } = useData();
    const orders = santaData?.productionOrders || [];
    const lots = santaData?.lots || [];

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de producción...</div>;
    }
    
    return <ProductionDashboard orders={orders} lots={lots} />;
}

export default ProductionDashboardPage;
