
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, Trash2 } from "lucide-react";
import {
  type BillOfMaterial,
  type ProductionOrder,
  type Item,
  type Uom,
  type CalcRow,
  type CalcResult,
} from "@/domain/ssot";

// UI y datos REALES
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";

// Acciones REALES del módulo Producción (ajusta la ruta si difiere)
import {
  planProduction,
  startProduction,
  pauseProduction,
  resumeProduction,
  closeProduction,
  cancelProduction,
  toggleProtocolsAcknowledged,
  setOperatorsCount,
  addIncident,
  recordConsumption,
  setCalculatorInput,
} from "@/app/(app)/production/actions";

const SpinnerButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
> = ({ children, loading, className = "", ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`relative flex items-center justify-center gap-2 h-10 px-4 rounded-md font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
  >
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
      </div>
    )}
    <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
  </button>
);

function ProductionWorkstation({
  order,
  bom,
  onRefresh,
  onPlanned,
  allItems,
  allBoms,
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

  const itemById = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems]);
  const workstationBom = useMemo(
    () => (order ? allBoms.find((b) => b.id === order.bomId) ?? null : bom),
    [order, bom, allBoms]
  );

  const outputItem = useMemo(
    () => (workstationBom ? itemById.get(workstationBom.outputItemId) ?? null : null),
    [workstationBom, itemById]
  );

  const inferredStage: "PRODUCCION" | "ENVASADO" | "DESCONOCIDA" = useMemo(() => {
    if (!outputItem) return "DESCONOCIDA";
    if (outputItem.category === "intermediate") return "PRODUCCION";
    if (outputItem.category === "fg") return "ENVASADO";
    return "DESCONOCIDA";
  }, [outputItem]);

  useEffect(() => {
    setQty(order?.targetQuantity ?? 1);
    setDate(order?.scheduledFor ?? "");
    setAck(Boolean(order?.checks?.find((c) => c.id === "prot")?.done));
    setOps((order as any)?.operatorsCount ?? 0);

    if (order?.actuals?.length) {
      setActuals(order.actuals);
    } else if (workstationBom) {
      const scale = (q: number) => (q * (order?.targetQuantity ?? qty ?? 1)) / (workstationBom.batchSize || 1);
      setActuals(
        workstationBom.items.map((c) => ({
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

  // Calculadora (server action real)
  useEffect(() => {
    if (!calcRows.length) {
      setCalcResult(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await setCalculatorInput({ raws: calcRows });
        if ((res as any)?.ok) setCalcResult((res as any).data?.calcResult ?? null);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [calcRows]);

  if (!order && !bom) {
    return (
      <SBCard title="Puesto de Trabajo" className="grid place-content-center min-h-[60vh]">
        <div className="text-center">
          <FactoryIcon size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Selecciona una receta para planificar o una orden para ejecutar.</p>
        </div>
      </SBCard>
    );
  }

  const isExecuting = !!order;
  const hasShortages = (order?.shortages?.length ?? 0) > 0;
  const canStart = ack && !hasShortages;
  const bomToUse = workstationBom!;

  const handlePlan = () =>
    startTransition(async () => {
      const res = await planProduction({
        bomId: bomToUse.id,
        plannedQty: qty,
        plannedDate: date || undefined,
        name: bomToUse.name,
      } as any);
      if ((res as any)?.ok) onPlanned((res as any).data.id);
    });

  const doAndRefresh = (fn: () => Promise<any>) =>
    startTransition(async () => {
      await fn();
      onRefresh();
    });

  const updateActual = (idx: number, v: number) =>
    setActuals((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, actualQty: Number.isFinite(v) ? v : 0 } : r))
    );

  const stageHint =
    inferredStage === "PRODUCCION"
      ? "Etapa: PRODUCCIÓN — insumos raw + intermediate. Salida: intermediate."
      : inferredStage === "ENVASADO"
      ? "Etapa: ENVASADO — insumos intermediate + pack. Salida: fg."
      : "Etapa no inferida por categoría del output.";

  return (
    <SBCard title={order?.id ? `${order?.id} — ${order?.status}` : bomToUse?.name}>
      <div className="p-4 space-y-6">
        {/* Estado */}
        {isExecuting && (
          <div className="flex flex-wrap items-center gap-2">
            {order!.status === "PLANNED" && (
              <SpinnerButton
                className="bg-slate-900 text-white hover:bg-slate-700"
                loading={pending}
                disabled={!canStart}
                onClick={() => doAndRefresh(() => startProduction(order!.id))}
              >
                Iniciar
              </SpinnerButton>
            )}
            {order!.status === "IN_PROGRESS" && (
              <SpinnerButton className="border" loading={pending} onClick={() => doAndRefresh(() => pauseProduction(order!.id))}>
                Pausar
              </SpinnerButton>
            )}
            {order!.status === "PAUSED" && (
              <SpinnerButton className="bg-slate-900 text-white hover:bg-slate-700" loading={pending} onClick={() => doAndRefresh(() => resumeProduction(order!.id))}>
                Reanudar
              </SpinnerButton>
            )}
            {order!.status === "PLANNED" && (
              <SpinnerButton className="bg-rose-600 text-white hover:bg-rose-700" loading={pending} onClick={() => doAndRefresh(() => cancelProduction(order!.id))}>
                Cancelar
              </SpinnerButton>
            )}
            {(order!.status === "IN_PROGRESS" || order!.status === "PAUSED") && (
              <SpinnerButton className="bg-slate-900 text-white hover:bg-slate-700" loading={pending} onClick={() => doAndRefresh(() => closeProduction(order!.id))}>
                Finalizar
              </SpinnerButton>
            )}
          </div>
        )}

        {/* Planificación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cantidad ({bomToUse.baseUnit})</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              disabled={isExecuting}
              className="w-full h-10 px-3 rounded-lg border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha prevista</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isExecuting}
              className="w-full h-10 px-3 rounded-lg border"
            />
          </div>
          <div className="text-sm text-slate-600 flex items-end">{stageHint}</div>
        </div>

        {/* Parte de materiales */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Parte de Producción (Materiales)</h3>
            {isExecuting && (
              <SpinnerButton
                loading={pending}
                className="border"
                onClick={() => doAndRefresh(() => recordConsumption(order!.id, actuals))}
              >
                Guardar consumo
              </SpinnerButton>
            )}
          </div>
          <div className="rounded-lg border divide-y">
            {bomToUse.items.map((c, i) => {
              const item = itemById.get(c.itemId);
              const theoretical = ((c.qty || 0) * (order?.targetQuantity ?? qty ?? 1)) / (bomToUse.batchSize || 1);
              return (
                <div key={c.itemId} className="grid grid-cols-[1fr_auto] p-3 items-center gap-3">
                  <div>
                    <p className="font-semibold">{item?.name ?? c.itemId}</p>
                    <p className="text-xs text-slate-500">
                      Cat: <b>{item?.category ?? "-"}</b> · Rol: <b>{c.role ?? "FORMULA"}</b>
                    </p>
                    <p className="text-sm text-slate-500">
                      Teórico: {theoretical.toFixed(2)} {c.uom}
                    </p>
                  </div>
                  {isExecuting && (
                    <input
                      type="number"
                      className="w-28 h-9 px-2 rounded-lg border text-right"
                      placeholder="Cant. real"
                      value={actuals[i]?.actualQty ?? 0}
                      onChange={(e) => updateActual(i, Number(e.target.value))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calidad + Personal */}
        {isExecuting && (
          <div className="space-y-6 pt-6 border-t">
            <div>
              <h3 className="font-medium mb-2">Calidad y Personal</h3>
              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => doAndRefresh(() => toggleProtocolsAcknowledged(order!.id, e.target.checked))}
                />
                He leído los protocolos.
              </label>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  value={ops}
                  onChange={(e) => setOps(Number(e.target.value))}
                  className="w-28 h-9 px-2 rounded-lg border"
                  placeholder="Operarios"
                />
                <SpinnerButton loading={pending} className="border" onClick={() => doAndRefresh(() => setOperatorsCount(order!.id, ops))}>
                  Guardar operarios
                </SpinnerButton>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Incidencias</h3>
              <div className="flex items-center gap-2">
                <input
                  value={incidentSummary}
                  onChange={(e) => setIncidentSummary(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border"
                  placeholder="Añadir incidencia..."
                />
                <SpinnerButton
                  loading={pending}
                  className="border"
                  onClick={() => doAndRefresh(() => addIncident(order!.id, { summary: incidentSummary, severity: "LOW" } as any))}
                >
                  Añadir
                </SpinnerButton>
              </div>
            </div>
          </div>
        )}

        {/* Calculadora (solo en planificación) */}
        {!isExecuting && (
          <>
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-medium">Calculadora de Ajustes</h3>
              <div className="space-y-2">
                {calcRows.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-2 items-center">
                    <input
                      className="h-9 px-2 rounded-lg border"
                      placeholder="Item ID"
                      value={r.itemId}
                      onChange={(e) =>
                        setCalcRows((rows) => rows.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)))
                      }
                    />
                    <input
                      type="number"
                      className="h-9 px-2 rounded-lg border"
                      placeholder="ABV %"
                      value={r.abvPct ?? ""}
                      onChange={(e) =>
                        setCalcRows((rows) => rows.map((x, i) => (i === idx ? { ...x, abvPct: Number(e.target.value) } : x)))
                      }
                    />
                    <input
                      type="number"
                      className="h-9 px-2 rounded-lg border"
                      placeholder="Acidez g/L"
                      value={r.acidity_gpl ?? ""}
                      onChange={(e) =>
                        setCalcRows((rows) => rows.map((x, i) => (i === idx ? { ...x, acidity_gpl: Number(e.target.value) } : x)))
                      }
                    />
                    <input
                      type="number"
                      className="h-9 px-2 rounded-lg border"
                      placeholder="Azúcar g/L"
                      value={r.sugar_gpl ?? ""}
                      onChange={(e) =>
                        setCalcRows((rows) => rows.map((x, i) => (i === idx ? { ...x, sugar_gpl: Number(e.target.value) } : x)))
                      }
                    />
                    <input
                      type="number"
                      className="h-9 px-2 rounded-lg border"
                      placeholder="Cantidad"
                      value={r.qty ?? ""}
                      onChange={(e) =>
                        setCalcRows((rows) => rows.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))
                      }
                    />
                    <button
                      onClick={() => setCalcRows((rows) => rows.filter((_, i) => i !== idx))}
                      className="h-9 w-9 grid place-content-center rounded-lg border hover:bg-red-50 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCalcRows((rows) => [...rows, { itemId: "", uom: "L" as Uom, qty: 0 }])}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <Plus size={14} />
                Añadir fila
              </button>
              {calcResult && (
                <div className="text-sm p-3 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold mb-1">Resultado estimado</h4>
                  <p>
                    ABV: <b>{calcResult.estimatedAbvPct}%</b> · Acidez: <b>{calcResult.estimatedAcidity_gpl} g/L</b> · Azúcar:{" "}
                    <b>{calcResult.estimatedSugar_gpl} g/L</b>
                  </p>
                </div>
              )}
            </div>
            <SpinnerButton onClick={handlePlan} loading={pending} className="w-full h-12 text-base font-semibold mt-2 bg-slate-900 text-white hover:bg-slate-700">
              Planificar producción
            </SpinnerButton>
          </>
        )}
      </div>
    </SBCard>
  );
}

export default function ExecutionPage() {
  const { data, loadInitialData } = useData(); // tu hook real (usa reload/refresh según tu implementación)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const openOrder = useMemo(
    () => (data?.productionOrders ?? []).find((o) => o.id === openOrderId) ?? null,
    [data, openOrderId]
  );
  const openBom = useMemo(
    () => (data?.billOfMaterials ?? []).find((b) => b.id === openBomId) ?? null,
    [data, openBomId]
  );

  const selectOrder = useCallback((id: string) => {
    setOpenBomId(null);
    setOpenOrderId(id);
  }, []);
  const selectBom = useCallback((id: string) => {
    setOpenOrderId(null);
    setOpenBomId(id);
  }, []);
  const handlePlanned = (orderId: string) => {
    loadInitialData?.();
    selectOrder(orderId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
      <aside className="lg:col-span-3 space-y-4">
        <SBCard title="Planificar nueva orden">
          <div className="p-2 space-y-1">
            {(data?.billOfMaterials ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => selectBom(b.id)}
                className={`w-full text-left p-2 rounded-md transition-colors text-sm font-medium ${
                  openBomId === b.id ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </SBCard>
        <SBCard title="Órdenes activas">
          <div className="p-2 space-y-1">
            {(data?.productionOrders ?? [])
              .filter((o) => o.status !== "CLOSED" && o.status !== "CANCELLED")
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => selectOrder(o.id)}
                  className={`w-full text-left p-2 hover:bg-slate-50 rounded-md ${
                    openOrderId === o.id ? "bg-slate-100" : ""
                  }`}
                >
                  {o.id} — <span className="font-semibold">{o.status}</span>
                </button>
              ))}
          </div>
        </SBCard>
      </aside>

      <main className="lg:col-span-9 min-h-[70vh]">
        <ProductionWorkstation
          order={openOrder}
          bom={openBom}
          onRefresh={() => loadInitialData?.()}
          onPlanned={handlePlanned}
          allItems={data?.items ?? []}
          allBoms={data?.billOfMaterials ?? []}
        />
      </main>
    </div>
  );
}
