// src/features/production/execution/components/ActiveOrderPanel.tsx
"use client";
import React, { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Play, Pause, CheckCircle, XCircle, Calendar, ArrowRight } from "lucide-react";
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom } from '@/domain/ssot';
import { updateProductionOrderStatus, completeProductionOrder } from "@/server/actions/production.actions";
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
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'finish' | 'summary' | null>(null);


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
          const res = await updateProductionOrderStatus({ 
              orderId: activeForm.order!.id, 
              status,
              responsibleId: activeForm.responsibleId
          } as any);
          if(res.ok) {
              toast.success(`Orden ${status === 'IN_PROGRESS' ? 'iniciada' : 'pausada'}`);
              // ✅ Actualizar estado local sin refresh
              setActiveForm((prev: any) => prev ? {
                  ...prev,
                  order: { ...prev.order, status }
              } : null);
          } else {
              toast.error(!res.ok ? (res.message ?? 'Operación fallida') : '');
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
            toast.error(!res.ok ? (res.message ?? 'Operación fallida') : '');
        }
        setConfirmAction(null);
    });
  };


  const showSummary = () => {
    if (!activeForm?.order || missingForFinish.length > 0) {
      toast.error("Faltan datos obligatorios para finalizar la orden.");
      return;
    }
    setConfirmAction('summary');
  };

  const handleFinish = () => {
    startTransition(async () => {
      try {
        const res = await completeProductionOrder({
          orderId: activeForm.order!.id,
          finalConsumptions: activeForm.realConsumption.map((c: any) => ({
            sku: c.itemId, 
            lotNumber: c.lotNumber, 
            fromLocationId: c.fromLocationId, 
            qty: c.realQty, 
            uom: c.uom
          })),
          finalOutputs: [{
            sku: activeForm.finalOutput.itemId,
            qty: activeForm.finalOutput.qty,
            uom: activeForm.finalOutput.uom,
            toLocationId: activeForm.finalOutput.toLocationId,
            lotNumber: activeForm.finalOutput.lotNumber || `LFG-${Date.now()}`
          }]
        } as any);
        
        if (!res.ok) {
          console.error('Error al finalizar:', res);
          toast.error(res.message ?? 'No se pudo finalizar la orden');
          setConfirmAction(null);
          return;
        }
      } catch (error) {
        console.error('Error al finalizar producción:', error);
        toast.error('Error inesperado al finalizar la producción');
        setConfirmAction(null);
        return;
      }
      
      // ✅ Calcular resumen completo de producción
      const totalConsumedReal = activeForm.realConsumption.reduce((sum: number, c: any) => sum + (c.realQty || 0), 0);
      const totalConsumedTheorical = activeForm.realConsumption.reduce((sum: number, c: any) => sum + (c.theoreticalQty || 0), 0);
      const desviacion = totalConsumedReal - totalConsumedTheorical;
      const mermaPercent = totalConsumedTheorical > 0 ? ((desviacion / totalConsumedTheorical) * 100).toFixed(2) : '0.00';
      
      // Calcular costes si hay información de precios
      const totalCost = activeForm.realConsumption.reduce((sum: number, c: any) => {
        const item = items.find(i => i.id === c.itemId);
        const cost = item?.stdCost || 0;
        return sum + (c.realQty * cost);
      }, 0);
      
      const numIncidents = (activeForm.journal?.filter((j: any) => j.kind === 'INCIDENT') || []).length;
      const protocolsOk = (activeForm.protocolChecks || []).filter(Boolean).length;
      
      toast.success(
        <div className="space-y-3">
          <p className="font-bold text-base">✅ Producción Finalizada</p>
          
          <div className="text-xs space-y-1 border-t pt-2">
            <p className="font-semibold">📦 Producción:</p>
            <p className="pl-3">• Producto: {items.find(i => i.id === activeForm.finalOutput.itemId)?.name || 'N/A'}</p>
            <p className="pl-3">• Cantidad: {activeForm.finalOutput.qty} {activeForm.finalOutput.uom}</p>
            <p className="pl-3">• Lote: {activeForm.finalOutput.lotNumber}</p>
          </div>
          
          <div className="text-xs space-y-1 border-t pt-2">
            <p className="font-semibold">📊 Consumo:</p>
            <p className="pl-3">• Teórico: {totalConsumedTheorical.toFixed(3)}</p>
            <p className="pl-3">• Real: {totalConsumedReal.toFixed(3)}</p>
            <p className={`pl-3 ${desviacion > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              • Desviación: {desviacion > 0 ? '+' : ''}{desviacion.toFixed(3)} ({mermaPercent}%)
            </p>
            {totalCost > 0 && <p className="pl-3">• Coste Total: €{totalCost.toFixed(2)}</p>}
          </div>
          
          <div className="text-xs space-y-1 border-t pt-2">
            <p className="font-semibold">👤 Control:</p>
            <p className="pl-3">• Responsable: {activeForm.responsibleId || 'N/A'}</p>
            <p className="pl-3">• Protocolos OK: {protocolsOk}/4</p>
            {numIncidents > 0 && (
              <p className="pl-3 text-destructive">• Incidencias: {numIncidents}</p>
            )}
          </div>
        </div>,
        { duration: 10000 }
      );
      
      setActiveForm(null);
      router.refresh();
      setConfirmAction(null);
    });
  };

  const missingForStart = useMemo(()=>{
    const msgs:string[] = [];
    if (!activeForm?.order) return [];
    if (!activeForm.responsibleId?.trim()) msgs.push("Responsable obligatorio.");
    if (!(activeForm.protocolChecks || []).some(Boolean)) msgs.push("Debes marcar al menos un check de protocolos.");
    return msgs;
  }, [activeForm]);

  const missingForFinish = useMemo(() => {
    const msgs: string[] = [];
    if (!activeForm?.order) return ["No hay orden activa"];
    if (!activeForm.realConsumption || activeForm.realConsumption.length === 0 || activeForm.realConsumption.some((l: any) => (l.realQty || 0) <= 0)) {
        msgs.push("Debes registrar el consumo real de todas las materias primas.");
    }
    if ((activeForm.finalOutput?.qty || 0) <= 0) {
        msgs.push("La cantidad de producción final debe ser mayor que cero.");
    }
    if (!activeForm.finalOutput?.lotNumber?.trim()) {
        msgs.push("El lote final es obligatorio.");
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
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Cantidad</label>
                        <Input type="number" className="w-full" value={activeForm.finalOutput.qty || 1} readOnly={!canEditPlan(activeForm?.order?.status)} onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, qty: Number(e.target.value) || 0} )} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha programada</label>
                        <Input 
                            type="date" 
                            className="w-full" 
                            value={activeForm?.order?.scheduledFor?.slice(0, 10) || activeForm.plannedDate || new Date().toISOString().slice(0, 10)} 
                            readOnly={!canEditPlan(activeForm?.order?.status)} 
                            onChange={e => {
                                if (activeForm.order) {
                                    // Si hay orden, actualizar scheduledFor
                                    setFormValue('order', {...activeForm.order, scheduledFor: e.target.value});
                                } else {
                                    // Si es planificación, actualizar plannedDate
                                    setFormValue('plannedDate', e.target.value);
                                }
                            }} 
                        />
                    </div>
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
                        {(activeForm.order && canFinish(activeForm.order.status)) && <SBButton className="sb-btn-success" onClick={showSummary} disabled={isPending || missingForFinish.length > 0}><CheckCircle size={16}/> Finalizar</SBButton>}
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
        
        {confirmAction && confirmAction !== 'summary' && (
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

        {/* Resumen ANTES de finalizar */}
        {confirmAction === 'summary' && (() => {
          // KPIs de consumo
          const totalConsumedReal = activeForm.realConsumption.reduce((sum: number, c: any) => sum + (c.realQty || 0), 0);
          const totalConsumedTheorical = activeForm.realConsumption.reduce((sum: number, c: any) => sum + (c.theoreticalQty || 0), 0);
          const desviacionConsumo = totalConsumedReal - totalConsumedTheorical;
          const mermaConsumoPercent = totalConsumedTheorical > 0 ? ((desviacionConsumo / totalConsumedTheorical) * 100).toFixed(2) : '0.00';
          
          // KPIs de producción final
          const produccionTeorica = activeForm.order?.targetQuantity || 0;
          const produccionReal = activeForm.finalOutput?.qty || 0;
          const desviacionProduccion = produccionReal - produccionTeorica;
          const mermaProduccionPercent = produccionTeorica > 0 ? ((desviacionProduccion / produccionTeorica) * 100).toFixed(2) : '0.00';
          
          // Merma total considerando ambos factores
          const eficienciaTotal = produccionTeorica > 0 && totalConsumedTheorical > 0
            ? ((produccionReal / produccionTeorica) / (totalConsumedReal / totalConsumedTheorical) * 100).toFixed(2)
            : '100.00';
          
          const totalCost = activeForm.realConsumption.reduce((sum: number, c: any) => {
            const item = items.find(i => i.id === c.itemId);
            const cost = item?.stdCost || 0;
            return sum + (c.realQty * cost);
          }, 0);
          const numIncidents = (activeForm.journal?.filter((j: any) => j.kind === 'INCIDENT') || []).length;
          const protocolsOk = (activeForm.protocolChecks || []).filter(Boolean).length;
          
          return (
            <div className="sb-dialog__overlay" onClick={() => setConfirmAction(null)}>
                <div className="sb-dialog__content max-w-2xl" onClick={e => e.stopPropagation()}>
                    <div className="sb-dialog">
                        <div className="sb-dialog__header">
                            <h3 className="sb-dialog__title text-lg">📋 Resumen de Producción</h3>
                        </div>
                        <div className="sb-dialog__body space-y-4 max-h-[60vh] overflow-y-auto">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2"><span className="text-lg">📦</span>Producción Final</h4>
                                <div className="text-sm space-y-1 bg-secondary/30 p-3 rounded">
                                  <p><span className="font-medium">Producto:</span> {items.find(i => i.id === activeForm.finalOutput.itemId)?.name || 'N/A'}</p>
                                  <p><span className="font-medium">Lote:</span> {activeForm.finalOutput.lotNumber}</p>
                                  <div className="pt-2 border-t space-y-1">
                                    <p><span className="font-medium">Teórica:</span> {produccionTeorica} {activeForm.finalOutput.uom}</p>
                                    <p><span className="font-medium">Real:</span> {produccionReal} {activeForm.finalOutput.uom}</p>
                                    <p className={desviacionProduccion >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                      <span className="font-medium">Desviación:</span> {desviacionProduccion > 0 ? '+' : ''}{desviacionProduccion.toFixed(3)} ({mermaProduccionPercent}%)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2"><span className="text-lg">👤</span>Control</h4>
                              <div className="text-sm space-y-1 bg-secondary/30 p-3 rounded">
                                <p><span className="font-medium">Responsable:</span> {activeForm.responsibleId || 'N/A'}</p>
                                <p><span className="font-medium">Protocolos OK:</span> {protocolsOk}/4</p>
                                {numIncidents > 0 && <p className="text-destructive"><span className="font-medium">Incidencias:</span> {numIncidents}</p>}
                              </div>
                            </div>
                          </div>
                          
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2"><span className="text-lg">📊</span>Consumo de Materias Primas</h4>
                              <div className="bg-secondary/30 p-3 rounded space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
                                  <span>Teórico</span>
                                  <span>Real</span>
                                  <span>Desviación</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                                  <span>{totalConsumedTheorical.toFixed(3)}</span>
                                  <span>{totalConsumedReal.toFixed(3)}</span>
                                  <span className={desviacionConsumo > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                    {desviacionConsumo > 0 ? '+' : ''}{desviacionConsumo.toFixed(3)} ({mermaConsumoPercent}%)
                                  </span>
                                </div>
                                {totalCost > 0 && (
                                  <div className="pt-2 border-t">
                                    <p className="text-sm"><span className="font-medium">Coste Total:</span> €{totalCost.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="bg-info/10 border border-info/30 p-3 rounded space-y-1">
                              <h4 className="font-semibold text-sm flex items-center gap-2"><span className="text-lg">⚖️</span>Balance Global</h4>
                              <p className="text-sm"><span className="font-medium">Eficiencia Total:</span> <span className={parseFloat(eficienciaTotal) >= 95 ? 'text-emerald-600' : parseFloat(eficienciaTotal) >= 85 ? 'text-amber-600' : 'text-rose-600'}>{eficienciaTotal}%</span></p>
                              <p className="text-xs text-muted-foreground">Relación entre producción obtenida y materias primas consumidas</p>
                            </div>
                          </div>
                          
                          {numIncidents > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2 text-destructive"><span className="text-lg">⚠️</span>Incidencias Registradas</h4>
                              <div className="bg-destructive/5 p-3 rounded space-y-1">
                                {(activeForm.journal?.filter((j: any) => j.kind === 'INCIDENT') || []).map((inc: any, i: number) => (
                                  <p key={i} className="text-xs">• {inc.summary}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="sb-dialog__footer">
                            <SBButton variant="ghost" onClick={() => setConfirmAction(null)}>Revisar</SBButton>
                            <SBButton variant="primary" onClick={() => { setConfirmAction('finish'); handleFinish(); }} disabled={isPending}>
                              <CheckCircle size={16}/> Confirmar y Finalizar
                            </SBButton>
                        </div>
                    </div>
                </div>
            </div>
          );
        })()}
    </div>
  );
}
