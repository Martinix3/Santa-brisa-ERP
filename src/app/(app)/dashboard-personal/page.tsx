// src/app/(app)/dashboard-personal/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Package, Briefcase, CheckSquare } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, InteractionStatus, Account, OrderSellOut, PosTactic, Item } from '@/domain/ssot';
import { orderToBottles } from '@/lib/sb-core';
import { TaskBoard } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ============================================================================
// SANTA BRISA DESIGN SYSTEM: CONSTANTS
// ============================================================================
const SANTA_BRISA_COLORS = {
  brand: {
    accent: '#F4C542',
  },
  // ... (se podrían añadir más colores del sistema si fueran necesarios)
};

// ============================================================================
// COMPONENT: KpiCard
// ============================================================================
// ✅ Santabrisseado: Versión mejorada y consistente con el resto de la app.
//    - Fondo gris claro (#f9fafb) -> bg-slate-50
//    - Borde simple, sin sombra -> border border-slate-200
//    - Iconos en color 'muted' -> text-slate-500
//    - Jerarquía de texto ajustada a la paleta.
//    - Animación 'hover' de elevación sutil.
const KpiCard = ({ 
    icon: Icon, 
    title, 
    value, 
    goal, 
    color 
}: { 
    icon: React.ElementType;
    title: string; 
    value: number; 
    goal: number; 
    color: string 
}) => {
    const progress = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    return (
        <motion.div 
            className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-transform duration-200 hover:-translate-y-1"
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
        >
            <div className="flex items-center space-x-3 mb-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <Icon className="text-slate-500" size={20} />
                </div>
                <p className="text-sm text-slate-700 font-medium">{title}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value} <span className="text-base font-normal text-slate-500">/ {goal}</span></p>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function PersonalDashboardPage() {
    const { currentUser, data } = useData();
    const router = useRouter();
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
    const [openNewTask, setOpenNewTask] = useState(false);
    const [completingMarketingEvent, setCompletingMarketingEvent] = useState<any>(null);

    // Lógica de datos (sin cambios)
    const { personalTasks, kpis } = useMemo(() => {
        if (!data || !currentUser) return { personalTasks: [], kpis: null };
        const myInteractions = (data.interactions || []).filter(i => {
            const isAssigned = (i.involvedUserIds || []).includes(currentUser.id);
            const isSelfAssigned = (i.involvedUserIds === undefined || i.involvedUserIds.length === 0) && i.userId === currentUser.id;
            return isAssigned || isSelfAssigned;
        });
        const tasks = mapInteractionsToTasks(myInteractions, data.accounts);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const myAccounts = (data.accounts || []).filter(a => a.ownerId === currentUser.id && new Date(a.createdAt) >= startOfMonth);
        const myOrders = (data.ordersSellOut || []).filter(o => {
            const acc = data.accounts.find(a => a.id === o.accountId);
            return acc?.ownerId === currentUser.id && new Date(o.createdAt) >= startOfMonth;
        });
        const myVisits = myInteractions.filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth);
        const myPosTactics = (data.posTactics || []).filter(t => t.createdById === currentUser.id && new Date(t.createdAt) >= startOfMonth);
        const boxesSold = myOrders.reduce((sum, o) => {
            const bottles = orderToBottles(o, data.items || []);
            const firstLineItem = o.lines?.[0]?.itemId ? data.items.find(it => it.id === o.lines[0].itemId) : undefined;
            const caseUnits = firstLineItem?.caseUnits || 6;
            return sum + Math.floor(bottles / caseUnits);
        }, 0);
        const kpiData = {
            newAccounts: myAccounts.length,
            boxesSold: boxesSold,
            visits: myVisits.length,
            posTactics: myPosTactics.length
        };
        return { personalTasks: tasks, kpis: kpiData };
    }, [data, currentUser]);

    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
        if (!data || !data.interactions) return;
        const taskToUpdate = data.interactions.find(i => i.id === id);
        if (!taskToUpdate) return;
    
        if (newStatus === 'done') {
          if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && data.marketingEvents) {
            const event = data.marketingEvents.find((e: any) => e.id === taskToUpdate.linkedEntity?.id);
            if (event) setCompletingMarketingEvent(event);
            else setCompletingTask(taskToUpdate);
          } else {
            setCompletingTask(taskToUpdate);
          }
        }
    };
    
    // Animación de carga escalonada
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 }
        }
    };

    if (!kpis) {
        return <div className="p-6 bg-white text-slate-700">Cargando dashboard...</div>;
    }

    return (
        <>
            {/* ✅ Santabrisseado: Fondo blanco puro, padding consistente */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        {/* ✅ Santabrisseado: Título con color de texto principal */}
                        <h1 className="text-2xl font-bold text-slate-900">Mi Dashboard</h1>
                    </div>

                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* ✅ Santabrisseado: KPIs con iconos y color de marca correcto */}
                        <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts} goal={10} color={SANTA_BRISA_COLORS.brand.accent} />
                        <KpiCard icon={Package} title="Cajas Vendidas" value={kpis.boxesSold} goal={150} color={SANTA_BRISA_COLORS.brand.accent} />
                        <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits} goal={60} color={SANTA_BRISA_COLORS.brand.accent} />
                        <KpiCard icon={CheckSquare} title="POS Tactics" value={kpis.posTactics} goal={20} color={SANTA_BRISA_COLORS.brand.accent} />
                    </motion.div>
                    
                    {/* El Kanban, que también aparece con una animación sutil */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <TaskBoard
                            tasks={personalTasks}
                            onTaskStatusChange={handleUpdateStatus}
                            onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
                            onNewTask={() => setOpenNewTask(true)}
                        />
                    </motion.div>

                </div>
            </main>

            {/* --- Dialogs --- */}
            {/* La lógica y el renderizado de los diálogos permanecen, solo se ajusta el color de acento */}
            {completingTask && (
                <TaskCompletionDialog task={completingTask} open={!!completingTask} onClose={() => setCompletingTask(null)} onSuccess={() => { toast.success('Tarea completada con éxito.'); router.refresh(); setCompletingTask(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} />
            )}
            {completingMarketingEvent && (
                <MarketingTaskCompletionDialog entity={completingMarketingEvent} open={!!completingMarketingEvent} onClose={() => setCompletingMarketingEvent(null)} onSuccess={() => { toast.success('Resultados del evento guardados.'); router.refresh(); setCompletingMarketingEvent(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} />
            )}
            {openNewTask && currentUser && (
                <NewEventDialog
                  open={openNewTask}
                  onOpenChange={setOpenNewTask}
                  onSuccess={() => { toast.success("Tarea creada"); setOpenNewTask(false); router.refresh(); }}
                  onError={(msg) => toast.error(msg)}
                  // ✅ Santabrisseado: Color de acento correcto
                  accentColor={SANTA_BRISA_COLORS.brand.accent}
                  initialEventData={{ userId: currentUser.id, dept: 'PERSONAL' }}
                />
            )}
        </>
    );
}