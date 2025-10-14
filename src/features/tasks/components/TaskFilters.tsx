"use client";

import { Select } from "@/components/ui/ui-primitives";
import type { Department, TaskPriority } from "@/domain/ssot";

interface TaskFiltersProps {
  filters: {
    department?: Department;
    priority?: TaskPriority;
    due: 'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE';
  };
  onFiltersChange: (filters: TaskFiltersProps['filters']) => void;
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-lg">
      <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
      
      <Select
        value={filters.department || ''}
        onChange={(e) => {
          const dept = e.target.value as Department | '';
          onFiltersChange({
            ...filters,
            department: dept || undefined,
          });
        }}
        className="sb-select w-auto min-w-[140px]"
      >
        <option value="">Todos los dept.</option>
        <option value="PERSONAL">Personal</option>
        <option value="VENTAS">Ventas</option>
        <option value="MARKETING">Marketing</option>
        <option value="PRODUCCION">Producción</option>
        <option value="ALMACEN">Almacén</option>
        <option value="FINANZAS">Finanzas</option>
        <option value="CALIDAD">Calidad</option>
        <option value="OPS">Operaciones</option>
      </Select>

      <Select
        value={filters.priority || ''}
        onChange={(e) => {
          const prio = e.target.value as TaskPriority | '';
          onFiltersChange({
            ...filters,
            priority: prio || undefined,
          });
        }}
        className="sb-select w-auto min-w-[120px]"
      >
        <option value="">Todas prioridad</option>
        <option value="URGENT">Urgente</option>
        <option value="HIGH">Alta</option>
        <option value="MEDIUM">Media</option>
        <option value="LOW">Baja</option>
      </Select>

      <Select
        value={filters.due}
        onChange={(e) => {
          onFiltersChange({
            ...filters,
            due: e.target.value as 'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE',
          });
        }}
        className="sb-select w-auto min-w-[140px]"
      >
        <option value="ALL">Todas las fechas</option>
        <option value="TODAY">Hoy</option>
        <option value="WEEK">Esta semana</option>
        <option value="OVERDUE">Vencidas</option>
      </Select>

      {(filters.department || filters.priority || filters.due !== 'ALL') && (
        <button
          onClick={() => onFiltersChange({ due: 'ALL' })}
          className="text-xs text-primary hover:underline ml-2"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
