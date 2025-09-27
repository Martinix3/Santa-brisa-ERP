
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, ListFilter, Pause, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { useData } from "@/lib/dataprovider";
import { SB_COLORS, type Item, type CalcRow, type CalcResult } from "@/domain/ssot";
import { toast } from "sonner";
import { Field } from "@/components/forms/Field";
import {
  planProduction,
  startProduction,
  pauseProduction,
  resumeProduction,
  setOperatorsCount,
  toggleProtocolsAcknowledged,
  recordConsumption,
  recordOutput,
  recordPackagingParent,
  setQcResult,
  addIncident,
  setCalculatorInput,
  closeProduction,
  cancelProduction,
  previewPlanning,
} from "../actions";


// ---- Aliases para evitar choques de tipos SSOT
type Uom = "L" | "kg" | "unit";
type ProductionOrderUI = any;
type BillOfMaterialUI = any;


// ===== Helpers compactos (no tocan estética global) =====
function SectionHeader({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-lg grid place-items-center ring-1 ring-black/5
                      bg-[hsl(var(--sb-accent-produc)/0.12)]
                      text-[hsl(var(--sb-accent-produc))]`}
        >
          {icon ?? <FactoryIcon size={16} />}
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="text-xs text-zinc-600">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmptyCenter({ onPickBom }: { onPickBom: () => void }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-100 text-zinc-700 grid place-items-center">
          <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-80"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-800">Nada abierto</h3>
        <p className="text-sm text-zinc-500 mt-1">Selecciona una orden a la izquierda o crea una nueva desde un BOM.</p>
        <div className="mt-4">
          <SpinnerButton onClick={onPickBom}>
            <Plus className="mr-2" size={16} /> Planificar desde BOM
          </SpinnerButton>
        </div>
      </div>
    </div>
  );
}

// ── Cabecera de control contextual de la ORDEN ───────────────────
// props esperadas: order {id,status,stage,plannedQty,baseUnit,shortages?,protocolsAcknowledged?,parentLotNumber?,lotNumber?}
// acciones importadas: startProduction, pauseProduction, resumeProduction, closeProduction, cancelProduction, planProduction
// util: toast, SpinnerButton (o Button)
function HeaderExecutionControls({
  order,
  canStartExtraCheck = true,   // por si quieres inyectar lógica adicional (p.ej. operarios > 0)
  onRefresh,
}: {
  order: any;
  canStartExtraCheck?: boolean;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  const status = order?.status as string;
  const isProd = order?.stage === "PRODUCCION";
  const hasShortages = (order?.shortages?.length ?? 0) > 0;
  const hasParentLotIfNeeded = isProd ? true : (order?.parentLotNumber ?? "").trim().length > 0;

  const canStart = status === "planned" || status === "PLANNED"
    ? !!order?.protocolsAcknowledged && !hasShortages && hasParentLotIfNeeded && canStartExtraCheck
    : false;

  const canPause = status === "wip" || status === "IN_PROGRESS";
  const canResume = status === "PAUSED" || status === "paused";
  const canFinish = canPause || canResume;
  const canCancel = status === "planned" || status === "PLANNED";

  const primaryLabel =
    status === "PLANNED" || status === "planned" ? "iniciar" :
    status === "IN_PROGRESS" || status === "wip" ? "pausa" :
    status === "PAUSED" || status === "paused" ? "reanudar" : "iniciar";

  const secondaryLabel =
    status === "PLANNED" || status === "planned" ? "cancelar" : "finalizar";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Botón principal */}
      <SpinnerButton
        loading={pending}
        disabled={
          (status === "PLANNED" || status === "planned") ? !canStart :
          (status === "IN_PROGRESS" || status === "wip") ? !canPause :
          (status === "PAUSED" || status === "paused") ? !canResume : false
        }
        onClick={() =>
          startTransition(async () => {
            let r;
            if (status === "PLANNED" || status === "planned") r = await startProduction(order.id);
            else if (status === "IN_PROGRESS" || status === "wip") r = await pauseProduction(order.id);
            else if (status === "PAUSED" || status === "paused") r = await resumeProduction(order.id);
            if (r?.ok) toast.success(primaryLabel);
            else toast.error(r?.message ?? "Acción no completada");
            onRefresh();
          })
        }
        className="sb-btn-primary min-w-[140px] capitalize"
      >
        {primaryLabel}
      </SpinnerButton>

      {/* Botón secundario */}
      <SpinnerButton
        loading={pending}
        disabled={(status !== "PLANNED" && status !== "planned") && !canFinish}
        onClick={() =>
          startTransition(async () => {
            let r;
            if (status === "PLANNED" || status === "planned") {
              r = await cancelProduction(order.id);
            } else {
              r = await closeProduction(order.id);
            }
            if (r?.ok) toast.success(secondaryLabel);
            else toast.error(r?.message ?? "Acción no completada");
            onRefresh();
          })
        }
        className="sb-btn-secondary min-w-[140px] capitalize"
      >
        {secondaryLabel}
      </SpinnerButton>

      {/* Badges informativos */}
      {hasShortages && (
        <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800">
          ⚠️ faltantes de material
        </span>
      )}
      {(status === "QC_HOLD" || status === "qc_hold") && (
        <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800">
          ⏸ en espera de QC
        </span>
      )}
      {order?.lotNumber && (
        <span className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-700">
          Lote salida: <b>{order.lotNumber}</b>
        </span>
      )}
    </div>
  );
}

// ── Sección Seguridad & Personal ─────────────────────────────────
// acciones: toggleProtocolsAcknowledged, setOperatorsCount
function SafetyAndPersonal({
  order,
  onRefresh,
}: {
  order: any;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [ack, setAck] = React.useState(!!order?.protocolsAcknowledged);
  const [ops, setOps] = React.useState<number>(order?.operatorsCount ?? 0);

  React.useEffect(() => {
    setAck(!!order?.protocolsAcknowledged);
    setOps(order?.operatorsCount ?? 0);
  }, [order?.protocolsAcknowledged, order?.operatorsCount]);

  return (
    <div className="rounded-xl border p-3 bg-white">
      <h3 className="text-base font-semibold">Seguridad y Personal</h3>
      <div className="mt-3 space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => {
              const v = e.target.checked;
              setAck(v);
              startTransition(async () => {
                const r = await toggleProtocolsAcknowledged(order.id, v);
                r?.ok ? toast.success(v ? "Protocolos confirmados" : "Protocolos desmarcados") : toast.error(r?.message ?? "Error");
                onRefresh();
              });
            }}
          />
          <span>He leído y cumplo los protocolos de Calidad para esta orden</span>
        </label>

        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm mb-1">N.º de operarios</label>
            <input
              type="number"
              min={0}
              className="w-32 h-10 px-3 rounded-lg border"
              value={ops}
              onChange={(e) => setOps(Number(e.target.value))}
            />
          </div>
          <SpinnerButton
            className="sb-btn-secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await setOperatorsCount(order.id, ops);
                r?.ok ? toast.success("Operarios guardados") : toast.error(r?.message ?? "Error");
                onRefresh();
              })
            }
          >
            Guardar
          </SpinnerButton>
        </div>
      </div>
    </div>
  );
}

// ── Sección Incidencias ──────────────────────────────────────────
// acción: addIncident(orderId, {severity, summary, details})
function IncidentsSection({ order, onRefresh }: { order: any; onRefresh: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [severity, setSeverity] = React.useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [summary, setSummary] = React.useState("");
  const [details, setDetails] = React.useState("");

  return (
    <div className="rounded-xl border p-3 bg-white">
      <h3 className="text-base font-semibold">Incidencias</h3>
      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-sm mb-1">Severidad</label>
          <select className="w-full h-10 px-3 rounded-lg border" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Resumen</label>
          <input className="w-full h-10 px-3 rounded-lg border" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm mb-1">Detalles</label>
          <textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border" value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <SpinnerButton
          className="sb-btn-secondary"
          disabled={!summary}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await addIncident(order.id, { severity, summary, details });
              r?.ok ? toast.success("Incidencia añadida") : toast.error(r?.message ?? "Error");
              setSummary(""); setDetails("");
              onRefresh();
            })
          }
        >
          Añadir incidencia
        </SpinnerButton>
      </div>

      <div className="text-sm opacity-80 mt-3">
        {(order?.incidents ?? []).length ? (
          <ul className="list-disc pl-6 space-y-1">
            {order.incidents.map((x: any) => (
              <li key={x.id}>
                <b>{x.severity}</b> · {x.summary} <span className="opacity-70">({x.at})</span>
              </li>
            ))}
          </ul>
        ) : (
          "Sin incidencias registradas."
        )}
      </div>
    </div>
  );
}


function PlanningBoard({ bom, allItems, allBoms, onBomChange, onPlanned }: { bom: any; allItems: Item[], allBoms: any[], onBomChange: (bomId: string) => void; onPlanned: (id: string) => void; }) {
    const [qty, setQty] = React.useState<number>(1);
    const [date, setDate] = React.useState<string>("");
    const [preview, setPreview] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [creating, setCreating] = React.useState(false);

    const itemsById = useMemo(() => new Map(allItems.map(it => [it.id, it])), [allItems]);
  
    // fórmula base
    const base = React.useMemo(() => {
      const raw = bom?.items ?? bom?.components ?? [];
      return (raw as any[]).map(c => ({
        itemId: c.itemId ?? c.sku ?? "—",
        name: itemsById.get(c.itemId)?.name || c.itemId,
        qty: c.qty ?? c.quantityPerBase ?? 0,
        uom: c.uom ?? "L",
      }));
    }, [bom, itemsById]);
  
    // preview simple (guard)
    const last = React.useRef<string>("");
    React.useEffect(() => {
      const payload = JSON.stringify({ bomId:bom?.id, plannedQty:qty });
      if (!bom?.id || qty<=0) { setPreview(null); last.current = payload; return; }
      if (payload===last.current) return;
      last.current = payload;
      setLoading(true);
      previewPlanning({ bomId:bom.id, plannedQty:qty }).then(res => setPreview(res?.ok? res.data : null)).finally(()=>setLoading(false));
    }, [bom?.id, qty]);
  
    async function handlePlan() {
      setCreating(true);
      const r = await planProduction({ bomId:bom.id, plannedQty:qty, plannedDate: date||undefined, name:bom.name });
      setCreating(false);
      if (r?.ok) { toast.success("Planificada"); onPlanned(r.data.id); } else { toast.error(r?.message ?? "No se pudo planificar"); }
    }
  
    const accent = SB_COLORS.primary.teal;

    return (
      <div className="rounded-xl border p-3 bg-white">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
                <label className="block text-sm mb-1">Receta a producir</label>
                <select className="w-full h-10 px-3 rounded-lg border" value={bom?.id || ''} onChange={(e) => onBomChange(e.target.value)}>
                    <option value="" disabled>Selecciona una receta...</option>
                    {allBoms.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm mb-1">Cantidad a producir ({bom?.baseUnit ?? "u"})</label>
                <input type="number" min={1} className="w-full h-10 px-3 rounded-lg border" value={qty} onChange={e=>setQty(Number(e.target.value))}/>
            </div>
            <div>
                <label className="block text-sm mb-1">Fecha prevista</label>
                <input type="date" className="w-full h-10 px-3 rounded-lg border" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
        </div>
  
        <div className="mt-4">
          <h4 className="font-medium">Materiales Requeridos</h4>
          <div className="mt-2 rounded-lg border">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-xs text-zinc-500">
              <span>Componente</span><span>Cant. Teórica</span><span>Cant. Real</span>
            </div>
            <div className="divide-y">
              {base.map((c,i)=>(
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 items-center">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-[11px] text-zinc-500">Lot: <b>SB-NAoT</b></div>
                  </div>
                  <div className="text-sm tabular-nums">{(c.qty||0)*qty} {c.uom}</div>
                  <div><input defaultValue={1} className="w-24 h-9 px-2 rounded-lg border"/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
  
        {loading && <div className="text-sm text-zinc-500 mt-3">Calculando disponibilidad…</div>}
  
        {preview && (
          <div className="mt-3 grid gap-3">
            <div className="rounded-lg border p-3">
              <h4 className="font-medium">COA teórico</h4>
              <ul className="mt-2 text-sm space-y-1">
                <li>Grado: <b>{preview.estimates?.abvPct ?? "—"}%</b></li>
                <li>Acidez: <b>{preview.estimates?.acidity_gpl ?? "—"} g/L</b></li>
                <li>Azúcar: <b>{preview.estimates?.sugar_gpl ?? "—"} g/L</b></li>
              </ul>
            </div>
            <div className="rounded-lg border p-3">
              <h4 className="font-medium">Disponibilidad</h4>
              {Array.isArray(preview.shortages) && preview.shortages.length>0 ? (
                <ul className="mt-2 text-sm space-y-1">
                  {preview.shortages.map((s:any,i:number)=>(
                    <li key={i} className="text-rose-700">⚠️ Falta {s.missing} {s.uom} de {s.itemId} (Req {s.required}, Disp {s.available})</li>
                  ))}
                </ul>
              ): <div className="mt-2 text-sm text-emerald-700">Todo cubre</div>}
            </div>
          </div>
        )}
  
        <SpinnerButton
          onClick={handlePlan}
          loading={creating}
          style={{ backgroundColor: accent }}
          className="text-white w-full h-12 text-base font-semibold mt-4"
        >
          Planificar producción
        </SpinnerButton>
      </div>
    );
}

function OrderDetail({ order, allItems, onRefresh, onClose }: { order: ProductionOrderUI; allItems: Item[]; onRefresh: () => void; onClose:()=>void }) {
  return (
    <div className="space-y-4">
      <HeaderExecutionControls order={order} onRefresh={onRefresh} />
      <div className="mt-4">
        <SafetyAndPersonal order={order} onRefresh={onRefresh} />
      </div>
      <div className="mt-4">
        <IncidentsSection order={order} onRefresh={onRefresh} />
      </div>
    </div>
  );
}


// ===== Página principal con organización tipo "playground" =====
export default function ExecutionPage() {
  const { data, loadInitialData } = useData();
  const accent = (SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal;

  const allItems = useMemo(() => (data?.items || []) as Item[], [data]);

  const boms: BillOfMaterialUI[] = useMemo(() => {
      const raw = (data?.billOfMaterials ?? []) as BillOfMaterialUI[];
      return raw.map((b: any) => ({
        id: b.id,
        name: b.name ?? b.id,
        stage: (b.stage) ?? (b.output?.isFinal ? "ENVASADO" : "PRODUCCION"),
        baseUnit: (b.baseUnit ?? b.uom ?? "L") as Uom,
        ...b,
      }));
    }, [data]);
  const orders: ProductionOrderUI[] = useMemo(() => (data?.productionOrders ?? []) as ProductionOrderUI[], [data]);

  // Helpers de estado compatibles con SSOT
  const isActiveStatus = (s: string) => ['IN_PROGRESS','PAUSED','QC_HOLD','PACKAGING', 'wip'].includes(s);
  const isScheduledStatus = (s: string) => s === 'PLANNED' || s === 'planned';

  // Agrupación "playground": izquierda (source), centro (workstation), derecha (inspectores)
  const active: ProductionOrderUI[] = useMemo(() => orders.filter((o) => isActiveStatus(o.status)), [orders]);
  const scheduled: ProductionOrderUI[] = useMemo(() => orders.filter((o) => isScheduledStatus(o.status)), [orders]);

  // Estado de selección (uno u otro)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const openOrder: ProductionOrderUI | null = useMemo(() => orders.find((o) => o.id === openOrderId) ?? null, [orders, openOrderId]);
  const openBom: BillOfMaterialUI | null = useMemo(() => boms.find((b) => b.id === openBomId) ?? null, [boms, openBomId]);

  const pickBom = useCallback(() => {
    if (!boms?.length) return;
    setOpenOrderId(null);
    setOpenBomId(boms[0].id);
  }, [boms]);

  const selectOrder = useCallback((id: string) => {
    setOpenBomId(null);
    setOpenOrderId(id);
  }, []);

  // ===== Layout =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
      {/* Izquierda: "Fuentes" → Órdenes y Nuevo desde BOM */}
      <aside className="lg:col-span-3 space-y-4">
        <SBCard
          title="Órdenes"
          accent={accent}
        >
          <div className="p-3 flex items-center justify-between">
            <div className="text-sm text-zinc-600">Activas ({active.length}) · Planificadas ({scheduled.length})</div>
            <div className="flex items-center gap-2">
              <details className="relative group">
                <summary className="cursor-pointer list-none sb-btn-secondary px-2 py-1 rounded-md border text-xs flex items-center gap-1">
                  <Plus size={14} /> Nuevo
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-10 max-h-72 overflow-auto">
                  {boms.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setOpenOrderId(null); setOpenBomId(b.id); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      {b.name} {b.stage === 'PRODUCCION' ? '• OUT: intermediate' : '• OUT: fg'}
                    </button>
                  ))}
                  {!boms?.length && (
                    <div className="px-3 py-2 text-sm text-zinc-500">No hay BOMs.</div>
                  )}
                </div>
              </details>
              <button className="px-2 py-1 rounded-md border text-xs" title="Filtrar"><ListFilter size={14} /></button>
            </div>
          </div>

          <div className="px-2 pb-2 space-y-1 max-h-[55vh] overflow-y-auto">
            {[...active, ...scheduled].map((o) => (
              <button
                key={o.id}
                onClick={() => selectOrder(o.id)}
                className={`w-full text-left rounded-md p-2 hover:bg-zinc-50 transition-colors ${openOrderId === o.id ? 'ring-1 ring-[hsl(var(--sb-accent-produc))]/30 bg-[hsl(var(--sb-accent-produc)/0.05)]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{o.name || o.id}</p>
                    <p className="text-xs text-zinc-500 truncate">{o.plannedQty} {o.baseUnit} {o.stage ? `• ${o.stage}` : ''}</p>
                  </div>
                  <div className="shrink-0">
                    {o.status === 'IN_PROGRESS' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">En curso</span>}
                    {o.status === 'PAUSED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">Pausada</span>}
                    {o.status === 'PLANNED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border">Planificada</span>}
                    {o.status === 'QC_HOLD' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">QC Hold</span>}
                    {o.status === 'PACKAGING' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Envasado</span>}
                  </div>
                </div>
              </button>
            ))}

            {!active.length && !scheduled.length && (
              <div className="text-sm text-zinc-500 px-2 py-6 text-center">Sin órdenes. Crea una desde BOM.</div>
            )}
          </div>
        </SBCard>
      </aside>

      {/* Centro: Workstation (Plan → Ejecutar) */}
      <main className="lg:col-span-6 min-h-[70vh]">
        <SBCard
          title={openOrder ? (openOrder.name || openOrder.id) : openBom ? (openBom.name || 'Planificación') : 'Workstation'}
          accent={accent}
        >
          <div className="p-4 min-h-[60vh]">
            {openOrder ? (
              // === EJECUCIÓN ===
              <OrderDetail
                order={openOrder}
                allItems={allItems}
                onRefresh={loadInitialData}
                onClose={() => setOpenOrderId(null)}
              />
            ) : openBom ? (
              // === PLANIFICACIÓN ===
              <PlanningBoard
                bom={openBom}
                allItems={allItems}
                allBoms={boms}
                onBomChange={setOpenBomId}
                onPlanned={(newOrderId: string) => {
                  setOpenOrderId(newOrderId);
                  setOpenBomId(null);
                  loadInitialData();
                }}
              />
            ) : (
              <EmptyCenter onPickBom={pickBom} />
            )}
          </div>
        </SBCard>
      </main>

      {/* Derecha: Inspectores contextuales (como el panel derecho del playground) */}
      <aside className="lg:col-span-3 space-y-4">
        {/*
        <ShortagesPanel shortages={[]} items={data?.items ?? []} />
        <QCPanel lots={data?.onHand ?? []} />
        */}
      </aside>
    </div>
  );
}

    