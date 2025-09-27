// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, Trash2, Calendar } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial, ProductionOrder, Item, Uom, CalcRow, CalcResult } from "@/domain/ssot";
import {
  planProduction, startProduction, pauseProduction, resumeProduction,
  closeProduction, cancelProduction, toggleProtocolsAcknowledged,
  setOperatorsCount, addIncident, recordConsumption, setCalculatorInput,
} from "@/app/(app)/production/actions";
import { SBScaffold, SBCardBox, SBBtn } from "@/components/sb-funda/SBScaffold";

// ===== Helpers UI =====
const ACCENT: "produc" = "produc";
const mono = "font-mono tabular-nums";

function StatusBadge({ status }: { status?: ProductionOrder["status"] }) {
  const cls =
    status === "PLANNED" ? "bg-sky-100 text-sky-700 ring-sky-200" :
    status === "IN_PROGRESS" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
    status === "PAUSED" ? "bg-amber-100 text-amber-800 ring-amber-200" :
    status === "QC_HOLD" ? "bg-purple-100 text-purple-700 ring-purple-200" :
    status === "CLOSED" ? "bg-zinc-100 text-zinc-700 ring-zinc-200" :
    status === "CANCELLED" ? "bg-rose-100 text-rose-700 ring-rose-200" :
    "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return <span className={`px-2 py-0.5 text-[11px] rounded-full ring-1 ${cls}`}>{status ?? "—"}</span>;
}

function SpinnerButton(props: React.ComponentProps<typeof SBBtn> & { loading?: boolean }) {
  const { loading, children, ...rest } = props;
  return (
    <SBBtn {...rest} disabled={loading || rest.disabled} className="relative">
      {loading && <span className="absolute inset-0 grid place-items-center"><span className="h-4 w-4 border-2 border-current border-b-transparent rounded-full animate-spin" /></span>}
      <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
    </SBBtn>
  );
}

// ====== Workstation (misma lógica, nueva composición) =======================
function ProductionWorkstation({
  order, bom, onRefresh, onPlanned, allItems, allBoms,
}: {
  order: ProductionOrder | null;
  bom: BillOfMaterial | null;
  onRefresh: () => void;
  onPlanned: (orderId: string) => void;
  allItems: Item[];
  allBoms: BillOfMaterial[];
}) {
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState<number>(1);
  const [date, setDate] = useState<string>("");
  const [ack, setAck] = useState<boolean>(false);
  const [ops, setOps] = useState<number>(0);
  const [incidentSummary, setIncidentSummary] = useState<string>("");
  const [actuals, setActuals] = useState<NonNullable<ProductionOrder["actuals"]>>([]);
  const [calcRows, setCalcRows] = useState<CalcRow[]>([]);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const itemById = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
  const workstationBom = useMemo(() => (order ? allBoms.find(b => b.id === order.bomId) ?? null : bom), [order, bom, allBoms]);
  const outputItem = useMemo(() => (workstationBom ? itemById.get(workstationBom.outputItemId) ?? null : null), [workstationBom, itemById]);

  const inferredStage: "PRODUCCION" | "ENVASADO" | "DESCONOCIDA" = useMemo(() => {
    if (!outputItem) return "DESCONOCIDA";
    if ((outputItem as any).category === "intermediate") return "PRODUCCION";
    if ((outputItem as any).category === "fg") return "ENVASADO";
    return "DESCONOCIDA";
  }, [outputItem]);

  useEffect(() => {
    setQty(order?.targetQuantity ?? 1);
    setDate(order?.scheduledFor ?? "");
    setAck(Boolean(order?.checks?.find(c => c.id === "prot")?.done));
    setOps((order as any)?.operatorsCount ?? 0);

    if (order?.actuals?.length) {
      setActuals(order.actuals);
    } else if (workstationBom) {
      const scale = (q: number) => (q * (order?.targetQuantity ?? qty ?? 1)) / (workstationBom.batchSize || 1);
      setActuals(
        workstationBom.items.map(c => ({
          itemId: c.itemId,
          theoreticalQty: scale(c.qty || 0),
          actualQty: 0,
          uom: c.uom as Uom,
        }))
      );
    } else {
      setActuals([]);
    }

    setIncidentSummary("");
    setCalcRows([]);
    setCalcResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, workstationBom]);

  useEffect(() => {
    if (!calcRows.length || !order?.id) { setCalcResult(null); return; }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await setCalculatorInput(order!.id, { raws: calcRows });
        if ((res as any)?.ok) setCalcResult((res as any).data?.calcResult ?? null);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [calcRows, order?.id]);

  if (!order && !bom) {
    return (
      <SBCardBox accentTone={ACCENT} title="Puesto de trabajo" subtitle="Selecciona una receta para planificar o una orden para ejecutar">
        <div className="grid place-content-center min-h-[40vh] text-center text-zinc-600">
          <FactoryIcon className="mx-auto mb-4 text-zinc-300" size={40}/>
          <p>Sin selección.</p>
        </div>
      </SBCardBox>
    );
  }

  const isExecuting = !!order;
  const bomToUse = workstationBom!;
  const hasShortages = (order?.shortages?.length ?? 0) > 0;
  const canStart = ack && !hasShortages;

  const doAndRefresh = (fn: () => Promise<any>) =>
    startTransition(async () => { await fn(); onRefresh(); });

  const handlePlan = () =>
    startTransition(async () => {
      const res = await planProduction({
        bomId: bomToUse.id, plannedQty: qty, plannedDate: date || undefined, name: bomToUse.name,
      } as any);
      if ((res as any)?.ok) onPlanned((res as any).data.id);
    });

  const stageHint =
    inferredStage === "PRODUCCION"
      ? "Etapa: PRODUCCIÓN — insumos raw + intermediate. Salida: intermediate."
      : inferredStage === "ENVASADO"
      ? "Etapa: ENVASADO — insumos intermediate + pack. Salida: fg."
      : "Etapa no inferida por categoría del output.";

  const updateActual = (idx: number, v: number) =>
    setActuals(rows => rows.map((r, i) => (i === idx ? { ...r, actualQty: Number.isFinite(v) ? v : 0 } : r)));

  const recordNow = () => {
    const payload = actuals.map(a => ({ itemId: a.itemId, uom: a.uom, qty: a.actualQty, role: "FORMULA" as const }));
    doAndRefresh(() => recordConsumption(order!.id, payload));
  };

  return (
    <SBCardBox
      accentTone={ACCENT}
      title={order?.id ? (bomToUse?.name ?? order.id) : (bomToUse?.name ?? "Puesto de trabajo")}
      subtitle={order?.id ? <>Orden: <span className="font-medium">{order.id}</span></> : "Planificación de lote"}
      right={order?.status && <StatusBadge status={order.status} />}
    >
      {/* Subcabecera — cantidad, fecha, etapa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Cantidad ({bomToUse.baseUnit})</label>
          <input type="number" value={qty} onChange={(e)=>setQty(Number(e.target.value))}
                 disabled={isExecuting}
                 className={`w-full h-10 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sb-accent-produc)/0.45)] ${mono}`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Fecha prevista</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
                   disabled={isExecuting}
                   className="w-full h-10 pl-9 pr-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sb-accent-produc)/0.45)]" />
          </div>
        </div>
        <div className="text-sm text-zinc-600 flex items-end">{stageHint}</div>
      </div>

      {/* Acciones por estado (alineado a BOM: botones ligeros) */}
      {order && (
        <div className="flex flex-wrap gap-2 py-2">
          {order.status === "PLANNED" && (
            <>
              <SpinnerButton variant="solid" tone={ACCENT} loading={pending} disabled={!canStart}
                onClick={()=>doAndRefresh(()=>startProduction(order.id))}>Iniciar</SpinnerButton>
              <SpinnerButton variant="danger" loading={pending}
                onClick={()=>doAndRefresh(()=>cancelProduction(order.id))}>Cancelar</SpinnerButton>
            </>
          )}
          {order.status === "IN_PROGRESS" && (
            <>
              <SpinnerButton variant="ghost" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>pauseProduction(order.id))}>Pausar</SpinnerButton>
              <SpinnerButton variant="solid" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>closeProduction(order.id))}>Finalizar</SpinnerButton>
            </>
          )}
          {order.status === "PAUSED" && (
            <>
              <SpinnerButton variant="solid" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>resumeProduction(order.id))}>Reanudar</SpinnerButton>
              <SpinnerButton variant="ghost" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>closeProduction(order.id))}>Finalizar</SpinnerButton>
            </>
          )}
        </div>
      )}

      {/* === Sección: Materiales (igual patrón visual BOM) === */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-800">Parte de Producción (Materiales)</h3>
          {isExecuting && (
            <SpinnerButton variant="ghost" tone={ACCENT} loading={pending} onClick={recordNow}>Guardar consumo</SpinnerButton>
          )}
        </div>

        <div className="hidden md:grid grid-cols-[1.2fr,0.8fr,0.6fr,0.6fr,0.5fr] text-xs font-semibold text-zinc-600 px-3 py-2">
          <div>Material</div><div>Categoría / Rol</div><div className="text-right">Teórico</div><div className="text-right">Real</div><div>UoM</div>
        </div>

        <div className="rounded-xl border overflow-hidden">
          {bomToUse.items.map((c, i) => {
            const item = itemById.get(c.itemId);
            const theoretical = ((c.qty || 0) * (order?.targetQuantity ?? qty ?? 1)) / (bomToUse.batchSize || 1);
            return (
              <div key={c.itemId} className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr,0.6fr,0.6fr,0.5fr] items-center px-3 py-2 border-t first:border-t-0 odd:bg-white even:bg-zinc-50/60">
                <div className="py-1">
                  <div className="font-medium text-zinc-900">{item?.name ?? c.itemId}</div>
                  <div className="text-[11px] text-zinc-500">{c.itemId}</div>
                </div>
                <div className="text-sm text-zinc-700">{(item as any)?.category ?? "-"} · <span className="uppercase">{c.role ?? "FORMULA"}</span></div>
                <div className={`text-right text-sm text-zinc-700 ${mono}`}>{theoretical.toFixed(3)}</div>
                <div className="md:text-right">
                  {isExecuting ? (
                    <input
                      type="number"
                      className={`w-full md:w-28 h-9 px-2 rounded-lg border text-right focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sb-accent-produc)/0.45)] ${mono}`}
                      placeholder="0"
                      value={actuals[i]?.actualQty ?? 0}
                      onChange={(e) => updateActual(i, Number(e.target.value))}
                    />
                  ) : <span className="text-zinc-400 text-sm">—</span>}
                </div>
                <div className="text-sm text-zinc-600">{c.uom}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === Sección: Calidad & Personal === */}
      {isExecuting && (
        <div className="grid md:grid-cols-2 gap-4 mt-6 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 mb-2">Calidad y Personal</h3>
            <label className="flex items-center gap-3 mb-3">
              <input type="checkbox" checked={ack} onChange={(e)=>doAndRefresh(()=>toggleProtocolsAcknowledged(order!.id, e.target.checked))} />
              He leído los protocolos.
            </label>
            <div className="flex items-end gap-2">
              <div className="grow max-w-[160px]">
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Operarios</label>
                <input type="number" value={ops} onChange={(e)=>setOps(Number(e.target.value))}
                       className={`w-full h-9 px-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sb-accent-produc)/0.45)] ${mono}`} />
              </div>
              <SpinnerButton variant="ghost" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>setOperatorsCount(order!.id, ops))}>
                Guardar operarios
              </SpinnerButton>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 mb-2">Incidencias</h3>
            <div className="flex items-center gap-2">
              <input
                value={incidentSummary}
                onChange={(e)=>setIncidentSummary(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sb-accent-produc)/0.45)]"
                placeholder="Añadir incidencia…"
              />
              <SpinnerButton variant="ghost" tone={ACCENT} loading={pending}
                onClick={()=>doAndRefresh(()=>addIncident(order!.id, { summary: incidentSummary, severity: "LOW" } as any))}>
                Añadir
              </SpinnerButton>
            </div>
          </div>
        </div>
      )}

      {/* === Sección: Calculadora (solo planificación) === */}
      {!isExecuting && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Calculadora de Ajustes</h3>
          <div className="space-y-2">
            {calcRows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-2 items-center">
                <input className="h-9 px-2 rounded-lg border" placeholder="Item ID" value={r.itemId}
                  onChange={(e)=>setCalcRows(rows=>rows.map((x,i)=>i===idx?{...x,itemId:e.target.value}:x))}/>
                <input type="number" className="h-9 px-2 rounded-lg border" placeholder="ABV %" value={r.abvPct ?? ""}
                  onChange={(e)=>setCalcRows(rows=>rows.map((x,i)=>i===idx?{...x,abvPct:Number(e.target.value)}:x))}/>
                <input type="number" className="h-9 px-2 rounded-lg border" placeholder="Acidez g/L" value={r.acidity_gpl ?? ""}
                  onChange={(e)=>setCalcRows(rows=>rows.map((x,i)=>i===idx?{...x,acidity_gpl:Number(e.target.value)}:x))}/>
                <input type="number" className="h-9 px-2 rounded-lg border" placeholder="Azúcar g/L" value={r.sugar_gpl ?? ""}
                  onChange={(e)=>setCalcRows(rows=>rows.map((x,i)=>i===idx?{...x,sugar_gpl:Number(e.target.value)}:x))}/>
                <input type="number" className="h-9 px-2 rounded-lg border" placeholder="Cantidad" value={r.qty ?? ""}
                  onChange={(e)=>setCalcRows(rows=>rows.map((x,i)=>i===idx?{...x,qty:Number(e.target.value)}:x))}/>
                <button onClick={()=>setCalcRows(rows=>rows.filter((_,i)=>i!==idx))}
                        className="h-9 w-9 grid place-content-center rounded-lg border hover:bg-red-50 text-zinc-500 hover:text-red-600">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
          <button onClick={()=>setCalcRows(rows=>[...rows,{ itemId:"", uom:"L" as Uom, qty:0 }])}
                  className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 mt-2">
            <Plus size={14}/> Añadir fila
          </button>
          {calcResult && (
            <div className="text-sm p-3 bg-zinc-50 rounded-lg border mt-3">
              <p>
                ABV: <b>{calcResult.estimatedAbvPct}%</b> · Acidez: <b>{calcResult.estimatedAcidity_gpl} g/L</b> · Azúcar: <b>{calcResult.estimatedSugar_gpl} g/L</b>
              </p>
            </div>
          )}
          <div className="mt-4">
            <SpinnerButton variant="solid" tone={ACCENT} onClick={handlePlan} className="w-full h-12 text-base font-semibold">Planificar producción</SpinnerButton>
          </div>
        </div>
      )}
    </SBCardBox>
  );
}

// ======================== PAGE =============================================
export default function ExecutionPage() {
  const { data, loadInitialData } = useData();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const openOrder = useMemo(() => (data?.productionOrders ?? []).find(o => o.id === openOrderId) ?? null, [data, openOrderId]);
  const openBom   = useMemo(() => (data?.billOfMaterials ?? []).find(b => b.id === openBomId) ?? null, [data, openBomId]);

  const selectOrder = useCallback((id: string) => { setOpenBomId(null); setOpenOrderId(id); }, []);
  const selectBom   = useCallback((id: string) => { setOpenOrderId(null); setOpenBomId(id); }, []);
  const handlePlanned = (orderId: string) => { loadInitialData?.(); selectOrder(orderId); };

  // Sidebar BOM-like
  const sidebar = (
    <div className="space-y-4">
      <SBCardBox title="Planificar nueva orden">
        <div className="p-1 space-y-1">
          {(data?.billOfMaterials ?? []).map(b => (
            <button key={b.id} onClick={()=>selectBom(b.id)}
              className={`w-full text-left p-2 rounded-md transition-colors text-sm font-medium ${
                openBomId === b.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
              }`}>
              {b.name}
            </button>
          ))}
        </div>
      </SBCardBox>

      <SBCardBox title="Órdenes activas">
        <div className="p-1 space-y-1">
          {(data?.productionOrders ?? [])
            .filter(o => o.status !== "CLOSED" && o.status !== "CANCELLED")
            .map(o => (
              <button key={o.id} onClick={()=>selectOrder(o.id)}
                className={`w-full text-left p-2 rounded-md transition-colors text-sm ${
                  openOrderId === o.id ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}>
                <span className="font-mono">{o.id}</span> — <span className="font-semibold">{o.status}</span>
              </button>
            ))}
        </div>
      </SBCardBox>
    </div>
  );

  return (
    <SBScaffold
      module="produc"
      title="Producción"
      subtitle="Puesto de trabajo — estilo unificado BOM"
      headerRight={
        <SBBtn variant="solid" tone="produc" onClick={()=>openBomId && selectBom(openBomId)}>
          Nueva orden
        </SBBtn>
      }
      sidebar={sidebar}
      density="compact"
    >
      <ProductionWorkstation
        order={openOrder}
        bom={openBom}
        onRefresh={()=>loadInitialData?.()}
        onPlanned={handlePlanned}
        allItems={data?.items ?? []}
        allBoms={data?.billOfMaterials ?? []}
      />
    </SBScaffold>
  );
}
