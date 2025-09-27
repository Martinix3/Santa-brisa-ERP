// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Plus, Trash2, Factory as FactoryIcon, Pause, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import type { Item } from "@/domain/ssot";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field } from "@/components/forms/Field";
import { toast } from "sonner";

// Acciones del módulo Producción (previas en actions.ts)
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
} from "../actions";

// ===== Tipos locales mínimos (alineados a actions.ts) =====
type ProductionOrder = any; // Usa tu tipo real si lo tienes exportado desde el SSOT

// ===== Helpers visuales reutilizables =====
function SectionCard({ title, hint, badge, children }: { title: string; hint?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {hint && <p className="text-xs text-zinc-600">{hint}</p>}
        </div>
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white">{badge}</span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md bg-white ${className}`}>{children}</div>;
}

// ======================================================
// Cards de producto (grid)
// ======================================================
function ProductCard({ product, onClick }: { product: Item; onClick: () => void }) {
  const badge =
    product.category === "fg"
      ? "Producto final"
      : product.category === "intermediate"
      ? "Intermedio"
      : product.category === "pack"
      ? "Packaging"
      : "Materia prima";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start w-full rounded-xl border bg-white hover:bg-zinc-50 transition-colors overflow-hidden"
      title={product.name}
    >
      <div className="w-full aspect-[4/3] bg-zinc-100 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-zinc-400">Sin foto</div>
        )}
      </div>
      <div className="w-full p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-left line-clamp-2">{product.name}</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-600 shrink-0">{badge}</span>
        </div>
      </div>
    </button>
  );
}

// ======================================================
// Diálogo de acción: Producir intermedio / Envasar final
// ======================================================
function ProductActionDialog({
  product,
  onClose,
  onCreated,
}: {
  product: Item | null;
  onClose: () => void;
  onCreated: (newId: string) => void;
}) {
  const [qty, setQty] = useState<number>(1);
  const [pending, startTransition] = useTransition();
  if (!product) return null;
  const canProduce = !!product.bomProduccionId;
  const canPack = !!product.bomEnvasadoId;
  const run = (mode: "produce" | "pack") =>
    startTransition(async () => {
      const bomId = mode === "produce" ? product.bomProduccionId : product.bomEnvasadoId;
      if (!bomId) { toast.error("Este producto no tiene BOM configurado para esa acción."); return; }
      if (qty <= 0) { toast.error("Cantidad debe ser > 0"); return; }
      const res = await planProduction({ bomId, plannedQty: qty });
      if (res.ok) { toast.success("Orden planificada"); onCreated(res.data.id); onClose(); }
      else { toast.error(res.message ?? "No se pudo planificar"); }
    });
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">¿Qué quieres hacer con {product.name}?</h3>
        <p className="text-sm text-zinc-600 mt-1">Elige la acción y cantidad para crear una nueva orden.</p>
        <div className="mt-4">
          <label className="block text-sm mb-1">Cantidad</label>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-32 h-10 px-3 rounded-lg border" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SpinnerButton disabled={!canProduce} loading={pending} onClick={() => run("produce")} className={`sb-btn-primary ${!canProduce ? "opacity-50 cursor-not-allowed" : ""}`}>Producir intermedio</SpinnerButton>
          <SpinnerButton disabled={!canPack} loading={pending} onClick={() => run("pack")} className={`sb-btn-secondary ${!canPack ? "opacity-50 cursor-not-allowed" : ""}`}>Envasar / embotellar</SpinnerButton>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-zinc-50" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}


// ===== Detalle de Orden (panel derecho) =====
function OrderDetail({ order, allItems, onRefresh }: { order: ProductionOrder; allItems: Item[]; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [ops, setOps] = useState<number>(order?.operatorsCount ?? 0);
  const [ack, setAck] = useState<boolean>(!!order?.protocolsAcknowledged);
  const [parentLot, setParentLot] = useState<string>(order?.parentLotNumber ?? "");

  // consumo
  const [consLines, setConsLines] = useState<
    Array<{ itemId: string; uom: "L" | "kg" | "unit"; qty: number; role?: "FORMULA" | "PACKAGING" | "COST_ONLY" }>
  >(order?.consumption ?? []);
  const [outputQty, setOutputQty] = useState<number>(order?.output?.[0]?.qty ?? order?.plannedQty ?? 0);

  // incidencias
  const [incSeverity, setIncSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [incSummary, setIncSummary] = useState("");
  const [incDetails, setIncDetails] = useState("");

  // calculadora
  const [calcRows, setCalcRows] = useState<
    Array<{ itemId: string; abvPct?: number; acidity_gpl?: number; sugar_gpl?: number; uom: "L" | "kg" | "unit"; qty: number }>
  >(order?.calcInput?.raws ?? []);

  useEffect(() => {
    setOps(order?.operatorsCount ?? 0);
    setAck(!!order?.protocolsAcknowledged);
  }, [order?.operatorsCount, order?.protocolsAcknowledged]);

  const accent = "[--sb-accent-produc:182_25%_47%]";

  function updateCons(idx: number, v: any) {
    setConsLines((l) => l.map((x, i) => (i === idx ? v : x)));
  }
  function updateCalc(idx: number, v: any) {
    setCalcRows((l) => l.map((x, i) => (i === idx ? v : x)));
  }

  if (!order) return <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border">Selecciona una orden.</div>;

  const status = order.status as string;
  const isProd = order.stage === "PRODUCCION";

  return (
    <SBCard title={order.name ?? order.id} accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
      {/* Header acciones rápidas */}
      <div className="p-4 border-b rounded-t-2xl bg-white">
        <div className="flex flex-wrap items-center gap-2">
          {status === "PLANNED" && (
            <SpinnerButton
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await startProduction(order.id);
                  r?.ok ? toast.success("Orden iniciada") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
              className={`sb-btn-primary ${accent}`}
            >
              Iniciar
            </SpinnerButton>
          )}
          {status === "IN_PROGRESS" && (
            <>
              <SpinnerButton
                className="sb-btn-secondary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await pauseProduction(order.id);
                    r?.ok ? toast.message("Orden pausada") : toast.error(r?.message ?? "Error");
                    onRefresh();
                  })
                }
              >
                <Pause size={14} className="mr-1 inline" />
                Pausar
              </SpinnerButton>
              <SpinnerButton
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await closeProduction(order.id);
                    r?.ok ? toast.success("Orden cerrada") : toast.error(r?.message ?? "Error");
                    onRefresh();
                  })
                }
                className={`sb-btn-primary ${accent}`}
              >
                <CheckCircle2 size={14} className="mr-1 inline" />
                Cerrar
              </SpinnerButton>
            </>
          )}
          {status === "PAUSED" && (
            <SpinnerButton
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await resumeProduction(order.id);
                  r?.ok ? toast.success("Orden reanudada") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
              className={`sb-btn-primary ${accent}`}
            >
              <Play size={14} className="mr-1 inline" />
              Reanudar
            </SpinnerButton>
          )}
          {status === "QC_HOLD" && (
            <div className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800 flex items-center gap-1">
              <AlertTriangle size={12} />
              En espera de QC
            </div>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-4 space-y-6">
        {/* Protocolos + Operarios */}
        <SectionCard title="Seguridad y personal" hint="Confirmación de protocolos y dotación de operarios" badge="QA">
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
          <div className="flex items-end gap-3 mt-3">
            <div>
              <label className="block text-sm mb-1">N.º de operarios</label>
              <input type="number" min={0} className="w-32 h-10 px-3 rounded-lg border" value={ops} onChange={(e) => setOps(Number(e.target.value))} />
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
        </SectionCard>

        {/* Consumo */}
        <SectionCard title="Consumo real" hint="Registra el consumo real por línea" badge="IN">
          <div className="space-y-2">
            {consLines.map((l, idx) => (
              <Row key={idx}>
                <Field label="Ítem" name={`in.${idx}.itemId`}>
                  <input
                    className="w-full h-10 px-3 rounded-lg border"
                    value={l.itemId}
                    onChange={(e) => updateCons(idx, { ...l, itemId: e.target.value })}
                    placeholder="itemId o SKU"
                  />
                </Field>
                <Field label="UoM" name={`in.${idx}.uom`}>
                  <select
                    className="w-full h-10 px-3 rounded-lg border"
                    value={l.uom}
                    onChange={(e) => updateCons(idx, { ...l, uom: e.target.value as any })}
                  >
                    <option value="L">L</option>
                    <option value="kg">kg</option>
                    <option value="unit">unit</option>
                  </select>
                </Field>
                <Field label="Cantidad" name={`in.${idx}.qty`}>
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border"
                    value={l.qty}
                    onChange={(e) => updateCons(idx, { ...l, qty: Number(e.target.value) })}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setConsLines((list) => list.filter((_, i) => i !== idx))}
                  className="h-10 px-2 border rounded-lg bg-zinc-50 hover:bg-zinc-100"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </Row>
            ))}
            <button
              type="button"
              onClick={() => setConsLines([...consLines, { itemId: "", uom: "L", qty: 0, role: "FORMULA" }])}
              className="mt-2 px-3 py-1.5 text-sm rounded-lg border bg-zinc-50 hover:bg-zinc-100"
            >
              <Plus size={14} className="inline mr-1" /> Añadir línea
            </button>
            <div className="flex gap-2">
              <SpinnerButton
                className="sb-btn-secondary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await recordConsumption(order.id, consLines);
                    r?.ok ? toast.success("Consumo guardado") : toast.error(r?.message ?? "Error");
                    onRefresh();
                  })
                }
              >
                Guardar consumo
              </SpinnerButton>
            </div>
          </div>
        </SectionCard>

        {/* Output y Lote */}
        <SectionCard title="Resultado" hint={isProd ? "Salida de Producto Intermedio" : "Salida de Producto Final"} badge="OUT">
          {!isProd && (
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="block text-sm mb-1">Lote SF (padre)</label>
                <input className="w-full h-10 px-3 rounded-lg border" value={parentLot} onChange={(e) => setParentLot(e.target.value)} />
              </div>
              <SpinnerButton
                className="sb-btn-secondary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await recordPackagingParent(order.id, parentLot);
                    r?.ok ? toast.success("Lote SF asignado") : toast.error(r?.message ?? "Error");
                    onRefresh();
                  })
                }
              >
                Usar lote SF
              </SpinnerButton>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm mb-1">Cantidad salida</label>
              <input
                type="number"
                className="w-40 h-10 px-3 rounded-lg border"
                value={outputQty}
                onChange={(e) => setOutputQty(Number(e.target.value))}
              />
            </div>
            <SpinnerButton
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await recordOutput(order.id, outputQty);
                  r?.ok ? toast.success("Output registrado") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
              className="sb-btn-primary"
            >
              Registrar output
            </SpinnerButton>
          </div>
          {order.lotNumber && (
            <div className="text-xs mt-2">
              Lote generado: <b>{order.lotNumber}</b>
            </div>
          )}
        </SectionCard>

        {/* QC */}
        <SectionCard title="Control de Calidad" hint="Aprobación, rechazo o exención" badge="QC">
          <div className="flex gap-2">
            <SpinnerButton
              className="sb-btn-secondary"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await setQcResult(order.id, { status: "PASSED" });
                  r?.ok ? toast.success("QC OK") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
            >
              Aprobar
            </SpinnerButton>
            <SpinnerButton
              className="sb-btn-destructive"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await setQcResult(order.id, { status: "FAILED", remarks: "KO" });
                  r?.ok ? toast.message("QC KO") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
            >
              Rechazar
            </SpinnerButton>
            <SpinnerButton
              className="sb-btn-ghost"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await setQcResult(order.id, { status: "WAIVED", remarks: "Exento" });
                  r?.ok ? toast.message("QC Exento") : toast.error(r?.message ?? "Error");
                  onRefresh();
                })
              }
            >
              Exento
            </SpinnerButton>
          </div>
        </SectionCard>

        {/* Incidencias */}
        <SectionCard title="Incidencias" hint="Registra y consulta incidencias de la orden" badge="INC">
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm mb-1">Severidad</label>
              <select className="w-full h-10 px-3 rounded-lg border" value={incSeverity} onChange={(e) => setIncSeverity(e.target.value as any)}>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Resumen</label>
              <input className="w-full h-10 px-3 rounded-lg border" value={incSummary} onChange={(e) => setIncSummary(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm mb-1">Detalles</label>
              <textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border" value={incDetails} onChange={(e) => setIncDetails(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <SpinnerButton
              className="sb-btn-secondary"
              disabled={!incSummary}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await addIncident(order.id, { severity: incSeverity, summary: incSummary, details: incDetails });
                  r?.ok ? toast.success("Incidencia añadida") : toast.error(r?.message ?? "Error");
                  setIncSummary("");
                  setIncDetails("");
                  onRefresh();
                })
              }
            >
              Añadir incidencia
            </SpinnerButton>
          </div>
          <div className="text-sm opacity-80 mt-2">
            {(order.incidents ?? []).length ? (
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
        </SectionCard>

        {/* Calculadora (stub) */}
        <SectionCard title="Calculadora de ajustes (estimación)" hint="Promedios ponderados por volumen" badge="CALC">
          <div className="space-y-2">
            {calcRows.map((r, idx) => (
              <Row key={idx}>
                <Field label="Item" name={`calc.${idx}.itemId`}>
                  <input className="w-full h-10 px-3 rounded-lg border" value={r.itemId} onChange={(e) => updateCalc(idx, { ...r, itemId: e.target.value })} />
                </Field>
                <Field label="ABV %" name={`calc.${idx}.abv`}>
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border"
                    value={r.abvPct ?? ""}
                    onChange={(e) => updateCalc(idx, { ...r, abvPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Acidez g/L" name={`calc.${idx}.ac`}>
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border"
                    value={r.acidity_gpl ?? ""}
                    onChange={(e) => updateCalc(idx, { ...r, acidity_gpl: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Azúcar g/L" name={`calc.${idx}.sug`}>
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border"
                    value={r.sugar_gpl ?? ""}
                    onChange={(e) => updateCalc(idx, { ...r, sugar_gpl: Number(e.target.value) })}
                  />
                </Field>
                <Field label="UoM" name={`calc.${idx}.uom`}>
                  <select className="w-full h-10 px-3 rounded-lg border" value={r.uom} onChange={(e) => updateCalc(idx, { ...r, uom: e.target.value as any })}>
                    <option value="L">L</option>
                    <option value="kg">kg</option>
                    <option value="unit">unit</option>
                  </select>
                </Field>
                <Field label="Cant." name={`calc.${idx}.qty`}>
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border"
                    value={r.qty}
                    onChange={(e) => updateCalc(idx, { ...r, qty: Number(e.target.value) })}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setCalcRows((list) => list.filter((_, i) => i !== idx))}
                  className="h-10 px-2 border rounded-lg bg-zinc-50 hover:bg-zinc-100"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </Row>
            ))}
            <button
              type="button"
              onClick={() => setCalcRows([...calcRows, { itemId: "", uom: "L", qty: 0 } as any])}
              className="mt-2 px-3 py-1.5 text-sm rounded-lg border bg-zinc-50 hover:bg-zinc-100"
            >
              <Plus size={14} className="inline mr-1" /> Añadir fila
            </button>
            <div className="flex gap-2">
              <SpinnerButton
                className="sb-btn-secondary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setCalculatorInput(order.id, { raws: calcRows });
                    r?.ok ? toast.success("Cálculo actualizado") : toast.error(r?.message ?? "Error");
                    onRefresh();
                  })
                }
              >
                Calcular
              </SpinnerButton>
            </div>
            {order.calcResult && (
              <div className="text-sm">
                <div>
                  ABV estimado: <b>{order.calcResult.estimatedAbvPct ?? "—"}%</b>
                </div>
                <div>
                  Acidez estimada: <b>{order.calcResult.estimatedAcidity_gpl ?? "—"} g/L</b>
                </div>
                <div>
                  Azúcares estimados: <b>{order.calcResult.estimatedSugar_gpl ?? "—"} g/L</b>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Footer */}
      <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
        {status !== "CLOSED" && (
          <SpinnerButton
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await closeProduction(order.id);
                r?.ok ? toast.success("Orden cerrada") : toast.error(r?.message ?? "Error");
                onRefresh();
              })
            }
            className="sb-btn-primary"
          >
            Cerrar orden
          </SpinnerButton>
        )}
      </div>
    </SBCard>
  );
}

// ===== Página =====
export default function ProductionPage() {
  const { data: santaData } = useData();
  const [openOrder, setOpenOrder] = useState<ProductionOrder | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);

  // Orígenes
  const ordersAll = useMemo(() => (santaData?.productionOrders ?? []) as ProductionOrder[], [santaData]);
  const orders = useMemo(() => ordersAll, [ordersAll]);
  const allItems = useMemo(() => (santaData?.items ?? []) as Item[], [santaData]);
  const products = useMemo(() => allItems.filter(i => i.category === "intermediate" || i.category === "fg"), [allItems]);

  const select = useCallback(
    (id: string) => {
      const found = ordersAll.find((x: any) => x.id === id);
      if (found) setOpenOrder(found);
    },
    [ordersAll]
  );

  // Refresco (si tu dataprovider no autopropaga, aquí forzarías un fetch)
  const refresh = useCallback(() => {}, []);

  const accent = "[--sb-accent-produc:182_25%_47%]";

  return (
    <>
      {/* HEADER sticky */}
      <header
        aria-label="Sección Producción"
        className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      >
        <div className="mx-auto max-w-screen-2xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl grid place-items-center ring-1 ring-black/5 bg-[hsl(var(--sb-accent-produc)/0.12)] text-[hsl(var(--sb-accent-produc))] ${accent}`}
                aria-hidden="true"
                title="Producción"
              >
                <FactoryIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">Producción</h1>
                <p className="text-xs text-zinc-600">Elige producto para crear orden. Consulta órdenes activas y terminadas.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SUBHEADER */}
      <div className="mx-auto max-w-screen-2xl px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Órdenes de producción</h2>
            <p className="text-sm text-zinc-500">Estados: PLANNED, IN_PROGRESS, PAUSED, QC_HOLD, CLOSED</p>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="mx-auto max-w-screen-2xl px-6 pb-24">
        {/* === Grid de productos (entrada visual) === */}
        <section className="mb-6">
          <SBCard title="Productos" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-sm text-zinc-500 px-3 py-8 text-center border rounded-xl bg-zinc-50">
                  No hay productos configurados (intermediate/fg).
                </div>
              )}
            </div>
          </SBCard>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista */}
          <div className="lg:col-span-1">
            <SBCard title="Órdenes" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="px-2 pt-2 pb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-600">{orders.length}</span>
              </div>

              <div className="p-2 space-y-1">
                {orders.map((o: any) => {
                  const isActive = openOrder?.id === o.id;
                  return (
                    <div
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(o.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(o.id)}
                      className={`rounded-lg p-3 border transition-colors outline-none cursor-pointer ${
                        isActive
                          ? "bg-yellow-50 border-yellow-200"
                          : `border-transparent hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent-produc))] focus-visible:ring-offset-2`
                      }`}
                      aria-label={`Abrir orden ${o.name || o.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-zinc-800">{o.name || o.id}</p>
                          <p className="text-xs text-zinc-500">
                            {o.stage} • {o.plannedQty} {o.baseUnit}
                          </p>
                          <span className="mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">
                            {o.status}
                          </span>
                          {o.lotNumber && (
                            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">
                              Lote: {o.lotNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SBCard>
          </div>

          {/* Detalle */}
          <div className="lg:col-span-2">
            {!openOrder ? (
              <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border">
                Selecciona una orden.
              </div>
            ) : (
              <OrderDetail order={openOrder} allItems={allItems} onRefresh={refresh} />
            )}
          </div>
        </div>

        {/* FAB crear (abre el plan rápido del header) */}
        {/* Ya no necesitamos el FAB porque creamos desde el grid */}
      </main>

      {/* Diálogo de acción por producto */}
      <ProductActionDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onCreated={(id) => {
          // Opcional: autoseleccionar cuando aparezca en la lista
        }}
      />
    </>
  );
}
