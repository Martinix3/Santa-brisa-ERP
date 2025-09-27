"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Plus, Trash2, Factory as FactoryIcon, Pause, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import type { Item } from "@/domain/ssot";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field } from "@/components/forms/Field";
import { toast } from "sonner";

// Acciones del módulo Producción (previas en actions.ts)
import {
  // estas siguen usándose desde OrderDetail (server-side mutaciones por fetch interno)
  planProduction, // <- solo lo usa OrderDetail? Si no, puedes dejarlo también; el tablero NO lo usa directo
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
// Tablero de producción basado en receta/BOM
// ======================================================
type DraftRow = {
  id: string;
  bomId: string | "";
  bomName: string;
  qty: number;
  date: string;     // ISO (YYYY-MM-DD)
  preview?: any;    // resultado de previewPlanning
};

function PlanningBoard({
  boms,
  rows,
  setRows,
}: {
  boms: Array<{ id: string; name: string }>;
  rows: DraftRow[];
  setRows: React.Dispatch<React.SetStateAction<DraftRow[]>>;
}) {
  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: `draft_${Date.now()}`,
        bomId: "",
        bomName: "",
        qty: 0,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);
  const update = (id: string, patch: Partial<DraftRow>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch, preview: patch.bomId !== undefined ? undefined : r.preview } : r)));
  const remove = (id: string) => setRows((list) => list.filter((r) => r.id !== id));

  const doPreview = async (row: DraftRow) => {
    if (!row.bomId) return toast.error("Selecciona una receta/BOM.");
    if (row.qty <= 0) return toast.error("Cantidad debe ser > 0.");
    const r = await fetch("/api/production/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bomId: row.bomId, plannedQty: row.qty }),
    }).then(res => res.json());
    if (r?.ok) update(row.id, { preview: r.data });
    else toast.error(r?.message ?? "No se pudo previsualizar");
  };

  const doPlan = async (row: DraftRow) => {
    if (!row.bomId) return toast.error("Selecciona una receta/BOM.");
    if (row.qty <= 0) return toast.error("Cantidad debe ser > 0.");
    const r = await fetch("/api/production/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bomId: row.bomId, plannedQty: row.qty, name: row.bomName }),
    }).then(res => res.json());
    if (r?.ok) {
      toast.success("Orden planificada");
      remove(row.id);
    } else {
      toast.error(r?.message ?? "No se pudo planificar");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-600">Añade líneas de planificación y ajústalas según disponibilidad y specs.</p>
        <button type="button" onClick={addRow} className="h-9 px-3 rounded-lg border bg-zinc-50 hover:bg-zinc-100 text-sm">
          <Plus className="inline mr-1" size={14} /> Añadir línea
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-600">
              <th className="py-2 px-2 w-[320px]">Receta / BOM</th>
              <th className="py-2 px-2 w-28">Cantidad</th>
              <th className="py-2 px-2 w-40">Fecha</th>
              <th className="py-2 px-2">Preview</th>
              <th className="py-2 px-2 w-56">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="py-2 px-2">
                  <select
                    className="h-9 w-full border rounded-lg px-2"
                    value={r.bomId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const bom = boms.find((b) => b.id === id);
                      update(r.id, { bomId: id, bomName: bom?.name ?? "" });
                    }}
                  >
                    <option value="">— Selecciona receta/BOM —</option>
                    {boms.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min={0}
                    value={r.qty}
                    onChange={(e) => update(r.id, { qty: Number(e.target.value) })}
                    className="h-9 w-24 border rounded-lg px-2"
                  />
                </td>
                <td className="py-2 px-2">
                  <input type="date" value={r.date} onChange={(e) => update(r.id, { date: e.target.value })} className="h-9 border rounded-lg px-2"/>
                </td>
                <td className="py-2 px-2">
                  {r.preview ? (
                    <div className="text-xs">
                      {r.preview.inSpec ? (
                        <span className="px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700">En spec</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800">Fuera de spec</span>
                      )}
                      {r.preview.shortages?.length > 0 && (
                        <div className="mt-1 text-rose-700">Faltantes: {r.preview.shortages.length}</div>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => doPreview(r)} className="h-9 px-3 rounded-lg border bg-zinc-50 hover:bg-zinc-100">
                      Previsualizar
                    </button>
                  )}
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => doPlan(r)} className="h-9 px-3 rounded-lg border bg-yellow-50 hover:bg-yellow-100">
                      Planificar
                    </button>
                    <button type="button" onClick={() => remove(r.id)} className="h-9 px-3 rounded-lg border bg-white hover:bg-zinc-50">
                      Quitar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [boardRows, setBoardRows] = useState<DraftRow[]>([]);

  // Orígenes
  const boms = useMemo(() => ((santaData?.billOfMaterials ?? []) as any[]).map(b => ({ id: b.id, name: b.name ?? b.id })), [santaData]);
  const ordersAll = useMemo(() => (santaData?.productionOrders ?? []) as ProductionOrder[], [santaData]);
  const orders = useMemo(() => ordersAll, [ordersAll]);
  const allItems = useMemo(() => (santaData?.items ?? []) as Item[], [santaData]);

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

  // Panel derecho: Activas + Programadas y Partes de producción
  const active = useMemo(() => orders.filter((o: any) => ["IN_PROGRESS", "PAUSED", "QC_HOLD"].includes(o.status)), [orders]);
  const scheduled = useMemo(() => orders.filter((o: any) => o.status === "PLANNED"), [orders]);
  const hasAlert = (o: any) => o.status === "QC_HOLD" || (o.incidents?.length ?? 0) > 0;

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
                <p className="text-xs text-zinc-600">Tablero de planificación por receta/BOM. Ajusta cantidades y fechas según stocks y previsiones.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 pb-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panel principal: tablero por BOM */}
          <div className="lg:col-span-2">
            <SBCard title="Tablero de producción" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="p-3">
                <PlanningBoard boms={boms} rows={boardRows} setRows={setBoardRows} />
              </div>
            </SBCard>

            {/* Detalle (ejecución) */}
            <div className="mt-6">
              {!openOrder ? (
                <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border">
                  Selecciona una orden en el panel derecho.
                </div>
              ) : (
                <OrderDetail order={openOrder} allItems={allItems} onRefresh={refresh} />
              )}
            </div>
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-1 space-y-6">
            {/* Activas y Programadas en una sola tarjeta */}
            <SBCard title={`Órdenes (activas ${active.length} / programadas ${scheduled.length})`} accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="p-2 space-y-2">
                {[...active, ...scheduled].map((o: any) => (
                  <button key={o.id} onClick={() => select(o.id)} className="w-full text-left rounded-lg p-3 border hover:bg-zinc-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{o.name || o.id}</div>
                        <div className="text-xs text-zinc-500 truncate">
                          {o.stage} • {o.plannedQty} {o.baseUnit}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">{o.status}</span>
                        {hasAlert(o) && <div className="text-[11px] text-amber-700 mt-1">⚠️ alerta</div>}
                      </div>
                    </div>
                  </button>
                ))}
                {active.length + scheduled.length === 0 && (
                  <div className="text-sm text-zinc-500 px-2 py-6 text-center">Sin órdenes activas o programadas.</div>
                )}
              </div>
            </SBCard>

            {/* Partes de producción (detalle breve de cada orden) */}
            <SBCard title="Partes de producción" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="p-2 space-y-2">
                {orders.map((o:any) => (
                  <div key={o.id} className="rounded-lg border p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{o.name || o.id}</div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">{o.status}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {o.stage} • {o.plannedQty} {o.baseUnit}
                      {o.lotNumber ? ` • Lote ${o.lotNumber}` : ""}
                      {o.startedAt ? ` • Inicio ${o.startedAt}` : ""}
                      {o.endedAt ? ` • Fin ${o.endedAt}` : ""}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="text-sm text-zinc-500 px-2 py-6 text-center">Sin registros.</div>}
              </div>
            </SBCard>
          </div>
        </div>
      </main>
    </>
  );
}
