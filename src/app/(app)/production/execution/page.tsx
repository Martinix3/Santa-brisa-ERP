
"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Plus, Trash2, Factory as FactoryIcon, Pause, Play, CheckCircle2, AlertTriangle, ListFilter } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { useData } from "@/lib/dataprovider";
import { SB_COLORS } from "@/domain/ssot";
import { Field } from "@/components/forms/Field";
import { toast } from "sonner";
import type { Item } from "@/domain/ssot";

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
  cancelProduction,
  previewPlanning,
} from "../actions";

// ---- Aliases para evitar choques de tipos SSOT
type Uom = "L" | "kg" | "unit";
type ProductionOrderUI = any;
type BillOfMaterialUI = any;


// ===== Helpers visuales reutilizables =====
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

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md bg-white ${className}`}>{children}</div>;
}

// ======================================================
// PLANNING BOARD (planificación en vivo por BOM)
// ======================================================
function PlanningBoard({ bom, onPlanned }: { bom: any; onPlanned: (id: string) => void }) {
  const [qty, setQty] = useState<number>(0);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  // --- helpers de componentes del BOM ---
  const baseComponents = React.useMemo(() => {
    const raw = bom?.components ?? bom?.lines ?? bom?.materials ?? [];
    // Normaliza a { itemId, qty, uom, role }
    return (raw as any[]).map((c) => ({
      itemId: c.itemId ?? c.componentId ?? c.item ?? c.sku ?? "—",
      qty: typeof c.qty === "number" ? c.qty : c.quantityPerBase ?? c.quantity ?? 0,
      uom: c.uom ?? c.unit ?? c.baseUnit ?? c.measure ?? "",
      role: c.role ?? c.kind ?? c.type ?? undefined,
    }));
  }, [bom]);

  // recalcula preview en vivo cada vez que cambian qty/date
  const lastPreviewPayload = React.useRef<string>("");
  React.useEffect(() => {
    const payload = JSON.stringify({ bomId: bom?.id, plannedQty: qty });

    if (!bom?.id || qty <= 0) {
      setPreview(null);
      return;
    }
    if (payload === lastPreviewPayload.current) return;
    lastPreviewPayload.current = payload;

    const ctrl = new AbortController();
    let active = true;
    setLoading(true);
    previewPlanning({ bomId: bom.id, plannedQty: qty })
      .then((res) => {
        if (!active) return;
        if (res?.ok) setPreview(res.data);
        else setPreview(null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; ctrl.abort(); };
  }, [bom?.id, qty]);

  async function handlePlan() {
    if (!bom?.id || qty <= 0) {
      toast.error("Indica una cantidad > 0");
      return;
    }
    setCreating(true);
    const res = await planProduction({
      bomId: bom.id,
      plannedQty: qty,
      plannedDate: date || undefined,
      name: bom.name,
    });
    setCreating(false);
    if (res?.ok) {
      toast.success("Producción planificada");
      onPlanned(res.data.id);
    } else {
      toast.error(res?.message ?? "No se pudo planificar");
    }
  }

  // Etiquetas visuales según spec
  const specBadge =
    preview?.inSpec === true
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : preview?.inSpec === false
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-white text-zinc-700";

  return (
    <SBCard
      title={`Planificación: ${bom?.name ?? bom?.id ?? "—"}`}
      accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}
    >
      <div className="p-4 space-y-6">
        {/* Controles básicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Cantidad a producir</label>
            <input
              type="number"
              min={1}
              className="w-full h-10 px-3 rounded-lg border"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha prevista</label>
            <input
              type="date"
              className="w-full h-10 px-3 rounded-lg border"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {loading && <div className="text-sm text-zinc-500">Calculando disponibilidad…</div>}

        {/* === Fórmula base por 1 unidad === */}
        <div className="rounded-lg border p-3">
          <h4 className="font-medium">Fórmula (por 1 {bom?.baseUnit ?? "unidad"})</h4>
          {baseComponents.length === 0 ? (
            <div className="text-sm text-zinc-500 mt-2">Esta receta no tiene componentes definidos.</div>
          ) : (
            <ul className="mt-2 text-sm space-y-1">
              {baseComponents.map((c, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="truncate">{c.itemId}</span>
                  <span className="shrink-0 tabular-nums">{c.qty} {c.uom}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* === Necesario para la cantidad === */}
        {qty > 0 && baseComponents.length > 0 && (
          <div className="rounded-lg border p-3">
            <h4 className="font-medium">Necesario para {qty} {bom?.baseUnit ?? "u"}</h4>
            <ul className="mt-2 text-sm space-y-1">
              {baseComponents.map((c, i) => {
                const need = (c.qty || 0) * qty;
                return (
                  <li key={i} className="flex items-center justify-between">
                    <span className="truncate">{c.itemId}</span>
                    <span className="shrink-0 tabular-nums">{need} {c.uom}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* === Disponibilidad / COA estimado (preview) === */}
        {qty > 0 && (
          <div className="space-y-3">
            {preview && (
              <>
                <div className="text-sm">
                  <b>COA estimado</b>: {preview.estimates?.abvPct ?? "—"}% ABV,{" "}
                  {preview.estimates?.acidity_gpl ?? "—"} g/L acidez,{" "}
                  {preview.estimates?.sugar_gpl ?? "—"} g/L azúcares
                </div>
                {Array.isArray(preview.shortages) && preview.shortages.length > 0 ? (
                  <div className="text-sm text-rose-700">
                    ⚠️ Faltantes:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {preview.shortages.map((s: any, i: number) => (
                        <li key={i}>
                          {s.itemId}: falta {s.missing} {s.uom} (req {s.required}, disp {s.available})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm text-emerald-700">✅ Todo cubre según stock reservado.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Botón principal */}
        <SpinnerButton
          loading={creating}
          onClick={handlePlan}
          className="sb-btn-primary w-full h-12 text-base font-semibold"
        >
          Planificar producción
        </SpinnerButton>
      </div>
    </SBCard>
  );
}

// ======================================================
// Detalle de Orden (panel derecho)
// ======================================================
function OrderDetail({ order, allItems, onRefresh, onClose }: { order: ProductionOrderUI; allItems: Item[]; onRefresh: () => void; onClose: () => void }) {
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
  const [calcRows, setCalcRows] = useState<CalcRow[]>(order?.calcInput?.raws ?? []);
  const debounceRef = React.useRef<any>(null);
  type CalcResult = {
    estimatedAbvPct?: number;
    estimatedAcidity_gpl?: number;
    estimatedSugar_gpl?: number;
  } | null;
  const [calcResult, setCalcResult] = useState<CalcResult>(null);

  useEffect(() => {
    setOps(order?.operatorsCount ?? 0);
    setAck(!!order?.protocolsAcknowledged);
  }, [order?.operatorsCount, order?.protocolsAcknowledged]);

  useEffect(() => {
    const rows = calcRows.filter(r => r.itemId && r.qty > 0);
    clearTimeout(debounceRef.current);
    if (rows.length === 0) {
      setCalcResult(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res: any = await setCalculatorInput("planning-" + (order?.id ?? "temp"), { raws: rows } as any);
      if (res?.ok) setCalcResult((res.data?.calcResult as CalcResult) ?? null);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [calcRows, order?.id]);

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
  const hasShortages = (order.shortages?.length ?? 0) > 0;
  const hasParentLotIfNeeded = isProd ? true : (order.parentLotNumber || parentLot).trim().length > 0;

  // Reglas de habilitación
  const canStart = status === "PLANNED" && ack && !hasShortages && hasParentLotIfNeeded;
  const canPause = status === "IN_PROGRESS";
  const canResume = status === "PAUSED";
  const canCancel = status === "PLANNED";
  const canFinish = status === "IN_PROGRESS" || status === "PAUSED"; // finalizar siempre disponible una vez iniciada

  // Labels según estado
  const primaryLabel =
    status === "PLANNED" ? "Iniciar" :
    status === "IN_PROGRESS" ? "Pausar" :
    status === "PAUSED" ? "Reanudar" : "Iniciar";
  const secondaryLabel = status === "PLANNED" ? "Cancelar" : "Terminar";


  return (
    <SBCard title={order.name ?? order.id} accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
      {/* Header acciones rápidas → 2 botones grandes contextuales */}
      <div className="p-4 border-b rounded-t-2xl bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <SpinnerButton
            loading={pending}
            disabled={
              (status === "PLANNED" && !canStart) ||
              (status === "IN_PROGRESS" && !canPause) ||
              (status === "PAUSED" && !canResume)
            }
            onClick={() =>
              startTransition(async () => {
                let r;
                if (status === "PLANNED") r = await startProduction(order.id);
                else if (status === "IN_PROGRESS") r = await pauseProduction(order.id);
                else if (status === "PAUSED") r = await resumeProduction(order.id);
                if (r?.ok) toast.success(primaryLabel);
                else toast.error(r?.message ?? "Acción no completada");
                onRefresh();
              })
            }
            className={`min-w-[140px]`}
          >
            {primaryLabel}
          </SpinnerButton>

          <SpinnerButton
            loading={pending}
            disabled={status !== "PLANNED" && !canFinish}
            onClick={() =>
              startTransition(async () => {
                let r;
                if (status === "PLANNED") {
                  r = await cancelProduction(order.id);
                } else {
                  r = await closeProduction(order.id);
                }
                if (r?.ok) toast.success(secondaryLabel);
                else toast.error(r?.message ?? "Acción no completada");
                onRefresh();
              })
            }
          >
            {secondaryLabel}
          </SpinnerButton>

          {status === "QC_HOLD" && (
            <div className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800 flex items-center gap-1">
              <AlertTriangle size={12}/> En espera de QC
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
    </SBCard>
  );
}


// ===== Página =====
export default function ExecutionPage() {
  const { data, refresh } = useData();
  const accent = (SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal;

  // ===== Tipado SSOT =====
  // Ajusta estos imports si tus nombres difieren en '@/domain/ssot'
  // type ProductionOrder, ProductionStatus, ProductionStage, BillOfMaterial, Item, Uom deben existir en tu kernel.
  // Si en tu repo los tipos tienen otro nombre, cambia aquí los alias.
  type Uom = 'L' | 'kg' | 'unit';
  type ProductionStage = 'PRODUCCION' | 'ENVASADO';
  type ProductionStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'PACKAGING' | 'QC_HOLD' | 'CLOSED' | 'CANCELLED';
  type ItemCategory = 'fg' | 'raw' | 'pack' | 'intermediate';
  type BillOfMaterial = {
    id: string;
    name: string;
    stage: ProductionStage;
    outputItemId: string; // 'intermediate' si stage=PRODUCCION, 'fg' si stage=ENVASADO
    baseUnit: Uom;
    batchSize: number;
    items: Array<{ itemId: string; qty: number; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY' }>;
  };
  type ProductionOrder = {
    id: string;
    name?: string;
    stage: ProductionStage;
    status: ProductionStatus;
    plannedQty: number;
    baseUnit: Uom;
    bomId?: string;
    outputItemId: string;
    plannedDate?: string; // ISO
  };

  // ===== Datos base (SSOT) =====
  const boms: BillOfMaterialUI[] = useMemo(() => {
      const raw = (data?.billOfMaterials ?? []) as BillOfMaterialUI[];
      return raw.map((b: any) => ({
        id: b.id,
        name: b.name ?? b.id,
        kind: (b.kind as string) ?? (b.stage as string) ?? (b.output?.isFinal ? "ENVASADO" : "PRODUCCION"),
        baseUnit: (b.baseUnit ?? b.uom ?? "L") as Uom,
        ...b,
      }));
    }, [data]);
  const orders: ProductionOrderUI[] = useMemo(() => (data?.productionOrders ?? []) as ProductionOrderUI[], [data]);

  // Helpers de estado compatibles con SSOT
  const isActiveStatus = (s: ProductionStatus) => ['IN_PROGRESS','PAUSED','QC_HOLD','PACKAGING'].includes(s);
  const isScheduledStatus = (s: ProductionStatus) => s === 'PLANNED';

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
                      {/* Reglas SSOT: mostrar sólo BOMs con output correcto según etapa */}
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
                allItems={(data?.items ?? []) as Item[]}
                onRefresh={refresh}
                onClose={() => setOpenOrderId(null)}
              />
            ) : openBom ? (
              // === PLANIFICACIÓN ===
              <PlanningBoard
                bom={openBom}
                onPlanned={(newOrderId: string) => {
                  setOpenBomId(null);
                  setOpenOrderId(newOrderId);
                  refresh();
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
        <SBCard title="Disponibilidades / Roturas" accent={accent}>
          <div className="p-3">
             {/* <ShortagesPanel shortages={openOrder?.shortages ?? openBom?.shortages ?? []} /> */}
          </div>
        </SBCard>

        <SBCard title="Calidad (QC)" accent={accent}>
          <div className="p-3">
             {/* <QCPanel outputLots={openOrder?.outputLots ?? []} /> */}
          </div>
        </SBCard>
      </aside>
    </div>
  );
}
