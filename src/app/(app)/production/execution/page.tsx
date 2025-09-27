
// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition, useCallback } from "react";
import {
  Play, Pause, CheckCircle, XCircle, Factory as FactoryIcon, Calendar, ChevronDown,
  AlertTriangle, ClipboardList, Package, Timer, ListOrdered
} from "lucide-react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";

// Usa tipos reales del SSOT
import type {
  Uom,
  Item,
  Lot,
  ProductionOrder,
  BillOfMaterial as RecipeBom,
  ProductionStatus,
  JournalEntry,
  OnHandView,
} from "@/domain/ssot";


// ======= Acciones server (ajusta la ruta si difiere) =======
import {
  planProduction,
  startProduction,
  pauseProduction,
  resumeProduction,
  closeProduction,
  cancelProduction,
  addIncident,
} from "../actions";

type LocalProductionOrder = ProductionOrder & {
  locked?: boolean;
  theory?: Array<{ itemId: string; qty: number; uom: Uom }>;
  real?: Array<{ itemId: string; qty: number; uom: Uom; lotNumber?: string }>;
};


// ====================== Helpers UI ======================
function Collapsible({ title, count, defaultOpen = true, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold"
      >
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

function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) {
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
  if (s === "DONE") return "emerald";
  return "zinc" as const;
}

// ================== Cálculos negocio (teoría/stock) ==================
function computeTheoretical(bom: RecipeBom, qty: number, itemsMap: Map<string, Item>) {
  // qty es el multiplicador del batch
  const lines = (bom.items || []).filter((l:any) => (l.role ?? 'FORMULA') !== "COST_ONLY");
  return lines.map((l:any) => ({
    itemId: l.itemId,
    itemName: itemsMap.get(l.itemId)?.name ?? l.itemId,
    qty: +(l.qty * qty).toFixed(3),
    uom: l.uom,
    role: l.role,
  }));
}

function allocateFromLots(
  theory: Array<{ itemId: string; qty: number; uom: Uom; itemName?: string }>,
  onHand: Array<{itemId:string; lotNumber?:string; qty:number; uom:string; receivedAt?:string; createdAt?:string}>,
) {
    const byItem = new Map<string, any[]>();
    for (const r of onHand) {
      if (!byItem.has(r.itemId)) byItem.set(r.itemId, []);
      byItem.get(r.itemId)!.push(r);
    }
    for (const rows of byItem.values()) {
      rows.sort((a,b)=> new Date(a.receivedAt||a.createdAt||0).getTime() - new Date(b.receivedAt||b.createdAt||0).getTime());
    }
    const shortages: Array<{itemId:string; itemName:string; missing:number; uom:Uom}> = [];
    const picks: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom}> = [];
    for (const t of theory) {
      let remain = t.qty;
      const rows = byItem.get(t.itemId) ?? [];
      for (const r of rows) {
        if (remain <= 0) break;
        const take = Math.min(r.qty ?? 0, remain);
        if (take > 0) {
          picks.push({ itemId: t.itemId, lotNumber: r.lotNumber || '', qty: +take.toFixed(3), uom: t.uom });
          remain -= take;
        }
      }
      if (remain > 1e-6) shortages.push({ itemId: t.itemId, itemName: t.itemName || t.itemId, missing: +remain.toFixed(3), uom: t.uom });
    }
    return { shortages, picks };
}


function computeKPIs(order: LocalProductionOrder, itemsMap: Map<string, Item>) {
  // Rendimiento: (output real / teoría esperada output) * 100
  // Costes: suma teorías (estimado) vs suma reales (real) * costStd
  // Mermas: (consumo teórico - real consumo) en %
  // Botellas/hora: si FG y tiene bottleSizeMl, usar elapsed y qty output
  const theory = order.theory ?? [];
  const real = order.real ?? [];

  const sumBy = (arr: Array<{ itemId: string; qty: number }>) =>
    arr.reduce((acc, x) => acc + (x.qty || 0), 0);

  // estimado y real en coste
  let costEst = 0;
  let costReal = 0;
  for (const t of theory) {
    const it = itemsMap.get(t.itemId);
    costEst += (it?.stdCost || 0) * (t.qty || 0);
  }
  for (const r of real) {
    const it = itemsMap.get(r.itemId);
    costReal += (it?.stdCost || 0) * (r.qty || 0);
  }

  // mermas: consideramos sólo FORMULA (si hay metadata en theory)
  // Como no la conservamos aquí, aproximamos: si real<theory ⇒ merma
  const theoTotal = sumBy(theory);
  const realTotal = sumBy(real);
  let mermaPct = 0;
  if (theoTotal > 0) {
    mermaPct = ((theoTotal - realTotal) / theoTotal) * 100;
  }

  // rendimiento: si tenemos output real en order.real con item outputItemId
  const outputReal = real.find((x) => x.itemId === order.outputItemId)?.qty ?? 0;
  // teoría esperada para output ≈ plannedQty * 1 (si batch produce 1 unidad base)
  // Esto depende de tu modelado. Aquí usamos plannedQty como "unidades de salida base".
  const outputTheo = order.targetQuantity || 1;
  const rendimientoPct = outputTheo > 0 ? (outputReal / outputTheo) * 100 : 0;

  // botellas/hora: si FG y bottleSizeMl definido
  let botellasHora = 0;
  if (order.stage === "ENVASADO" && order.execution?.startedAt && order.execution?.finishedAt) {
    const elapsedHours = (new Date(order.execution.finishedAt).getTime() - new Date(order.execution.startedAt).getTime()) / 3600000;
    const fg = itemsMap.get(order.outputItemId);
    if (elapsedHours > 0 && fg?.bottleMl && outputReal > 0) {
      // si outputReal está en L, convertir a botellas (L -> mL / bottleSizeMl)
      // aquí asumimos UoM del output en L (ajusta si usas unit)
      const ml = outputReal * 1000;
      const bottles = ml / fg.bottleMl;
      botellasHora = bottles / elapsedHours;
    }
  }

  return {
    rendimientoPct: +rendimientoPct.toFixed(1),
    costeEstimado: +costEst.toFixed(2),
    costeReal: +costReal.toFixed(2),
    mermaPct: +mermaPct.toFixed(1),
    botellasHora: +botellasHora.toFixed(1),
  };
}

// ================== Componentes funcionales ==================
function StockCheckPanel({
  bom, qty, items, onHand, onReadyChange, shortagesOut, requiredLotsOut
}: {
  bom: RecipeBom; qty: number; items: Item[]; onHand: Array<{itemId:string; lotNumber?:string; qty:number; uom:string; receivedAt?:string; createdAt?:string}>;
  onReadyChange: (ok: boolean) => void;
  shortagesOut: (s: Array<{ itemId: string; itemName: string; missing: number; uom: Uom }>) => void;
  requiredLotsOut: (r: Array<{ itemId: string; lotNumber: string; qty: number; uom: Uom }>) => void;
}) {
  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const theory = useMemo(() => computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);
  
  const { shortages, picks } = useMemo(() => allocateFromLots(theory, onHand), [theory, onHand]);


  useEffect(() => {
    onReadyChange(shortages.length === 0);
    shortagesOut(shortages);
    requiredLotsOut(picks);
  }, [shortages, picks, onReadyChange, shortagesOut, requiredLotsOut]);

  return (
    <div className="border rounded-lg p-3 bg-zinc-50">
      <h4 className="text-sm font-semibold mb-2">Disponibilidad y lotes de insumo</h4>
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
      {shortages.length > 0 ? (
        <p className="text-xs text-rose-600 mt-2">Faltan materiales: {shortages.map(s => `${s.itemName} (${s.missing} ${s.uom})`).join(", ")}</p>
      ) : <p className="text-xs text-emerald-700 mt-2">OK — stock suficiente. Se propondrán reservas al programar.</p>}
    </div>
  );
}

function MaterialsEditor({
  bom, qty, real, onChange, readOnly
}: {
  bom: RecipeBom; qty: number;
  real: Array<{ itemId: string; qty: number; uom: Uom; lotNumber?: string }>;
  onChange: (rows: Array<{ itemId: string; qty: number; uom: Uom; lotNumber?: string }>) => void;
  readOnly?: boolean;
}) {
  const { data } = useData();
  const itemsMap = useMemo(() => new Map<string, Item>((data?.items || []).map(i => [i.id, i])), [data?.items]);
  const theory = useMemo(() => computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);

  // merge real con teoría para pintar filas
  const rows = useMemo(() => {
    return theory.map((t) => {
      const r = real.find((x) => x.itemId === t.itemId);
      return { ...t, realQty: r?.qty ?? 0, lotNumber: r?.lotNumber ?? '' };
    });
  }, [theory, real]);

  const setRealQty = (itemId: string, val: number) => {
    const next = [...real];
    const ix = next.findIndex((x) => x.itemId === itemId);
    if (ix >= 0) { next[ix] = { ...next[ix], qty: val }; }
    else { next.push({ itemId, qty: val, uom: theory.find(t => t.itemId === itemId)?.uom || "kg" }); }
    onChange(next);
  };

  const setLot = (itemId: string, lotNumber: string) => {
    const next = [...real];
    const ix = next.findIndex((x) => x.itemId === itemId);
    if (ix >= 0) { next[ix] = { ...next[ix], lotNumber }; }
    else { next.push({ itemId, qty: 0, uom: theory.find(t => t.itemId === itemId)?.uom || "kg", lotNumber }); }
    onChange(next);
  };

  return (
    <div className="border rounded-lg">
      <div className="grid grid-cols-[1fr,120px,120px,160px] px-3 py-2 text-xs font-semibold bg-zinc-50 rounded-t-lg">
        <span>Material</span>
        <span className="text-right">Teórico</span>
        <span className="text-right">Real</span>
        <span>Lote real</span>
      </div>
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.itemId} className="grid grid-cols-[1fr,120px,120px,160px] items-center px-3 py-2 text-sm">
            <span className="truncate">{r.itemName}</span>
            <span className="text-right font-mono">{r.qty} {r.uom}</span>
            <span className="text-right">
              <input
                type="number" step="0.01" min={0}
                className="border rounded-md p-1 w-[110px] text-right font-mono"
                value={r.realQty ?? ''}
                onChange={(e) => setRealQty(r.itemId, Number(e.target.value) || 0)}
                disabled={readOnly}
              />
            </span>
            <span>
              <input
                type="text"
                className="border rounded-md p-1 w-[150px] font-mono"
                placeholder="LT-YYYY-XX (opcional)"
                value={r.lotNumber ?? ''}
                onChange={(e) => setLot(r.itemId, e.target.value)}
                disabled={readOnly}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function JournalCard({
  journal, onAdd, readOnly
}: {
  journal: JournalEntry[];
  onAdd: (text: string) => void;
  readOnly?: boolean;
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

// ======================= Página principal =======================
export default function ProductionExecutionPage() {
  const { data } = useData();
  const items: Item[] = data?.items ?? [];
  const onHand: OnHandView[] = data?.onHand ?? [];
  const lots: Lot[] = data?.lots ?? [];
  const recipes: RecipeBom[] = (data?.billOfMaterials ?? []) as any;
  const ordersRaw: ProductionOrder[] = (data?.productionOrders ?? []) as any;

  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const activeOrders = useMemo(
    () => ordersRaw.filter((o) => o.status !== "DONE" && o.status !== "CANCELLED"),
    [ordersRaw]
  );

  // UI: selección
  const [planningBom, setPlanningBom] = useState<RecipeBom | null>(null);
  const [currentOrder, setCurrentOrder] = useState<LocalProductionOrder | null>(null);

  // Planificación
  const [planQty, setPlanQty] = useState<number>(1);
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [stockOk, setStockOk] = useState<boolean>(false);
  const [shortages, setShortages] = useState<Array<{ itemId: string; itemName: string; missing: number; uom: Uom }>>([]);
  const [requiredLots, setRequiredLots] = useState<Array<{ itemId: string; lotNumber: string; qty: number; uom: Uom }>>([]);

  // Ejecución (gating)
  const [protocolsAck, setProtocolsAck] = useState<boolean>(false);
  const [responsible, setResponsible] = useState<string>("");

  // Consumo real editable (se bloquea tras iniciar)
  const [realConsumption, setRealConsumption] = useState<Array<{ itemId: string; qty: number; uom: Uom; lotNumber?: string }>>([]);

  // Bitácora local (si el order trae, la copiamos y seguimos añadiendo)
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  // Pending states
  const [isPendingProgram, startProgramTransition] = useTransition();
  const [isPendingStart, startStartTransition] = useTransition();
  const [isPendingFinish, startFinishTransition] = useTransition();
  const [isPendingOther, startOtherTransition] = useTransition();
  const isPendingAny = isPendingProgram || isPendingStart || isPendingFinish || isPendingOther;

  // ======= Handlers selección =======
  const openPlanningFromBom = (bom: RecipeBom) => {
    setPlanningBom(bom);
    setCurrentOrder(null);
    setPlanQty(1);
    setPlanDate(new Date().toISOString().slice(0, 10));
    setShortages([]);
    setRequiredLots([]);
    setStockOk(false);
  };

  const openExecution = (order: ProductionOrder) => {
    setCurrentOrder(order);
    setPlanningBom(null);
    setProtocolsAck(false);
    setResponsible(order.responsibleId ?? "");
    setRealConsumption((order as LocalProductionOrder).actuals ?? []);
    setJournal((order as any).journal ?? []);
  };

  // ======= Programar =======
  const handleProgram = () => {
    if (!planningBom) return;
    const idempotencyKey = crypto.randomUUID();
    startProgramTransition(async () => {
      const r = await planProduction({
        bomId: planningBom.id,
        qty: planQty,
        plannedDate: planDate,
        reservations: requiredLots, // reserva sugerida
        idempotencyKey,
      } as any);
      if ((r as any)?.ok) {
        const newOrder: ProductionOrder = (r as any).data?.order ?? (r as any).order ?? null;
        if (newOrder) {
          toast.success("Orden planificada");
          setCurrentOrder(newOrder);
          setPlanningBom(null);
          setRealConsumption((newOrder as LocalProductionOrder).actuals ?? []); // si server devuelve snapshot
          setJournal((newOrder as any).journal ?? []);
        } else {
          toast.success("Orden planificada (sin payload). Refresca datos si no aparece.");
        }
      } else {
        toast.error((r as any)?.error ?? "No se pudo planificar");
      }
    });
  };

  const resetPlanning = () => {
    setPlanningBom(null);
  };

  // ======= Iniciar / Pausar / Reanudar / Finalizar / Cancelar =======
  const handleStart = () => {
    if (!currentOrder) return;
    if (!protocolsAck || !responsible) {
      toast.error("Debes aceptar protocolos y asignar responsable antes de iniciar.");
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    startStartTransition(async () => {
      const r = await startProduction({
        orderId: currentOrder.id,
        responsible,
        // al iniciar bloqueamos qty y fecha (lo hará el server), y anotación "START"
        idempotencyKey,
      } as any);
      if ((r as any)?.ok) {
        toast.success("Producción iniciada");
        const upd: ProductionOrder = (r as any).data?.order ?? currentOrder;
        // bloqueamos edición localmente
        setCurrentOrder({ ...upd, locked: true, status: "IN_PROGRESS" });
        setJournal([...((upd as any).journal ?? []), { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Inicio de producción", kind: "START" }]);
      } else {
        toast.error((r as any)?.error ?? "Error al iniciar");
      }
    });
  };

  const handlePause = () => {
    if (!currentOrder) return;
    const idempotencyKey = crypto.randomUUID();
    startOtherTransition(async () => {
      const r = await pauseProduction({ orderId: currentOrder.id, idempotencyKey});
      if ((r as any)?.ok) {
        toast.message("Producción en pausa");
        setCurrentOrder({ ...currentOrder, status: "PAUSED" });
        setJournal([...((currentOrder as any).journal ?? []), { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Pausa", kind: "PAUSE" }]);
      } else {
        toast.error((r as any)?.error ?? "No se pudo pausar");
      }
    });
  };

  const handleResume = () => {
    if (!currentOrder) return;
    const idempotencyKey = crypto.randomUUID();
    startOtherTransition(async () => {
      const r = await resumeProduction({ orderId: currentOrder.id, idempotencyKey });
      if ((r as any)?.ok) {
        toast.success("Producción reanudada");
        setCurrentOrder({ ...currentOrder, status: "IN_PROGRESS" });
        setJournal([...((currentOrder as any).journal ?? []), { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Reanudación", kind: "RESUME" }]);
      } else {
        toast.error((r as any)?.error ?? "No se pudo reanudar");
      }
    });
  };

  const confirmAndCancel = (orderId: string) => {
    if (!confirm("¿Cancelar la orden? Esta acción no se puede deshacer.")) return;
    const idempotencyKey = crypto.randomUUID();
    startOtherTransition(async () => {
      const r = await cancelProduction({ orderId, idempotencyKey });
      if ((r as any)?.ok) {
        toast.success("Orden cancelada");
        setCurrentOrder(null);
      } else {
        toast.error((r as any)?.error ?? "No se pudo cancelar");
      }
    });
  };

  const handleFinish = () => {
    if (!currentOrder) return;

    // Resumen final: mostramos un confirm con puntos clave (puedes reemplazar por modal real)
    const kpisPrev = computeKPIs(
      {
        ...currentOrder,
        real: realConsumption,
        execution: {
            ...currentOrder.execution,
            finishedAt: new Date().toISOString(),
            startedAt: currentOrder.execution?.startedAt ?? new Date(Date.now() - 3600000).toISOString(), // fallback 1h
        }
      },
      itemsMap
    );

    const resumen =
      `Vas a finalizar la orden.\n` +
      `Rendimiento: ${kpisPrev.rendimientoPct}%\n` +
      `Mermas: ${kpisPrev.mermaPct}%\n` +
      `Coste Estimado: ${kpisPrev.costeEstimado} vs Real: ${kpisPrev.costeReal}\n` +
      (currentOrder.stage === "ENVASADO" ? `Botellas/h: ${kpisPrev.botellasHora}\n` : "");

    if (!confirm(resumen + "\n¿Confirmar y registrar inventario?")) return;

    const idempotencyKey = crypto.randomUUID();
    startFinishTransition(async () => {
      const r = await closeProduction({
        orderId: currentOrder.id,
        realConsumption,
        // rectificación final de lotes/cantidades
        journal: [
          ...((currentOrder as any).journal ?? []),
          ...journal,
          { id: crypto.randomUUID(), at: new Date().toISOString(), summary: "Cierre de orden", kind: "FINISH" },
        ],
        idempotencyKey,
      } as any);
      if ((r as any)?.ok) {
        toast.success("Orden finalizada y archivada");
        const upd: ProductionOrder = (r as any).data?.order ?? { ...currentOrder, status: "DONE", execution: { ...currentOrder.execution, finishedAt: new Date().toISOString() } };
        setCurrentOrder(upd);
      } else {
        toast.error((r as any)?.error ?? "No se pudo finalizar");
      }
    });
  };

  // ======= Añadir nota/Incidencia a la bitácora =======
  const handleAddJournal = (text: string) => {
    if (!currentOrder) {
      // estamos en planificación, simplemente añadimos a local
      setJournal((j) => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "NOTE" }]);
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    startOtherTransition(async () => {
      const r = await addIncident({
        orderId: currentOrder.id,
        summary: text,
        severity: "LOW",
        idempotencyKey,
      });
      if ((r as any)?.ok) {
        const newEntry: JournalEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "INCIDENT" };
        setJournal((j) => [...j, newEntry]);
        toast.success("Anotado en bitácora");
      } else {
        // aunque falle server, mantenemos nota local
        setJournal((j) => [...j, { id: crypto.randomUUID(), at: new Date().toISOString(), summary: text, kind: "NOTE" }]);
        toast.error("No se pudo registrar la incidencia en server; guardada localmente.");
      }
    });
  };

  // KPI live cuando hay orden cerrada (o para mostrar preview al cerrar)
  const kpis = useMemo(() => {
    if (!currentOrder) return null;
    const base = { ...currentOrder, real: realConsumption };
    return computeKPIs(base, itemsMap);
  }, [currentOrder, realConsumption, itemsMap]);

  // ======= Render =======
  // Listas colapsables en la izquierda
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna izquierda: listas */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        <Collapsible title="Planificar nueva orden" count={recipes.length} defaultOpen>
          <ul className="max-h-56 overflow-y-auto divide-y">
            {recipes.map((b) => (
              <li key={b.id}>
                <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={() => openPlanningFromBom(b)}>
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
            {recipes.length === 0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay recetas.</li>}
          </ul>
        </Collapsible>

        <Collapsible title="En curso" count={activeOrders.length} defaultOpen>
          <ul className="max-h-56 overflow-y-auto divide-y">
            {activeOrders.map((o) => (
              <li key={o.id}>
                <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={() => openExecution(o)}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.name ?? `Orden ${o.id.slice(-4)}`}</span>
                    <Badge tone={mapStatusTone(o.status)}>{o.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {o.stage === "ENVASADO" ? "Envasado" : "Producción"} · {o.scheduledFor ? new Date(o.scheduledFor).toLocaleDateString() : "-"}
                  </p>
                </button>
              </li>
            ))}
            {activeOrders.length === 0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay órdenes activas.</li>}
          </ul>
        </Collapsible>
      </div>

      {/* Columna central + derecha: contenido */}
      <div className="lg:col-span-9 space-y-4">
        {/* Modo Planificación */}
        {planningBom && !currentOrder && (
          <SBCard
            title="Planificar Nueva Orden"
            accent="hsl(var(--sb-accent-produc))"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium">Receta base</label>
                  <p className="font-semibold">{planningBom.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium">Cantidad (lotes de receta)</label>
                  <input type="number" className="mt-1 w-full border rounded-md p-2" value={planQty} onChange={e => setPlanQty(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-medium">Fecha prevista</label>
                  <input type="date" className="mt-1 w-full border rounded-md p-2" value={planDate} onChange={e => setPlanDate(e.target.value)} />
                </div>
              </div>

              <StockCheckPanel bom={planningBom} qty={planQty} items={items} onHand={onHand} onReadyChange={setStockOk} shortagesOut={setShortages} requiredLotsOut={setRequiredLots} />

              <div className="flex justify-end gap-2">
                <SBButton variant="secondary" onClick={resetPlanning}>Cancelar</SBButton>
                <SpinnerButton onClick={handleProgram} disabled={isPendingAny} loading={isPendingProgram}>Programar producción</SpinnerButton>
              </div>
            </div>
          </SBCard>
        )}

        {/* Modo Ejecución */}
        {currentOrder && (
          <>
            <SBCard
              title={
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{currentOrder.name || 'Orden de Producción'}</span>
                  <Badge tone={mapStatusTone(currentOrder.status)}>{currentOrder.status}</Badge>
                </div>
              }
              accent="hsl(var(--sb-accent-produc))"
            >
              <div className="p-4 space-y-4">
                {/* Panel de estado y gating */}
                {(currentOrder.status === "PLANNED" || currentOrder.status === "RELEASED") && (
                  <div className="p-3 bg-zinc-50 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <input id="protocols-ack" type="checkbox" checked={protocolsAck} onChange={e => setProtocolsAck(e.target.checked)} />
                      <label htmlFor="protocols-ack" className="text-sm">Confirmo que he leído los protocolos de seguridad.</label>
                    </div>
                    <div>
                      <label htmlFor="responsible-id" className="text-sm">Responsable de producción</label>
                      <input id="responsible-id" value={responsible ?? ''} onChange={e => setResponsible(e.target.value)} className="w-full mt-1 border rounded-md p-2" placeholder="Tu nombre..." />
                    </div>
                  </div>
                )}
                
                {/* Botonera de acción principal */}
                <div className="flex flex-wrap gap-2">
                  {(currentOrder.status === 'PLANNED' || currentOrder.status === 'RELEASED') && <SpinnerButton onClick={handleStart} loading={isPendingStart} disabled={!protocolsAck || !responsible || isPendingAny}><Play size={16}/> Iniciar</SpinnerButton>}
                  {currentOrder.status === 'IN_PROGRESS' && <SpinnerButton onClick={handlePause} loading={isPendingOther} disabled={isPendingAny}><Pause size={16}/> Pausar</SpinnerButton>}
                  {currentOrder.status === 'PAUSED' && <SpinnerButton onClick={handleResume} loading={isPendingOther} disabled={isPendingAny}><Play size={16}/> Reanudar</SpinnerButton>}
                  {(currentOrder.status === 'IN_PROGRESS' || currentOrder.status === 'QC_HOLD') && <SpinnerButton onClick={handleFinish} loading={isPendingFinish} disabled={isPendingAny}><CheckCircle size={16}/> Finalizar</SpinnerButton>}
                  {currentOrder.status !== 'DONE' && currentOrder.status !== 'CANCELLED' && <SpinnerButton variant='destructive' onClick={() => confirmAndCancel(currentOrder.id)} loading={isPendingOther} disabled={isPendingAny}><XCircle size={16}/> Cancelar</SpinnerButton>}
                </div>
              </div>
            </SBCard>
            
            {/* Panel de consumo real */}
            <MaterialsEditor
              bom={recipes.find(b => b.id === currentOrder.bomId)!}
              qty={currentOrder.targetQuantity}
              real={realConsumption}
              onChange={setRealConsumption}
              readOnly={currentOrder.status !== "PLANNED" && currentOrder.status !== "RELEASED"}
            />
            
            <>
              {/* Bitácora — siempre visible, incidencias abiertas */}
              <JournalCard
                journal={journal}
                onAdd={handleAddJournal}
                readOnly={false}
              />
            </>
          </>
        )}

        {!planningBom && !currentOrder && (
          <div className="border-2 border-dashed rounded-xl h-[60vh] grid place-items-center text-zinc-500">
            Selecciona una receta para planificar o una orden en curso para ejecutar.
          </div>
        )}
      </div>
    </div>
  );
}
