// src/features/admin/components/DepartmentKpiSection.tsx
"use client";
import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Stat = { label: string; value: number; variant: 'info' | 'primary' | 'success' | 'destructive' };

interface Props {
  icon: LucideIcon;
  title: string;
  stats: Stat[];
  accentVar?: string; // e.g., 'ventas', 'marketing', 'produccion'
}

export function DepartmentKpiSection({ icon: Icon, title, stats, accentVar }: Props) {
  return (
    <div className="sb-card" style={accentVar ? {
      borderTop: `3px solid hsl(var(--sb-accent-${accentVar}))`
    } : undefined}>
      <div className="sb-card__header">
        <Icon className="sb-icon" style={accentVar ? {
          color: `hsl(var(--sb-accent-${accentVar}))`
        } : undefined} />
        <h2 className="sb-card__title">{title}</h2>
      </div>
      <div className="sb-card__content space-y-2">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center justify-between p-2 rounded-md bg-secondary">
            <span className="text-sm font-medium text-secondary-foreground">{stat.label}</span>
            <div className="sb-badge" data-variant={stat.variant}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
