
"use client";

import React from 'react';
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function OrdersPage() {
    return (
        <AuthenticatedLayout>
            <OrdersDashboard />
        </AuthenticatedLayout>
    );
}
