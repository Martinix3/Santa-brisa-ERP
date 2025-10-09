// src/features/personal/components/DashboardKpiCard.tsx
"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
  progress?: number;
  variant?: 'default' | 'destructive';
}

export function DashboardKpiCard({ icon: Icon, title, value, description, progress, variant = 'default' }: Props) {
  return (
    <div className={cn("sb-card p-3 md:p-4", variant === 'destructive' && 'border-destructive/30 ring-1 ring-destructive/20')}>
      <div className="flex items-center justify-between mb-1">
        <h3 className={cn("text-xs md:text-sm font-semibold truncate", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')}>{title}</h3>
        <Icon className={cn("w-4 h-4 flex-shrink-0", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <p className={cn("text-xl md:text-2xl font-bold", variant === 'destructive' ? 'text-destructive' : 'text-foreground')}>{value}</p>
      {progress !== undefined ? (
        <div className="w-full bg-secondary rounded-full h-1.5 mt-2 hidden lg:block">
          <div className="bg-success h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      ) : (
        description && <p className="text-xs text-muted-foreground mt-2 truncate hidden lg:block">{description}</p>
      )}
    </div>
  );
}
