
import React from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    variant?: 'primary' | 'secondary';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, variant = 'secondary' }) => {
    const baseClasses = "p-4 rounded-xl shadow-lg";
    const variantClasses = {
        primary: "bg-blue-600 text-white",
        secondary: "bg-white border border-slate-200 text-slate-800"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]}`}>
            <p className={`text-3xl font-bold ${variant === 'secondary' && 'text-blue-600'}`}>
                {value}
            </p>
            <p className={`text-sm mt-1 ${variant === 'primary' ? 'text-blue-100' : 'text-slate-500'}`}>
                {title}
            </p>
        </div>
    );
};

export default KpiCard;
