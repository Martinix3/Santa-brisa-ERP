
// src/components/ui/SBKpiCard.tsx
"use client";
import React from 'react';

interface SBKpiCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
}

export const SBKpiCard: React.FC<SBKpiCardProps> = ({ title, value, icon: Icon }) => {
    return (
        <div className="sb-card">
            <div className="sb-card__content">
                <div className="flex items-center space-x-3">
                    <div className="bg-secondary p-2 rounded-lg">
                        <Icon className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            </div>
        </div>
    );
};
