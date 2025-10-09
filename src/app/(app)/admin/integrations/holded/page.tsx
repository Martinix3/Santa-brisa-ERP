'use client';

import { useState } from 'react';
import { PageShell } from '@/components/shared/PageShell';
import { Download, RefreshCw, Check, X, AlertCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export default function HoldedIntegrationPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportingRaw, setIsImportingRaw] = useState(false);
  const [isExportingRaw, setIsExportingRaw] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [lastRawImport, setLastRawImport] = useState<{
    contacts: { total: number; created: number; updated: number; errors: number };
    products: { total: number; created: number; updated: number; errors: number };
    documents: { total: number; created: number; updated: number; errors: number };
    warehouses: { total: number; created: number; updated: number; errors: number };
    stockmovements: { total: number; created: number; updated: number; errors: number };
    payments: { total: number; created: number; updated: number; errors: number };
  } | null>(null);
  const [lastNormalize, setLastNormalize] = useState<{
    accounts: { processed: number; created: number; updated: number; errors: number };
    items: { processed: number; created: number; updated: number; errors: number };
    warehouses: { processed: number; created: number; updated: number; errors: number };
    orders: { processed: number; created: number; updated: number; errors: number };
  } | null>(null);
  const [lastSync, setLastSync] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const handleImportRaw = async () => {
    setIsImportingRaw(true);
    
    try {
      const response = await fetch('/api/integrations/holded/import-raw', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setLastRawImport(data.summary);
        toast.success('Importación RAW completada', {
          description: `Tiempo total: ${(data.totalTime / 1000).toFixed(1)}s`,
        });
      } else {
        toast.error('Error en la importación', {
          description: data.error || 'Error desconocido',
        });
      }
    } catch (error: any) {
      toast.error('Error de conexión', {
        description: error.message,
      });
    } finally {
      setIsImportingRaw(false);
    }
  };

  const handleNormalize = async () => {
    setIsNormalizing(true);
    
    try {
      const response = await fetch('/api/integrations/holded/normalize', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setLastNormalize(data.summary);
        toast.success('Normalización completada', {
          description: `Tiempo total: ${(data.totalTime / 1000).toFixed(1)}s`,
        });
      } else {
        toast.error('Error en la normalización', {
          description: data.error || 'Error desconocido',
        });
      }
    } catch (error: any) {
      toast.error('Error de conexión', {
        description: error.message,
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleExportRaw = async () => {
    setIsExportingRaw(true);
    
    try {
      const response = await fetch('/api/integrations/holded/export-raw', {
        method: 'GET',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error('Error al exportar', {
          description: data.error || 'Error desconocido',
        });
        return;
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holded-raw-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Exportación completada', {
        description: 'Los datos RAW se han descargado correctamente',
      });
    } catch (error: any) {
      toast.error('Error de conexión', {
        description: error.message,
      });
    } finally {
      setIsExportingRaw(false);
    }
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    
    try {
      const response = await fetch('/api/integrations/holded/sync-contacts', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.ok) {
        setLastSync(data.summary);
        toast.success('Sincronización completada', {
          description: data.message,
        });
      } else {
        toast.error('Error en la sincronización', {
          description: data.error,
        });
      }
    } catch (error: any) {
      toast.error('Error de conexión', {
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <PageShell
      title="Integración Holded"
      description="Sincronizar contactos y configurar webhooks"
    >
      <div className="space-y-6">
        {/* RAW Import Card */}
        <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-1.5 bg-purple-50 dark:bg-purple-950/20">
            <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Download className="h-5 w-5 text-purple-600" />
              Importación RAW (Paso 1)
            </h3>
            <p className="text-sm text-muted-foreground">
              Importa TODOS los datos de Holded tal cual, sin transformaciones (colecciones mirror)
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleImportRaw}
                disabled={isImportingRaw}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-purple-600 text-white hover:bg-purple-700 h-11 px-8"
              >
                <RefreshCw className={`h-4 w-4 ${isImportingRaw ? 'animate-spin' : ''}`} />
                {isImportingRaw ? 'Importando...' : 'Importar TODO (RAW)'}
              </button>

              <button
                onClick={handleExportRaw}
                disabled={isExportingRaw}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-11 px-8"
              >
                <FileDown className={`h-4 w-4 ${isExportingRaw ? 'animate-pulse' : ''}`} />
                {isExportingRaw ? 'Exportando...' : 'Exportar Datos RAW'}
              </button>

              {(isImportingRaw || isExportingRaw) && (
                <p className="text-sm text-muted-foreground">
                  Esto puede tardar varios minutos...
                </p>
              )}
            </div>

            {lastRawImport && (
              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <h4 className="font-semibold mb-3">Último resultado:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(lastRawImport).map(([entity, stats]) => (
                    <div key={entity} className="p-3 rounded border bg-background">
                      <div className="font-semibold text-sm mb-2 capitalize">{entity}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold">{stats.total}</div>
                          <div className="text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center text-green-600">
                          <div className="font-bold">{stats.created}</div>
                          <div className="text-muted-foreground">Nuevo</div>
                        </div>
                        <div className="text-center text-blue-600">
                          <div className="font-bold">{stats.updated}</div>
                          <div className="text-muted-foreground">Act.</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900 dark:text-purple-100">
                  <p className="font-semibold mb-1">¿Qué hace esta importación?</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-800 dark:text-purple-200">
                    <li>Importa contactos, productos, documentos, almacenes, movimientos de stock y pagos</li>
                    <li>Guarda los datos RAW (sin transformar) en colecciones mirror</li>
                    <li>Permite analizar y normalizar después al SSOT</li>
                    <li>Es IDEMPOTENTE: puedes ejecutarla múltiples veces</li>
                    <li>Colecciones creadas: integrations/holded/*_mirror</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Normalize Card */}
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-1.5 bg-blue-50 dark:bg-blue-950/20">
            <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              Normalización al SSOT (Paso 2)
            </h3>
            <p className="text-sm text-muted-foreground">
              Convierte datos RAW de mirrors → SSOT con estructura completa (todos los campos)
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNormalize}
                disabled={isNormalizing}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-11 px-8"
              >
                <RefreshCw className={`h-4 w-4 ${isNormalizing ? 'animate-spin' : ''}`} />
                {isNormalizing ? 'Normalizando...' : 'Normalizar al SSOT'}
              </button>

              {isNormalizing && (
                <p className="text-sm text-muted-foreground">
                  Procesando datos con mappers...
                </p>
              )}
            </div>

            {lastNormalize && (
              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <h4 className="font-semibold mb-3">Último resultado:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(lastNormalize).map(([collection, stats]) => (
                    <div key={collection} className="p-3 rounded border bg-background">
                      <div className="font-semibold text-sm mb-2 capitalize">{collection}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold">{stats.processed}</div>
                          <div className="text-muted-foreground">Proc.</div>
                        </div>
                        <div className="text-center text-green-600">
                          <div className="font-bold">{stats.created}</div>
                          <div className="text-muted-foreground">Nuevo</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">¿Qué hace esta normalización?</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Lee datos de mirrors (contacts, products, documents, warehouses)</li>
                    <li>Aplica mappers con materialize() para garantizar TODOS los campos</li>
                    <li>Escribe a SSOT: accounts, items, orders, warehouses</li>
                    <li>Usa merge:false para forzar estructura completa</li>
                    <li>NUNCA hay undefined, solo null/''/0/[]</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Contacts Card */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-1.5">
            <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Download className="h-5 w-5" />
              Sincronizar Contactos
            </h3>
            <p className="text-sm text-muted-foreground">
              Importa todos los contactos de Holded como Parties y Accounts en el CRM
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSyncContacts}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </button>

              {isSyncing && (
                <p className="text-sm text-muted-foreground">
                  Esto puede tardar varios minutos...
                </p>
              )}
            </div>

            {lastSync && (
              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <h4 className="font-semibold mb-3">Último resultado:</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{lastSync.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <Check className="h-5 w-5" />
                      {lastSync.created}
                    </div>
                    <div className="text-xs text-muted-foreground">Creados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {lastSync.updated}
                    </div>
                    <div className="text-xs text-muted-foreground">Actualizados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-500">
                      {lastSync.skipped}
                    </div>
                    <div className="text-xs text-muted-foreground">Omitidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                      {lastSync.errors > 0 && <X className="h-5 w-5" />}
                      {lastSync.errors}
                    </div>
                    <div className="text-xs text-muted-foreground">Errores</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">¿Qué hace esta sincronización?</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Obtiene todos los contactos de Holded</li>
                    <li>Crea Party con datos completos (nombre, CIF, dirección, teléfono)</li>
                    <li>Crea PartyRole de tipo CUSTOMER</li>
                    <li>Crea Account vinculada</li>
                    <li>Guarda el ID de Holded para sincronización futura</li>
                    <li>Es idempotente: puedes ejecutarla varias veces sin duplicar</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Webhooks Card */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-1.5">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Webhooks Configurados</h3>
            <p className="text-sm text-muted-foreground">
              Webhooks que Holded debe llamar automáticamente
            </p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Presupuesto Creado</div>
                  <div className="text-sm text-muted-foreground">
                    estimate.created → Crea Order en CRM
                  </div>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  POST /api/integrations/holded/webhooks/estimate
                </code>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Factura Pagada</div>
                  <div className="text-sm text-muted-foreground">
                    invoice.paid → Actualiza Order como pagado
                  </div>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  POST /api/integrations/holded/webhooks/invoice
                </code>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900 dark:text-yellow-100">
                  <p className="font-semibold mb-1">Configurar en Holded:</p>
                  <p>Ve a Holded → Configuración → Webhooks y añade las URLs de arriba</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
