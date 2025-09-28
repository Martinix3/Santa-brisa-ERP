
"use client";

import React, { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Pause, CheckCircle, XCircle,
  Factory as FactoryIcon, Calendar, ChevronDown, AlertTriangle
} from "lucide-react";
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";

// Tipos SSOT (no asumimos campos que no existan realmente en ProductionOrder)
import type {
  Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom, ProductionStatus, OnHandView
} from "@/domain/ssot";
import { JournalEntry } from "@/domain/ssot.common";

// Server actions (NUEVAS ACCIONES CENTRALIZADAS)
import {
  planProduction,
  updateProductionOrderStatus,
  completeProductionOrder,
  addIncident,
} from "../actions";

type LocalProductionOrder = ProductionOrder & {
  locked?: boolean;
  theory?: Array<{ itemId: string; qty: number; uom: Uom }>;
  real?: Array<{ itemId: string; qty: number; uom: Uom; lotNumber?: string }>;
  journal?: JournalEntry[];
};

// ---------- Helpers UI ----------
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

const mapStatusTone = (s?: ProductionStatus): "emerald" | "amber" | "rose" | "zinc" => {
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
type RealLine = { itemId: string; qty: number; uom: Uom; lotNumber: string };
type OutputReal = { itemId: string; qty: number; uom: Uom; lotNumber?: string; sku?:string };

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

function picksToRealLines(picks: Array<{itemId:string; lotNumber:string; qty:number; uom:string}>): RealLine[] {
  const bucket = new Map<string, RealLine>();
  for (const p of picks) {
    const k = `${p.itemId}|${p.lotNumber}|${p.uom}`;
    const cur = bucket.get(k) ?? { itemId: p.itemId, lotNumber: p.lotNumber, qty: 0, uom: p.uom as Uom };
    cur.qty = +(cur.qty + Number(p.qty || 0)).toFixed(3);
    bucket.set(k, cur);
  }
  return [...bucket.values()];
}

// ---------- Panel único: Material | Propuesto | REAL | DIFF ----------
function StockCheckPanel({
  bom, qty, items, onHand,
  onReadyChange, shortagesOut, requiredLotsOut
}:{
  bom: RecipeBom; qty: number; items: Item[];
  onHand: Array<{itemId:string; lotNumber?:string; qty:number; uom:string; receivedAt?:string; createdAt?:string; locationId?: string;}>;
  onReadyChange: (ok:boolean)=>void;
  shortagesOut: (s: Array<{itemId:string; itemName:string; missing:number; uom:Uom}>)=>void;
  requiredLotsOut: (r: Array<{itemId:string; lotNumber:string; qty:number; uom:string}>)=>void;
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
    const picks: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom}> = [];
    for (const t of theory) {
      let remain = t.qty;
      const rows = byItem.get(t.itemId) ?? [];
      for (const r of rows) {
        if (remain <= 0) break;
        const take = Math.min(Number(r.qty) || 0, remain);
        if (take > 0 && r.lotNumber) {
          picks.push({ itemId: t.itemId, lotNumber: r.lotNumber, qty: +take.toFixed(3), uom: t.uom });
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
    requiredLotsOut(picks as any);
  }, [shortages, picks, onReadyChange, shortagesOut, requiredLotsOut]);

  return (
    <div className="border rounded-lg p-3 bg-zinc-50">
      <h4 className="text-sm font-semibold mb-3">Disponibilidad y lotes de insumo</h4>

      {/* Banner de faltantes */}
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
              {/* Lotes sugeridos debajo */}
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

// ---------- Página ----------
export default function ProductionExecutionPage() {
  const router = useRouter();
  const { data } = useData();
  const items: Item[] = data?.items ?? [];
  const onHand: OnHandView[] = data?.onHand ?? [];
  const recipes: RecipeBom[] = (data?.billOfMaterials ?? []) as any;
  const ordersRaw: ProductionOrder[] = (data?.productionOrders ?? []) as any;

  const itemsMap = useMemo(()=> new Map(items.map(i=>[i.id,i])), [items]);
  const activeOrders = useMemo(
    () => ordersRaw.filter(o => o.status !== "DONE" && o.status !== "CANCELLED"),
    [ordersRaw]
  );

  // Selección
  const [planningBom, setPlanningBom] = useState<RecipeBom|null>(null);
  const [currentOrder, setCurrentOrder] = useState<LocalProductionOrder | null>(null);

  // Plan local
  const [planQty, setPlanQty] = useState<number>(1);
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [stockOk, setStockOk] = useState(true);
  const [shortages, setShortages] = useState<Array<{itemId:string; itemName:string; missing:number; uom:Uom}>>([]);
  const [requiredLots, setRequiredLots] = useState<Array<{itemId:string; lotNumber:string; qty:number; uom:string}>>([]);

  // Reales
  const [realConsumption, setRealConsumption] = useState<RealLine[]>([]);
  const [outputReal, setOutputReal] = useState<OutputReal>({ itemId: '', qty: 0, uom: "unit" });
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  // Control básico
  const [responsible, setResponsible] = useState("");
  const [protocolChecks, setProtocolChecks] = useState([false,false,false,false]);

  // Incidencias (panel nuevo)
  const [incidentText, setIncidentText] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<"LOW"|"MEDIUM"|"HIGH">("LOW");

  // Loading states
  const [isPending, startTransition] = useTransition();

  // Aperturas
  const openPlanningFromBom = (bom: RecipeBom) => {
    setPlanningBom(bom);
    setCurrentOrder(null);
    setPlanQty(1);
    setPlanDate(new Date().toISOString().slice(0,10));
    setRealConsumption([]);
    setOutputReal({ itemId: bom.outputItemId, sku: itemsMap.get(bom.outputItemId)?.sku, qty: 0, uom: (bom.stage === "ENVASADO" ? "unit" : "L") as any });
    setResponsible("");
    setProtocolChecks([false,false,false,false]);
    setJournal([]);
    setIncidentText("");
  };

  const openExecution = (order: ProductionOrder) => {
    setCurrentOrder(order as LocalProductionOrder);
    setPlanningBom(null);
    setPlanQty(((order as any).targetQuantity ?? (order as any).plannedQty ?? 1));
    setPlanDate((((order as any).scheduledFor ?? (order as any).plannedDate) ?? new Date().toISOString()).slice(0,10));
    setRealConsumption((((order as any).actuals ?? []) as RealLine[]).map(r=>({ ...r, qty: Number(r.qty)||0 })));
    const out = (order as any)?.output?.[0];
    setOutputReal({ itemId: order.outputItemId, sku: itemsMap.get(order.outputItemId)?.sku, qty: Number(out?.qty)||0, uom: (out?.uom ?? "unit") as any, lotNumber: out?.lotNumber });
    setResponsible((order as any).responsibleId ?? "");
    setProtocolChecks([false,false,false,false]);
    setJournal((order as any).journal ?? []);
    setIncidentText("");
  };

  // Shortages (para “‼️”)
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

  // Validaciones y avisos
  const missingForProgram = useMemo(()=>{
    const msgs:string[] = [];
    if (!planningBom) return [];
    if (planQty <= 0) msgs.push("Cantidad planificada debe ser > 0.");
    return msgs;
  }, [planningBom, planQty]);

  const missingForStart = useMemo(()=>{
    const msgs:string[] = [];
    if (!currentOrder) return [];
    if (!responsible.trim()) msgs.push("Responsable obligatorio.");
    if (!protocolChecks.some(Boolean)) msgs.push("Debes marcar al menos un check de protocolos.");
    return msgs;
  }, [currentOrder, responsible, protocolChecks]);

  const missingForFinish = useMemo(()=>{
    const msgs:string[] = [];
    if (!currentOrder) return [];
    if (!(outputReal.qty > 0)) msgs.push("Cantidad de producción final debe ser > 0.");
    return msgs;
  }, [currentOrder, outputReal]);

  // Actions
  const applyProposalToReal = useCallback(() => {
    setRealConsumption(picksToRealLines(requiredLots));
    toast.success("Propuesta aplicada al consumo real");
  }, [requiredLots]);

  const handleProgram = () => {
    if (!planningBom) return;
    if (missingForProgram.length) { toast.error("Revisa avisos para programar."); return; }
    startTransition(async ()=>{
      const r = await planProduction({
        bomId: planningBom.id,
        qty: planQty,
        plannedDate: planDate,
        reservations: requiredLots,
        idempotencyKey: crypto.randomUUID()
      });
      if ((r as any)?.ok) {
        toast.success("Orden planificada");
        setPlanningBom(null);
        router.refresh();
      } else {
        toast.error((r as any)?.message ?? "No se pudo planificar");
      }
    });
  };

  const handleUpdateStatus = (status: 'IN_PROGRESS' | 'PAUSED' | 'CANCELLED') => {
      if(!currentOrder) return;
      if (status === 'CANCELLED' && !confirm('¿Cancelar la orden? Esta acción no se puede deshacer.')) return;
      startTransition(async () => {
          const res = await updateProductionOrderStatus({ orderId: currentOrder.id, status, responsibleId: responsible });
          if(res.ok) {
              toast.success(`Orden ${status === 'CANCELLED' ? 'cancelada' : 'actualizada'}`);
              setCurrentOrder(o => o ? ({...o, status: res.data.order.status as any }) : null);
              if (status === 'CANCELLED') setCurrentOrder(null);
              router.refresh();
          } else {
              toast.error(res.message);
          }
      });
  }

  const handleFinish = () => {
    if (!currentOrder) return;
    if (!confirm("¿Finalizar y cerrar la orden? Se crearán movimientos de stock. Esta acción no se puede deshacer.")) return;
    if (missingForFinish.length) { toast.error("Revisa avisos para finalizar."); return; }
    startTransition(async ()=>{
      const r = await completeProductionOrder({
        orderId: currentOrder.id,
        finalConsumptions: realConsumption,
        finalOutputs: [outputReal]
      });
      if (r.ok) {
        toast.success("Orden finalizada");
        setCurrentOrder({ ...currentOrder, status: "DONE" as ProductionStatus });
        router.refresh();
      } else toast.error(r.message ?? "No se pudo finalizar");
    });
  };

  const handleAddIncident = async () => {
    if (!currentOrder) return;
    const text = incidentText.trim();
    if (!text) { toast.error("Describe la incidencia."); return; }
    startTransition(async () => {
      const r = await addIncident({
        orderId: currentOrder.id,
        severity: incidentSeverity,
        summary: text,
      });
      if ((r as any).ok) {
        setJournal(j => [
          ...j,
          { id: `inc_${(r.data as any).incidentId ?? Date.now()}`, at: new Date().toISOString(), kind: 'INCIDENT', summary: `[${incidentSeverity}] ${text}` } as JournalEntry
        ]);
        setIncidentText("");
        toast.success("Incidencia registrada");
        router.refresh();
      } else {
        toast.error((r as any).message ?? 'Error al añadir incidencia');
      }
    });
  };

  // Render
  const activeBom = planningBom ?? (currentOrder ? (recipes.find(b=> b.id === (currentOrder as any).bomId) as RecipeBom|undefined) : undefined);

  // Derivados panel incidencias
  const incidentEntries = (journal ?? []).filter(j => j.kind === 'INCIDENT');
  const orderIsLocked = isClosedLike(currentOrder?.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: sin límites de altura */}
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

      {/* Centro + derecha */}
      <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Centro: 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <SBCard title={<><Calendar/><span>Planificación / Ejecución de orden</span></>}>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                <p className="font-bold font-mono text-base">
                  {currentOrder?.orderNumber ?? currentOrder?.name ?? activeBom?.name ?? "Nueva orden"}
                </p>
                <p><b>Etapa:</b> {(activeBom)?.stage ?? "-"}</p>
                {currentOrder?.status && (<p><b>Status:</b> <Badge tone={mapStatusTone(currentOrder.status)}>{currentOrder.status}</Badge></p>)}
              </div>

              {/* Inputs del plan (siempre visibles, bloqueados según estado) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Cantidad (lotes de receta)</label>
                  <input
                    type="number" className="mt-1 w-full border rounded-md p-2"
                    value={planQty}
                    readOnly={!canEditPlan(currentOrder?.status)}
                    onChange={e=> setPlanQty(Number(e.target.value)||0)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Fecha prevista</label>
                  <input
                    type="date" className="mt-1 w-full border rounded-md p-2"
                    value={planDate}
                    readOnly={!canEditPlan(currentOrder?.status)}
                    onChange={e=> setPlanDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Panel de materiales */}
              {activeBom ? (
                <StockCheckPanel
                  bom={activeBom}
                  qty={planQty}
                  items={items}
                  onHand={onHand}
                  onReadyChange={setStockOk}
                  shortagesOut={setShortages}
                  requiredLotsOut={setRequiredLots}
                />
              ) : (
                <div className="border rounded-lg p-3 text-sm text-zinc-500">Selecciona una receta u orden.</div>
              )}

              {/* Volcar propuesta a REAL */}
              <div className="flex items-center justify-end">
                <button
                  className="text-xs px-2 py-1 rounded border bg-white hover:bg-zinc-50"
                  onClick={applyProposalToReal}
                  disabled={requiredLots.length === 0}
                >
                  Usar propuesta en Consumo REAL
                </button>
              </div>

              {/* Botonera azul (estado) */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(!currentOrder && planningBom) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handleProgram} disabled={isPending || missingForProgram.length > 0}>
                    <Play size={16}/> Programar producción
                  </SBButton>
                )}
                {currentOrder && canStart(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending || missingForStart.length > 0}>
                    <Play size={16}/> Iniciar
                  </SBButton>
                )}
                {currentOrder && canPause(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('PAUSED')} disabled={isPending}>
                    <Pause size={16}/> Pausar
                  </SBButton>
                )}
                {currentOrder && canResume(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isPending}>
                    <Play size={16}/> Reanudar
                  </SBButton>
                )}
                {currentOrder && canFinish(currentOrder.status) && (
                  <SBButton className="bg-emerald-600 text-white" onClick={handleFinish} disabled={isPending || missingForFinish.length > 0}>
                    <CheckCircle size={16}/> Finalizar
                  </SBButton>
                )}
                {currentOrder && (
                  <SBButton variant="destructive" onClick={() => handleUpdateStatus('CANCELLED')} disabled={isClosedLike(currentOrder?.status) || isPending}>
                    <XCircle size={16}/> Cancelar
                  </SBButton>
                )}
              </div>

              {/* Avisos contextuales */}
              {(missingForProgram.length || missingForStart.length || missingForFinish.length) > 0 && (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs space-y-1">
                  {missingForProgram.map((m,i)=><div key={`mp-${i}`}>• {m}</div>)}
                  {missingForStart.map((m,i)=><div key={`ms-${i}`}>• {m}</div>)}
                  {missingForFinish.map((m,i)=><div key={`mf-${i}`}>• {m}</div>)}
                </div>
              )}
            </div>
          </SBCard>
        </div>

        {/* Derecha: control + incidencias */}
        <div className="lg:col-span-1 space-y-4">
          <SBCard title="Control de orden">
            <div className="p-4 space-y-3">
              <div className="p-3 bg-zinc-50 border rounded-lg text-sm">
                <div className="font-mono">SKU: <b>{ itemsMap.get(outputReal?.itemId ?? "")?.name ?? "-" }</b></div>
                <div className="font-mono">LOT: <b>{ outputReal.lotNumber ?? "-" }</b></div>
              </div>

              <label className="text-xs font-medium">Responsable</label>
              <input
                className="w-full border rounded-md p-2"
                placeholder="Nombre responsable"
                value={responsible ?? ''}
                onChange={e=>setResponsible(e.target.value)}
                readOnly={isClosedLike(currentOrder?.status)}
              />

              {/* Checks de protocolos */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {protocolChecks.map((v,i)=>(
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={()=> {
                        const next = [...protocolChecks]; next[i] = !next[i]; setProtocolChecks(next);
                      }}
                      disabled={isClosedLike(currentOrder?.status)}
                    />
                    He leído los protocolos
                  </label>
                ))}
              </div>

              {/* Edición de salida real */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs font-medium">Salida (qty)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-md p-2"
                    value={outputReal.qty}
                    onChange={e => setOutputReal(o => ({ ...o, qty: Number(e.target.value) || 0 }))}
                    readOnly={isClosedLike(currentOrder?.status)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Lote final</label>
                  <input
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="Ej. LFG-2509-01"
                    value={outputReal.lotNumber ?? ""}
                    onChange={e => setOutputReal(o => ({ ...o, lotNumber: e.target.value }))}
                    readOnly={isClosedLike(currentOrder?.status)}
                  />
                </div>
              </div>
            </div>
          </SBCard>

          {/* ====== Panel de Incidencias ====== */}
          <SBCard title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/><span>Incidencias</span></div>}>
            <div className="p-4 space-y-3">
              {/* Alta de incidencia */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Nueva incidencia</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  placeholder="Descripción breve (qué, dónde, por qué, impacto)"
                  value={incidentText}
                  onChange={e=>setIncidentText(e.target.value)}
                  disabled={!currentOrder || orderIsLocked || isPending}
                />
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded-md p-2 text-xs"
                    value={incidentSeverity}
                    onChange={e=>setIncidentSeverity(e.target.value as any)}
                    disabled={!currentOrder || orderIsLocked || isPending}
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                  </select>
                  <SBButton
                    className="bg-amber-600 text-white"
                    onClick={handleAddIncident}
                    disabled={!currentOrder || orderIsLocked || isPending || !incidentText.trim()}
                  >
                    <AlertTriangle size={16}/> Añadir incidencia
                  </SBButton>
                </div>
              </div>

              {/* Listado de incidencias */}
              <div className="mt-2 border-t pt-2">
                {incidentEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No hay incidencias registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {incidentEntries.slice().reverse().map((inc) => {
                      // Esperamos formato "[SEVERITY] texto" en summary si viene del addIncident de arriba
                      const m = inc.summary?.match(/^\[(LOW|MEDIUM|HIGH)\]\s*(.*)$/i);
                      const sev = (m?.[1]?.toUpperCase?.() as "LOW"|"MEDIUM"|"HIGH"|undefined) ?? "LOW";
                      const text = m ? m[2] : inc.summary;
                      const sevTone = sev === "HIGH" ? "rose" : sev === "MEDIUM" ? "amber" : "zinc";
                      const sevClass = sevTone === "rose"
                        ? "bg-rose-100 text-rose-800"
                        : sevTone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-zinc-100 text-zinc-800";
                      return (
                        <li key={inc.id} className="rounded-md border bg-white p-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${sevClass}`}>{sev}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{inc.at ? new Date(inc.at).toLocaleString('es-ES') : ""}</span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-800">{text}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}
