// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, CheckCircle, XCircle, Factory as FactoryIcon, Calendar, ChevronDown, AlertTriangle, Info } from "lucide-react";
import { SBCard, SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom, ProductionStatus, OnHandView } from '@/domain/ssot';
import { JournalEntry } from "@/domain/ssot.common";
import { planProduction, updateProductionOrderStatus, completeProductionOrder, addIncident } from "../actions";

// Tipos locales para el estado del formulario
type LocalProductionOrder = ProductionOrder & { locked?: boolean; };
type RealLine = { itemId: string; qty: number; uom: Uom; lotNumber: string; fromLocationId: string; };
type OutputReal = { itemId: string; qty: number; uom: Uom; lotNumber?: string; sku?: string; toLocationId: string };
type ActiveOrderForm = {
    order: LocalProductionOrder | null;
    planningBom: RecipeBom | null;
    responsibleId: string;
    finalOutput: OutputReal;
    realConsumption: RealLine[];
    journal: JournalEntry[];
    incidentText: string;
    incidentSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
    protocolChecks: boolean[];
    stockOk: boolean;
    shortages: Array<{ itemId: string; itemName: string; missing: number; uom: Uom }>;
    requiredLots: Array<{ itemId: string; lotNumber: string; qty: number; uom: string; locationId: string }>;
};

// ---------- Componentes helpers como Badge, Collapsible se mantienen igual ----------
function Badge({ children, tone = "zinc" }:{
  children: React.ReactNode; tone?: "zinc"|"sky"|"amber"|"rose"|"emerald";
}) {
  const toneClasses = {
    zinc: "bg-zinc-100 text-zinc-800",
    sky: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    emerald: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${toneClasses[tone]}`}>{children}</span>;
}

const mapStatusTone = (s?: ProductionStatus): "emerald" | "amber" | "rose" | "zinc" | "sky" => {
  if (s === "DONE") return "emerald";
  if (s === "CANCELLED") return "zinc";
  if (s === "PAUSED" || s === "QC_HOLD") return "rose";
  if (s === "IN_PROGRESS") return "sky";
  return "amber";
};

function Collapsible({ title, count, defaultOpen = true, children }:{
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl bg-white">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between p-3 text-sm font-semibold">
        <span className="flex items-center gap-2">{title}</span>
        <span className="flex items-center gap-2">
          {typeof count === "number" && (
            <span className="font-mono text-xs px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded-full">{count}</span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

// ---------- Estado / Reglas ----------
const canEditPlan = (s?: ProductionStatus) => s === "PLANNED" || s == null;
const canStart    = (s?: ProductionStatus) => s === "PLANNED";
const canPause    = (s?: ProductionStatus) => s === "IN_PROGRESS";
const canResume   = (s?: ProductionStatus) => s === "PAUSED";
const canFinish   = (s?: ProductionStatus) => s === "IN_PROGRESS" || s === "PAUSED";
const isClosedLike = (s?: ProductionStatus) => s === "DONE" || s === "CANCELLED";

// ---------- Cálculos y helpers ----------
const toTime = (s?: string) => {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? t : 0;
};

function computeTheoretical(bom: RecipeBom, qty: number, itemsMap: Map<string, Item>) {
  const lines = (bom.items || []).filter((l:any) => (l.role ?? "FORMULA") !== "COST_ONLY");
  return lines.map((l:any) => ({
    itemId: l.itemId,
    itemName: itemsMap.get(l.itemId)?.name ?? l.itemId,
    qty: +(Number(l.qty || 0) * Number(qty || 0)).toFixed(3),
    uom: (l.uom || "unit") as Uom,
  }));
}

function picksToRealLines(picks: Array<{itemId:string; lotNumber:string; qty:number; uom:string; locationId: string}>): RealLine[] {
  const bucket = new Map<string, RealLine>();
  for (const p of picks) {
    const k = `${p.itemId}|${p.lotNumber}|${p.uom}`;
    const cur = bucket.get(k) ?? { itemId: p.itemId, lotNumber: p.lotNumber, qty: 0, uom: p.uom as Uom, fromLocationId: p.locationId };
    cur.qty = +(cur.qty + Number(p.qty || 0)).toFixed(3);
    bucket.set(k, cur);
  }
  return [...bucket.values()];
}


// ---------- Panel de Disponibilidad ----------
function StockCheckPanel({
  bom, qty, items, onHand, onReadyChange, shortagesOut, requiredLotsOut
}:{
  bom: RecipeBom; qty: number; items: Item[];
  onHand: OnHandView[];
  onReadyChange: (ok:boolean)=>void;
  shortagesOut: (s: Array<{itemId:string; itemName:string; missing:number; uom:Uom}>)=>void;
  requiredLotsOut: (r: Array<{itemId:string; lotNumber:string; qty:number; uom:string; locationId: string}>)=>void;
}) {
  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const theory = useMemo(() => computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);

  const { shortages, picks } = useMemo(() => {
    const byItem = new Map<string, any[]>();
    for (const r of onHand) {
      if (!byItem.has(r.itemId)) byItem.set(r.itemId, []);
      byItem.get(r.itemId)!.push(r);
    }
    for (const rows of byItem.values()) {
      rows.sort((a,b)=> toTime(a.receivedAt || a.createdAt) - toTime(b.receivedAt || b.createdAt));
    }
    const shortages: Array<{itemId:string; itemName:string; missing:number; uom:Uom}> = [];
    const picks: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom, locationId: string}> = [];
    for (const t of theory) {
      let remain = t.qty;
      const rows = byItem.get(t.itemId) ?? [];
      for (const r of rows) {
        if (remain <= 0) break;
        const take = Math.min(Number(r.qty) || 0, remain);
        if (take > 0 && r.lotNumber) {
          picks.push({ itemId: t.itemId, lotNumber: r.lotNumber, qty: +take.toFixed(3), uom: t.uom, locationId: r.locationId });
          remain = +(remain - take).toFixed(3);
        }
      }
      if (remain > 1e-6) shortages.push({ itemId: t.itemId, itemName: itemsMap.get(t.itemId)?.name ?? t.itemId, missing: +remain.toFixed(3), uom: t.uom });
    }
    return { shortages, picks };
  }, [theory, onHand, itemsMap]);

  useEffect(() => {
    onReadyChange(shortages.length === 0);
    shortagesOut(shortages);
    requiredLotsOut(picks);
  }, [shortages, picks, onReadyChange, shortagesOut, requiredLotsOut]);

  return (
    <div className="border rounded-lg p-3 bg-zinc-50">
      <h4 className="text-sm font-semibold mb-3">Disponibilidad y lotes de insumo</h4>
      {shortages.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
          <b>Faltantes:</b> {shortages.map(s => `${s.itemName}: ${s.missing} ${s.uom}`).join(" · ")}
        </div>
      )}
      <div className="text-xs">
        <div className="grid grid-cols-[1fr,90px,90px] font-semibold mb-1">
          <span>Material</span><span className="text-right">Req.</span><span className="text-right">Propuesto</span>
        </div>
        {theory.map((line) => {
          const proposed = picks.filter(p => p.itemId === line.itemId).reduce((s,p)=>s+p.qty,0);
          return (
            <div key={line.itemId} className="grid grid-cols-[1fr,90px,90px] items-start py-0.5">
              <span>{line.itemName}</span>
              <span className="text-right font-mono">{line.qty} {line.uom}</span>
              <span className={`text-right font-mono ${proposed>=line.qty?'text-emerald-700':'text-rose-700'}`}>
                {+proposed.toFixed(3)} {line.uom}
              </span>
              <div className="col-span-3 text-[11px] text-zinc-600 mt-0.5">
                {picks.filter(p=>p.itemId===line.itemId).map(p=>(
                  <span key={`${p.itemId}-${p.lotNumber}`} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded border bg-white">
                    {p.lotNumber} · {p.qty} {p.uom}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ---------- Página Principal (Refactorizada) ----------
export default function ProductionExecutionPage() {
  const router = useRouter();
  const { data } = useData();
  const items = data?.items ?? [];
  const onHand = data?.onHand ?? [];
  const recipes = (data?.billOfMaterials ?? []) as RecipeBom[];
  const ordersRaw = (data?.productionOrders ?? []) as ProductionOrder[];
  
  const itemsMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const activeOrders = useMemo(() => ordersRaw.filter(o => o.status !== "DONE" && o.status !== "CANCELLED"), [ordersRaw]);

  // ==== Estado Centralizado y Único ====
  const [activeForm, setActiveForm] = useState<ActiveOrderForm | null>(null);
  const [isPending, startTransition] = useTransition();

  // Función para actualizar el estado de forma segura
  const setFormValue = useCallback((field: keyof ActiveOrderForm, value: any) => {
    setActiveForm(form => form ? ({ ...form, [field]: value }) : null);
  }, []);
  
  const onReadyChange = useCallback((ok: boolean) => setFormValue('stockOk', ok), [setFormValue]);
  const shortagesOut = useCallback((s: ActiveOrderForm['shortages']) => setFormValue('shortages', s), [setFormValue]);
  const requiredLotsOut = useCallback((r: ActiveOrderForm['requiredLots']) => {
      setFormValue('requiredLots', r);
  }, [setFormValue]);

  const openPlanningFromBom = useCallback((bom: RecipeBom) => {
    const outputItem = itemsMap.get(bom.outputItemId);
    setActiveForm({
        order: null,
        planningBom: bom,
        responsibleId: "",
        finalOutput: {
            itemId: bom.outputItemId,
            sku: outputItem?.sku,
            qty: 1, // Cantidad por defecto
            uom: (bom.stage === "ENVASADO" ? "unit" : "L"),
            toLocationId: 'FG/MAIN'
        },
        realConsumption: [],
        journal: [],
        incidentText: "",
        incidentSeverity: 'LOW',
        protocolChecks: [false, false, false, false],
        stockOk: false,
        shortages: [],
        requiredLots: [],
    });
  }, [itemsMap]);

  const openExecution = useCallback((order: ProductionOrder) => {
    const outputItem = itemsMap.get(order.outputItemId);
    setActiveForm({
        order: order as LocalProductionOrder,
        planningBom: null,
        responsibleId: (order as any).responsibleId ?? "",
        finalOutput: (order as any).finalOutputs?.[0] ?? {
            itemId: order.outputItemId,
            sku: outputItem?.sku,
            qty: order.targetQuantity,
            uom: order.baseUnit,
            toLocationId: 'FG/MAIN'
        },
        realConsumption: [],
        journal: (order as any).journal ?? [],
        incidentText: "",
        incidentSeverity: 'LOW',
        protocolChecks: [false, false, false, false],
        stockOk: true,
        shortages: (order as any).shortages ?? [],
        requiredLots: (order as any).reservations ?? [],
    });
  }, [itemsMap]);

  const hasShortagesFor = (o: ProductionOrder) => {
    const bom = recipes.find(b => b.id === (o as any).bomId);
    if (!bom) return false;
    const theory = computeTheoretical(bom, ((o as any).targetQuantity ?? 1), itemsMap);
    const byItem = new Map<string, number>();
    (onHand as any[]).forEach(r => {
      const q = Number(r.qty) || 0;
      byItem.set(r.itemId, +(((byItem.get(r.itemId) ?? 0) + q).toFixed(3)));
    });
    return theory.some(t => (byItem.get(t.itemId) ?? 0) + 1e-6 < t.qty);
  };
  
  const handleUpdateStatus = (status: 'IN_PROGRESS' | 'PAUSED' | 'CANCELLED') => {
      if (!activeForm?.order) return;
      if (status === 'CANCELLED' && !confirm('¿Cancelar la orden? Esta acción no se puede deshacer.')) return;
      startTransition(async () => {
          const res = await updateProductionOrderStatus({ orderId: activeForm.order!.id, status, responsibleId: activeForm.responsibleId });
          if(res.ok) {
              toast.success(`Orden ${status === 'CANCELLED' ? 'cancelada' : 'actualizada'}`);
              setActiveForm(null); // Limpia el formulario
              router.refresh();
          } else {
              toast.error(res.message);
          }
      });
  }

  const handleFinish = () => {
    if (!activeForm?.order) return;
    if (activeForm.finalOutput.qty <= 0) {
      toast.error("La cantidad final de producción debe ser mayor a cero.");
      return;
    }
    if (!confirm("¿Finalizar y cerrar la orden? Se crearán movimientos de stock.")) return;

    startTransition(async () => {
      const res = await completeProductionOrder({
        orderId: activeForm.order!.id,
        finalConsumptions: activeForm.realConsumption,
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

  const handleAddIncident = async () => {
    if (!activeForm?.order || !activeForm.incidentText.trim()) return;
    startTransition(async () => {
      const r = await addIncident({
        orderId: activeForm.order!.id,
        severity: activeForm.incidentSeverity,
        summary: activeForm.incidentText.trim(),
      });
      if (r.ok) {
        setFormValue('journal', [...(activeForm.journal || []), {id: `inc_${r.data.incidentId ?? Date.now()}`, at: new Date().toISOString(), kind:'INCIDENT', summary: activeForm.incidentText.trim()}]);
        setFormValue('incidentText', '');
        toast.success("Incidencia registrada");
      } else {
        toast.error(r.message ?? 'Error al añadir incidencia');
      }
    });
  };
  
  const handleProgram = () => {
    if (!activeForm?.planningBom) return;
    const planQty = (activeForm.finalOutput)?.qty ?? 1;
    if (planQty <= 0) { toast.error("La cantidad debe ser mayor que cero."); return; }

    startTransition(async ()=>{
      const r = await planProduction({
        bomId: activeForm.planningBom!.id,
        qty: planQty,
        plannedDate: activeForm.order?.scheduledFor,
        reservations: activeForm.requiredLots,
        idempotencyKey: crypto.randomUUID()
      });
      if (r.ok) {
        toast.success("Orden planificada");
        setActiveForm(null);
        router.refresh();
      } else {
        toast.error(r.message ?? "No se pudo planificar");
      }
    });
  };

  // Derivación de estado: siempre se calcula en cada render a partir de la fuente de verdad (`activeForm`)
  const activeBom = activeForm?.planningBom ?? (activeForm?.order ? recipes.find(b => b.id === (activeForm.order as any).bomId) : undefined);
  const orderIsLocked = activeForm?.order ? isClosedLike(activeForm.order.status) : false;
  
  const missingForStart = useMemo(()=>{
    const msgs:string[] = [];
    if (!activeForm?.order) return [];
    if (!activeForm.responsibleId.trim()) msgs.push("Responsable obligatorio.");
    if (!activeForm.protocolChecks.some(Boolean)) msgs.push("Debes marcar al menos un check de protocolos.");
    return msgs;
  }, [activeForm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna Izquierda (Listas) */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        <Collapsible title="Planificar nueva orden" count={recipes.length} defaultOpen>
          <ul className="divide-y">
            {recipes.map(b=>(
              <li key={b.id}>
                <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={()=>openPlanningFromBom(b)}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.name}</span>
                    <Badge tone="sky">BOM</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    <FactoryIcon className="inline h-3 w-3 mr-1" />
                    {b.stage === "ENVASADO" ? "Envasado" : "Producción"}
                  </p>
                </button>
              </li>
            ))}
            {recipes.length===0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay recetas.</li>}
          </ul>
        </Collapsible>
        <Collapsible title="Órdenes activas" count={activeOrders.length} defaultOpen>
          <ul className="divide-y">
            {activeOrders.map(o=>{
              const warn = hasShortagesFor(o);
              return (
                <li key={o.id}>
                  <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={()=>openExecution(o)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {o.orderNumber ?? o.name ?? `Orden ${o.id.slice(-4)}`} {warn && <span className="ml-1 text-rose-600 font-bold">‼️</span>}
                      </span>
                      <Badge tone={mapStatusTone(o.status)}>{o.status}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {(recipes.find(b=>b.id === (o as any).bomId)?.stage === "ENVASADO" ? "Envasado" : "Producción")} · {(o as any).scheduledFor ? new Date((o as any).scheduledFor).toLocaleDateString('es-ES') : "-"}
                    </p>
                  </button>
                </li>
              );
            })}
            {activeOrders.length===0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay órdenes activas.</li>}
          </ul>
        </Collapsible>
      </div>

      {/* Panel Central y Derecha (Formulario Activo) */}
      <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!activeForm ? (
            <div className="lg:col-span-3 flex items-center justify-center h-96 bg-zinc-50 rounded-xl">
                <p className="text-zinc-500">Selecciona una receta para planificar o una orden activa para ejecutar.</p>
            </div>
        ) : (
            <>
                {/* Columna Central (2/3) */}
                <div className="lg:col-span-2 space-y-4">
                  <SBCard title={<div className="flex items-center gap-2"><Calendar/><span>Planificación / Ejecución de orden</span></div>}>
                    <div className="p-4 space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                        <p className="font-bold font-mono text-base">
                          {activeForm?.order?.orderNumber ?? activeForm?.order?.name ?? activeBom?.name ?? "Nueva orden"}
                        </p>
                        <p><b>Etapa:</b> {(activeBom)?.stage ?? "-"}</p>
                        {activeForm?.order?.status && (<p><b>Status:</b> <Badge tone={mapStatusTone(activeForm.order.status)}>{activeForm.order.status}</Badge></p>)}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <Input type="number" className="mt-1 w-full" value={activeForm.finalOutput.qty || 1} readOnly={!canEditPlan(activeForm?.order?.status)} onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, qty: Number(e.target.value) || 0} )} />
                          <Input type="date" className="mt-1 w-full" value={activeForm?.order?.scheduledFor?.slice(0, 10) || new Date().toISOString().slice(0, 10)} readOnly={!canEditPlan(activeForm?.order?.status)} onChange={e => setFormValue('order', {...activeForm?.order, scheduledFor: e.target.value} )} />
                      </div>
                      
                      {activeBom ? (
                        <StockCheckPanel bom={activeBom} qty={activeForm.finalOutput.qty || 1} items={items} onHand={onHand}
                          onReadyChange={onReadyChange}
                          shortagesOut={shortagesOut}
                          requiredLotsOut={requiredLotsOut} />
                      ) : (
                        <div className="border rounded-lg p-3 text-sm text-zinc-500">Selecciona una receta u orden.</div>
                      )}
                      
                      <div className="flex justify-end"><button className="text-xs px-2 py-1 rounded border bg-white hover:bg-zinc-50" onClick={() => setFormValue('realConsumption', picksToRealLines(activeForm.requiredLots || []))} disabled={!activeForm.requiredLots.length}>Usar propuesta en Consumo REAL</button></div>
                      
                      <Collapsible title="Consumo Real" count={activeForm.realConsumption.length}>
                        <div className="p-3 space-y-2">
                           {(activeForm.realConsumption || []).map((line, i) => (
                            <div key={`${line.itemId}-${line.lotNumber}`} className="grid grid-cols-[1.5fr_1fr_0.8fr_auto] gap-2 items-center">
                              <span className="text-sm font-medium">{itemsMap.get(line.itemId)?.name}</span>
                              <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded-full">{line.lotNumber}</span>
                              <Input
                                type="number"
                                value={line.qty}
                                onChange={(e) => {
                                  const newConsumption = [...activeForm.realConsumption];
                                  newConsumption[i].qty = Number(e.target.value);
                                  setFormValue('realConsumption', newConsumption);
                                }}
                                disabled={orderIsLocked}
                              />
                               <span className="text-xs text-zinc-500">{line.uom}</span>
                            </div>
                           ))}
                           {activeForm.realConsumption.length === 0 && <p className="text-xs text-zinc-500 text-center py-2">Usa la propuesta o añade líneas manualmente.</p>}
                        </div>
                      </Collapsible>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(!activeForm.order && activeForm.planningBom) && <SBButton className="bg-blue-600 text-white" onClick={handleProgram} disabled={isPending}><Play size={16}/> Programar producción</SBButton>}
                        {(activeForm.order && canStart(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending || missingForStart.length > 0}><Play size={16}/> Iniciar</SBButton>}
                        {(activeForm.order && canPause(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('PAUSED')} disabled={isPending}><Pause size={16}/> Pausar</SBButton>}
                        {(activeForm.order && canResume(activeForm.order.status)) && <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending}><Play size={16}/> Reanudar</SBButton>}
                        {(activeForm.order && canFinish(activeForm.order.status)) && <SBButton className="bg-emerald-600 text-white" onClick={handleFinish} disabled={isPending}><CheckCircle size={16}/> Finalizar</SBButton>}
                        {activeForm.order && <SBButton variant="destructive" onClick={() => handleUpdateStatus('CANCELLED')} disabled={isClosedLike(activeForm.order?.status) || isPending}><XCircle size={16}/> Cancelar</SBButton>}
                      </div>
                      
                      {(missingForStart.length > 0 && activeForm.order?.status === 'PLANNED') && (
                        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs space-y-1">
                          {missingForStart.map((m,i)=><div key={`ms-${i}`}>• {m}</div>)}
                        </div>
                      )}
                    </div>
                  </SBCard>
                </div>
                {/* Columna Derecha (1/3) */}
                <div className="lg:col-span-1 space-y-4">
                  <SBCard title="Control de orden">
                    {activeForm && <div className="p-4 space-y-3">
                      <div className="p-3 bg-zinc-50 border rounded-lg text-sm">
                        <div className="font-mono">SKU: <b>{ itemsMap.get(activeForm.finalOutput?.itemId ?? "")?.name ?? "-" }</b></div>
                        <div className="font-mono">LOTE: <b>{ activeForm.finalOutput.lotNumber ?? "-" }</b></div>
                      </div>
                      <Input placeholder="Nombre responsable" value={activeForm.responsibleId ?? ''} onChange={e=>setFormValue('responsibleId', e.target.value)} readOnly={orderIsLocked} />
                      <div className="grid grid-cols-2 gap-2 text-sm">{activeForm.protocolChecks.map((v,i)=>(<label key={i} className="flex items-center gap-2"><input type="checkbox" checked={v} onChange={()=> setFormValue('protocolChecks', activeForm.protocolChecks.map((c,ci)=> i===ci?!c:c))} disabled={orderIsLocked}/>Protocolos OK</label>))}</div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Input type="number" value={activeForm.finalOutput.qty} onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, qty: Number(e.target.value) || 0})} readOnly={orderIsLocked}/>
                        <Input placeholder="Ej. LFG-2509-01" value={activeForm.finalOutput.lotNumber ?? ""} onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, lotNumber: e.target.value})} readOnly={orderIsLocked} />
                      </div>
                    </div>}
                  </SBCard>
                  <SBCard title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/><span>Incidencias</span></div>}>
                    <div className="p-4 space-y-3">
                      <textarea className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Descripción breve..." value={activeForm.incidentText || ''} onChange={e=>setFormValue('incidentText', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending} />
                      <div className="flex items-center gap-2">
                        <Select value={activeForm.incidentSeverity || 'LOW'} onChange={e=>setFormValue('incidentSeverity', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending}>
                          <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option>
                        </Select>
                        <SBButton className="bg-amber-600 text-white" onClick={handleAddIncident} disabled={!activeForm.order || orderIsLocked || isPending || !activeForm.incidentText.trim()}><AlertTriangle size={16}/> Añadir incidencia</SBButton>
                      </div>
                      <div className="mt-2 border-t pt-2 max-h-40 overflow-y-auto">
                        <ul className="space-y-2">
                            {(activeForm.journal || []).filter(j => j.kind === 'INCIDENT').slice().reverse().map((inc) => {
                              const m = inc.summary?.match(/^\[(LOW|MEDIUM|HIGH)\]\s*(.*)$/i);
                              const sev = (m?.[1]?.toUpperCase?.() as "LOW"|"MEDIUM"|"HIGH"|undefined) ?? "LOW";
                              const text = m ? m[2] : inc.summary;
                              const tone = sev === "HIGH" ? "rose" : sev === "MEDIUM" ? "amber" : "zinc";
                              return (
                                <li key={inc.id} className="rounded-md border bg-white p-2">
                                  <div className="flex items-center justify-between"><Badge tone={tone}>{sev}</Badge><span className="text-[10px] text-zinc-500 font-mono">{inc.at ? new Date(inc.at).toLocaleString('es-ES') : ""}</span></div>
                                  <p className="mt-1 text-xs text-zinc-800">{text}</p>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    </div>
                  </SBCard>
                </div>
            </>
        )}
      </div>
    </div>
  );
}