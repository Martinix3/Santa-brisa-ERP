// src/app/(app)/orders/page.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import { readFlowFrom } from "@/lib/useFlow";
import { getInteractionsForOrder, getLastAndNextInteractionDates } from "@/features/orders/interactions.helpers";
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import type { Interaction, InteractionStatus, MarketingEvent, OrderSellIn /* o tu tipo */, Account } from "@/domain/ssot";
import { toast } from "sonner";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import OrdersDashboard from '@/features/orders/components/OrdersDashboard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';


export default function OrdersPage({ searchParams }: { searchParams?: Record<string, any> }) {
    const flow = readFlowFrom(searchParams);
    const router = useRouter();
    const { data, setData, isPersistenceEnabled, saveCollection } = useData();

    // Estado para crear/editar/completar interacciones desde Orders
    const [isNewEventOpen, setIsNewEventOpen] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<Interaction|null>(null);
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
    const [completingMarketingEvent, setCompletingMarketingEvent] = useState<MarketingEvent | null>(null);
    const [currentOrderContext, setCurrentOrderContext] = useState<{orderId:string; accountId?:string}|null>(null);

    const orders = useMemo(() => {
        if (!data?.ordersSellOut) return [];
        // Filtro por flow (tu lógica real aquí):
        // DIRECT => sell-in/online; PLACEMENT => reportes distribuidor si conviven
        return data.ordersSellOut.filter(o => {
            const account = data.accounts.find(a => a.id === o.accountId);
            if (!account) return false;

            if (flow === "PLACEMENT") return account.flow === 'PLACEMENT';
            return account.flow !== 'PLACEMENT';
        });
    }, [data?.ordersSellOut, data?.accounts, flow]);

    // Mapeo de métricas de visita por pedido (evita recalcular por fila)
    const orderVisitMetrics = useMemo(() => {
        if (!data?.interactions) return {};
        const map: Record<string, {last:string|null; next:string|null}> = {};
        for (const o of orders) {
        const inters = getInteractionsForOrder(data.interactions, o.id);
        map[o.id] = getLastAndNextInteractionDates(inters);
        }
        return map;
    }, [data?.interactions, orders]);

    const openNewVisitForOrder = (orderId: string, accountId?: string) => {
        setEditingInteraction(null);
        setCurrentOrderContext({ orderId, accountId });
        setIsNewEventOpen(true);
    };

    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
        if (!data?.interactions) return;
        const taskToUpdate = data.interactions.find(i => i.id === id);
        if (newStatus === 'done' && taskToUpdate) {
            if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && data.marketingEvents) {
                const event = (data.marketingEvents || []).find((e: MarketingEvent) => e.id === taskToUpdate.linkedEntity?.id);
                if (event) setCompletingMarketingEvent(event);
                else setCompletingTask(taskToUpdate);
            } else {
                setCompletingTask(taskToUpdate);
            }
        }
    };

    return (
        <>
            <ModuleHeader title="Pedidos" icon={ShoppingCart} />
            <div className="p-6 bg-zinc-50 flex-grow">
               <OrdersDashboard 
                 orderVisitMetrics={orderVisitMetrics}
                 onNewVisit={openNewVisitForOrder}
               />
            </div>
             {/* Crear/editar interacción (sembrada con ORDER) */}
            {isNewEventOpen && (
                <NewEventDialog
                open={isNewEventOpen}
                onOpenChange={setIsNewEventOpen}
                onSuccess={() => {
                    // Opcional: refrescar, toasts…
                    router.refresh();
                    setIsNewEventOpen(false);
                    setEditingInteraction(null);
                    setCurrentOrderContext(null);
                }}
                onError={(msg) => toast.error(`Error: ${msg}`)}
                // Semilla: vinculamos la nueva interacción al pedido (y a la cuenta)
                initialEventData={{
                    ...(editingInteraction || {}),
                    accountId: currentOrderContext?.accountId,
                    linkedEntity: currentOrderContext ? { type: 'ORDER', id: currentOrderContext.orderId } : undefined,
                    dept: 'VENTAS',
                } as any}
                accentColor={''}
                />
            )}

            {/* Completar interacción desde Orders */}
            {completingTask && (
                <TaskCompletionDialog
                task={completingTask}
                open={!!completingTask}
                onClose={() => setCompletingTask(null)}
                onSuccess={() => {
                    toast.success('Visita completada.');
                    router.refresh();
                    setCompletingTask(null);
                }}
                onError={(msg) => toast.error(`Error: ${msg}`)}
                />
            )}

            {completingMarketingEvent && (
                <MarketingTaskCompletionDialog
                entity={completingMarketingEvent}
                open={!!completingMarketingEvent}
                onClose={() => setCompletingMarketingEvent(null)}
                onSuccess={() => {
                    toast.success('Resultados del evento de marketing guardados.');
                    router.refresh();
                    setCompletingMarketingEvent(null);
                }}
                onError={(msg) => toast.error(`Error: ${msg}`)}
                />
            )}
        </>
    );
}
