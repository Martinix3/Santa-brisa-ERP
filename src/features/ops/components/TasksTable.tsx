// FILE: src/features/ops/components/TasksTable.tsx
'use client';
import React from 'react';
import type { Interaction, InteractionStatus, Department, TaskKind } from '@/domain/ssot';
import { SBButton, SBCard, Badge } from '@/components/ui';

// This is the VIEW MODEL for a task card.
export type Task = Interaction & {
  accountName?: string;
};

const DEPT_TO_BADGE_CLASS: Record<string, string> = {
  VENTAS: 'bg-orange-100 text-orange-800', 
  MARKETING: 'bg-sky-100 text-sky-800', 
  PRODUCCION: 'bg-teal-100 text-teal-800',
  FINANZAS: 'bg-yellow-100 text-yellow-800', 
  CALIDAD: 'bg-indigo-100 text-indigo-800', 
  ALMACEN: 'bg-slate-100 text-slate-800', 
  PERSONAL: 'bg-pink-100 text-pink-800',
  OPS: 'bg-purple-100 text-purple-800',
};

export function TasksTable({
  rows,
  view,
  deptFilter,
  onComplete,
  onDragStart,
}:{
  rows: Task[];
  view: 'DIA'|'SEMANA'|'MES';
  deptFilter: 'TODOS'| Department;
  onComplete:(id:string)=>void;
  onDragStart:(row:Task,e:React.DragEvent)=>void;
}){
  const filtered = rows.filter(r => {
    if (deptFilter !== 'TODOS' && r.dept !== deptFilter) return false;
    // TODO: Aquí iría la lógica de filtrado por fecha para DIA/SEMANA/MES
    return true;
  });
  
  return (
    <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 px-3 font-normal">Tarea</th>
              <th className="font-normal">Cuenta</th>
              <th className="font-normal">Dept</th>
              <th className="font-normal">Programada</th>
              <th className="text-right font-normal pr-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r=> (
              <tr key={r.id} className="border-t hover:bg-secondary" draggable onDragStart={(e)=>onDragStart(r,e)}>
                <td className="py-2 px-3 font-medium">{r.note}</td>
                <td>{r.accountName}</td>
                <td><Badge className={DEPT_TO_BADGE_CLASS[r.dept || 'OPS']}>{r.dept}</Badge></td>
                <td>{r.plannedFor ? <Badge variant="success">Sí</Badge> : <Badge variant="secondary">No</Badge>}</td>
                <td className="text-right pr-3">
                  <SBButton variant="primary" size="sm" onClick={() => onComplete(r.id)}>Completar</SBButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}
