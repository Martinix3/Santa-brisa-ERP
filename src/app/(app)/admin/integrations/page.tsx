"use client";

import { useState } from "react";
import { reindexAlgolia } from "./actions";

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    contactsIndexed?: number;
    contactsSkipped?: number;
    tasksIndexed?: number;
    tasksSkipped?: number;
    error?: string;
  } | null>(null);

  const handleReindex = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await reindexAlgolia();
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="sb-h2">Integraciones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona las integraciones externas del sistema
        </p>
      </header>

      {/* Algolia Section */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="sb-card__title">Algolia Search</div>
          <div className="sb-card__description">
            Sistema de búsqueda avanzada con fuzzy matching y typo tolerance
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium mb-1">Re-indexar datos</h3>
              <p className="text-sm text-muted-foreground">
                Sincroniza manualmente todos los contacts y tasks con Algolia.
                Esto puede tardar unos segundos.
              </p>
            </div>
            <button
              onClick={handleReindex}
              disabled={loading}
              className="sb-btn"
              data-variant="primary"
            >
              {loading ? 'Indexando...' : 'Re-indexar Ahora'}
            </button>
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`p-4 rounded-md ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <div className="space-y-2">
                  <div className="font-medium text-green-900">
                    ✅ Indexación completada
                  </div>
                  <div className="text-sm text-green-800 space-y-1">
                    <div>• {result.contactsIndexed} contacts indexados</div>
                    <div>• {result.contactsSkipped} contacts omitidos (no clientes)</div>
                    <div>• {result.tasksIndexed} tasks indexadas</div>
                    <div>• {result.tasksSkipped} tasks omitidas (antiguas completadas)</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-red-900 mb-1">
                    ❌ Error en la indexación
                  </div>
                  <div className="text-sm text-red-800">{result.error}</div>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <strong>Nota:</strong> El sync automático está pendiente de configuración.
            Usa este botón después de hacer cambios masivos en Firestore para
            mantener Algolia actualizado.
          </div>
        </div>
      </section>

      {/* Future integrations placeholder */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="sb-card__title">Otras Integraciones</div>
          <div className="sb-card__description">
            Próximamente: Holded, WhatsApp Business API, etc.
          </div>
        </div>
        <div className="sb-card__content">
          <p className="text-sm text-muted-foreground">
            No hay integraciones adicionales configuradas
          </p>
        </div>
      </section>
    </div>
  );
}
