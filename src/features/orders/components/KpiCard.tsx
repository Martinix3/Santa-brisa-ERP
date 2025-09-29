// src/features/orders/components/KpiCard.tsx
import React from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    variant?: 'primary' | 'secondary';
    className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, variant = 'secondary', className }) => {
    const baseClasses = "p-4 rounded-xl";
    const variantClasses = {
        primary: "bg-blue-600 text-white",
        secondary: "bg-slate-50 border border-slate-200 text-slate-800"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <p className="text-sm text-slate-500">
                {title}
            </p>
            <p className={`text-3xl font-bold mt-1 ${variant === 'secondary' && 'text-slate-900'}`}>
                {value}
            </p>
        </div>
    );
};

export default KpiCard;
