
'use client';
import React from 'react';
import type { TaskKind, Interaction, InteractionStatus, Department } from '@/domain/ops.types';

// This is the VIEW MODEL for a task card.
export type Task = {
  id: string;
  title: string;
  dept: Department;
  kind: TaskKind,
  status: InteractionStatus; // 'open' | 'done'
  dueAt?: string;             // ISO recomendado
  involvedUserIds?: string[];
  accountName?: string;
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
    // Aquí iría la lógica de filtrado por fecha para DIA/SEMANA/MES
    return true;
  });
  
  return (
    <section className="sb-card">
      <header className="sb-card__header">
        <h3 className="sb-card__title">Tareas ({view})</h3>
        <div className="ml-auto flex gap-2">
          {/* Los badges ahora podrían ser un componente reutilizable */}
        </div>
      </header>
      <div className="sb-card__content">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="py-2">Tarea</th>
              <th>Cuenta</th>
              <th>Dept</th>
              <th>Programada</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r=> (
              <tr key={r.id} className="border-t hover:bg-neutral-50" draggable onDragStart={(e)=>onDragStart(r,e)}>
                <td className="py-2">{r.title}</td>
                <td>{r.accountName}</td>
                <td><span className={`sb-badge sb-badge--${(r.dept||'').toLowerCase()}`}>{r.dept}</span></td>
                <td>{r.dueAt ? <span className="sb-badge sb-badge--ok">Sí</span> : <span className="sb-badge sb-badge--warn">No</span>}</td>
                <td className="text-right">
                  <button className="sb-btn-primary px-2 py-1 text-xs" onClick={() => onComplete(r.id)}>Completar →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
