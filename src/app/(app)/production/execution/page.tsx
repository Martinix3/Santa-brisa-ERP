"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, Trash2, Calendar, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial, ProductionOrder, Item, Uom, CalcRow, CalcResult, SafetyProtocol } from "@/domain/ssot";
import {
  planProduction, startProduction, pauseProduction, resumeProduction,
  closeProduction, cancelProduction, addIncident, recordConsumption, acknowledgeProtocol, setCalculatorInput
} from "@/app/(app)/production/actions";
import { SBScaffold, SBCardBox, SBBtn } from "@/components/sb-funda/SBScaffold";

// ============================================================================
// COMPONENTES DE UI Y HELPERS
// ============================================================================

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
  return <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset ${cls}`}>{status ?? "—"}</span>;
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

// ============================================================================
// SUB-COMPONENTES DE WORKSTATION (DIVIDIDOS POR RESPONSABILIDAD)
// ============================================================================

const ActionToolbar = ({ order, onAction, loading, canStart }: {
  order: ProductionOrder; onAction: (action: () => Promise<any>) => void; loading: boolean; canStart: boolean;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {order.status === "PLANNED" && (<>
      <SpinnerButton variant="solid" tone={ACCENT} loading={loading} disabled={!canStart} onClick={() => onAction(() => startProduction(order.id))}>Iniciar Producción</SpinnerButton>
      <SpinnerButton variant="danger" loading={loading} onClick={() => onAction(() => cancelProduction(order.id))}>Cancelar Orden</SpinnerButton>
      {!canStart && <p className="text-xs text-amber-700 self-center ml-2">Es necesario completar el protocolo para poder iniciar.</p>}
    </>}
    {order.status === "IN_PROGRESS" && (<>
      <SpinnerButton variant="ghost" tone={ACCENT} loading={loading} onClick={() => onAction(() => pauseProduction(order.id))}>Pausar</SpinnerButton>
      <SpinnerButton variant="solid" tone={ACCENT} loading={loading} onClick={() => onAction(() => closeProduction(order.id))}>Finalizar Orden</SpinnerButton>
    </>)}
    {order.status === "PAUSED" && (<>
      <SpinnerButton variant="solid" tone={ACCENT} loading={loading} onClick={() => onAction(() => resumeProduction(order.id))}>Reanudar</SpinnerButton>
      <SpinnerButton variant="ghost" tone={ACCENT} loading={loading} onClick={() => onAction(() => closeProduction(order.id))}>Finalizar</SpinnerButton>
    </>)}
  </div>
);

const MaterialsPanel = ({ bom, order, items, onSave, loading }: {
  bom: BillOfMaterial; order: ProductionOrder; items: Map<string, Item>; onSave: (payload: any[]) => void; loading: boolean;
}) => {
  const [actuals, setActuals] = useState<Record<string, number>>({});
  useEffect(() => {
    const initialActuals: Record<string, number> = {};
    (order.actuals ?? []).forEach(a => { initialActuals[a.itemId] = a.actualQty; });
    setActuals(initialActuals);
  }, [order.actuals]);

  const updateActual = (itemId: string, qty: number) => setActuals(prev => ({ ...prev, [itemId]: isNaN(qty) ? 0 : qty }));
  const handleSave = () => {
    const payload = bom.items.map(c => ({ itemId: c.itemId, uom: c.uom, qty: actuals[c.itemId] ?? 0, role: c.role ?? "FORMULA" }));
    onSave(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-zinc-800">Materiales Requeridos</h3>
        <SpinnerButton variant="ghost" tone={ACCENT} loading={loading} onClick={handleSave}>Guardar Consumo</SpinnerButton>
      </div>
      <div className="grid grid-cols-[2fr,1fr,1fr,1.2fr] gap-4 text-xs font-semibold text-zinc-600 px-4 py-2 bg-zinc-50 rounded-t-lg">
        <div className="text-left">Material</div>
        <div className="text-left">Lote Reservado</div>
        <div className="text-right">Cantidad Teórica</div>
        <div className="text-right">Consumo Real</div>
      </div>
      <div className="border-x border-b rounded-b-lg">
        {bom.items.map(c => {
          const item = items.get(c.itemId);
          const theoretical = (c.qty * order.targetQuantity) / bom.batchSize;
          const reservedLot = order.reservations?.find(r => r.itemId === c.itemId)?.lotNumber || 'LT-RM-25-007';
          return (
            <div key={c.itemId} className="grid grid-cols-[2fr,1fr,1fr,1.2fr] gap-4 items-center px-4 py-3 border-t first:border-t-0 hover:bg-zinc-50/70">
              <div><p className="font-semibold text-zinc-900">{item?.name ?? c.itemId}</p><p className="text-xs text-zinc-500 font-mono">{item?.sku ?? c.itemId}</p></div>
              <div><span className="font-mono text-sm text-sky-700 bg-sky-100 px-2 py-1 rounded-md">{reservedLot}</span></div>
              <div className="text-right font-mono text-sm text-zinc-700">{theoretical.toFixed(3)} <span className="text-xs text-zinc-500">{c.uom}</span></div>
              <div className="text-right"><input type="number" className="w-32 h-9 px-2 rounded-lg border text-right font-mono focus:outline-none focus:ring-2 focus:ring-sky-400" placeholder="0.000" value={actuals[c.itemId] ?? ''} onChange={e => updateActual(c.itemId, parseFloat(e.target.value))} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProtocolPanel = ({ order, protocol, onAction, loading }: {
  order: ProductionOrder; protocol: SafetyProtocol | null; onAction: (action: () => Promise<any>) => void; loading: boolean;
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const isAcknowledged = order.checks?.find(c => c.id === `protocol_${protocol?.id}`)?.done ?? false;

  if (!protocol) return <div className="p-3 text-sm border rounded-lg bg-zinc-50 text-zinc-600">Esta orden no tiene un protocolo de seguridad asociado.</div>;

  const mandatoryItems = protocol.items.filter(i => i.mandatory);
  const allMandatoryChecked = mandatoryItems.every(i => checkedItems[i.id]);
  const handleAcknowledge = () => onAction(() => acknowledgeProtocol(order.id, protocol.id, Object.keys(checkedItems).filter(k => checkedItems[k])));

  if (isAcknowledged) return (<SBCardBox title="Protocolo de Seguridad" icon={ShieldCheck} padding="sm" className="bg-emerald-50 border-emerald-200"><div className="text-sm text-emerald-800"><h4 className="font-semibold">{protocol.title}</h4><p>Protocolo completado y firmado.</p></div></SBCardBox>);
  
  return (
    <SBCardBox title="Protocolo de Seguridad" icon={FileText}>
      <h4 className="font-semibold mb-2">{protocol.title}</h4>
      <div className="space-y-2">
        {protocol.items.map(item => (<label key={item.id} className="flex items-start gap-3 p-2 rounded hover:bg-zinc-50 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={!!checkedItems[item.id]} onChange={() => setCheckedItems(p => ({ ...p, [item.id]: !p[item.id] }))}/>
          <span className="text-sm">{item.text} {item.mandatory && <span className="text-rose-500">*</span>}</span>
        </label>))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <SpinnerButton variant="solid" tone={ACCENT} loading={loading} disabled={!allMandatoryChecked} onClick={handleAcknowledge}>Confirmar y Firmar Protocolo</SpinnerButton>
        {!allMandatoryChecked && <p className="text-xs text-zinc-500 mt-1">Debes completar todos los puntos obligatorios (*).</p>}
      </div>
    </SBCardBox>
  );
};

const IncidentsPanel = ({ order, onAction, loading }: {
  order: ProductionOrder; onAction: (action: () => Promise<any>) => void; loading: boolean;
}) => {
    const [summary, setSummary] = useState('');
    const handleAdd = () => {
        if (!summary.trim()) return;
        onAction(() => addIncident(order.id, { summary, severity: "LOW" }));
        setSummary('');
    };
    return (<SBCardBox title="Registrar Incidencia" icon={AlertTriangle}><div className="flex items-center gap-2"><input value={summary} onChange={e => setSummary(e.target.value)} className="w-full h-9 px-2 rounded-lg border" placeholder="Breve descripción..."/><SpinnerButton variant="ghost" tone={ACCENT} loading={loading} onClick={handleAdd}>Añadir</SpinnerButton></div></SBCardBox>);
};


const PlanningWorkstation = ({ bom, onPlanned, items }: {
  bom: BillOfMaterial;
  onPlanned: (orderId: string) => void;
  items: Map<string, Item>;
}) => {
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState<number>(bom.batchSize || 1);
  const [date, setDate] = useState<string>('');
  const [calcRows, setCalcRows] = useState<CalcRow[]>([]);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const handlePlan = () => startTransition(async () => {
    const res = await planProduction({ bomId: bom.id, plannedQty: qty, plannedDate: date || undefined, name: bom.name, });
    if (res.ok) onPlanned(res.data.id);
  });

  return (
    <SBCardBox accentTone={ACCENT} title={`Planificar Nueva Orden: ${bom.name}`} subtitle="Define la cantidad y fecha para crear una nueva orden de producción.">
      <div className="p-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-xs font-semibold text-zinc-600 mb-1">Cantidad ({bom.baseUnit})</label><input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border ${mono}`} /></div>
          <div><label className="block text-xs font-semibold text-zinc-600 mb-1">Fecha prevista</label><div className="relative"><Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg border" /></div></div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-800 mb-2">Materiales Teóricos</h3>
          <div className="border rounded-lg overflow-hidden"><div className="grid grid-cols-[2fr,1fr] gap-4 text-xs font-semibold text-zinc-600 px-4 py-2 bg-zinc-50"><div className="text-left">Material</div><div className="text-right">Cantidad Estimada</div></div>
            {bom.items.map(c => (<div key={c.itemId} className="grid grid-cols-[2fr,1fr] gap-4 items-center px-4 py-3 border-t"><p className="font-semibold text-zinc-900">{items.get(c.itemId)?.name ?? c.itemId}</p><p className="text-right font-mono text-sm text-zinc-700">{((c.qty * qty) / bom.batchSize).toFixed(3)} <span className="text-xs text-zinc-500">{c.uom}</span></p></div>))}
          </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">Calculadora de Ajustes</h3>
            <div className="space-y-2">
                {calcRows.map((r, idx) => (<div key={idx} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-2 items-center"><input className="h-9 px-2 rounded-lg border" placeholder="Item ID" value={r.itemId} onChange={e => setCalcRows(rows => rows.map((x, i) => i === idx ? { ...x, itemId: e.target.value } : x))} /><input type="number" className="h-9 px-2 rounded-lg border" placeholder="ABV %" value={r.abvPct ?? ""} onChange={e => setCalcRows(rows => rows.map((x, i) => i === idx ? { ...x, abvPct: Number(e.target.value) } : x))} /><input type="number" className="h-9 px-2 rounded-lg border" placeholder="Acidez g/L" value={r.acidity_gpl ?? ""} onChange={e => setCalcRows(rows => rows.map((x, i) => i === idx ? { ...x, acidity_gpl: Number(e.target.value) } : x))} /><input type="number" className="h-9 px-2 rounded-lg border" placeholder="Azúcar g/L" value={r.sugar_gpl ?? ""} onChange={e => setCalcRows(rows => rows.map((x, i) => i === idx ? { ...x, sugar_gpl: Number(e.target.value) } : x))} /><input type="number" className="h-9 px-2 rounded-lg border" placeholder="Cantidad" value={r.qty ?? ""} onChange={e => setCalcRows(rows => rows.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))} /><button onClick={() => setCalcRows(rows => rows.filter((_, i) => i !== idx))} className="h-9 w-9 grid place-content-center rounded-lg border hover:bg-red-50 text-zinc-500 hover:text-red-600"><Trash2 size={16} /></button></div>))}
            </div>
            <button onClick={() => setCalcRows(rows => [...rows, { itemId: "", uom: "L" as Uom, qty: 0 }])} className="text-sm font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 mt-2"><Plus size={14} /> Añadir fila a la calculadora</button>
        </div>
        <div className="border-t pt-4">
            <SpinnerButton variant="solid" tone={ACCENT} loading={pending} onClick={handlePlan} className="w-full h-12 text-base font-semibold">Planificar Producción</SpinnerButton>
        </div>
      </div>
    </SBCardBox>
  );
};

// ============================================================================
// COMPONENTE CONTENEDOR: ProductionWorkstation
// ============================================================================
function ProductionWorkstation({ order, bom, onRefresh, onPlanned, allItems, allBoms, allProtocols }: {
  order: ProductionOrder | null; bom: BillOfMaterial | null; onRefresh: () => void; onPlanned: (orderId: string) => void; allItems: Item[]; allBoms: BillOfMaterial[]; allProtocols: SafetyProtocol[];
}) {
  const [pending, startTransition] = useTransition();
  const itemById = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
  const workstationBom = useMemo(() => (order ? allBoms.find(b => b.id === order.bomId) : bom), [order, bom, allBoms]);
  const relevantProtocol = useMemo(() => {
    if (!workstationBom?.safetyProtocolId) return null;
    return allProtocols.find(p => p.id === workstationBom.safetyProtocolId) ?? null;
  }, [workstationBom, allProtocols]);
  const isProtocolAcknowledged = order?.checks?.find(c => c.id === `protocol_${relevantProtocol?.id}`)?.done ?? false;
  const doAndRefresh = useCallback((fn: () => Promise<any>) => startTransition(async () => { await fn(); onRefresh(); }), [onRefresh]);
  
  if (!workstationBom) return (<SBCardBox accentTone={ACCENT} title="Puesto de trabajo"><div className="grid place-content-center min-h-[40vh] text-center text-zinc-600"><FactoryIcon className="mx-auto mb-4 text-zinc-300" size={40}/><p>Selecciona una receta para planificar o una orden para ejecutar.</p></div></SBCardBox>);
  
  if (!order) {
    return <PlanningWorkstation bom={workstationBom} onPlanned={onPlanned} items={itemById}/>;
  }

  return (
    <SBCardBox accentTone={ACCENT} title={<>Orden de Producción: <span className="font-mono">{order.id}</span></>} subtitle={workstationBom.name} right={<StatusBadge status={order.status} />} footer={<ActionToolbar order={order} onAction={doAndRefresh} loading={pending} canStart={!relevantProtocol || isProtocolAcknowledged}/>}>
      <div className="p-4 space-y-8">
        <MaterialsPanel bom={workstationBom} order={order} items={itemById} onSave={(payload) => doAndRefresh(() => recordConsumption(order.id, payload))} loading={pending}/>
        <div className="grid md:grid-cols-2 gap-6">
          <ProtocolPanel order={order} protocol={relevantProtocol} onAction={doAndRefresh} loading={pending}/>
          <IncidentsPanel order={order} onAction={doAndRefresh} loading={pending}/>
        </div>
      </div>
    </SBCardBox>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function ExecutionPage() {
  const { data, loadInitialData } = useData();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const openOrder = useMemo(() => (data?.productionOrders ?? []).find(o => o.id === openOrderId) ?? null, [data?.productionOrders, openOrderId]);
  const openBom = useMemo(() => (data?.billOfMaterials ?? []).find(b => b.id === openBomId) ?? null, [data?.billOfMaterials, openBomId]);

  const selectOrder = (id: string) => { setOpenBomId(null); setOpenOrderId(id); };
  const selectBom = (id: string) => { setOpenOrderId(null); setOpenBomId(id); };
  const handlePlanned = (orderId: string) => { loadInitialData?.(); selectOrder(orderId); };

  const sidebar = (
    <div className="space-y-6">
      <SBCardBox title="Planificar nueva orden" padding="sm">
        <div className="space-y-1">
          {(data?.billOfMaterials ?? []).map(b => (<button key={b.id} onClick={() => selectBom(b.id)} className={`w-full text-left p-2.5 rounded-md transition-colors text-sm flex items-center gap-2 ${openBomId === b.id ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-700 hover:bg-zinc-50"}`}><FileText size={14} className="text-zinc-400"/><span>{b.name}</span></button>))}
        </div>
      </SBCardBox>
      <SBCardBox title="Órdenes activas" padding="sm">
        <div className="space-y-1">
          {(data?.productionOrders ?? []).filter(o => o.status !== "CLOSED" && o.status !== "CANCELLED").map(o => (<button key={o.id} onClick={() => selectOrder(o.id)} className={`w-full text-left p-2.5 rounded-md transition-colors flex justify-between items-center ${openOrderId === o.id ? "bg-zinc-200" : "hover:bg-zinc-50"}`}><div className="flex-1"><p className="font-semibold text-zinc-800">{data?.billOfMaterials.find(b => b.id === o.bomId)?.name ?? 'Orden sin nombre'}</p><p className="font-mono text-xs text-zinc-500">{o.id}</p></div><StatusBadge status={o.status} /></button>))}
        </div>
      </SBCardBox>
    </div>
  );

  return (
    <SBScaffold module="produc" title="Producción" subtitle="Puesto de trabajo de Ejecución" sidebar={sidebar} density="compact">
      <ProductionWorkstation
        order={openOrder}
        bom={openBom}
        onRefresh={() => loadInitialData?.()}
        onPlanned={handlePlanned}
        allItems={data?.items ?? []}
        allBoms={data?.billOfMaterials ?? []}
        allProtocols={data?.safety_protocols ?? []}
      />
    </SBScaffold>
  );
}