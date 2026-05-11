"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useState, useTransition } from "react";
import { QcResultsForm } from "@/components/quality-v2/QcResultsForm";
import { LotTraceabilityPanel } from "@/components/quality-v2/LotTraceabilityPanel";
import { LotDocumentsPanel } from "@/components/quality-v2/LotDocumentsPanel";
import { processQcDecisionV2 } from "@/server/actions/quality-v2.actions";
import { toast } from "sonner";

type Props = {
  lotCode: string;
  parameters: Array<{ id: string; code: string; name: string; unit?: string }>;
  plans: Array<{ id: string; name: string; parameters: { parameterId: string }[] }>;
  onClose: () => void;
};

export function LotQcDrawer({ lotCode, parameters, plans, onClose }: Props) {
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "CONDITIONAL">("APPROVED");
  const [results, setResults] = useState<Array<{ parameterId: string; methodId: string; value: number | string; status: "OK" | "FAIL" | "NA"; unit?: string }>>([]);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"results" | "trace" | "documents">("results");
  const [notes, setNotes] = useState("");

  // 📅 Campos automáticos
  const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const responsable = "system"; // TODO: replace with active session user name

  const submit = () => {
    startTransition(() => {
      const userId = "system"; // TODO: replace with active session user
      processQcDecisionV2({ lotCode, decision, results }, userId).then((res) => {
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Decisión QC procesada correctamente");
        onClose();
      });
    });
  };

  return (
    <aside className="sb-drawer">
      <div className="sb-drawer__header">
        <h3 className="text-lg font-semibold">Revisión QC · {lotCode}</h3>
        <button
          className="sb-btn--icon"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <nav className="sb-tabs mb-4" role="tablist">
          <button
            className="sb-tab"
            role="tab"
            aria-selected={activeTab === "results"}
            onClick={() => setActiveTab("results")}
          >
            Resultados
          </button>
          <button
            className="sb-tab"
            role="tab"
            aria-selected={activeTab === "trace"}
            onClick={() => setActiveTab("trace")}
          >
            Trazabilidad
          </button>
          <button
            className="sb-tab"
            role="tab"
            aria-selected={activeTab === "documents"}
            onClick={() => setActiveTab("documents")}
          >
            Documentos
          </button>
        </nav>

        {activeTab === "results" && (
          <div className="space-y-4">
            {/* Campos automáticos */}
            <div className="sb-card-glass-light p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input
                    type="text"
                    value={fecha}
                    readOnly
                    className="sb-input bg-secondary/20 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Responsable</label>
                  <input
                    type="text"
                    value={responsable}
                    readOnly
                    className="sb-input bg-secondary/20 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Formulario QC */}
            <div className="sb-card-glass-light p-5">
              <QcResultsForm
                parameters={parameters}
                plans={plans}
                onChange={setResults}
              />
            </div>

            {/* Notas adicionales */}
            <div className="sb-card-glass-light p-4">
              <label className="block text-sm font-medium mb-2">Notas adicionales</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones, comentarios, incidencias..."
                rows={3}
                className="sb-input w-full resize-none"
              />
            </div>
          </div>
        )}
        {activeTab === "trace" && (
          <LotTraceabilityPanel lotCode={lotCode} />
        )}
        {activeTab === "documents" && (
          <LotDocumentsPanel lotCode={lotCode} />
        )}
      </div>

      <div className="sb-drawer__footer">
        <button className="sb-btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="sb-btn--primary"
          disabled={isPending}
          onClick={() => { setDecision("APPROVED"); submit(); }}
        >
          Liberar
        </button>
        <button
          className="sb-btn--destructive"
          disabled={isPending}
          onClick={() => { setDecision("REJECTED"); submit(); }}
        >
          Rechazar
        </button>
        <button
          className="sb-btn--secondary"
          disabled={isPending}
          onClick={() => { setDecision("CONDITIONAL"); submit(); }}
        >
          Condicional
        </button>
      </div>
    </aside>
  );
}
