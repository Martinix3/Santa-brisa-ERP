"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { RefreshCw, Download, Upload, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  importAccountsFromHolded,
  exportAccountToHolded,
  getSyncStats,
} from "@/server/actions/holded-accounts-sync";
import { masterSyncAll } from "@/server/actions/master-sync";

// ============================================================================
// TYPES
// ============================================================================

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  withErrors: number;
  syncedPercentage: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HoldedSyncPanel() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isMasterSyncing, setIsMasterSyncing] = useState(false);

  // Cargar stats al montar
  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setIsLoadingStats(true);
    try {
      const result = await getSyncStats();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const result = await importAccountsFromHolded();

      if (result.success) {
        toast.success(result.message || "Importación completada", {
          description: `${result.accountsImported || 0} nuevas, ${result.accountsMerged || 0} actualizadas, ${result.accountsSkipped || 0} sin cambios`,
        });

        // Recargar stats
        await loadStats();
      } else {
        toast.error("Error en importación", {
          description: result.message || "Error desconocido",
        });

        if (result.errors && result.errors.length > 0) {
          console.error("Import errors:", result.errors);
        }
      }
    } catch (error: any) {
      toast.error("Error fatal", {
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleMasterSync() {
    setIsMasterSyncing(true);
    try {
      const result = await masterSyncAll();

      if (result.success) {
        const totalSynced =
          result.holded.accounts.synced +
          result.holded.orders.synced +
          result.shopify.orders.imported;

        toast.success("Sincronización completa exitosa", {
          description: `${totalSynced} registros sincronizados en ${(result.durationMs / 1000).toFixed(1)}s`,
        });

        await loadStats();
      } else {
        toast.error("Sincronización con errores", {
          description: result.errors?.join(", ") || "Ver consola para detalles",
        });
      }
    } catch (error: any) {
      toast.error("Error fatal", {
        description: error.message,
      });
    } finally {
      setIsMasterSyncing(false);
    }
  }

  async function handleExportAll() {
    if (!stats || stats.pending === 0) {
      toast.info("No hay cuentas pendientes de exportar");
      return;
    }

    setIsExporting(true);
    try {
      // TODO: Implementar exportación masiva
      toast.info("Exportación masiva", {
        description: "Funcionalidad en desarrollo",
      });
    } catch (error: any) {
      toast.error("Error en exportación", {
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Sincronización Completa
          </h2>
          <p className="text-sm text-zinc-600 mt-1">
            Holded (cuentas, pedidos, facturas, pagos) + Shopify (pedidos, clientes) + Auto-linking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={isLoadingStats}
            className="sb-btn sb-btn--ghost sb-btn--sm"
          >
            <RefreshCw className={isLoadingStats ? "animate-spin" : ""} size={16} />
            Actualizar
          </button>

          <button
            onClick={handleMasterSync}
            disabled={isMasterSyncing}
            className="sb-btn sb-btn--primary sb-btn--sm"
          >
            <RefreshCw size={16} className={isMasterSyncing ? "animate-spin" : ""} />
            {isMasterSyncing ? "Sincronizando Todo..." : "🚀 Sync Completo (Holded + Shopify)"}
          </button>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="sb-btn sb-btn--secondary sb-btn--sm"
          >
            <Download size={16} />
            {isImporting ? "Importando..." : "Solo Cuentas"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="sb-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Total Cuentas
              </span>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <RefreshCw size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900">
              {stats.total}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Cuentas en el sistema
            </p>
          </div>

          {/* Sincronizadas */}
          <div className="sb-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Sincronizadas
              </span>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900">
              {stats.synced}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${stats.syncedPercentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-green-600">
                {stats.syncedPercentage}%
              </span>
            </div>
          </div>

          {/* Pendientes */}
          <div className="sb-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Pendientes
              </span>
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900">
              {stats.pending}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Sin sincronizar
            </p>
          </div>

          {/* Con errores */}
          <div className="sb-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Con Errores
              </span>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900">
              {stats.withErrors}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Requieren atención
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoadingStats && !stats && (
        <div className="sb-card p-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw size={20} className="animate-spin text-zinc-400" />
            <span className="text-sm text-zinc-600">
              Cargando estadísticas...
            </span>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="sb-card p-5 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              ¿Qué sincroniza el botón &quot;Sync Completo&quot;?
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Un solo click sincroniza todas tus fuentes de datos automáticamente:
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-semibold">💰 Holded:</span>
                <span>Cuentas, Pedidos, Facturas, Pagos (bidireccional)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">🛍️ Shopify:</span>
                <span>Pedidos + Clientes con direcciones completas</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">🔗 Auto-linking:</span>
                <span>Enlaza automáticamente pedidos Shopify ↔ Holded (por &quot;Shopify #N&quot;)</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Control duplicados automático</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Normalización de direcciones</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Shadow accounts si falta info</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Trazabilidad completa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
