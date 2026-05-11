/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import FinanceKPIs from "@/components/finanzas/FinanceKPIs";
import { Download } from "lucide-react";

export default function TesoreriaPage() {
  return (
    <div className="sb-page">
      <div className="sb-page__header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="sb-page__title">Tesorería</h1>
            <p className="sb-page__subtitle">
              Gestión de cobros, pagos y flujo de caja
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="sb-btn sb-btn--ghost sb-btn--sm">
              <Download size={16} />
              Exportar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* KPIs Financieros */}
        <FinanceKPIs />

        {/* Info Box */}
        <div className="sb-card p-5 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Sincronización con Holded
              </h3>
              <p className="text-sm text-blue-800">
                Los datos de tesorería se sincronizan automáticamente con Holded Treasury.
                Los cobros y pagos se vinculan automáticamente a facturas y cuentas cuando es posible.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Cobros automáticos desde facturas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Link automático a cuentas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Categorización por método</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Análisis de flujo mensual</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
