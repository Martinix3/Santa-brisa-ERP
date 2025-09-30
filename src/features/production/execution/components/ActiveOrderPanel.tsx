// src/features/production/execution/components/ActiveOrderPanel.tsx
"use client";
import React, { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Pause, CheckCircle, XCircle, Calendar, ArrowRight } from "lucide-react";
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom } from '@/domain/ssot';
import { updateProductionOrderStatus, completeProductionOrder } from "@/app/(app)/production/actions";
import { StockCheckPanel } from './StockCheckPanel';
import { RealConsumptionPanel } from './RealConsumptionPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { canEditPlan, canStart, canPause, canResume, canFinish, isClosedLike } from '../helpers';

export function ActiveOrderPanel({ activeForm, setActiveForm, onProgram, items, onHand, recipes }: {
  activeForm: any;
  setActiveForm: (form: any) => void;
  onProgram: () => Promise<void>;
  items: Item[];
  onHand: any[];
  recipes: RecipeBom[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setFormValue = useCallback((field: string, value: any) => {
    setActiveForm((form: any) => form ? ({ ...form, [field]: value }) : null);
  }, [setActiveForm]);

  const onReadyChange = useCallback((ok: boolean) => setFormValue('stockOk', ok), [setFormValue]);
  const shortagesOut = useCallback((s: any) => setFormValue('shortages', s), [setFormValue]);
  const requiredLotsOut = useCallback((r: any) => setFormValue('requiredLots', r), [setFormValue]);

  const activeBom = activeForm?.planningBom ?? (activeForm?.order ? recipes.find(b => b.id === (activeForm.order as any).bomId) : undefined);
  const orderIsLocked = activeForm?.order ? isClosedLike(activeForm.order.status) : false;

  const handleUpdateStatus = (status: 'IN_PROGRESS' | 'PAUSED' | 'CANCELLED') => {
      if (!activeForm?.order) return;
      if (status === 'CANCELLED' && !confirm('¿Cancelar la orden? Esta acción no se puede deshacer.')) return;
      startTransition(async () => {
          const res = await updateProductionOrderStatus({ orderId: activeForm.order!.id, status });
          if(res.ok) {
              toast.success(`Orden ${status === 'CANCELLED' ? 'cancelada' : 'actualizada'}`);
              setActiveForm(null);
              router.refresh();
          } else {
              toast.error(res.message);
          }
      });
  };

  const handleFinish = () => {
    if (!activeForm?.order || missingForFinish.length > 0) {
      toast.error("Faltan datos obligatorios para finalizar la orden.");
      return;
    }
    if (!confirm("¿Finalizar y cerrar la orden? Se crearán movimientos de stock.")) return;

    startTransition(async () => {
      const res = await completeProductionOrder({
        orderId: activeForm.order!.id,
        finalConsumptions: activeForm.realConsumption.map((c: any) => ({itemId: c.itemId, lotNumber: c.lotNumber, fromLocationId: c.fromLocationId, qty: c.realQty, uom: c.uom})),
        finalOutputs: [activeForm.finalOutput]
      });
      if (res.ok) {
        toast.success("Orden finalizada con éxito");
        setActiveForm(null);
        router.refresh();
      } else {
        toast.error(res.message ?? "No se pudo finalizar la orden");
      }
    });
  };

  const missingForStart = useMemo(()=>{
    const msgs:string[] = [];
    if (!activeForm?.order) return [];
    if (!activeForm.responsibleId?.trim()) msgs.push("Responsable obligatorio.");
    if (!activeForm.protocolChecks?.some(Boolean)) msgs.push("Debes marcar al menos un check de protocolos.");
    return msgs;
  }, [activeForm]);

  const missingForFinish = useMemo(() => {
    const msgs: string[] = [];
    if (!activeForm?.order) return ["No hay orden activa"];
    if (activeForm.realConsumption.length === 0 || activeForm.realConsumption.some((l: any) => l.realQty <= 0)) {
        msgs.push("Debes registrar el consumo real de todas las materias primas.");
    }
    if (activeForm.finalOutput.qty <= 0) {
        msgs.push("La cantidad de producción final debe ser mayor que cero.");
    }
    return msgs;
  }, [activeForm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
            <SBCard title={<div className="flex items-center gap-2"><Calendar/><span>Planificación / Ejecución de orden</span></div>}>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                <p className="font-bold font-mono text-base">
                    {activeForm?.order?.orderNumber ?? activeBom?.name ?? "Nueva orden"}
                </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input type="number" className="mt-1 w-full" value={activeForm.finalOutput.qty || 1} readOnly={!canEditPlan(activeForm?.order?.status)} onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, qty: Number(e.target.value) || 0} )} />
                    <Input type="date" className="mt-1 w-full" value={activeForm?.order?.scheduledFor?.slice(0, 10) || new Date().toISOString().slice(0, 10)} readOnly={!canEditPlan(activeForm?.order?.status)} onChange={e => setFormValue('order', {...activeForm?.order, scheduledFor: e.target.value} )} />
                </div>
                
                {activeBom && (
                <StockCheckPanel bom={activeBom} qty={activeForm.finalOutput.qty || 1} items={items} onHand={onHand}
                    onReadyChange={onReadyChange}
                    shortagesOut={shortagesOut}
                    requiredLotsOut={requiredLotsOut} />
                )}
                
                <RealConsumptionPanel
                    activeForm={activeForm}
                    setFormValue={setFormValue}
                    orderIsLocked={orderIsLocked}
                />
                
                <div className="flex flex-wrap gap-2 pt-2">
                {(!activeForm.order && activeForm.planningBom) && <SBButton className="bg-blue-600 text-white" onClick={onProgram} disabled={isPending}><Play size={16}/> Programar producción</SBButton>}
                {(activeForm.order && canStart(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending || missingForStart.length > 0}><Play size={16}/> Iniciar</SBButton>}
                {(activeForm.order && canPause(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('PAUSED')} disabled={isPending}><Pause size={16}/> Pausar</SBButton>}
                {(activeForm.order && canResume(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending}><Play size={16}/> Reanudar</SBButton>}
                {(activeForm.order && canFinish(activeForm.order.status)) && <SBButton className="bg-emerald-600 text-white" onClick={handleFinish} disabled={isPending || missingForFinish.length > 0}><CheckCircle size={16}/> Finalizar</SBButton>}
                {activeForm.order && <SBButton variant="destructive" onClick={() => handleUpdateStatus('CANCELLED')} disabled={isClosedLike(activeForm.order?.status) || isPending}><XCircle size={16}/> Cancelar</SBButton>}
                </div>
            </div>
            </SBCard>
        </div>
        <div className="lg:col-span-1">
          <RightSidebarPanel activeForm={activeForm} setFormValue={setFormValue} orderIsLocked={orderIsLocked} />
        </div>
    </div>
  );
}
