// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import {
  Play, Pause, CheckCircle2, XCircle, Factory as FactoryIcon, Calendar as CalendarIcon,
  ChevronDown, ClipboardList
} from "lucide-react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";

// Tipos SSOT
import type {
  Uom, Item, Lot, ProductionOrder, BillOfMaterial as RecipeBom, ProductionStatus, JournalEntry, OnHandView
} from "@/domain/ssot";

// Acciones (server)
import {
  planProduction, startProduction, pauseProduction, resumeProduction, closeProduction, cancelProduction, addIncident
} from "../actions";

// --------------------------- Helpers UI ---------------------------
function Badge({ children, tone = "zinc" }:{children:React.ReactNode; tone?: "zinc"|"sky"|"amber"|"rose"|"emerald"}) {
  const toneClasses = {
    zinc: "bg-zinc-100 text-zinc-800",
    sky: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    emerald: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${toneClasses[tone]}`}>{children}</span>;
}
function mapStatusTone(s: ProductionStatus) {
  if (s === "IN_PROGRESS") return "sky";
  if (s === "PLANNED") return "amber";
  if (s === "PAUSED") return "rose";
  if (s === "CLOSED" || s === "DONE") return "emerald";
  return "zinc" as const;
}
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

// --------------------------- Negocio ---------------------------
type RealLine = { itemId: string; qty: number; uom: Uom; lotNumber?: string };
type OutputReal = { qty: number; uom: Uom; lotNumber?: string };

const canEditPlan   = (s: ProductionStatus|undefined) => s === "PLANNED" || s == null;
const canEditReal   = (s: ProductionStatus|undefined) => s === "PLANNED" || s === "IN_PROGRESS" || s === "PAUSED";
const canStart      = (s: ProductionStatus|undefined) => s === "PLANNED";
const canPause      = (s: ProductionStatus|undefined) => s === "IN_PROGRESS";
const canResume     = (s: ProductionStatus|undefined) => s === "PAUSED";
const canFinish     = (s: ProductionStatus|undefined) => s === "IN_PROGRESS" || s === "PAUSED";
const isClosedLike  = (s: ProductionStatus|undefined) => s === "CLOSED" || s === "DONE" || s === "CANCELLED";

function computeTheoretical(bom: RecipeBom, qty: number, itemsMap: Map<string, Item>) {
  const lines = (bom.items || []).filter((l:any) => (l.role ?? "FORMULA") !== "COST_ONLY");
  return lines.map((l:any) => ({
    itemId: l.itemId,
    itemName: itemsMap.get(l.itemId)?.name ?? l.itemId,
    qty: +(Number(l.qty || 0) * Number(qty || 0)).toFixed(3),
    uom: (l.uom || "unit") as Uom,
    role: l.role,
  }));
}

// --------------------------- Panel Materiales (único) ---------------------------
function StockCheckPanel({
  bom, qty, items, onHand,
  real, onChangeReal,
  outputReal, onChangeOutputReal,
  status = "PLANNED",
  showAvailability = true,
}: {
  bom: RecipeBom; qty: number; items: Item[];
  onHand: Array<{ itemId: string; lotNumber: string; qty: number; uom: string; receivedAt?: string; createdAt?: string }>;
  real: RealLine[]; onChangeReal: (rows: RealLine[]) => void;
  outputReal: OutputReal; onChangeOutputReal: (val: OutputReal) => void;
  status?: ProductionStatus; showAvailability?: boolean;
}) {
  const itemsMap = useMemo(()=> new Map(items.map(i=>[i.id,i])), [items]);
  const theory = useMemo(()=> computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);

  // Propuesto FIFO (solo informativo: total + chips por lote)
  const proposedMap = useMemo(() => {
    const byItem = new Map<string, any[]>();
    onHand.forEach(r => { if (!byItem.has(r.itemId)) byItem.set(r.itemId, []); byItem.get(r.itemId)!.push(r); });
    byItem.forEach(list => list.sort((a,b)=> new Date(a.receivedAt||a.createdAt||0).getTime() - new Date(b.receivedAt||b.createdAt||0).getTime()));
    const map = new Map<string, { qty: number; lots: Array<{ lotNumber: string; qty: number; uom: Uom }> }>();
    for (const t of theory) {
      let remain = t.qty, taken = 0;
      const rows = byItem.get(t.itemId) ?? [];
      const lots: Array<{ lotNumber: string; qty: number; uom: Uom }> = [];
      for (const r of rows) {
        if (remain <= 0) break;
        const take = Math.min(Number(r.qty||0), remain);
        if (take > 0) { lots.push({ lotNumber: r.lotNumber, qty: +take.toFixed(3), uom: t.uom as Uom }); remain -= take; taken += take; }
      }
      map.set(t.itemId, { qty: +taken.toFixed(3), lots });
    }
    return map;
  }, [theory, onHand]);

  // Faltantes (una sola línea roja si aplica)
  const shortagesMsg = useMemo(()=>{
    if (!showAvailability) return "";
    const missing: string[] = [];
    for (const t of theory) {
      const prop = proposedMap.get(t.itemId)?.qty ?? 0;
      const miss = +(t.qty - prop).toFixed(3);
      if (miss > 1e-6) missing.push(`${itemsMap.get(t.itemId)?.name ?? t.itemId} (${miss} ${t.uom})`);
    }
    return missing.join(", ");
  }, [showAvailability, theory, proposedMap, itemsMap]);

  const canEdit = canEditReal(status);
  const upsertReal = (patch: RealLine) => {
    const next = [...real];
    const ix = next.findIndex(r => r.itemId === patch.itemId);
    if (ix >= 0) next[ix] = { ...next[ix], ...patch };
    else next.push(patch);
    onChangeReal(next);
  };

  const ReqPropHeader = () => (
    <div className="flex items-center justify-end gap-2 pr-0.5">
      <span className="text-right">Req.</span>
      <span className="w-1 h-1 rounded-full bg-zinc-300" />
      <span className="text-right">Propuesto</span>
    </div>
  );

  return (
    <div className="border rounded-lg p-3 bg-zinc-50">
      <h4 className="text-sm font-semibold mb-3">Disponibilidad y lotes de insumo</h4>

      <div className="grid grid-cols-[1fr,150px,140px,80px] font-semibold text-xs text-zinc-600 border-b pb-2 mb-2">
        <span className="pl-1">Material</span>
        <ReqPropHeader />
        <span>REAL</span>
        <span className="text-right pr-1">DIFF</span>
      </div>

      <div className="divide-y">
        {theory.map(t => {
          const itemName = itemsMap.get(t.itemId)?.name ?? t.itemId;
          const proposed = proposedMap.get(t.itemId)?.qty ?? 0;
          const propLots = proposedMap.get(t.itemId)?.lots ?? [];
          const realRow = real.find(r => r.itemId === t.itemId);
          const realQty = Number.isFinite(realRow?.qty as any) ? (realRow?.qty ?? 0) : 0;
          const realLot = realRow?.lotNumber ?? "";
          const diff = +(realQty - t.qty).toFixed(3);
          const diffTone = diff === 0 ? "text-emerald-700" : diff > 0 ? "text-amber-700" : "text-rose-700";

          return (
            <div key={t.itemId} className="grid grid-cols-[1fr,150px,140px,80px] items-start text-sm py-2 px-1 hover:bg-zinc-50 rounded-md">
              {/* Material + chips propuestos */}
              <div>
                <div className="truncate">{itemName}</div>
                <div className="mt-1">
                  {propLots.map(p => (
                    <span key={`${t.itemId}-${p.lotNumber}`} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded-lg border bg-zinc-100 text-[11px] font-mono">
                      {p.lotNumber} · {p.qty} {p.uom}
                    </span>
                  ))}
                </div>
              </div>

              {/* Req · Propuesto */}
              <div className="text-right font-mono pr-1">
                <div>{t.qty} {t.uom}</div>
                <div className="text-emerald-700">{proposed} {t.uom}</div>
              </div>

              {/* REAL (pill qty + lote) */}
              <div className="flex gap-2 items-center">
                <input
                  className="w-[85px] border rounded-full px-3 py-1 text-right font-mono bg-white"
                  type="number" step="0.01" min={0}
                  value={realQty}
                  onChange={e => {
                    const n = e.target.value === "" ? 0 : Number(e.target.value);
                    upsertReal({ itemId: t.itemId, qty: Number.isFinite(n) ? n : 0, lotNumber: realLot || undefined, uom: t.uom as Uom });
                  }}
                  disabled={!canEdit}
                />
                <input
                  className="w-[120px] border rounded-md p-1 font-mono bg-white"
                  placeholder="Lote real"
                  value={realLot}
                  onChange={e => upsertReal({ itemId: t.itemId, lotNumber: e.target.value, qty: realQty, uom: t.uom as Uom })}
                  disabled={!canEdit}
                />
              </div>

              {/* DIFF */}
              <div className={`text-right font-mono ${diffTone}`}>{diff}</div>
            </div>
          );
        })}

        {/* PRODUCCIÓN FINAL */}
        <div className="grid grid-cols-[1fr,150px,140px,80px] items-center text-sm py-2 px-1">
          <div className="font-semibold uppercase text-zinc-700">Producción final</div>
          <div className="text-right font-mono pr-1">
            <div>{qty} unit</div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="w-[85px] border rounded-full px-3 py-1 text-right font-mono bg-white"
              type="number" step="0.01" min={0}
              value={outputReal.qty ?? 0}
              onChange={e => {
                const n = e.target.value === "" ? 0 : Number(e.target.value);
                onChangeOutputReal({ ...outputReal, qty: Number.isFinite(n) ? n : 0 });
              }}
              disabled={!canEdit}
            />
            <input
              className="w-[120px] border rounded-md p-1 font-mono bg-white"
              placeholder="Lote final"
              value={outputReal.lotNumber ?? ""}
              onChange={e => onChangeOutputReal({ ...outputReal, lotNumber: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div />
        </div>
      </div>

      {showAvailability && shortagesMsg && (
        <p className="text-xs text-rose-600 mt-3">Faltan materiales: {shortagesMsg}</p>
      )}
    </div>
  );
}

// --------------------------- Bitácora ---------------------------
function JournalCard({ journal, onAdd, readOnly }:{
  journal: JournalEntry[]; onAdd: (text:string)=>void; readOnly?: boolean;
}) {
  const [draft, setDraft] = useState("");
  return (
    <SBCard title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Parte de producción (bitácora)</span>}>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-[1fr,120px] gap-2">
          <input
            className="border rounded-md p-2"
            placeholder="Resumen / nota rápida / incidencia"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={readOnly}
          />
          <SBButton onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }} disabled={readOnly || !draft.trim()}>
            Añadir
          </SBButton>
        </div>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {journal.length === 0 && <li className="text-sm text-zinc-500">Sin anotaciones.</li>}
          {journal.slice().reverse().map((j) => (
            <li key={j.id} className="text-sm">
              <span className="font-mono text-xs text-zinc-500">{new Date(j.at).toLocaleString("es-ES")}</span>{" — "}
              {j.summary}
            </li>
          ))}
        </ul>
      </div>
    </SBCard>
  );
}

// --------------------------- Panel derecho ---------------------------
function RightControlPanel({
  skuName, lot, startedAt, endedAt,
  responsible, setResponsible,
  checks, setChecks,
  notes, setNotes,
  kpis
}:{
  skuName: string; lot?: string; startedAt?: string; endedAt?: string;
  responsible: string; setResponsible: (v:string)=>void;
  checks: boolean[]; setChecks: (next:boolean[])=>void;
  notes: string; setNotes: (v:string)=>void;
  kpis: { rendimientoPct:number; mermaPct:number; costeEstimado:number; costeReal:number; botellasHora:number };
}) {
  return (
    <div className="border rounded-xl bg-white p-3 space-y-3">
      <div className="p-3 bg-zinc-50 border rounded-lg text-sm">
        <div className="font-mono">SKU: <b>{skuName || "-"}</b></div>
        <div className="font-mono">LOT: <b>{lot ?? "-"}</b></div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-emerald-700">FECHA INICIO {startedAt ? new Date(startedAt).toLocaleDateString('es-ES') : ""}</span>
          <span className="text-rose-700">FECHA FIN {endedAt ? new Date(endedAt).toLocaleDateString('es-ES') : ""}</span>
        </div>
      </div>

      <input
        className="w-full border rounded-md p-2" placeholder="Nombre responsable"
        value={responsible ?? ""} onChange={e=>setResponsible(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        {checks.map((v, i) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!v}
              onChange={() => {
                const next = [...checks]; next[i] = !next[i]; setChecks(next);
              }}
            />
            He leído los protocolos
          </label>
        ))}
      </div>

      <textarea
        className="w-full min-h-24 border rounded-md p-2"
        placeholder="REGISTRA TUS INCIDENCIAS"
        value={notes ?? ""} onChange={e=>setNotes(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="border rounded-lg p-2 bg-zinc-50">
          <div className="text-xs text-zinc-500">Rendimiento</div>
          <div className="font-semibold">{kpis.rendimientoPct}%</div>
        </div>
        <div className="border rounded-lg p-2 bg-zinc-50">
          <div className="text-xs text-zinc-500">Mermas</div>
          <div className="font-semibold">{kpis.mermaPct}%</div>
        </div>
        <div className="border rounded-lg p-2 bg-zinc-50">
          <div className="text-xs text-zinc-500">Coste estimado</div>
          <div className="font-semibold">{kpis.costeEstimado}</div>
        </div>
        <div className="border rounded-lg p-2 bg-zinc-50">
          <div className="text-xs text-zinc-500">Coste real</div>
          <div className="font-semibold">{kpis.costeReal}</div>
        </div>
        {/* Extra KPI sugerido */}
        <div className="border rounded-lg p-2 bg-zinc-50 col-span-2">
          <div className="text-xs text-zinc-500">Botellas / hora</div>
          <div className="font-semibold">{kpis.botellasHora}</div>
        </div>
      </div>
    </div>
  );
}

// --------------------------- Página ---------------------------
export default function ProductionExecutionPage() {
  const { data } = useData();
  const items: Item[] = data?.items ?? [];
  const onHand: OnHandView[] = data?.onHand ?? [];
  const recipes: RecipeBom[] = (data?.billOfMaterials ?? []) as any;
  const ordersRaw: ProductionOrder[] = (data?.productionOrders ?? []) as any;

  const itemsMap = useMemo(()=> new Map(items.map(i=>[i.id,i])), [items]);

  const activeOrders = useMemo(()=> ordersRaw.filter(o=> o.status !== "CANCELLED" && o.status !== "CLOSED" && o.status !== "DONE"), [ordersRaw]);

  // Selección
  const [planningBom, setPlanningBom] = useState<RecipeBom|null>(null);
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder|null>(null);

  // Plan
  const [planQty, setPlanQty] = useState<number>(1);
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().slice(0,10));

  // Real
  const [realConsumption, setRealConsumption] = useState<RealLine[]>([]);
  const [outputReal, setOutputReal] = useState<OutputReal>({ qty: 0, uom: "unit" as Uom });

  // Control panel
  const [responsible, setResponsible] = useState<string>("");
  const [checks, setChecks] = useState([false,false,false,false]);
  const [notes, setNotes] = useState("");

  // Bitácora
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  // Cargas
  const [isPendingProgram, startProgram] = useTransition();
  const [isPendingStart, startStart] = useTransition();
  const [isPendingFinish, startFinish] = useTransition();
  const [isPendingOther, startOther] = useTransition();

  const openPlanningFromBom = (bom: RecipeBom) => {
    setPlanningBom(bom);
    setCurrentOrder(null);
    setPlanQty(1);
    setPlanDate(new Date().toISOString().slice(0,10));
    setRealConsumption([]);
    setOutputReal({ qty: 0, uom: (bom.stage==="ENVASADO" ? "unit" : "L") as Uom });
    setResponsible("");
    setChecks([false,false,false,false]);
    setNotes("");
    setJournal([]);
  };

  const openExecution = (order: ProductionOrder) => {
    setCurrentOrder(order);
    setPlanningBom(null);
    setPlanQty(order.plannedQty ?? 1);
    setPlanDate(order.plannedDate?.slice(0,10) ?? new Date().toISOString().slice(0,10));
    setRealConsumption(((order as any).actuals ?? []) as RealLine[]);
    setOutputReal({ qty: (order as any)?.output?.[0]?.qty ?? 0, uom: ((order as any)?.output?.[0]?.uom ?? "unit") as Uom, lotNumber: (order as any)?.output?.[0]?.lotNumber });
    setResponsible((order as any).responsibleId ?? "");
    setChecks([false,false,false,false]);
    setNotes("");
    setJournal(((order as any).journal ?? []) as JournalEntry[]);
  };

  // PREVIEW faltantes por orden (para “‼️”)
  const hasShortagesFor = (o: ProductionOrder) => {
    const bom = recipes.find(b=> b.id === o.bomId);
    if (!bom) return false;
    const theory = computeTheoretical(bom, o.plannedQty ?? 1, itemsMap);
    const byItem = new Map<string, number>();
    onHand.forEach(r=> byItem.set(r.itemId, (byItem.get(r.itemId) ?? 0) + (r.qty ?? 0)));
    for (const t of theory) {
      const avail = byItem.get(t.itemId) ?? 0;
      if (avail + 1e-6 < t.qty) return true;
    }
    return false;
  };

  // Acciones
  const handleProgram = () => {
    if (!planningBom) return;
    startProgram(async () => {
      const r = await planProduction({
        bomId: planningBom.id,
        plannedQty: planQty,
        plannedDate: planDate,
      } as any);
      if ((r as any)?.ok) {
        toast.success("Orden planificada");
        // según tu action, puede devolver { id } únicamente; pedimos al usuario refrescar si no llega payload
        setPlanningBom(null);
      } else {
        toast.error((r as any)?.message ?? "No se pudo planificar");
      }
    });
  };

  const handleStart = () => {
    if (!currentOrder) return;
    if (!checks.some(Boolean) || !responsible) {
      toast.error("Debes aceptar protocolos (al menos uno) y asignar responsable.");
      return;
    }
    startStart(async () => {
      const r = await startProduction(currentOrder.id);
      if ((r as any)?.ok) {
        toast.success("Producción iniciada");
        setCurrentOrder({ ...currentOrder, status: "IN_PROGRESS", execution: { ...(currentOrder.execution||{}), startedAt: new Date().toISOString() } });
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Inicio de producción", kind: "START" } as any]);
      } else toast.error((r as any)?.message ?? "Error al iniciar");
    });
  };

  const handlePause = () => {
    if (!currentOrder) return;
    startOther(async () => {
      const r = await pauseProduction(currentOrder.id);
      if ((r as any)?.ok) {
        toast.message("Producción en pausa");
        setCurrentOrder({ ...currentOrder, status: "PAUSED" });
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Pausa", kind: "PAUSE" } as any]);
      } else toast.error((r as any)?.message ?? "No se pudo pausar");
    });
  };

  const handleResume = () => {
    if (!currentOrder) return;
    startOther(async () => {
      const r = await resumeProduction(currentOrder.id);
      if ((r as any)?.ok) {
        toast.success("Producción reanudada");
        setCurrentOrder({ ...currentOrder, status: "IN_PROGRESS" });
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Reanudación", kind: "RESUME" } as any]);
      } else toast.error((r as any)?.message ?? "No se pudo reanudar");
    });
  };

  const handleFinish = () => {
    if (!currentOrder) return;
    startFinish(async () => {
      const r = await closeProduction(currentOrder.id);
      if ((r as any)?.ok) {
        toast.success("Orden finalizada y archivada");
        setCurrentOrder({ ...currentOrder, status: "CLOSED", execution: { ...(currentOrder.execution||{}), finishedAt: new Date().toISOString() } });
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Cierre de orden", kind: "FINISH" } as any]);
      } else toast.error((r as any)?.message ?? "No se pudo finalizar");
    });
  };

  const handleCancel = () => {
    if (!currentOrder) return;
    if (!confirm("¿Cancelar la orden? Esta acción no se puede deshacer.")) return;
    startOther(async () => {
      const r = await cancelProduction(currentOrder.id);
      if ((r as any)?.ok) {
        toast.success("Orden cancelada");
        setCurrentOrder(null);
      } else toast.error((r as any)?.message ?? "No se pudo cancelar");
    });
  };

  const handleAddJournal = (text: string) => {
    if (!currentOrder) { setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "NOTE" } as any]); return; }
    (async () => {
      const r = await addIncident(currentOrder.id, { severity: "LOW", summary: text });
      if ((r as any)?.ok) {
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "INCIDENT" } as any]);
        toast.success("Anotado en bitácora");
      } else {
        setJournal(j => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "NOTE" } as any]);
        toast.error("No se pudo registrar en server; guardada localmente.");
      }
    })();
  };

  // KPIs (ligeros)
  const kpis = useMemo(()=>{
    // calculamos con lo que tengamos (preview simple)
    const cost = (lines:RealLine[]) => lines.reduce((s,l)=> s + ((itemsMap.get(l.itemId)?.stdCost ?? 0)*(l.qty??0)), 0);
    const costeEstimado = cost(computeTheoretical(recipes.find(b=>b.id === (currentOrder?.bomId ?? planningBom?.id)) ?? ({} as any), currentOrder?.plannedQty ?? planQty, itemsMap) as any);
    const costeReal = cost(realConsumption);
    const theoTotal = computeTheoretical(recipes.find(b=>b.id === (currentOrder?.bomId ?? planningBom?.id)) ?? ({} as any), currentOrder?.plannedQty ?? planQty, itemsMap).reduce((s,t)=>s+t.qty,0);
    const realTotal = realConsumption.reduce((s,r)=>s+r.qty,0);
    const mermaPct = theoTotal>0 ? +(((theoTotal - realTotal)/theoTotal)*100).toFixed(1) : 0;
    const rendimientoPct = (outputReal.qty ?? 0) > 0 && (currentOrder?.plannedQty ?? planQty) > 0
      ? +(((outputReal.qty ?? 0) / (currentOrder?.plannedQty ?? planQty))*100).toFixed(1) : 0;
    // botella/h estimado si hay started/finished
    let botellasHora = 0;
    const started = currentOrder?.execution?.startedAt; const finished = currentOrder?.execution?.finishedAt;
    const fg = itemsMap.get(currentOrder?.outputItemId ?? "");
    if (started && finished && fg?.bottleMl && outputReal.qty) {
      const elapsedH = (new Date(finished).getTime() - new Date(started).getTime())/3600000;
      if (elapsedH>0) { const bottles = (outputReal.qty*1000)/fg.bottleMl; botellasHora = +(bottles/elapsedH).toFixed(1); }
    }
    return {
      rendimientoPct, mermaPct,
      costeEstimado: +costeEstimado.toFixed(2),
      costeReal: +costeReal.toFixed(2),
      botellasHora
    };
  }, [currentOrder, planningBom, planQty, itemsMap, realConsumption, outputReal]);

  // Render
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna izquierda: listas */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        <Collapsible title="Planificar nueva orden" count={recipes.length} defaultOpen>
          <ul className="max-h-56 overflow-y-auto divide-y">
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
          <ul className="max-h-56 overflow-y-auto divide-y">
            {activeOrders.map(o=>{
              const warn = hasShortagesFor(o);
              return (
                <li key={o.id}>
                  <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={()=>openExecution(o)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {o.name ?? `Orden ${o.id.slice(-4)}`} {warn && <span className="ml-1 text-rose-600 font-bold">‼️</span>}
                      </span>
                      <Badge tone={mapStatusTone(o.status)}>{o.status}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {(o.stage === "ENVASADO" ? "Envasado" : "Producción")} · {o.plannedDate ? new Date(o.plannedDate).toLocaleDateString('es-ES') : "-"}
                    </p>
                  </button>
                </li>
              );
            })}
            {activeOrders.length===0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay órdenes activas.</li>}
          </ul>
        </Collapsible>
      </div>

      {/* Columna central (panel único) + derecha (control) */}
      <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Centro: 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card cabecera plan/exec */}
          <SBCard title={<><CalendarIcon size={16}/><span>Planificación / Ejecución de orden</span></>}>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                <p className="font-bold font-mono text-base">
                  {currentOrder?.name ?? planningBom?.name ?? "Nueva orden"}
                </p>
                <p><b>Etapa:</b> {currentOrder?.stage ?? planningBom?.stage ?? "-"}</p>
                {currentOrder?.status && (<p><b>Status:</b> <Badge tone="sky">{currentOrder.status}</Badge></p>)}
              </div>

              {/* Inputs plan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Cantidad (lotes de receta)</label>
                  <input
                    type="number" className="mt-1 w-full border rounded-md p-2"
                    value={currentOrder?.plannedQty ?? planQty}
                    readOnly={!canEditPlan(currentOrder?.status)}
                    onChange={e=> canEditPlan(currentOrder?.status) ? setPlanQty(Number(e.target.value)||0) : void 0}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Fecha prevista</label>
                  <input
                    type="date" className="mt-1 w-full border rounded-md p-2"
                    value={currentOrder?.plannedDate?.slice(0,10) ?? planDate}
                    readOnly={!canEditPlan(currentOrder?.status)}
                    onChange={e=> canEditPlan(currentOrder?.status) ? setPlanDate(e.target.value) : void 0}
                  />
                </div>
              </div>

              {/* Panel único materiales */}
              { (planningBom || (currentOrder && recipes.find(b=>b.id===currentOrder.bomId))) ? (
                <StockCheckPanel
                  bom={planningBom ?? (recipes.find(b=>b.id===currentOrder!.bomId) as RecipeBom)}
                  qty={currentOrder?.plannedQty ?? planQty}
                  items={items}
                  onHand={onHand as any}
                  real={realConsumption}
                  onChangeReal={setRealConsumption}
                  outputReal={outputReal}
                  onChangeOutputReal={setOutputReal}
                  status={currentOrder?.status ?? "PLANNED"}
                  showAvailability={true}
                />
              ) : (
                <div className="border rounded-lg p-3 text-sm text-zinc-500">Selecciona una receta u orden.</div>
              )}

              {/* Botonera azul (estado) */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(!currentOrder && planningBom) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handleProgram} disabled={isPendingProgram}>
                    <Play size={16}/> Programar
                  </SBButton>
                )}
                {currentOrder && canStart(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handleStart} disabled={isPendingStart}>
                    <Play size={16}/> Iniciar producción
                  </SBButton>
                )}
                {currentOrder && canPause(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handlePause} disabled={isPendingOther}>
                    <Pause size={16}/> Pausar
                  </SBButton>
                )}
                {currentOrder && canResume(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handleResume} disabled={isPendingOther}>
                    <Play size={16}/> Reanudar
                  </SBButton>
                )}
                {currentOrder && canFinish(currentOrder.status) && (
                  <SBButton className="bg-blue-600 text-white" onClick={handleFinish} disabled={isPendingFinish}>
                    <CheckCircle2 size={16}/> Finalizar
                  </SBButton>
                )}
                {currentOrder && canEditPlan(currentOrder.status) && (
                  <SBButton variant="secondary" onClick={handleCancel} disabled={isClosedLike(currentOrder.status)}>
                    <XCircle size={16}/> Cancelar
                  </SBButton>
                )}
              </div>
            </div>
          </SBCard>

          {/* Bitácora siempre visible */}
          <JournalCard journal={journal} onAdd={handleAddJournal} readOnly={isClosedLike(currentOrder?.status)} />
        </div>

        {/* Derecha: control */}
        <div className="lg:col-span-1">
          <RightControlPanel
            skuName={ itemsMap.get(currentOrder?.outputItemId ?? planningBom?.outputItemId ?? "")?.name ?? "-" }
            lot={ (currentOrder as any)?.lotNumber ?? outputReal.lotNumber }
            startedAt={ currentOrder?.execution?.startedAt }
            endedAt={ currentOrder?.execution?.finishedAt }
            responsible={responsible}
            setResponsible={setResponsible}
            checks={checks}
            setChecks={setChecks}
            notes={notes}
            setNotes={setNotes}
            kpis={kpis}
          />
        </div>
      </div>
    </div>
  );
}
