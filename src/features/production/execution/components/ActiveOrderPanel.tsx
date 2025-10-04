// src/features/production/execution/components/ActiveOrderPanel.tsx
"use client";
import React, { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'finish' | null>(null);


  const setFormValue = useCallback((field: string, value: any) => {
    setActiveForm((form: any) => form ? ({ ...form, [field]: value }) : null);
  }, [setActiveForm]);

  const onReadyChange = useCallback((ok: boolean) => setFormValue('stockOk', ok), [setFormValue]);
  const shortagesOut = useCallback((s: any) => setFormValue('shortages', s), [setFormValue]);
  const requiredLotsOut = useCallback((r: any) => setFormValue('requiredLots', r), [setFormValue]);

  const activeBom = activeForm?.planningBom ?? (activeForm?.order ? recipes.find(b => b.id === (activeForm.order as any).bomId) : undefined);
  const orderIsLocked = activeForm?.order ? isClosedLike(activeForm.order.status) : false;

  const handleUpdateStatus = (status: 'IN_PROGRESS' | 'PAUSED') => {
      if (!activeForm?.order) return;
      startTransition(async () => {
          const res = await updateProductionOrderStatus({ orderId: activeForm.order!.id, status });
          if(res.ok) {
              toast.success(`Orden actualizada`);
              setActiveForm(null);
              router.refresh();
          } else {
              toast.error(res.message);
          }
      });
  };

  const handleCancel = () => {
    if (!activeForm?.order) return;
    startTransition(async () => {
        const res = await updateProductionOrderStatus({ orderId: activeForm.order!.id, status: 'CANCELLED' });
        if(res.ok) {
            toast.success(`Orden cancelada`);
            setActiveForm(null);
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setConfirmAction(null);
    });
  };


  const handleFinish = () => {
    if (!activeForm?.order || missingForFinish.length > 0) {
      toast.error("Faltan datos obligatorios para finalizar la orden.");
      return;
    }

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
      setConfirmAction(null);
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
            <div className="sb-card__content space-y-4">
                <div className="p-3 bg-info-foreground/30 border border-info-foreground/50 rounded-lg text-sm space-y-1 text-info">
                <p className="font-bold font-mono text-base text-foreground">
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
                
                <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                        {(!activeForm.order && activeForm.planningBom) && <SBButton className="sb-btn-info" onClick={onProgram} disabled={isPending}><Play size={16}/> Programar producción</SBButton>}
                        {(activeForm.order && canStart(activeForm.order.status)) && <SBButton className="sb-btn-info" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending || missingForStart.length > 0}><Play size={16}/> Iniciar</SBButton>}
                        {(activeForm.order && canPause(activeForm.order.status)) && <SBButton className="sb-btn-info" onClick={() => handleUpdateStatus('PAUSED')} disabled={isPending}><Pause size={16}/> Pausar</SBButton>}
                        {(activeForm.order && canResume(activeForm.order.status)) && <SBButton className="sb-btn-info" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending}><Play size={16}/> Reanudar</SBButton>}
                        {(activeForm.order && canFinish(activeForm.order.status)) && <SBButton className="sb-btn-success" onClick={() => setConfirmAction('finish')} disabled={isPending || missingForFinish.length > 0}><CheckCircle size={16}/> Finalizar</SBButton>}
                        {activeForm.order && <SBButton variant="destructive" onClick={() => setConfirmAction('cancel')} disabled={isClosedLike(activeForm.order?.status) || isPending}><XCircle size={16}/> Cancelar</SBButton>}
                    </div>
                    
                    {(missingForStart.length > 0 && canStart(activeForm.order?.status)) && (
                        <div className="mt-3 text-xs text-destructive space-y-1">
                            <p className="font-semibold">Falta para poder iniciar:</p>
                            <ul className="list-disc list-inside">
                                {missingForStart.map(msg => <li key={msg}>{msg}</li>)}
                            </ul>
                        </div>
                    )}
                    {(missingForFinish.length > 0 && canFinish(activeForm.order?.status)) && (
                        <div className="mt-3 text-xs text-destructive space-y-1">
                            <p className="font-semibold">Falta para poder finalizar:</p>
                            <ul className="list-disc list-inside">
                                {missingForFinish.map(msg => <li key={msg}>{msg}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            </SBCard>
        </div>
        <div className="lg:col-span-1">
          <RightSidebarPanel activeForm={activeForm} setFormValue={setFormValue} orderIsLocked={orderIsLocked} />
        </div>
        
        {confirmAction && (
            <div className="sb-dialog__overlay" onClick={() => setConfirmAction(null)}>
                <div className="sb-dialog__content" onClick={e => e.stopPropagation()}>
                    <div className="sb-dialog">
                        <div className="sb-dialog__header">
                            <h3 className="sb-dialog__title">Confirmar acción</h3>
                        </div>
                        <div className="sb-dialog__body">
                            <p className="text-muted-foreground">
                                {confirmAction === 'cancel' && "Esta acción no se puede deshacer. ¿Estás seguro de que quieres cancelar esta orden de producción?"}
                                {confirmAction === 'finish' && "Esto finalizará la orden, creará el producto terminado en stock y descontará las materias primas consumidas. ¿Continuar?"}
                            </p>
                        </div>
                        <div className="sb-dialog__footer">
                            <SBButton variant="ghost" onClick={() => setConfirmAction(null)}>Cancelar</SBButton>
                            <SBButton variant={confirmAction === 'cancel' ? 'destructive' : 'primary'} onClick={confirmAction === 'cancel' ? handleCancel : handleFinish} disabled={isPending}>Confirmar</SBButton>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}