/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/bom/BomCard.tsx
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/ui-primitives';
import { Factory, Package, Calendar, TrendingUp, Layers } from 'lucide-react';
import type { BomWithKPIs } from '@/types/bom';

interface BomCardProps {
  bom: BomWithKPIs;
  isSelected?: boolean;
  onClick: () => void;
}

/**
 * Tarjeta visual para mostrar una receta (BOM)
 * Sigue el patrón de diseño de TaskCard/OrderCard/AccountCard
 */
export function BomCard({ bom, isSelected = false, onClick }: BomCardProps) {
  // Determinar color del border según stage
  const borderColor = bom.stage === 'PRODUCCION' ? 'border-l-blue-500' : 'border-l-purple-500';
  
  // Badge color según stage
  const stageBadgeVariant = bom.stage === 'PRODUCCION' ? 'blue' : 'purple';
  
  // Complexity badge color
  const complexityColor = 
    bom.complexity === 'HIGH' ? 'bg-red-100 text-red-800 border-red-200' :
    bom.complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-green-100 text-green-800 border-green-200';

  // Formatear última fecha de uso
  const formatLastUsed = (date?: string) => {
    if (!date) return 'Nunca usado';
    
    const lastUsedDate = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - lastUsedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        // Base styles - glassmorphism
        'sb-card-glass-light border-l-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.01]',
        // Border color por stage
        borderColor,
        // Selected state
        isSelected && 'ring-2 ring-primary shadow-lg scale-[1.01]',
        // Focus styles
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Seleccionar receta ${bom.name || bom.outputItemName}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">
            {bom.outputItemName || bom.name || 'Sin nombre'}
          </h4>
          {bom.name && bom.name !== bom.outputItemName && (
            <p className="text-xs text-muted-foreground truncate">{bom.name}</p>
          )}
          {bom.outputItemSku && (
            <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {bom.outputItemSku}</p>
          )}
        </div>
        
        {/* Stage Badge */}
        <Badge 
          variant={stageBadgeVariant as any}
          className="text-[10px] shrink-0"
        >
          {bom.stage === 'PRODUCCION' ? 'PROD' : 'ENV'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Complejidad */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
          <Layers className="w-3.5 h-3.5 text-muted-foreground mb-1" />
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", complexityColor)}>
            {bom.complexity}
          </span>
        </div>
        
        {/* Items Count */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
          <Package className="w-3.5 h-3.5 text-muted-foreground mb-1" />
          <span className="text-xs font-semibold text-foreground">{bom.itemsCount || 0}</span>
          <span className="text-[9px] text-muted-foreground">items</span>
        </div>
        
        {/* Usage Count */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground mb-1" />
          <span className="text-xs font-semibold text-foreground">{bom.usageCount || 0}</span>
          <span className="text-[9px] text-muted-foreground">usos</span>
        </div>
      </div>

      {/* Footer - Last Used */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
        <Calendar className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {formatLastUsed(bom.lastUsed)}
        </span>
      </div>

      {/* Base Unit Info */}
      {bom.baseUnit && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            Base: <span className="font-medium text-foreground">{bom.batchSize || 1} {bom.baseUnit}</span>
          </span>
        </div>
      )}
    </div>
  );
}
