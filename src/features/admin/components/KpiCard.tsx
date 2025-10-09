// src/features/admin/components/KpiCard.tsx
"use client";
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
}

export function KpiCard({ icon: Icon, title, value, description }: Props) {
  return (
    <div className="sb-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
