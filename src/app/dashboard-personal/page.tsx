
"use client";
import React, { useMemo } from 'react';
import { BarChart3, Calendar, CheckCircle, Clock, Plus, AlertTriangle } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { SBCard, SBButton, SB_COLORS } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import type { Interaction } from '@/domain/ssot';
import Link from 'next/link';

function PersonalKPI({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                <p className="text-sm text-zinc-600">{label}</p>
            </div>
        </div>
    );
}

function TaskCard({ task }: { task: Interaction }) {
    const { data: santaData } = useData();
    const isOverdue = task.plannedFor && new Date(task.plannedFor) < new Date();
    const account = santaData?.accounts.find(a => a.id === task.accountId);
    
    return (
        <Link href="/agenda" className="block p-3 rounded-lg border bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-sm text-zinc-800">{task.note}</p>
                    {account && <p className="text-xs text-zinc-500 mt-0.5">{account.name}</p>}
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-zinc-500'}`}>
                    {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                    {task.plannedFor ? new Date(task.plannedFor).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                </div>
            </div>
        </Link>
    );
}


function PersonalDashboardContent() {
  const { currentUser, data } = useData();
  
  const userTasks = useMemo(() => {
    if (!data || !currentUser) return [];
    return data.interactions.filter(i => i.userId === currentUser.id && i.status === 'open');
  }, [data, currentUser]);

  const kpis = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    
    const overdueTasks = userTasks.filter(t => t.plannedFor && new Date(t.plannedFor) < todayStart).length;
    const todayTasks = userTasks.filter(t => t.plannedFor && new Date(t.plannedFor) >= todayStart && new Date(t.plannedFor) <= todayEnd).length;
    const futureTasks = userTasks.filter(t => t.plannedFor && new Date(t.plannedFor) > todayEnd).length;

    return { overdueTasks, todayTasks, futureTasks };
  }, [userTasks]);
  
  if (!currentUser || !data) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 bg-zinc-50 flex-grow space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">Bienvenido, {currentUser.name.split(' ')[0]}</h1>
          <p className="text-zinc-600">Aquí tienes un resumen de tu actividad.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/agenda">
                <SBButton>
                    <Plus size={16} /> Nueva Tarea
                </SBButton>
            </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PersonalKPI label="Tareas Pendientes (Hoy)" value={kpis.todayTasks} icon={Clock} color={SB_COLORS.primary} />
        <PersonalKPI label="Tareas Atrasadas" value={kpis.overdueTasks} icon={AlertTriangle} color={SB_COLORS.cobre} />
        <PersonalKPI label="Tareas Futuras" value={kpis.futureTasks} icon={Calendar} color={SB_COLORS.accent} />
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SBCard title="Tareas Más Próximas">
            <div className="p-3 space-y-2">
                {userTasks.length > 0 ? (
                    userTasks
                        .sort((a, b) => new Date(a.plannedFor || 0).getTime() - new Date(b.plannedFor || 0).getTime())
                        .slice(0, 7)
                        .map(task => <TaskCard key={task.id} task={task} />)
                ) : (
                    <div className="text-center py-8 text-zinc-500">
                        <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                        <p className="font-semibold">¡Todo al día!</p>
                        <p className="text-sm">No tienes tareas pendientes.</p>
                    </div>
                )}
            </div>
        </SBCard>
        <div className="space-y-6">
            <SBCard title="Accesos Directos">
                <div className="p-4 grid grid-cols-2 gap-3">
                    <Link href="/accounts" className="text-center p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200">
                        <p className="font-semibold text-zinc-800">Ver Cuentas</p>
                    </Link>
                    <Link href="/orders" className="text-center p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200">
                        <p className="font-semibold text-zinc-800">Ver Pedidos</p>
                    </Link>
                </div>
            </SBCard>
        </div>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Dashboard Personal" icon={BarChart3} />
      <PersonalDashboardContent />
    </AuthenticatedLayout>
  );
}
