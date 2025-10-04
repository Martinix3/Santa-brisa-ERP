// src/features/agenda/components/TasksHeader.tsx
"use client";

import React from 'react';
import { Input, SBButton, Select } from '@/components/ui';
import type { TaskFilters } from '../hooks/useTasks';
import { Search, User, Users, Folder, Building, Briefcase } from 'lucide-react';

interface TasksHeaderProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export function TasksHeader({ filters, onFiltersChange }: TasksHeaderProps) {

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  
  const handleAssigneeChip = (mode: 'mine' | 'team') => {
      // For demo, 'mine' sets a mocked user ID.
      const newAssignees = mode === 'mine' ? ['user_1'] : []; 
      onFiltersChange({ ...filters, assignees: newAssignees });
  };
  
  const handleHasAccountChip = (mode: 'all' | 'linked' | 'unlinked') => {
      let hasAccount: boolean | undefined = undefined;
      if (mode === 'linked') hasAccount = true;
      if (mode === 'unlinked') hasAccount = false;
      onFiltersChange({ ...filters, hasAccount });
  };

  return (
    <div className="p-4 border-b bg-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gestor de Tareas</h2>
        {/* Placeholder for future actions like "New Task" */}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-grow min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="tasks-search-input"
            placeholder="Buscar por título, cuenta... (/)" 
            className="pl-9"
            value={filters.q || ''}
            onChange={e => handleFilterChange('q', e.target.value)}
          />
        </div>

        {/* Chips de Asignación */}
        <div className="flex items-center gap-2">
            <SBButton variant={!filters.assignees?.length ? 'primary' : 'outline'} size="sm" onClick={() => handleAssigneeChip('team')}><Users size={14} className="mr-1.5"/> Equipo</SBButton>
            <SBButton variant={filters.assignees?.length ? 'primary' : 'outline'} size="sm" onClick={() => handleAssigneeChip('mine')}><User size={14} className="mr-1.5"/> Mías</SBButton>
        </div>
        
        {/* Select de Departamento */}
        <Select value={filters.dept || 'ALL'} onChange={e => handleFilterChange('dept', e.target.value === 'ALL' ? undefined : e.target.value)}>
          <option value="ALL">Todos Dept.</option>
          <option value="VENTAS">Ventas</option>
          <option value="MARKETING">Marketing</option>
          <option value="PRODUCCION">Producción</option>
          <option value="ALMACEN">Almacén</option>
          <option value="FINANZAS">Finanzas</option>
        </Select>
        
        {/* Select de Origen */}
        <Select value={(filters.source && filters.source[0]) || 'ALL'} onChange={e => handleFilterChange('source', e.target.value === 'ALL' ? undefined : [e.target.value])}>
          <option value="ALL">Todo Origen</option>
          <option value="MANUAL">Manual</option>
          <option value="CRM">CRM</option>
          <option value="SYSTEM">Sistema</option>
        </Select>
        
        {/* Chips de Cuenta */}
        <div className="flex items-center gap-2">
            <SBButton variant={filters.hasAccount === undefined ? 'primary' : 'outline'} size="sm" onClick={() => handleHasAccountChip('all')}><Briefcase size={14} className="mr-1.5"/> Todas</SBButton>
            <SBButton variant={filters.hasAccount === true ? 'primary' : 'outline'} size="sm" onClick={() => handleHasAccountChip('linked')}><Building size={14} className="mr-1.5"/> Con Cuenta</SBButton>
            <SBButton variant={filters.hasAccount === false ? 'primary' : 'outline'} size="sm" onClick={() => handleHasAccountChip('unlinked')}><Folder size={14} className="mr-1.5"/> Libres</SBButton>
        </div>

        {/* Filtros de Fecha (simplificado por ahora) */}
        <Input type="date" value={filters.from || ''} onChange={e => handleFilterChange('from', e.target.value)}/>
        <Input type="date" value={filters.to || ''} onChange={e => handleFilterChange('to', e.target.value)}/>
      </div>
    </div>
  );
}
