

"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Lot, QCResult } from '@/domain/ssot';
import { QC_PARAMS, QCKey } from '@/domain/production.qc';
import { listLots } from '@/features/production/ssot-bridge';
import { useData } from '@/lib/dataprovider';

type QualityStatus = "hold" | "release" | "reject";
type QualityParamType = "ANALITICO" | "VISUAL" | "SENSORIAL";

type QualitySpecLine = {
  code: string;
  label: string;
  type: QualityParamType;
  unit?: string;
  target?: number | string;
  min?: number;
  max?: number;
  required?: boolean;
};

type QualitySpec = {
  id: string;
  sku: string;
  name: string;
  lines: QualitySpecLine[];
};

// ---- Helpers ----
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function statusPillColor(s: QualityStatus) {
  switch (s) {
    case "hold": return "bg-amber-100 text-amber-800 border border-amber-200";
    case "release": return "bg-green-100 text-green-800 border border-green-200";
    case "reject": return "bg-red-100 text-red-800 border border-red-200";
  }
}

function getSpecForSku(sku: string): QualitySpec {
    const specLines: QualitySpecLine[] = [];
    const params = QC_PARAMS[sku] || {};
    
    Object.entries(params).forEach(([key, param]) => {
        specLines.push({
            code: key,
            label: param.label,
            type: 'min' in param || 'max' in param ? 'ANALITICO' : 'VISUAL',
            unit: 'unit' in param ? (param.unit === '' ? undefined : param.unit) : undefined,
            min: 'min' in param ? param.min : undefined,
            max: 'max' in param ? param.max : undefined,
        });
    });

    return {
        id: `spec-${sku}`,
        sku: sku,
        name: `Especificación para ${sku}`,
        lines: specLines,
    };
}


function suggestedDecision(spec: QualitySpec, results: Record<string, QCResult>) {
  const byCode = new Map(Object.entries(results));
  let requiredOk = true; let anyFail = false;

  const evaluated = spec.lines.map(line => {
    const r = byCode.get(line.code);
    let ok = true;
    if (r?.value !== undefined && 'min' in line && 'max' in line) {
        const val = Number(r.value);
        if ((line.min !== undefined && val < line.min) || (line.max !== undefined && val > line.max)) {
            ok = false;
        }
    }

    if (!r && line.required) {
      ok = false;
    }
    
    if (r) {
        r.status = ok ? 'ok' : 'ko';
    }
    
    if (!ok) anyFail = true;
    if (line.required && !ok) requiredOk = false;
    
    return { line, result: r, ok };
  });

  const suggested: QualityStatus = requiredOk && !anyFail ? "release" : "reject";
  const summary = {
    ok: evaluated.filter(e => e.ok).length,
    ko: evaluated.filter(e => !e.ok).length,
    required: spec.lines.filter(l => l.required).length,
    requiredOk,
  };
  return { evaluated, suggested, summary };
}


// ---- Componentes ----
function Topbar() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Calidad</h1>
        <p className="text-sm text-zinc-500">Lotes, mediciones y decisiones APTO/NO_APTO.</p>
      </div>
    </div>
  );
}

function Tabs({ value, onChange }: { value: QualityStatus | "ALL"; onChange: (v: QualityStatus | "ALL") => void }) {
  const items: (QualityStatus | "ALL")[] = ["hold", "release", "reject", "ALL"];
  const labels: Record<QualityStatus | "ALL", string> = {
      hold: "Pendientes",
      release: "Aptos",
      reject: "No Aptos",
      ALL: "Todos"
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={classNames(
            "px-3 py-1.5 rounded-xl text-sm border",
            value === id ? "bg-white border-zinc-300 shadow-sm" : "bg-white/60 border-zinc-200 hover:bg-white"
          )}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}

function Table({ rows, onOpen }: { rows: Lot[]; onOpen: (b: Lot) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Lote</th>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Cantidad</th>
            <th className="px-4 py-3 text-left font-medium">F. Prod.</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-zinc-100">
              <td className="px-4 py-3 font-medium text-zinc-900 font-mono">{r.id}</td>
              <td className="px-4 py-3">{r.sku}</td>
               <td className="px-4 py-3">{r.quantity}</td>
              <td className="px-4 py-3">{fmtDate(r.createdAt)}</td>
              <td className="px-4 py-3">
                <span className={classNames("px-2 py-0.5 rounded-full text-xs font-semibold", statusPillColor(r.quality?.qcStatus || 'hold'))}>{(r.quality?.qcStatus || 'hold').toUpperCase()}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onOpen(r)} className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50">Revisar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpecTable({ spec }: { spec: QualitySpec }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="px-4 py-3 border-b border-zinc-200 flex items-baseline justify-between">
        <div>
          <div className="text-sm text-zinc-500">Especificación</div>
          <div className="font-medium text-zinc-900">{spec.name}</div>
        </div>
        <div className="text-xs text-zinc-500">SKU: {spec.sku}</div>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-2 text-left">Código</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-left">Unidad</th>
            <th className="px-4 py-2 text-left">Min</th>
            <th className="px-4 py-2 text-left">Max</th>
            <th className="px-4 py-2 text-left">Req.</th>
          </tr>
        </thead>
        <tbody>
          {spec.lines.map((l) => (
            <tr key={l.code} className="border-t border-zinc-100">
              <td className="px-4 py-2 font-medium text-zinc-900">{l.label}</td>
              <td className="px-4 py-2">{l.type}</td>
              <td className="px-4 py-2">{l.unit ?? "—"}</td>
              <td className="px-4 py-2">{l.min ?? "—"}</td>
              <td className="px-4 py-2">{l.max ?? "—"}</td>
              <td className="px-4 py-2">{l.required ? "✓" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-200">
        * Admin puede añadir/quitar parámetros por SKU.
      </div>
    </div>
  );
}

function MeasurementsEditor({ spec, results, onChange }: { spec: QualitySpec; results: Record<string, QCResult>; onChange: (r: Record<string, QCResult>) => void }) {
  const byCode = useMemo(() => new Map(Object.entries(results)), [results]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="px-4 py-3 border-b border-zinc-200">
        <div className="text-sm text-zinc-500">Mediciones</div>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-2 text-left">Parámetro</th>
            <th className="px-4 py-2 text-left">Valor</th>
            <th className="px-4 py-2 text-left">OK/KO</th>
            <th className="px-4 py-2 text-left">Comentario</th>
          </tr>
        </thead>
        <tbody>
          {spec.lines.map((l) => {
            const r = byCode.get(l.code) || { status: 'ko' } as QCResult;
            return (
              <tr key={l.code} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-medium text-zinc-900">{l.label}</td>
                <td className="px-4 py-2">
                  <input
                    className="w-36 px-2 py-1.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    value={r.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = val === '' ? undefined : (isNaN(Number(val)) ? val : Number(val));
                       onChange({ ...results, [l.code]: { ...r, value: parsed as number }});
                    }}
                    placeholder={l.type === "ANALITICO" ? "0.0" : "OK"}
                  />
                </td>
                 <td className="px-4 py-2">
                  <span className={`font-bold ${r.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <input
                    className="w-full max-w-xs px-2 py-1.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    value={r.notes ?? ""}
                    onChange={(e) => {
                       onChange({ ...results, [l.code]: { ...r, notes: e.target.value }});
                    }}
                    placeholder="Comentario opcional"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DecisionBar({ spec, results, onDecide }: { spec: QualitySpec; results: Record<string, QCResult>; onDecide: (next: QualityStatus, note?: string) => void }) {
  const { suggested, summary } = useMemo(() => suggestedDecision(spec, results), [spec, results]);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<QualityStatus | "">("");

  const finalChoice = (choice || (suggested as QualityStatus)) as QualityStatus;

  return (
    <div className="mt-4 p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-3">
      <div className="text-sm text-zinc-700">
        <b>Resumen:</b> OK {summary.ok} / KO {summary.ko} · Requeridos {summary.requiredOk ? "✓" : "✗"}
        <span className="ml-3">Sugerencia: <span className={classNames("px-2 py-0.5 rounded-full text-xs ml-1 font-semibold", statusPillColor(suggested))}>{suggested.toUpperCase()}</span></span>
      </div>
      <div className="flex items-center gap-2">
        <select value={choice} onChange={(e) => setChoice(e.target.value as any)} className="px-2 py-1.5 rounded-lg border border-zinc-300 bg-white text-sm">
          <option value="">Elegir…</option>
          <option value="release">APTO</option>
          <option value="reject">NO APTO</option>
          <option value="hold">BLOQUEADO</option>
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="w-64 px-2 py-1.5 rounded-lg border border-zinc-300" placeholder="Nota de decisión" />
        <button onClick={() => onDecide(finalChoice, note)} className="px-3 py-1.5 rounded-lg bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-500 text-sm">Registrar decisión</button>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-5xl bg-zinc-50 shadow-xl border-l border-zinc-200 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white">Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function QualityDashboardPage() {
    const [tab, setTab] = useState<QualityStatus | "ALL">("hold");
    const [lots, setLots] = useState<Lot[]>([]);
    const [open, setOpen] = useState<Lot | null>(null);
    const { setData: setGlobalData, data: santaData } = useData();


    const fetchData = useCallback(() => {
        if (!santaData) return;
        const data = santaData.lots || [];
        const sorted = data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLots(sorted);
    }, [santaData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const rows = useMemo(() => lots.filter(b => tab === "ALL" ? true : b.quality?.qcStatus === tab), [lots, tab]);
    
    const currentSpec = open ? getSpecForSku(open.sku) : null;
    
    const handleUpdateResults = (lotId: string, newResults: Record<string, QCResult>) => {
        const spec = getSpecForSku(lots.find(l => l.id === lotId)!.sku);
        suggestedDecision(spec, newResults); // This will update statuses in place

        setLots(prevLots => prevLots.map(l => l.id === lotId ? {...l, quality: {...l.quality, results: newResults}} : l));
        setOpen(prevOpen => prevOpen && prevOpen.id === lotId ? {...prevOpen, quality: {...prevOpen.quality, results: newResults}} : prevOpen);
    };

    const handleDecide = (nextStatus: QualityStatus, note?: string) => {
        if (!open || !santaData) return;
        
        const updatedLots = lots.map(b => b.id === open.id ? { ...b, quality: {...b.quality, qcStatus: nextStatus } } : b)
        setLots(updatedLots);
        setGlobalData({ ...santaData, lots: updatedLots });
        
        console.log("Decision registrada", { batchId: open.id, nextStatus, note, results: open.quality.results });
        setOpen(null);
    };

    return (
        <div className="p-5">
            <div className="max-w-7xl mx-auto flex flex-col gap-4">
                <Topbar />

                <div className="flex items-center justify-between">
                    <Tabs value={tab} onChange={setTab} />
                    <div className="text-sm text-zinc-500">{rows.length} lotes</div>
                </div>

                <Table rows={rows} onOpen={setOpen} />

                <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? `${open.id} · ${open.sku}` : ""}>
                    {open && currentSpec && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <SpecTable spec={currentSpec} />
                            <MeasurementsEditor 
                                spec={currentSpec} 
                                results={open.quality.results} 
                                onChange={(newResults) => handleUpdateResults(open.id, newResults)}
                            />
                            <div className="lg:col-span-2">
                                <DecisionBar 
                                    spec={currentSpec} 
                                    results={open.quality.results} 
                                    onDecide={handleDecide} 
                                />
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </div>
    );
}
