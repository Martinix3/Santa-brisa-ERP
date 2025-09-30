// src/app/(app)/orders/page.tsx
"use client";

import React from 'react';
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';

export default function OrdersPage() {
    // This page is now a simple wrapper for the main dashboard component.
    // The dashboard will handle all logic for filtering, KPIs, and actions.
    return (
        <div className="bg-background p-6">
            <OrdersDashboard />
        </div>
    );
}
