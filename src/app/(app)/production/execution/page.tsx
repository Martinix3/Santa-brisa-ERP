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
  previewPlanning,          // ⬅️ volvemos a usar previsualización en el tablero
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
// Lista compacta de productos
// ======================================================
function ProductRow({ product, onClick }: { product: Item; onClick: () => void }) {
  const badge = product.category === "fg" ? "Producto final" :
                product.category === "intermediate" ? "Intermedio" :
                product.category === "pack" ? "Packaging" : "Materia prima";
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-white hover:bg-zinc-50">
      <div className="min-w-0">
        <p className="font-medium truncate">{product.name}</p>
        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-600">{badge}</span>
      </div>
      <button onClick={onClick} className="px-3 h-8 rounded-lg border bg-zinc-50 hover:bg-zinc-100 text-sm">Añadir al tablero</button>
    </li>
  );
}

// ======================================================
// Diálogo: solo elegir acción → añade al tablero (no pide cantidad)
// ======================================================
function ProductActionDialog({
  product,
  onClose,
  onAddDraft,
}: {
  product: Item | null;
  onClose: () => void;
  onAddDraft: (payload: { product: Item; mode: "produce" | "pack" }) => void;
}) {
  if (!product) return null;
  const canProduce = !!product.bomProduccionId;
  const canPack = !!product.bomEnvasadoId;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">¿Qué quieres hacer con {product.name}?</h3>
        <p className="text-sm text-zinc-600 mt-1">Selecciona la acción. La cantidad y la fecha se definen en el tablero.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button disabled={!canProduce} onClick={() => { if (canProduce) { onAddDraft({ product, mode: "produce" }); onClose(); } }}
                  className={`h-10 rounded-lg border ${!canProduce ? "opacity-50 cursor-not-allowed" : "bg-yellow-50 hover:bg-yellow-100"}`}>Producir intermedio</button>
          <button disabled={!canPack} onClick={() => { if (canPack) { onAddDraft({ product, mode: "pack" }); onClose(); } }}
                  className={`h-10 rounded-lg border ${!canPack ? "opacity-50 cursor-not-allowed" : "bg-white hover:bg-zinc-50"}`}>Envasar / embotellar</button>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-zinc-50" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// Tablero de producción (editable)
// ======================================================
type DraftRow = {
  id: string;
  productId: string;
  productName: string;
  mode: "produce" | "pack";
  bomId: string;
  qty: number;
  date: string; // ISO (solo fecha)
  preview?: any; // resultado de previewPlanning
};

function PlanningBoard({ rows, setRows }: { rows: DraftRow[]; setRows: React.Dispatch<React.SetStateAction<DraftRow[]>> }) {
  const update = (id: string, patch: Partial<DraftRow>) => setRows(list => list.map(r => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) => setRows(list => list.filter(r => r.id !== id));

  const doPreview = async (row: DraftRow) => {
    if (row.qty <= 0) { toast.error("Cantidad > 0"); return; }
    const res = await previewPlanning({ bomId: row.bomId, plannedQty: row.qty });
    if (res.ok) update(row.id, { preview: res.data });
    else toast.error(res.message ?? "No se pudo previsualizar");
  };

  const doPlan = async (row: DraftRow) => {
    if (row.qty <= 0) { toast.error("Cantidad > 0"); return; }
    const res = await planProduction({ bomId: row.bomId, plannedQty: row.qty });
    if (res.ok) { toast.success("Orden planificada"); remove(row.id); }
    else toast.error(res.message ?? "No se pudo planificar");
  };

  if (rows.length === 0) return (
    <div className="text-sm text-zinc-500 px-3 py-6 text-center border rounded-xl bg-zinc-50">Añade productos desde la lista para planificar.</div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-600">
            <th className="py-2 px-2">Producto</th>
            <th className="py-2 px-2">Acción</th>
            <th className="py-2 px-2 w-28">Cantidad</th>
            <th className="py-2 px-2 w-40">Fecha</th>
            <th className="py-2 px-2">Preview</th>
            <th className="py-2 px-2 w-56">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t align-top">
              <td className="py-2 px-2">{r.productName}</td>
              <td className="py-2 px-2">{r.mode === "produce" ? "Producir intermedio" : "Envasar/embotellar"}</td>
              <td className="py-2 px-2">
                <input type="number" min={1} value={r.qty} onChange={e => update(r.id, { qty: Number(e.target.value) })}
                       className="h-9 w-24 border rounded-lg px-2" />
              </td>
              <td className="py-2 px-2">
                <input type="date" value={r.date} onChange={e => update(r.id, { date: e.target.value })}
                       className="h-9 border rounded-lg px-2"/>
              </td>
              <td className="py-2 px-2">
                {r.preview ? (
                  <div className="text-xs">
                    {r.preview.inSpec ? <span className="px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700">En spec</span>
                                      : <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800">Fuera de spec</span>}
                    {r.preview.shortages?.length > 0 && (
                      <div className="mt-1 text-rose-700">Faltantes: {r.preview.shortages.length}</div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => doPreview(r)} className="h-9 px-3 rounded-lg border bg-zinc-50 hover:bg-zinc-100">Previsualizar</button>
                )}
              </td>
              <td className="py-2 px-2">
                <div className="flex gap-2">
                  <button onClick={() => doPlan(r)} className="h-9 px-3 rounded-lg border bg-yellow-50 hover:bg-yellow-100">Planificar</button>
                  <button onClick={() => remove(r.id)} className="h-9 px-3 rounded-lg border bg-white hover:bg-zinc-50">Quitar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [boardRows, setBoardRows] = useState<DraftRow[]>([]);

  // Orígenes
  const ordersAll = useMemo(() => (santaData?.productionOrders ?? []) as ProductionOrder[], [santaData]);
  const orders = useMemo(() => ordersAll, [ordersAll]);
  const allItems = useMemo(() => (santaData?.items ?? []) as Item[], [santaData]);
  const items = useMemo(() => allItems.filter(i => i.category === "intermediate" || i.category === "fg"), [allItems]);

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
                <p className="text-xs text-zinc-600">Añade productos al tablero, ajusta cantidades/fechas, previsualiza y planifica.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Columna izquierda: lista de productos */}
          <section>
            <SBCard title="Productos" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <ul className="p-3 space-y-2">
                {items.map(p => <ProductRow key={p.id} product={p} onClick={() => setSelectedProduct(p)} />)}
                {items.length === 0 && <li className="text-sm text-zinc-500 px-3 py-8 text-center border rounded-xl bg-zinc-50">No hay productos configurados.</li>}
              </ul>
            </SBCard>

            <div className="mt-6">
              <SBCard title="Tablero de producción" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
                <div className="p-3">
                  <PlanningBoard rows={boardRows} setRows={setBoardRows} />
                </div>
              </SBCard>
            </div>
          </section>

          {/* Columna derecha: órdenes (activas y terminadas) */}
          <section className="space-y-6">
            <SBCard title={`Órdenes activas`} accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="p-2 space-y-1">
                {orders
                  .filter((o: any) => ["planned", "released", "wip"].includes(o.status))
                  .map((o: any) => (
                    <div
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(o.id)}
                      className={`rounded-lg p-3 border transition-colors outline-none cursor-pointer ${openOrder?.id === o.id ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-zinc-50"}`}
                      aria-label={`Abrir orden ${o.name || o.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-zinc-800">{o.name || o.id}</p>
                          <p className="text-xs text-zinc-500">{o.stage} • {o.plannedQty} {o.baseUnit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </SBCard>
            <SBCard title={`Órdenes terminadas`} accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="p-2 space-y-1">
                {orders
                  .filter((o: any) => ["done", "cancelled"].includes(o.status))
                  .map((o: any) => (
                    <div
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(o.id)}
                      className={`rounded-lg p-3 border transition-colors outline-none cursor-pointer ${openOrder?.id === o.id ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-zinc-50"}`}
                      aria-label={`Abrir orden ${o.name || o.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-zinc-800">{o.name || o.id}</p>
                          <p className="text-xs text-zinc-500">{o.stage} • {o.plannedQty} {o.baseUnit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </SBCard>
          </section>
        </div>
        <div className="mt-6">
          {openOrder && <OrderDetail order={openOrder} allItems={allItems} onRefresh={refresh} />}
        </div>
      </main>

      {/* Diálogo de acción por producto */}
      <ProductActionDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddDraft={({ product, mode }) => {
          const bomId = mode === "produce" ? product.bomProduccionId! : product.bomEnvasadoId!;
          if (!bomId) { toast.error("El producto no tiene BOM para esa acción."); return; }
          const today = new Date().toISOString().slice(0,10);
          setBoardRows(r => [...r, {
            id: `draft_${Date.now()}`,
            productId: product.id,
            productName: product.name,
            mode,
            bomId,
            qty: 1,
            date: today,
          }]);
        }}
      />
    </>
  );
}
