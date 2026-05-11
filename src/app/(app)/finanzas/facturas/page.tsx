"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { Download, FileText, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getInvoiceKPIs, importInvoicesFromHolded } from "@/server/actions/holded-invoices-sync";
import type { Invoice } from "@/domain/ssot";

interface InvoiceKPIs {
  todayInvoiced: number;
  pendingCollection: number;
  collectedThisMonth: number;
  monthTotal: number;
  overdueCount: number;
  overdueAmount: number;
  avgCollectionDays: number;
  byStatus: {
    status: Invoice['status'];
    count: number;
    amount: number;
  }[];
}

export default function FacturasPage() {
  const [kpis, setKpis] = useState<InvoiceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadKPIs();
  }, []);

  async function loadKPIs() {
    setIsLoading(true);
    try {
      const result = await getInvoiceKPIs();
      if (result.success && result.kpis) {
        setKpis(result.kpis);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const result = await importInvoicesFromHolded();
      
      if (result.success) {
        toast.success(result.message || "Sincronización completada");
        await loadKPIs(); // Recargar KPIs
      } else {
        toast.error("Error en sincronización", {
          description: result.message,
        });
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  return (
    <div className="sb-page">
      <div className="sb-page__header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="sb-page__title">Facturas</h1>
            <p className="sb-page__subtitle">
              Gestión de facturación y cobros desde Holded
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadKPIs}
              disabled={isLoading}
              className="sb-btn sb-btn--ghost sb-btn--sm"
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
              Actualizar
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="sb-btn sb-btn--primary sb-btn--sm"
            >
              <Download size={16} />
              {isImporting ? "Sincronizando..." : "Importar desde Holded"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* KPIs Row 1 */}
        {kpis && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Hoy Facturado */}
              <div className="sb-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-600">
                    Hoy Facturado
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-900">
                  {formatCurrency(kpis.todayInvoiced)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Facturas emitidas hoy
                </p>
              </div>

              {/* Pendiente Cobro */}
              <div className="sb-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-600">
                    Pendiente Cobro
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock size={20} className="text-yellow-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-900">
                  {formatCurrency(kpis.pendingCollection)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Por cobrar
                </p>
              </div>

              {/* Cobrado Mes */}
              <div className="sb-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-600">
                    Cobrado este Mes
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-900">
                  {formatCurrency(kpis.collectedThisMonth)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  De {formatCurrency(kpis.monthTotal)} total
                </p>
              </div>

              {/* Vencidas */}
              <div className="sb-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-600">
                    Facturas Vencidas
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle size={20} className="text-red-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-900">
                  {kpis.overdueCount}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatCurrency(kpis.overdueAmount)} vencido
                </p>
              </div>
            </div>

            {/* KPIs Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Días Promedio Cobro */}
              <div className="sb-card p-5">
                <h3 className="text-sm font-semibold text-zinc-600 mb-3">
                  Tiempo Promedio de Cobro
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-zinc-900">
                    {kpis.avgCollectionDays}
                  </span>
                  <span className="text-lg text-zinc-600">días</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Desde emisión hasta cobro efectivo
                </p>
              </div>

              {/* Por Estado */}
              <div className="sb-card p-5">
                <h3 className="text-sm font-semibold text-zinc-600 mb-3">
                  Por Estado
                </h3>
                <div className="space-y-2">
                  {kpis.byStatus.map((item: any) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-700 capitalize">
                        {item.status.toLowerCase()} ({item.count})
                      </span>
                      <span className="text-sm font-medium text-zinc-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && !kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sb-card p-5 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-1/2 mb-3" />
                <div className="h-8 bg-zinc-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="sb-card p-5 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Sincronización con Holded
              </h3>
              <p className="text-sm text-blue-800">
                Las facturas se sincronizan automáticamente desde Holded. Los datos se actualizan
                cada vez que importas o cuando Holded notifica cambios via webhook.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Link automático a cuentas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Tracking de estados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Alertas de vencimiento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>KPIs en tiempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
