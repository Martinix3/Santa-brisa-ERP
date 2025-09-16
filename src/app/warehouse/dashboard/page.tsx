"use client";
import { WarehouseDashboardPage } from '@/features/warehouse/components/ui-sb-warehouse';
import { useData } from '@/lib/dataprovider';
import React, { useMemo } from 'react';

export default function Dashboard() {
    const { data: santaData } = useData();

    const { inventory, shipments } = useMemo(() => {
        return {
            inventory: santaData?.inventory || [],
            shipments: santaData?.shipments || [],
        };
    }, [santaData]);

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de almacén...</div>;
    }

    return <WarehouseDashboardPage inventory={inventory} shipments={shipments} />;
}
