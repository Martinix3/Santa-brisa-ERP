
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, Trash2 } from "lucide-react";
import type {
  BillOfMaterial,
  ProductionOrder,
  Item,
  Uom,
  CalcRow,
  CalcResult,
} from "@/domain/ssot";
import { SBCardBox as SBCard, SBBtn, SpinnerButton } from "@/components/sb-funda/SBScaffold";
import { useData } from "@/lib/dataprovider";

/* ======================
   Helpers visuales
====================== */
const ACCENT_VAR = "--sb-accent-produc";
const accentText = `text-[hsl(var(${ACCENT_VAR}))]`;
const accentSoft = `bg-[hsl(var(${ACCENT_VAR})/0.08)]`;
const num = "font-mono tabular-nums";

function StatusBadge({ status }: { status?: ProductionOrder["status"] }) {
  const m: Record<string, string> = {
    PLANNED: "bg-sky-100 text-sky-700 ring-sky-200",
    IN_PROGRESS: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    PAUSED: "bg-amber-100 text-amber-800 ring-amber-200",
    QC_HOLD: "bg-purple-100 text-purple-700 ring-purple-200",
    CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    CANCELLED: "bg-rose-100 text-rose-700 ring-rose-200",
  };
  return <span className={`px-2 py-0.5 text-[11px] rounded-full ring-1 ${m[status ?? "PLANNED"]}`}>{status}</span>;
}

/* ======================
   Lateral: listas limpias
====================== */
function SidebarList({
  title,
  children,
  count,
}: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <SBCard title={title}>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-600">{count ?? ""}</span>
      </div>
      <div className="p-2 space-y-1">{children}</div>
    </SBCard>
  );
}

function SidebarItem({
  active,
  onClick,
  title,
  subtitle,
  right,
}: { active?: boolean; onClick: () => void; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors
        ${active ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-zinc-50"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-800 truncate">{title}</div>
          {subtitle && <div className="text-xs text-zinc-500 truncate">{subtitle}</div>}
        </div>
        {right}
      </div>
    </button>
  );
}

/* ======================
   Puesto de trabajo
====================== */
function ProductionWorkstation({
  order,
  bom,
  onRefresh,
  onPlanned,
  allItems,
  allBoms,
  setOpenOrderId,
}: {
  order: ProductionOrder | null;
  bom: BillOfMaterial | null;
  onRefresh: () => void;
  onPlanned: (orderId: string) => void;
  allItems: Item[];
  allBoms: BillOfMaterial[];
  setOpenOrderId?: (id: string | null) => void; // para seleccionar la orden recién creada
}) {
  const [pending, startTransition] = useTransition();

  // ----- estado mínimo para planificar/ejecutar -----
  const [qty, setQty] = useState<number>(1);
  const [date, setDate] = useState<string>("");
  const [ack, setAck] = useState<boolean>(false);
  const [ops, setOps] = useState<number>(0);
  const [actuals, setActuals] = useState<NonNullable<ProductionOrder["actuals"]>>([]);
  const [calcRows, setCalcRows] = useState<CalcRow[]>([]);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const itemById = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
  const workstationBom = useMemo(() => (order ? allBoms.find(b => b.id === order.bomId) ?? null : bom), [order, bom, allBoms]);
  const outputItem = useMemo(() => (workstationBom ? itemById.get(workstationBom.outputItemId) ?? null : null), [workstationBom, itemById]);

  useEffect(() => {
    setQty(order?.targetQuantity ?? 1);
    setDate(order?.scheduledFor ?? "");
    setAck(Boolean(order?.checks?.find(c => c.id === "prot")?.done));
    setOps((order as any)?.operatorsCount ?? 0);

    if (order?.actuals?.length) {
      setActuals(order.actuals);
    } else if (workstationBom) {
      const scale = (q: number) => (q * (order?.targetQuantity ?? 1)) / (workstationBom.batchSize || 1);
      setActuals(workstationBom.items.map(c => ({
        itemId: c.itemId, uom: c.uom as Uom, theoreticalQty: scale(c.qty || 0), actualQty: 0,
      })));
    } else {
      setActuals([]);
    }
  }, [order, workstationBom]);

  if (!order && !bom) {
    return (
      <SBCard className="grid place-content-center min-h-[50vh]">
        <div className="text-center">
          <FactoryIcon size={40} className="mx-auto text-zinc-300 mb-4" />
          <p className="text-zinc-600">Selecciona una receta para planificar o una orden para ejecutar.</p>
        </div>
      </SBCard>
    );
  }

  const isExecuting = Boolean(order);
  const bomToUse = (workstationBom!) as BillOfMaterial;

  // ----- acciones resumidas (tú ya las tienes implementadas) -----
  const doAndRefresh = (fn: () => Promise<any>) => startTransition(async () => { await fn(); onRefresh(); });
  const planProduction = async () => {
    // @ts-ignore: server action real en tu proyecto
    const res = await (await import("@/app/(app)/production/actions")).planProduction({
      bomId: bomToUse.id, plannedQty: qty, plannedDate: date || undefined, name: bomToUse.name,
    } as any);
    if ((res as any)?.ok) { onPlanned((res as any).data.id); setOpenOrderId?.((res as any).data.id); }
  };

  // ================== UI ==================
  return (
    <SBCard>
      {/* header limpio, estilo BOM */}
      <div className={`flex items-center justify-between px-4 py-3 ${accentSoft} rounded-t-xl border-b`}>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 grid place-content-center rounded-lg ${accentText} bg-white ring-1 ring-black/5`}>
            <FactoryIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900">
                {order?.id ? bomToUse?.name || order.id : bomToUse?.name || "Puesto de trabajo"}
              </h2>
              {order?.status && <StatusBadge status={order.status} />}
            </div>
            <p className="text-xs text-zinc-600">
              {order ? <>Orden: <span className="font-mono">{order.id}</span></> : "Planificación de lote"} ·{" "}
              <span className={accentText}>
                {outputItem?.category === "fg" ? "Etapa: ENVASADO" :
                 outputItem?.category === "intermediate" ? "Etapa: PRODUCCIÓN" : "Etapa: —"}
              </span>
            </p>
          </div>
        </div>

        {!order && (
          <button
            onClick={planProduction}
            className={`h-10 px-4 rounded-lg text-white bg-[hsl(var(${ACCENT_VAR}))] hover:brightness-110`}
          >
            Planificar producción
          </button>
        )}
      </div>

      <div className="p-4 space-y-8">
        {/* Bloque de planificación (dos campos + hint) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">
              Cantidad ({bomToUse.baseUnit})
            </label>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(Number(e.target.value))}
              disabled={isExecuting}
              className={`w-full h-10 px-3 rounded-lg border bg-white font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(${ACCENT_VAR})/0.45)]`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Fecha prevista</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={isExecuting}
              className={`w-full h-10 px-3 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(${ACCENT_VAR})/0.45)]`}
            />
          </div>
          <div className="text-sm text-zinc-600 flex items-end">
            {outputItem?.category === "fg"
              ? "Etapa: ENVASADO — insumos intermediate + pack. Salida: fg."
              : "Etapa: PRODUCCIÓN — insumos raw + intermediate. Salida: intermediate."}
          </div>
        </section>

        {/* Parte de materiales — jerarquía tipo BOM */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-800">
              Parte de Producción (Materiales)
            </h3>
            {isExecuting && (
              <button
                onClick={() => {
                  const payload = actuals.map(a => ({ itemId: a.itemId, uom: a.uom, qty: a.actualQty, role: "FORMULA" as const }));
                  // @ts-ignore
                  doAndRefresh(() => import("@/app/(app)/production/actions")
                    .then(m => m.recordConsumption(order!.id, payload)));
                }}
                className={`h-9 px-3 rounded-lg border text-[hsl(var(${ACCENT_VAR}))] bg-[hsl(var(${ACCENT_VAR})/0.06)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}
              >
                Guardar consumo
              </button>
            )}
          </div>

          {/* Encabezado de tabla (simple, sin columnas rígidas) */}
          <div className="hidden md:flex text-xs font-semibold text-zinc-600 px-3 py-2">
            <div className="flex-1">Material</div>
            <div className="w-28 text-right">Teórico</div>
            <div className="w-32 text-right">Real</div>
            <div className="w-16 text-left">UoM</div>
          </div>

          {/* Líneas */}
          <div className="rounded-xl border overflow-hidden divide-y">
            {bomToUse.items.map((c, i) => {
              const it = itemById.get(c.itemId);
              const theoretical = ((c.qty || 0) * (order?.targetQuantity ?? qty ?? 1)) / (bomToUse.batchSize || 1);
              return (
                <div key={`${c.itemId}-${i}`} className="px-3 py-3 bg-white">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* bloque informativo a la izquierda */}
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900">{it?.name ?? c.itemId}</div>
                      <div className="text-[11px] text-zinc-500">{c.itemId}</div>
                      <div className="text-xs text-zinc-600">{(it?.category ?? "—")} · <span className="uppercase">{c.role ?? "FORMULA"}</span></div>
                    </div>

                    {/* números alineados a la derecha */}
                    <div className="md:w-28 text-right text-sm text-zinc-700">
                      <span className="font-mono tabular-nums">{theoretical.toFixed(3)}</span>
                    </div>

                    <div className="md:w-32">
                      {isExecuting ? (
                        <input
                          type="number"
                          value={actuals[i]?.actualQty ?? 0}
                          onChange={e => setActuals(rows =>
                            rows.map((r, idx) => idx === i ? { ...r, actualQty: Number(e.target.value) || 0 } : r)
                          )}
                          className={`w-full h-9 px-2 rounded-lg border text-right font-mono tabular-nums
                                      focus:outline-none focus:ring-2 focus:ring-[hsl(var(${ACCENT_VAR})/0.45)]`}
                        />
                      ) : (
                        <div className="text-right text-zinc-400">—</div>
                      )}
                    </div>

                    <div className="md:w-16 text-sm text-zinc-500">{c.uom}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Calculadora (opcional, igual que antes) */}
        {!isExecuting && (
          <section className="pt-6 border-t">
            <h3 className="text-sm font-semibold mb-2">Calculadora de Ajustes</h3>
            <button
              onClick={() => setCalcRows(r => [...r, { itemId: "", uom: "L" as Uom, qty: 0 }])}
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <Plus size={14} /> Añadir fila
            </button>
            {/* (puedes mantener tus inputs aquí si te hacen falta) */}
          </section>
        )}
      </div>
    </SBCard>
  );
}

/* ======================
   Página
====================== */
export default function ExecutionPage() {
  const { data, loadInitialData } = useData();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const orders = (data?.productionOrders ?? []).filter(o => o.status !== "CLOSED" && o.status !== "CANCELLED");
  const boms = data?.billOfMaterials ?? [];
  const items = data?.items ?? [];

  const openOrder = useMemo(() => orders.find(o => o.id === openOrderId) ?? null, [orders, openOrderId]);
  const openBom = useMemo(() => boms.find(b => b.id === openBomId) ?? null, [boms, openBomId]);

  const selectOrder = useCallback((id: string) => { setOpenBomId(null); setOpenOrderId(id); }, []);
  const selectBom = useCallback((id: string) => { setOpenOrderId(null); setOpenBomId(id); }, []);
  const handlePlanned = (orderId: string) => { loadInitialData?.(); selectOrder(orderId); };

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-16">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 grid place-content-center rounded-xl ring-1 ring-black/5 ${accentText} ${"bg-[hsl(var(--sb-accent-produc)/0.12)]"}`}>
              <FactoryIcon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">Producción</h1>
              <p className="text-xs text-zinc-600">Puesto de trabajo — estilo unificado BOM</p>
            </div>
          </div>
          <button
            onClick={() => openBomId ? selectBom(openBomId) : undefined}
            className={`hidden sm:inline-flex h-10 px-3 rounded-lg text-white bg-[hsl(var(${ACCENT_VAR}))] hover:brightness-110`}
          >
            Nueva orden
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Lateral izquierdo */}
        <aside className="lg:col-span-3 space-y-6">
          <SidebarList title="Planificar nueva orden" count={boms.length}>
            {boms.map(b => (
              <SidebarItem
                key={b.id}
                active={openBomId === b.id}
                onClick={() => selectBom(b.id)}
                title={b.name}
                subtitle={items.find(i => i.id === b.outputItemId)?.name ?? b.outputItemId}
                right={b.stage ? <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">{b.stage}</span> : null}
              />
            ))}
          </SidebarList>

          <SidebarList title="Órdenes activas" count={orders.length}>
            {orders.map(o => (
              <SidebarItem
                key={o.id}
                active={openOrderId === o.id}
                onClick={() => selectOrder(o.id)}
                title={<span className="font-mono">{o.id}</span>}
                right={<StatusBadge status={o.status} />}
              />
            ))}
          </SidebarList>
        </aside>

        {/* Área principal */}
        <main className="lg:col-span-9">
          <ProductionWorkstation
            order={openOrder}
            bom={openBom}
            onRefresh={() => loadInitialData?.()}
            onPlanned={handlePlanned}
            allItems={items}
            allBoms={boms}
            setOpenOrderId={setOpenOrderId}
          />
        </main>
      </div>
    </div>
  );
}

    