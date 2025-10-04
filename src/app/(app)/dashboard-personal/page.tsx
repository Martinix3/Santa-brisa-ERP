// src/app/(app)/dashboard-personal/page.tsx
'use client';

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, Account, Department } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { DndContext, useDroppable, useDraggable } from '@dnd-kit/core';
import { Plus, Check, Clock, Waypoints, Droplet, Users } from 'lucide-react';
import { SBButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DayPicker } from 'react-day-picker';
import es from 'date-fns/locale/es';

// --- HELPERS & STYLES ---
const formatEur = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);

const TaskStatusBadge = ({ status, date }: { status: 'Vencida' | 'Hecho'; date?: string }) => {
  const baseClasses = 'text-xs font-semibold px-2 py-0.5 rounded-full';
  const styles = {
    Vencida: 'bg-red-100 text-red-800',
    Hecho: 'bg-green-100 text-green-800',
  };
  return (
    <div className="text-right">
      <span className={cn(baseClasses, styles[status])}>{status}</span>
      {date && <p className="text-xs text-muted-foreground mt-1">{date}</p>}
    </div>
  );
};

// --- COMPONENTS ---
function DailyTasksCard({ tasks }: { tasks: Interaction[] }) {
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const dateA = a.plannedFor ? new Date(a.plannedFor).getTime() : Infinity;
            const dateB = b.plannedFor ? new Date(b.plannedFor).getTime() : -Infinity;
            return dateA - dateB;
        });
    }, [tasks]);

    const getStatus = (task: Interaction): { status?: 'Vencida' | 'Hecho'; date?: string } => {
        if (task.status === 'done') return { status: 'Hecho' };
        if (task.plannedFor) {
            const now = new Date();
            const taskDate = new Date(task.plannedFor);
            if (taskDate < now) return { status: 'Vencida' };
            const time = taskDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            if (taskDate.toDateString() === now.toDateString()) {
                return { date: `Hoy, ${time}h` };
            }
        }
        return {};
    };

    return (
        <div className="bg-card border rounded-xl shadow-sm">
            <header className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2"><Clock size={16} /> Tareas del Día</h2>
            </header>
            <div className="p-2 space-y-1">
                {sortedTasks.map(task => {
                    const deptMeta = task.dept ? DEPT_META[task.dept] : DEPT_META['OPS'];
                    const { status, date } = getStatus(task);
                    return (
                        <div key={task.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                            <input type="checkbox" className="sb-checkbox" />
                            <div>
                                <p className="text-sm font-medium text-foreground">{task.note}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: deptMeta.color + '20', color: deptMeta.color }}>
                                    {deptMeta.label}
                                </span>
                            </div>
                            {status && <TaskStatusBadge status={status} date={date} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DealCard({ deal }: { deal: Account }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-3 bg-card border rounded-lg shadow-sm touch-none">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-sm">{deal.name}</p>
        {(deal.subType === 'PLV') && <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">PLV</span>}
      </div>
      <p className="text-xs text-muted-foreground">{formatEur(Math.random() * 25000)} · {Math.floor(Math.random() * 5 + 1)} ped.</p>
      <p className="text-right text-xs font-semibold text-primary mt-1">Programar</p>
    </div>
  );
}

function KanbanColumn({ id, title, count, deals }: { id: string; title: string; count: number; deals: Account[] }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-1 p-2 rounded-lg bg-secondary min-w-[200px]">
      <h3 className="font-semibold text-sm px-2 mb-2">{title} <span className="text-muted-foreground font-normal">({count})</span></h3>
      <div className="space-y-2">
        {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
        {deals.length === 0 && id === 'Fallida' && (
             <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground">Arrastra aquí</div>
        )}
      </div>
    </div>
  );
}

function SalesPipelineKanban({ accounts }: { accounts: Account[] }) {
    const pipelineData = useMemo(() => ({
        'Potencial': accounts.filter(a => a.stage === 'POTENCIAL'),
        'Seguimiento': accounts.filter(a => a.stage === 'SEGUIMIENTO'),
        'Activa': accounts.filter(a => a.stage === 'ACTIVA'),
        'Fallida': accounts.filter(a => a.stage === 'FALLIDA'),
    }), [accounts]);
    
    return (
        <div className="bg-card border rounded-xl shadow-sm">
            <header className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2"><Waypoints size={16} /> Pipeline de Ventas</h2>
            </header>
            <DndContext onDragEnd={() => {}}>
                <div className="p-4 flex gap-4 overflow-x-auto">
                    {Object.entries(pipelineData).map(([stage, deals]) => (
                        <KanbanColumn key={stage} id={stage} title={stage} count={deals.length} deals={deals} />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}

function WeeklyKpisCard() {
    return (
        <div className="bg-card border rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Droplet size={16}/> KPIs Clave (Semanal)</h3>
            <div className="flex justify-around text-center">
                <div>
                    <p className="text-xs text-muted-foreground">Tareas Completadas</p>
                    <p className="text-2xl font-bold">23</p>
                    <p className="text-xs font-semibold text-green-600">+5% ↑</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Ventas Cerradas</p>
                    <p className="text-2xl font-bold">€15K</p>
                    <p className="text-xs font-semibold text-red-600">-2% ↓</p>
                </div>
            </div>
        </div>
    );
}


// --- MAIN PAGE ---
export default function PersonalDashboardPage() {
  const { data } = useData();

  const { todayTasks, pipelineAccounts } = useMemo(() => {
    if (!data) return { todayTasks: [], pipelineAccounts: [] };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const tasks = (data.interactions || []).filter(i => {
      if (i.status === 'done') return false;
      if (!i.plannedFor) return true; // Tareas sin fecha se asumen para hoy
      return new Date(i.plannedFor) >= startOfToday;
    });

    const accounts = data.accounts || [];

    return { todayTasks: tasks, pipelineAccounts: accounts };
  }, [data]);

  return (
    <div className="p-6 bg-secondary/70 min-h-full">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Dashboard</h1>
          <p className="text-muted-foreground">Sábado, 4 de Octubre, 2025</p>
        </div>
        <div className="flex items-center gap-2">
            <SBButton variant='secondary'>Diaria</SBButton>
            <SBButton variant='secondary'>Semanal</SBButton>
            <SBButton variant='secondary'>Mensual</SBButton>
            <SBButton><Plus size={16} className='mr-1'/> Nueva Tarea</SBButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DailyTasksCard tasks={todayTasks} />
          <SalesPipelineKanban accounts={pipelineAccounts} />
        </div>
        <div className="space-y-6">
            <div className="bg-card border rounded-xl shadow-sm p-2">
                 <DayPicker
                    mode="single"
                    selected={new Date(2025, 9, 4)}
                    locale={es}
                    showOutsideDays
                    fixedWeeks
                  />
            </div>
            <WeeklyKpisCard/>
        </div>
      </div>
    </div>
  );
}
