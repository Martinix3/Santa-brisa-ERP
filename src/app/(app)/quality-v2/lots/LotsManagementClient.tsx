"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LotQcDrawer } from "@/components/quality-v2/LotQcDrawer";
import type { Lot, QualityPlan, AnalysisParameter, GeminiAnalysis } from "@/domain/ssot-v2-plus-schemas";

// Extended type for UI with denormalized data
type LotWithItem = Lot & {
  itemName?: string;
};

type Props = {
  lots: LotWithItem[];
  plans: QualityPlan[];
  parameters: AnalysisParameter[];
  geminiAlerts: GeminiAnalysis[];
};

export function LotsManagementClient({ lots, plans, parameters, geminiAlerts }: Props) {
  const [query, setQuery] = useState("");
  const [selectedLot, setSelectedLot] = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<"pending"|"passed"|"failed">("pending");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return lots.filter(l => l.lotCode.toLowerCase().includes(q) || (l.itemName||"").toLowerCase().includes(q));
  }, [lots, query]);

  const pending = filtered.filter(l => ["PENDING","IN_PROGRESS","HOLD","CONDITIONAL"].includes(l.qcStatus));
  const passed = filtered.filter(l => l.qcStatus === "PASSED");
  const failed = filtered.filter(l => l.qcStatus === "FAILED");

  return (
    <main className="p-4 md:p-6 space-y-5">
      <header className="sb-header-glass p-5">
        <h1>Gestión de Lotes QC</h1>
        <p className="text-muted-foreground">Control de calidad · {lots.length} lotes totales</p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--primary">Nueva revisión</button>
          <button className="sb-btn--secondary">Exportar</button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                className="sb-input" 
                placeholder="Buscar por lote o artículo…" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
              />
            </div>

            <nav className="sb-tabs mb-4">
              <button 
                className="sb-tab" 
                aria-selected={activeTab === "pending"}
                onClick={() => setActiveTab("pending")}
              >
                <span>Pendientes</span>
                <span className="sb-kpi-badge">{pending.length}</span>
              </button>
              <button 
                className="sb-tab" 
                aria-selected={activeTab === "passed"}
                onClick={() => setActiveTab("passed")}
              >
                <span>Aprobados</span>
                <span className="sb-kpi-badge">{passed.length}</span>
              </button>
              <button 
                className="sb-tab" 
                aria-selected={activeTab === "failed"}
                onClick={() => setActiveTab("failed")}
              >
                <span>Rechazados</span>
                <span className="sb-kpi-badge">{failed.length}</span>
              </button>
            </nav>

            {activeTab === "pending" && <LotTable rows={pending} onOpen={setSelectedLot} />}
            {activeTab === "passed" && <LotTable rows={passed} onOpen={setSelectedLot} />}
            {activeTab === "failed" && <LotTable rows={failed} onOpen={setSelectedLot} />}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-3">Resumen</h3>
            <div className="space-y-3">
              <KpiItem label="Pendientes" value={pending.length} tone="warning" />
              <KpiItem label="Aprobados" value={passed.length} tone="success" />
              <KpiItem label="Rechazados" value={failed.length} tone="destructive" />
              <KpiItem label="Alertas Gemini" value={geminiAlerts.length} tone="info" />
            </div>
          </div>
        </aside>
      </section>

      {selectedLot && (
        <LotQcDrawer
          lotCode={selectedLot}
          parameters={parameters}
          plans={plans}
          onClose={() => setSelectedLot(null)}
        />
      )}
    </main>
  );
}

function KpiItem({ label, value, tone }:{label:string; value:number|string; tone:"success"|"warning"|"destructive"|"info"}) {
  const toneClass = {
    success:"text-success",
    warning:"text-warning",
    destructive:"text-destructive",
    info:"text-info"
  }[tone];
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function LotTable({ rows, onOpen }:{ rows: Props["lots"]; onOpen:(c:string)=>void }) {
  return (
    <div className="sb-table-wrap">
      <table className="sb-table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Artículo</th>
            <th>Estado</th>
            <th>Caducidad</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.lotCode} className="hover:bg-secondary/30 cursor-pointer">
              <td className="font-medium">{r.lotCode}</td>
              <td className="text-sm text-muted-foreground">{r.itemName || r.itemId}</td>
              <td><StatusBadge status={r.qcStatus} /></td>
              <td className="text-sm text-muted-foreground">
                {r.expDate ? new Date(r.expDate).toLocaleDateString() : "-"}
              </td>
              <td>
                <button className="sb-btn--ghost" onClick={() => onOpen(r.lotCode)}>
                  Revisar
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }:{status:string}) {
  const map: Record<string, { label:string; className:string }> = {
    PENDING: { label:"Pendiente", className:"sb-badge--warning" },
    IN_PROGRESS: { label:"En revisión", className:"sb-badge--info" },
    HOLD: { label:"Retenido", className:"sb-badge--warning" },
    PASSED: { label:"Aprobado", className:"sb-badge--success" },
    FAILED: { label:"Rechazado", className:"sb-badge--destructive" },
    CONDITIONAL: { label:"Condicional", className:"sb-badge--default" },
  };
  const cfg = map[status] ?? { label: status, className:"sb-badge--default" };
  return <span className={cfg.className}>{cfg.label}</span>;
}
