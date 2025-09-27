// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, ListFilter, Trash2 } from "lucide-react";
import { SBCard, SBButton, SpinnerButton } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { SB_COLORS, type Item, type ProductionOrder, type BillOfMaterial, type Uom } from "@/domain/ssot";
import { toast } from "sonner";
import {
  planProduction,
  previewPlanning,
  startProduction,
  pauseProduction,
  resumeProduction,
  closeProduction,
  cancelProduction,
  toggleProtocolsAcknowledged,
  setOperatorsCount,
  addIncident
} from "../actions";

// Type Aliases
type ProductionOrderUI = any;
type BillOfMaterialUI = any;

// -- UI Components --

function HeaderExecutionControls({ order, canStartExtraCheck = true, onRefresh }: { order: any; canStartExtraCheck?: boolean; onRefresh: () => void; }) {
    const [pending, startTransition] = React.useTransition();
    const status = order?.status as string;
    const isProd = order?.stage === "PRODUCCION";
    const hasShortages = (order?.shortages?.length ?? 0) > 0;
    const hasParentLotIfNeeded = isProd ? true : (order?.parentLotNumber ?? "").trim().length > 0;

    const canStart = (status === "planned" || status === "PLANNED") ? !!order?.protocolsAcknowledged && !hasShortages && hasParentLotIfNeeded && canStartExtraCheck : false;
    const canPause = status === "wip" || status === "IN_PROGRESS";
    const canResume = status === "PAUSED" || status === "paused";
    const canFinish = canPause || canResume;
    const canCancel = status === "planned" || status === "PLANNED";

    const primaryLabel = status === "PLANNED" || status === "planned" ? "iniciar" : status === "IN_PROGRESS" || status === "wip" ? "pausa" : status === "PAUSED" || status === "paused" ? "reanudar" : "iniciar";
    const secondaryLabel = (status === "PLANNED" || status === "planned") ? "cancelar" : "finalizar";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <SpinnerButton loading={pending} disabled={(status === "PLANNED" || status === "planned") ? !canStart : (status === "IN_PROGRESS" || status === "wip") ? !canPause : (status === "PAUSED" || status === "paused") ? !canResume : false} onClick={() => startTransition(async () => {
                let r;
                if (status === "PLANNED" || status === "planned") r = await startProduction(order.id);
                else if (status === "IN_PROGRESS" || status === "wip") r = await pauseProduction(order.id);
                else if (status === "PAUSED" || status === "paused") r = await resumeProduction(order.id);
                if (r?.ok) toast.success(primaryLabel); else toast.error(r?.message ?? "Acción no completada");
                onRefresh();
            })} className="sb-btn-primary min-w-[140px] capitalize">
                {primaryLabel}
            </SpinnerButton>
            <SpinnerButton loading={pending} disabled={(status !== "PLANNED" && status !== "planned") && !canFinish} onClick={() => startTransition(async () => {
                let r;
                if (status === "PLANNED" || status === "planned") { r = await cancelProduction(order.id); } else { r = await closeProduction(order.id); }
                if (r?.ok) toast.success(secondaryLabel); else toast.error(r?.message ?? "Acción no completada");
                onRefresh();
            })} className="sb-btn-secondary min-w-[140px] capitalize">
                {secondaryLabel}
            </SpinnerButton>
            {hasShortages && <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800">⚠️ faltantes de material</span>}
            {(status === "QC_HOLD" || status === "qc_hold") && <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800">⏸ en espera de QC</span>}
            {order?.lotNumber && <span className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-700">Lote salida: <b>{order.lotNumber}</b></span>}
        </div>
    );
}

function SafetyAndPersonal({ order, onRefresh }: { order: any; onRefresh: () => void; }) {
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
                <label className="flex items-center gap-3"><input type="checkbox" checked={ack} onChange={(e) => {
                    const v = e.target.checked;
                    setAck(v);
                    startTransition(async () => {
                        const r = await toggleProtocolsAcknowledged(order.id, v);
                        r?.ok ? toast.success(v ? "Protocolos confirmados" : "Protocolos desmarcados") : toast.error(r?.message ?? "Error");
                        onRefresh();
                    });
                }} /><span>He leído y cumplo los protocolos de Calidad para esta orden</span></label>
                <div className="flex items-end gap-3">
                    <div><label className="block text-sm mb-1">N.º de operarios</label><input type="number" min={0} className="w-32 h-10 px-3 rounded-lg border" value={ops} onChange={(e) => setOps(Number(e.target.value))} /></div>
                    <SpinnerButton className="sb-btn-secondary" loading={pending} onClick={() => startTransition(async () => {
                        const r = await setOperatorsCount(order.id, ops);
                        r?.ok ? toast.success("Operarios guardados") : toast.error(r?.message ?? "Error");
                        onRefresh();
                    })}>Guardar</SpinnerButton>
                </div>
            </div>
        </div>
    );
}

function IncidentsSection({ order, onRefresh }: { order: any; onRefresh: () => void }) {
    const [pending, startTransition] = React.useTransition();
    const [severity, setSeverity] = React.useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
    const [summary, setSummary] = React.useState("");
    const [details, setDetails] = React.useState("");

    return (
        <div className="rounded-xl border p-3 bg-white">
            <h3 className="text-base font-semibold">Incidencias</h3>
            <div className="mt-3 grid sm:grid-cols-3 gap-2">
                <div><label className="block text-sm mb-1">Severidad</label><select className="w-full h-10 px-3 rounded-lg border" value={severity} onChange={(e) => setSeverity(e.target.value as any)}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select></div>
                <div className="sm:col-span-2"><label className="block text-sm mb-1">Resumen</label><input className="w-full h-10 px-3 rounded-lg border" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
                <div className="sm:col-span-3"><label className="block text-sm mb-1">Detalles</label><textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
            </div>
            <div className="flex gap-2 mt-2">
                <SpinnerButton className="sb-btn-secondary" disabled={!summary} loading={pending} onClick={() => startTransition(async () => {
                    const r = await addIncident(order.id, { severity, summary, details });
                    r?.ok ? toast.success("Incidencia añadida") : toast.error(r?.message ?? "Error");
                    setSummary(""); setDetails("");
                    onRefresh();
                })}>Añadir incidencia</SpinnerButton>
            </div>
            <div className="text-sm opacity-80 mt-3">
                {(order?.incidents ?? []).length ? <ul className="list-disc pl-6 space-y-1">{order.incidents.map((x: any) => <li key={x.id}><b>{x.severity}</b> · {x.summary} <span className="opacity-70">({x.at})</span></li>)}</ul> : "Sin incidencias registradas."}
            </div>
        </div>
    );
}

function PlanningBoard({ bom, onPlanned, allItems, onCancel }: { bom: BillOfMaterialUI; onPlanned: (id: string) => void; allItems: Item[]; onCancel: () => void; }) {
    const [qty, setQty] = React.useState<number>(1);
    const [date, setDate] = React.useState<string>("");
    const [preview, setPreview] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [creating, setCreating] = React.useState(false);

    const itemMap = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
    const last = React.useRef<string>("");
    React.useEffect(() => {
        const payload = JSON.stringify({ bomId: bom?.id, plannedQty: qty });
        if (!bom?.id || qty <= 0) { setPreview(null); last.current = payload; return; }
        if (payload === last.current) return;
        last.current = payload;
        setLoading(true);
        previewPlanning({ bomId: bom.id, plannedQty: qty }).then(res => setPreview(res?.ok ? res.data : null)).finally(() => setLoading(false));
    }, [bom?.id, qty]);

    async function handlePlan() {
        if (creating) return;
        setCreating(true);
        const r = await planProduction({ bomId: bom.id, plannedQty: qty, plannedDate: date || undefined, name: bom.name });
        setCreating(false);
        if (r?.ok) { toast.success("Planificada"); onPlanned(r.data.id); } else { toast.error(r?.message ?? "No se pudo planificar"); }
    }
    
    async function handlePlanAndStart() {
        if (creating) return;
        setCreating(true);
        const r = await planProduction({ bomId: bom.id, plannedQty: qty, plannedDate: date || undefined, name: bom.name });
        if(r.ok) {
            const startResult = await startProduction(r.data.id);
            if(startResult.ok) {
                toast.success("Orden planificada e iniciada");
                onPlanned(r.data.id);
            } else {
                 toast.error(startResult.message ?? "No se pudo iniciar la orden");
            }
        } else {
            toast.error(r.message ?? "No se pudo planificar");
        }
        setCreating(false);
    }
    
    const lotesPorItem = (itemId: string) => preview?.allocations?.filter((a: any) => a.itemId === itemId) || [];

    return (
        <div className="rounded-xl border p-3 bg-white space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-sm mb-1">Cantidad a producir ({bom?.baseUnit ?? "u"})</label><input type="number" min={1} className="w-full h-10 px-3 rounded-lg border" value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
                <div><label className="block text-sm mb-1">Fecha prevista</label><input type="date" className="w-full h-10 px-3 rounded-lg border" value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            <div>
                <h4 className="font-medium">Materiales Requeridos</h4>
                <div className="mt-2 rounded-lg border divide-y">
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-2 text-xs text-zinc-500 bg-zinc-50"><span className="font-semibold">Componente</span><span className="font-semibold text-right">Cant. Teórica</span><span className="font-semibold text-right">Cant. Real</span></div>
                    {preview?.nominal?.map((c: any, i: number) => (
                        <div key={i} className="px-3 py-2">
                            <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center">
                                <div><div className="font-medium text-sm">{itemMap.get(c.itemId)?.name || c.itemId}</div></div>
                                <div className="text-sm tabular-nums text-right">{(c.qty || 0).toFixed(3)} {c.uom}</div>
                                <div className="text-right"><input defaultValue={(c.qty || 0).toFixed(3)} className="w-24 h-9 px-2 rounded-lg border text-right" /></div>
                            </div>
                            {lotesPorItem(c.itemId).length > 0 && <div className="text-xs text-zinc-500 mt-1 pl-2">Lotes: {lotesPorItem(c.itemId).map((l: any) => `${l.lotNumber} (${l.qty.toFixed(2)})`).join(', ')}</div>}
                        </div>
                    ))}
                </div>
            </div>
            {loading && <div className="text-sm text-zinc-500">Calculando disponibilidad…</div>}
            {preview?.shortages?.length > 0 && <div className="mt-3 rounded-lg border p-3 bg-red-50 text-red-700">
                <h4 className="font-medium">Faltantes de Material</h4>
                <ul className="mt-2 text-sm space-y-1">{preview.shortages.map((s: any, i: number) => <li key={i}>⚠️ Falta {s.missing.toFixed(2)} {s.uom} de {itemMap.get(s.itemId)?.name || s.itemId}</li>)}</ul>
            </div>}
            {preview?.lotNumberPlanned && <div className="mt-3 rounded-lg border p-3 bg-zinc-50"><h4 className="font-medium">Lote de Salida Previsto</h4><p className="font-mono text-sm mt-1">{preview.lotNumberPlanned}</p></div>}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
                <SBButton variant="secondary" onClick={onCancel}>Cancelar</SBButton>
                <SpinnerButton onClick={handlePlan} loading={creating} disabled={!preview || preview.shortages.length > 0} className="sb-btn-secondary">Planificar</SpinnerButton>
                <SpinnerButton onClick={handlePlanAndStart} loading={creating} disabled={!preview || preview.shortages.length > 0} className="sb-btn-primary bg-blue-600 text-white">Planificar e Iniciar</SpinnerButton>
            </div>
        </div>
    );
}

function ProductionWorkstation({ order, bom, onRefresh, onPlanned, allItems, onCancelPlanning }: { order?: ProductionOrderUI; bom?: BillOfMaterialUI; onRefresh: () => void; onPlanned: (id: string) => void; allItems: Item[]; onCancelPlanning: () => void;}) {
    const isExecuting = !!order;
    const itemMap = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
    const title = order?.name || bom?.name || 'Producción';

    return (
        <SBCard title={title} accent={SB_COLORS.primary.teal}>
            <div className="p-4 space-y-4">
                {isExecuting ? (
                    <>
                        <HeaderExecutionControls order={order} onRefresh={onRefresh} />
                        <div className="rounded-xl border p-3 bg-white"><h3 className="text-base font-semibold">Materiales</h3><div className="mt-2 rounded-lg border divide-y"><div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-2 text-xs text-zinc-500 bg-zinc-50"><span className="font-semibold">Componente</span><span className="font-semibold text-right">Cant. Teórica</span><span className="font-semibold text-right">Cant. Real</span></div>
                            {(order.nominal || []).map((c: any, i: number) => <div key={i} className="px-3 py-2"><div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center"><div><div className="font-medium text-sm">{itemMap.get(c.itemId)?.name || c.itemId}</div><div className="text-xs text-zinc-500 mt-1 pl-2">Lotes: {order.reservations?.filter((r:any) => r.itemId === c.itemId).map((r:any) => `${r.lotNumber} (${r.qty})`).join(', ') || 'No asignado'}</div></div><div className="text-sm tabular-nums text-right">{(c.qty || 0).toFixed(3)} {c.uom}</div><div className="text-right"><input defaultValue={(c.qty || 0).toFixed(3)} className="w-24 h-9 px-2 rounded-lg border text-right" /></div></div></div>)}
                        </div></div>
                        <SafetyAndPersonal order={order} onRefresh={onRefresh} />
                        <IncidentsSection order={order} onRefresh={onRefresh} />
                    </>
                ) : bom ? (
                    <PlanningBoard bom={bom} onPlanned={onPlanned} allItems={allItems} onCancel={onCancelPlanning} />
                ) : (
                    <div className="h-full grid place-items-center"><div className="text-center max-w-sm"><div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-100 text-zinc-700 grid place-items-center"><svg width="22" height="22" viewBox="0 0 24 24" className="opacity-80"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><h3 className="text-lg font-semibold text-zinc-800">Nada abierto</h3><p className="text-sm text-zinc-500 mt-1">Selecciona una orden a la izquierda o crea una nueva desde un BOM.</p></div></div>
                )}
            </div>
        </SBCard>
    );
}

// ===== Main Page Component =====
export default function ExecutionPage() {
    const { data, loadInitialData } = useData();
    const accent = (SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal;

    const allItems = useMemo(() => (data?.items || []) as Item[], [data]);
    const boms: BillOfMaterialUI[] = useMemo(() => ((data?.billOfMaterials ?? []) as BillOfMaterialUI[]).map((b: any) => ({ ...b, id: b.id, name: b.name ?? b.id, stage: (b.stage) ?? (b.output?.isFinal ? "ENVASADO" : "PRODUCCION"), baseUnit: (b.baseUnit ?? b.uom ?? "L") as Uom })), [data]);
    const orders: ProductionOrderUI[] = useMemo(() => (data?.productionOrders ?? []) as ProductionOrderUI[], [data]);
    
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    const [openBomId, setOpenBomId] = useState<string | null>(null);

    const openOrder: ProductionOrderUI | null = useMemo(() => orders.find((o) => o.id === openOrderId) ?? null, [orders, openOrderId]);
    const openBom: BillOfMaterialUI | null = useMemo(() => boms.find((b) => b.id === openBomId) ?? null, [boms, openBomId]);

    const selectOrder = useCallback((id: string) => { setOpenBomId(null); setOpenOrderId(id); }, []);
    const handlePlanned = (orderId: string) => { loadInitialData(); selectOrder(orderId); };
    
    const active: ProductionOrderUI[] = useMemo(() => orders.filter((o) => ['IN_PROGRESS', 'wip', 'PAUSED', 'paused', 'QC_HOLD'].includes(o.status)), [orders]);
    const scheduled: ProductionOrderUI[] = useMemo(() => orders.filter((o) => ['PLANNED', 'planned'].includes(o.status)), [orders]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
            <aside className="lg:col-span-3 space-y-4">
                <SBCard title="Órdenes" accent={accent}>
                    <div className="p-3 flex items-center justify-between">
                        <div className="text-sm text-zinc-600">Activas ({active.length}) · Planificadas ({scheduled.length})</div>
                        <div className="flex items-center gap-2">
                            <details className="relative group">
                                <summary className="cursor-pointer list-none sb-btn-secondary px-2 py-1 rounded-md border text-xs flex items-center gap-1"><Plus size={14} /> Nuevo</summary>
                                <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-10 max-h-72 overflow-auto">
                                    {boms.map((b) => <button key={b.id} onClick={() => { setOpenOrderId(null); setOpenBomId(b.id); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">{b.name} {b.stage === 'PRODUCCION' ? '• OUT: intermediate' : '• OUT: fg'}</button>)}
                                    {!boms?.length && <div className="px-3 py-2 text-sm text-zinc-500">No hay BOMs.</div>}
                                </div>
                            </details>
                            <button className="px-2 py-1 rounded-md border text-xs" title="Filtrar"><ListFilter size={14} /></button>
                        </div>
                    </div>
                    <div className="px-2 pb-2 space-y-1 max-h-[55vh] overflow-y-auto">
                        {[...active, ...scheduled].map((o) => <button key={o.id} onClick={() => selectOrder(o.id)} className={`w-full text-left rounded-md p-2 hover:bg-zinc-50 transition-colors ${openOrderId === o.id ? 'ring-1 ring-[hsl(var(--sb-accent-produc))]/30 bg-[hsl(var(--sb-accent-produc)/0.05)]' : ''}`}>
                            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-medium text-zinc-800 truncate">{o.name || o.id}</p><p className="text-xs text-zinc-500 truncate">{o.targetQuantity} {o.baseUnit} {o.stage ? `• ${o.stage}` : ''}</p></div><div className="shrink-0">{o.status === 'IN_PROGRESS' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">En curso</span>}{o.status === 'PAUSED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">Pausada</span>}{o.status === 'PLANNED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border">Planificada</span>}{o.status === 'QC_HOLD' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">QC Hold</span>}</div></div>
                        </button>)}
                        {!active.length && !scheduled.length && <div className="text-sm text-zinc-500 px-2 py-6 text-center">Sin órdenes. Crea una desde BOM.</div>}
                    </div>
                </SBCard>
            </aside>
            <main className="lg:col-span-6 min-h-[70vh]">
                <ProductionWorkstation order={openOrder} bom={openBom} onRefresh={() => loadInitialData()} onPlanned={handlePlanned} allItems={allItems} onCancelPlanning={() => setOpenBomId(null)} />
            </main>
            <aside className="lg:col-span-3 space-y-4"></aside>
        </div>
    );
}