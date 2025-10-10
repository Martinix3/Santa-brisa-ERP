// src/features/sales/pipeline/components/PipelineHeader.tsx
"use client";
import React from 'react';
import { Input, SBButton } from '@/components/ui';
import { Search } from 'lucide-react';
import type { PipelineFilters } from '../hooks/usePipeline';

interface PipelineHeaderProps {
  filters: PipelineFilters;
  onFiltersChange: (filters: PipelineFilters) => void;
}

export function PipelineHeader({ filters, onFiltersChange }: PipelineHeaderProps) {
    
  const handleChipClick = (preset: 'ALL' | 'MINE') => {
      if(preset === 'ALL') {
          onFiltersChange({ ...filters, userIds: [] });
      } else {
          // Assuming current user ID is available, for now mocked
          onFiltersChange({ ...filters, userIds: ['user_1'] });
      }
  }

  return (
    <div className="p-4 border-b bg-card">
      <div className="flex items-center gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de cuenta..."
            className="pl-9"
            value={filters.q || ''}
            onChange={e => onFiltersChange({ ...filters, q: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
            <SBButton variant={!filters.userIds || filters.userIds.length === 0 ? 'primary' : 'secondary'} size="sm" onClick={() => handleChipClick('ALL')}>Todos</SBButton>
            <SBButton variant={(filters.userIds?.length ?? 0) > 0 ? 'primary' : 'secondary'} size="sm" onClick={() => handleChipClick('MINE')}>Mis Cuentas</SBButton>
        </div>
        {/* TODO: Add other dropdown filters (Zone, Distributor, etc.) */}
      </div>
    </div>
  );
}
