// src/features/orders/components/KpiCard.tsx
import React from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon }) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
                <div className="bg-slate-100 p-2 rounded-lg">
                    <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">{title}</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
    );
};

export default KpiCard;
