// src/app/(app)/orders/page.tsx
"use client";
import React from "react";
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';

export default function OrdersPage() {
    // This page now acts as a clean shell for the main dashboard component.
    // The 'flow' logic is handled internally by the dashboard to show DIRECT sales.
    return (
        <div className="p-6">
            <OrdersDashboard />
        </div>
    );
}
