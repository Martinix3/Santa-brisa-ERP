"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Play, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  preSyncAnalysis,
  resolveDuplicate,
  masterSyncAll,
  type DuplicateCandidate,
  type PreSyncAnalysis,
  type MasterSyncResult,
} from "@/server/actions/master-sync";

type SyncState = 'IDLE' | 'ANALYZING' | 'REVIEWING' | 'SYNCING' | 'COMPLETE';

export function MasterSyncPanel() {
  const [state, setState] = useState<SyncState>('IDLE');
  const [analysis, setAnalysis] = useState<PreSyncAnalysis | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [syncResult, setSyncResult] = useState<MasterSyncResult | null>(null);

  // ETAPA 1: Analizar datos
  async function handleAnalyze() {
    setState('ANALYZING');
    try {
      const result = await preSyncAnalysis();
      setAnalysis(result);
      setDuplicates(result.duplicates);
      
      if (result.duplicates.length === 0) {
        toast.success("✅ No se encontraron duplicados");
        // Si no hay duplicados, pasar directo a sync
        setState('REVIEWING');
      } else {
        toast.info(`🔍 ${result.duplicates.length} duplicados detectados`);
        setState('REVIEWING');
      }
    } catch (error: any) {
      toast.error("Error al analizar: " + error.message);
      setState('IDLE');
    }
  }

  // ETAPA 2: Cambiar acción de un duplicado
  function handleActionChange(candidateId: string, action: 'merge' | 'create' | 'skip') {
    setDuplicates(duplicates.map(dup => 
      dup.id === candidateId ? { ...dup, action } : dup
    ));
  }

  // ETAPA 3: Ejecutar sincronización
  async function handleSync() {
    // Guardar decisiones de duplicados
    setState('SYNCING');
    try {
      // Primero resolver duplicados
      for (const dup of duplicates) {
        if (dup.action) {
          await resolveDuplicate(dup.id, dup.action);
        }
      }

      // Luego ejecutar sync completo
      const result = await masterSyncAll();
      setSyncResult(result);
      setState('COMPLETE');
      
      if (result.success) {
        toast.success("✅ Sincronización completada");
      } else {
        toast.error("⚠️ Sincronización con errores");
      }
    } catch (error: any) {
      toast.error("Error en sincronización: " + error.message);
      setState('REVIEWING');
    }
  }

  // Reset
  function handleReset() {
    setState('IDLE');
    setAnalysis(null);
    setDuplicates([]);
    setSyncResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sb-card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="text-3xl">⚡</div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Sincronización Global</h2>
            <p className="text-sm text-zinc-600">
              Analiza duplicados y sincroniza todas las integraciones (Holded, Shopify, Sendcloud)
            </p>
          </div>
        </div>
      </div>

      {/* ESTADO: IDLE */}
      {state === 'IDLE' && (
        <div className="sb-card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">Iniciar Análisis Pre-Sync</h3>
          <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
            Antes de sincronizar, analizaremos los datos para detectar duplicados potenciales
            y permitirte revisar conflictos.
          </p>
          <button
            onClick={handleAnalyze}
            className="sb-btn sb-btn--primary"
          >
            <Eye size={16} />
            Analizar Datos
          </button>
        </div>
      )}

      {/* ESTADO: ANALYZING */}
      {state === 'ANALYZING' && (
        <div className="sb-card text-center py-12">
          <RefreshCw size={48} className="mx-auto mb-4 animate-spin text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Analizando datos...</h3>
          <p className="text-sm text-zinc-600">
            Detectando duplicados en Holded, Shopify y Sendcloud
          </p>
        </div>
      )}

      {/* ESTADO: REVIEWING */}
      {state === 'REVIEWING' && analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="sb-card bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {analysis.summary.totalToSync}
              </div>
              <div className="text-sm text-zinc-600">Registros a sincronizar</div>
            </div>
            <div className="sb-card bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {analysis.summary.duplicates}
              </div>
              <div className="text-sm text-zinc-600">Duplicados detectados</div>
            </div>
            <div className="sb-card bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {analysis.summary.newRecords}
              </div>
              <div className="text-sm text-zinc-600">Nuevos registros</div>
            </div>
          </div>

          {/* Tabla de Duplicados */}
          {duplicates.length > 0 ? (
            <div className="sb-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  🔍 Duplicados Detectados ({duplicates.length})
                </h3>
                <span className="text-xs text-zinc-500">
                  Revisa cada duplicado y elige la acción apropiada
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th className="text-left p-3">Fuente</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Nombre</th>
                      <th className="text-left p-3">Duplicado de</th>
                      <th className="text-left p-3">Match</th>
                      <th className="text-left p-3">Confianza</th>
                      <th className="text-left p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {duplicates.map((dup) => (
                      <tr key={dup.id} className="hover:bg-zinc-50">
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            dup.source === 'holded' ? 'bg-blue-100 text-blue-800' :
                            dup.source === 'shopify' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {dup.source.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{dup.type}</td>
                        <td className="p-3 font-medium">{dup.data?.name || dup.id}</td>
                        <td className="p-3 text-zinc-600">{dup.duplicateOfName || '-'}</td>
                        <td className="p-3">
                          <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">
                            {dup.matchStrategy}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  (dup.matchConfidence || 0) >= 0.95 ? 'bg-green-500' :
                                  (dup.matchConfidence || 0) >= 0.85 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${(dup.matchConfidence || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">
                              {Math.round((dup.matchConfidence || 0) * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={dup.action || 'merge'}
                            onChange={(e) => handleActionChange(dup.id, e.target.value as any)}
                            className="sb-input text-sm"
                          >
                            <option value="merge">🔄 Merge (Fusionar)</option>
                            <option value="create">➕ Create (Crear nuevo)</option>
                            <option value="skip">⏭️ Skip (Omitir)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="sb-card text-center py-8 bg-green-50 border-green-200">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                ✅ No hay duplicados
              </h3>
              <p className="text-sm text-green-700">
                Todos los registros son únicos. Puedes proceder con la sincronización.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="sb-btn sb-btn--ghost"
            >
              ← Volver
            </button>
            <button
              onClick={handleSync}
              className="sb-btn sb-btn--primary flex-1"
            >
              <Play size={16} />
              Ejecutar Sincronización Global
            </button>
          </div>
        </div>
      )}

      {/* ESTADO: SYNCING */}
      {state === 'SYNCING' && (
        <div className="sb-card">
          <div className="text-center py-8 mb-6">
            <RefreshCw size={48} className="mx-auto mb-4 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Sincronizando...</h3>
            <p className="text-sm text-zinc-600">
              Procesando todas las integraciones
            </p>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Holded Accounts', icon: '🏦' },
              { name: 'Holded Orders', icon: '📦' },
              { name: 'Holded Payments', icon: '💰' },
              { name: 'Holded Invoices', icon: '🧾' },
              { name: 'Sendcloud Tracking', icon: '🚚' },
              { name: 'Shopify Orders', icon: '🛒' },
            ].map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 font-medium">{item.name}</span>
                <RefreshCw size={16} className="animate-spin text-blue-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ESTADO: COMPLETE */}
      {state === 'COMPLETE' && syncResult && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className={`sb-card ${
            syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {syncResult.success ? (
                <CheckCircle2 size={32} className="text-green-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  syncResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {syncResult.success ? '✅ Sincronización Completada' : '⚠️ Sincronización con Errores'}
                </h3>
                <p className={`text-sm ${
                  syncResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  Duración: {(syncResult.durationMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Holded */}
            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">🏦 Holded Accounts</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.holded.accounts.synced}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.holded.accounts.errors} errores
                </span>
              </div>
            </div>

            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">📦 Holded Orders</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.holded.orders.synced}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.holded.orders.errors} errores
                </span>
              </div>
            </div>

            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">💰 Holded Payments</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.holded.payments.synced}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.holded.payments.errors} errores
                </span>
              </div>
            </div>

            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">🧾 Holded Invoices</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.holded.invoices.synced}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.holded.invoices.errors} errores
                </span>
              </div>
            </div>

            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">🚚 Sendcloud</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.sendcloud.tracking.updated}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.sendcloud.tracking.errors} errores
                </span>
              </div>
            </div>

            <div className="sb-card">
              <div className="text-sm font-semibold mb-2 text-zinc-600">🛒 Shopify</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {syncResult.shopify.orders.imported}
                </span>
                <span className="text-sm text-red-600">
                  {syncResult.shopify.orders.errors} errores
                </span>
              </div>
            </div>
          </div>

          {/* Errors */}
          {syncResult.errors && syncResult.errors.length > 0 && (
            <div className="sb-card bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">
                  Errores Encontrados ({syncResult.errors.length})
                </h4>
              </div>
              <ul className="space-y-1">
                {syncResult.errors.map((error, idx: number) => (
                  <li key={idx} className="text-sm text-red-800">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="sb-btn sb-btn--primary flex-1"
            >
              <RefreshCw size={16} />
              Nueva Sincronización
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
