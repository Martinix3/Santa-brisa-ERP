"use client";

/* ============================================================================
 * /quality/laboratorio — Registro de tests QC + Decisión de lote/orden
 * Integra: lots, qcParameters, qcTests, qcBatchResults, protocolAcks
 * Acento: hsl(var(--sb-accent-calidad))
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { Search, FlaskConical, CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from "lucide-react";

import type {
  Lot, LotNumber, QcTest, QcBatchResult, SantaData, ProductionOrder
} from "@/domain/ssot";

/* ===== Helpers UI ===== */
function Badge({ children, tone="zinc" }: { children: React.ReactNode; tone?: "zinc"|"sky"|"amber"|"rose"|"emerald" }) {
  const color = {
    zinc: "border-zinc-200 bg-white text-zinc-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${color}`}>{children}</span>;
}

function qcDecisionTone(s?: string): "emerald"|"amber"|"rose"|"zinc" {
  if (!s) return "zinc";
  if (s === "RELEASED" || s === "PASSED") return "emerald";
  if (s === "WAIVED" || s === "CONDITIONAL_RELEASE") return "amber";
  if (s === "REJECTED" || s === "FAILED") return "rose";
  return "zinc";
}

/* ===== Página ===== */
export default function LabPage() {
  const { data } = useData();

  // Datos SSOT
  const lots = (data?.lots ?? []) as Lot[];
  const orders = (data?.productionOrders ?? []) as ProductionOrder[];
  const qcParams = (data?.qcParameters ?? []) as Array<{ id:string; name:string; unit?:string; target?:number; min?:number; max?:number; kind?: "NUM"|"BOOL"|"TEXT" }>;
  const qcTests = (data?.qcTests ?? []) as QcTest[];
  const qcBatchResults = (data?.qcBatchResults ?? []) as QcBatchResult[];
  const protocolAcks = (data?.protocolAcks ?? []) as SantaData["protocolAcks"];

  // Foco: por defecto por lote
  const [focusKind, setFocusKind] = useState<"lot"|"order">("lot");
  const [query, setQuery] = useState("");

  // Resolver lotes en foco
  const focusedLots: Lot[] | null = useMemo(()=>{
    const id = query.trim();
    if (!id) return null;
    if (focusKind === "lot") {
      const l = lots.find(x=>x.lotNumber===id);
      return l ? [l] : [];
    }
    // order → lotes producidos por esa orden
    const o = orders.find(x=>x.id===id);
    if (!o) return [];
    return lots.filter(l => l.producedByOrderId === o.id);
  }, [focusKind, query, lots, orders]);

  const singleLot = focusedLots && focusedLots.length===1 ? focusedLots[0] : null;

  // Tests y resultados filtrados
  const testsForFocus = useMemo(()=>{
    if (!focusedLots) return [];
    const set = new Set(focusedLots.map(l=>l.lotNumber));
    return qcTests.filter(t=> t.lotNumber ? set.has(t.lotNumber) : false)
                  .sort((a,b)=> new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime());
  }, [focusedLots, qcTests]);

  const decisionsForFocus = useMemo(()=>{
    if (!focusedLots) return [];
    const set = new Set(focusedLots.map(l=>l.lotNumber));
    return qcBatchResults.filter(r => r.lotNumber ? set.has(r.lotNumber) : false)
                         .sort((a,b)=> new Date(a.reviewedAt ?? a.createdAt ?? a.updatedAt ?? a.id).getTime()
                                   - new Date(b.reviewedAt ?? b.createdAt ?? b.updatedAt ?? b.id).getTime());
  }, [focusedLots, qcBatchResults]);

  const lastDecision = decisionsForFocus[decisionsForFocus.length-1];

  // ===== Formularios (acciones stub: conecta con tus server actions reales) =====
  const [form, setForm] = useState<{ lotNumber?: LotNumber; paramId?: string; valueText?: string; valueNumeric?: string; valueBool?: boolean }>({});
  const [savingTest, setSavingTest] = useState(false);

  async function onSaveTest() {
    if (!singleLot && !(form.lotNumber && form.lotNumber.length>0)) return;
    if (!form.paramId) return;

    // 💡 Conecta aquí tu server action real: recordQcTest()
    // await recordQcTest({ lotNumber: singleLot?.lotNumber ?? form.lotNumber!, parameterId: form.paramId, ... });
    setSavingTest(true);
    try {
      // Simulación optimista (el dataprovider refrescará en la navegación real)
      console.info("[recordQcTest] ->", form);
    } finally {
      setSavingTest(false);
    }
  }

  const [decision, setDecision] = useState<"PASSED"|"FAILED"|"WAIVED"|"CONDITIONAL_RELEASE" | "">("");
  const [remarks, setRemarks] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  const canDecide = (focusedLots && focusedLots.length>0) && testsForFocus.length>0;

  async function onSaveDecision() {
    if (!canDecide || !decision) return;
    // 💡 Conecta aquí tu server action real: setQcDecision()
    // await setQcDecision({ lotNumbers: focusedLots!.map(l=>l.lotNumber), status: decision, remarks })
    setSavingDecision(true);
    try {
      console.info("[setQcDecision] lots=", focusedLots!.map(l=>l.lotNumber), "status=", decision, "remarks=", remarks);
    } finally {
      setSavingDecision(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl p-6 space-y-6">
      {/* Filtro de foco */}
      <SBCard title="Laboratorio — Registro QC" accent="hsl(var(--sb-accent-calidad))">
        <div className="p-4 grid md:grid-cols-[160px_1fr_220px] gap-3">
          <div className="flex gap-2">
            <select className="h-10 border rounded-lg px-2" value={focusKind} onChange={e=>setFocusKind(e.target.value as any)}>
              <option value="lot">Lote</option>
              <option value="order">Orden</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="h-10 border rounded-lg px-3 w-full"
              placeholder={`Buscar ${focusKind}…`}
              value={query}
              onChange={e=>setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            {singleLot?.qcStatus && <Badge tone={qcDecisionTone(singleLot.qcStatus)}>{singleLot.qcStatus}</Badge>}
            {singleLot?.status && <Badge>{singleLot.status}</Badge>}
          </div>
        </div>
      </SBCard>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* IZQ: Registrar test + tabla de tests */}
        <div className="space-y-6">
          <SBCard title="Registrar test" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 grid md:grid-cols-4 gap-3 items-end">
              {/* Lote seleccionado (si no hay single, habilita input manual) */}
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-600 mb-1">Lote</label>
                <input
                  className="h-10 border rounded-lg px-3 w-full"
                  value={singleLot?.lotNumber ?? (form.lotNumber ?? "")}
                  onChange={e=>setForm(f=>({...f, lotNumber: e.target.value as LotNumber}))}
                  disabled={!!singleLot}
                  placeholder="LTEQ-2509-01…"
                />
              </div>

              {/* Parámetro */}
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Parámetro</label>
                <select
                  className="h-10 border rounded-lg px-2 w-full"
                  value={form.paramId ?? ""}
                  onChange={e=>setForm(f=>({...f, paramId: e.target.value}))}
                >
                  <option value="">— Selecciona —</option>
                  {qcParams.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.name}{p.unit?` (${p.unit})`:""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor (auto UI por tipo simple) */}
              <ParamValueField
                param={qcParams.find(p=>p.id===form.paramId)}
                form={form}
                setForm={setForm}
              />

              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={onSaveTest}
                  disabled={savingTest || !(form.paramId && (singleLot?.lotNumber || form.lotNumber))}
                  className="sb-btn-primary px-4 py-2 text-sm"
                >
                  {savingTest ? "Guardando…" : "Guardar test"}
                </button>
              </div>
            </div>
          </SBCard>

          <SBCard title="Tests del foco" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4">
              {(!focusedLots || focusedLots.length===0) && (
                <div className="text-sm text-zinc-500">Busca un lote u orden para ver sus tests.</div>
              )}
              {focusedLots && focusedLots.length>0 && testsForFocus.length===0 && (
                <div className="text-sm text-zinc-500">Sin tests aún. Registra el primero arriba.</div>
              )}
              {testsForFocus.length>0 && (
                <table className="w-full text-sm">
                  <thead className="text-xs text-zinc-600">
                    <tr>
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-left">Lote</th>
                      <th className="text-left">Parámetro</th>
                      <th className="text-left">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testsForFocus.map(t=>{
                      const p = qcParams.find(x=>x.id===t.parameterId);
                      const val =
                        t.valueNumeric!=null ? `${t.valueNumeric} ${t.unit ?? p?.unit ?? ""}` :
                        t.valueText ?? (t.valueBool!=null ? (t.valueBool?"Sí":"No") : "—");
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="py-2">{new Date(t.testedAt).toLocaleString()}</td>
                          <td>{t.lotNumber}</td>
                          <td>{p?.name ?? t.parameterId}</td>
                          <td>{val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </SBCard>
        </div>

        {/* DER: Decisión y resumen */}
        <div className="space-y-6">
          <SBCard title="Decisión QC" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-3">
              <div className="text-sm text-zinc-600">
                Selecciona <b>Lote</b> u <b>Orden</b>, registra al menos un test y emite decisión de liberación.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={()=>setDecision("PASSED")}
                  className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${decision==="PASSED"?"ring-2 ring-emerald-400":""}`}
                >
                  <CheckCircle2 className="text-emerald-600" size={18}/> Liberar
                </button>
                <button
                  onClick={()=>setDecision("FAILED")}
                  className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${decision==="FAILED"?"ring-2 ring-rose-400":""}`}
                >
                  <XCircle className="text-rose-600" size={18}/> Rechazar
                </button>
                <button
                  onClick={()=>setDecision("WAIVED")}
                  className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${decision==="WAIVED"?"ring-2 ring-amber-400":""}`}
                >
                  <ShieldCheck className="text-amber-600" size={18}/> Exento
                </button>
                <button
                  onClick={()=>setDecision("CONDITIONAL_RELEASE")}
                  className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${decision==="CONDITIONAL_RELEASE"?"ring-2 ring-amber-400":""}`}
                >
                  <AlertTriangle className="text-amber-600" size={18}/> Liberación condicional
                </button>
              </div>

              <div>
                <label className="block text-xs text-zinc-600 mb-1">Observaciones</label>
                <textarea
                  className="border rounded-lg w-full p-2 text-sm"
                  rows={3}
                  value={remarks}
                  onChange={e=>setRemarks(e.target.value)}
                  placeholder="Notas de revisión, límites, criterios de aceptación…"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <span>Estado actual:</span>
                  <Badge tone={qcDecisionTone(lastDecision?.status)}>{lastDecision?.status ?? "PENDING"}</Badge>
                </div>
                <button
                  disabled={!canDecide || !decision || savingDecision}
                  onClick={onSaveDecision}
                  className="sb-btn-primary px-4 py-2 text-sm"
                >
                  {savingDecision ? "Guardando…" : "Guardar decisión"}
                </button>
              </div>
            </div>
          </SBCard>

          <SBCard title="Resumen del foco" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 text-sm space-y-2">
              {(!focusedLots || focusedLots.length===0) && (
                <div className="text-zinc-500">Busca un identificador para ver el resumen.</div>
              )}
              {focusedLots && focusedLots.map(l=>(
                <div key={l.lotNumber} className="border rounded-lg p-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.lotNumber}</div>
                    <div className="text-xs text-zinc-600">
                      Item {l.itemId} · {l.quantity} {/** uom: derivable si lo necesitas */}
                      {" · QC "}
                      <Badge tone={qcDecisionTone(l.qcStatus)}>{l.qcStatus ?? "PENDING"}</Badge>
                    </div>
                  </div>
                  <a className="text-sky-700 text-sm underline" href={`/lots/${encodeURIComponent(l.lotNumber)}/dossier`}>Abrir dossier</a>
                </div>
              ))}
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}

/* ===== Campo de valor según tipo de parámetro ===== */
function ParamValueField({
  param, form, setForm
}:{
  param?: { id:string; name:string; unit?:string; target?:number; min?:number; max?:number; kind?: "NUM"|"BOOL"|"TEXT" };
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  const kind = param?.kind ?? (param?.min!=null || param?.max!=null || param?.target!=null ? "NUM" : "TEXT");
  if (kind === "BOOL") {
    return (
      <div>
        <label className="block text-xs text-zinc-600 mb-1">Valor</label>
        <select
          className="h-10 border rounded-lg px-2 w-full"
          value={form.valueBool===true ? "true" : form.valueBool===false ? "false" : ""}
          onChange={(e)=>setForm((f:any)=>({...f, valueBool: e.target.value===""? undefined : e.target.value==="true"}))}
        >
          <option value="">—</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </div>
    );
  }
  if (kind === "NUM") {
    return (
      <div>
        <label className="block text-xs text-zinc-600 mb-1">
          Valor {param?.unit ? `(${param.unit})` : ""}
        </label>
        <input
          type="number"
          step="any"
          className="h-10 border rounded-lg px-3 w-full"
          value={form.valueNumeric ?? ""}
          onChange={e=>setForm((f:any)=>({...f, valueNumeric: e.target.value}))}
          placeholder={param?.target!=null ? `objetivo ${param.target}` : ""}
        />
        {(param?.min!=null || param?.max!=null) && (
          <div className="text-[11px] text-zinc-500 mt-1">
            {param?.min!=null ? `Min ${param.min}` : ""} {param?.max!=null ? `· Max ${param.max}` : ""}
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs text-zinc-600 mb-1">Valor</label>
      <input
        className="h-10 border rounded-lg px-3 w-full"
        value={form.valueText ?? ""}
        onChange={e=>setForm((f:any)=>({...f, valueText: e.target.value}))}
        placeholder="pH correcto / aspecto / olor…"
      />
    </div>
  );
}
