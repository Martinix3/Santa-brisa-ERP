/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/trace/TraceUI.tsx
'use client';

import React from 'react';
import { useTrace } from './TraceProvider';
import { Eye, X, FileCode, Database, Calculator, Activity, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { TraceEvent } from '@/lib/trace/FirestoreTracer';

export function TraceModeToggle() {
  const { isTraceModeEnabled, toggleTraceMode, metadata } = useTrace();

  return (
    <button
      onClick={toggleTraceMode}
      data-trace-ui
      className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
        isTraceModeEnabled
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 border border-gray-300'
      }`}
      title="Cmd/Ctrl + Shift + T"
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>{isTraceModeEnabled ? 'Modo Traza ON' : 'Modo Traza OFF'}</span>
        {metadata && (
          <span className="text-xs opacity-75">
            ({metadata.stats.totalComponents} comp)
          </span>
        )}
      </div>
    </button>
  );
}

export function TraceOverlay() {
  const { isTraceModeEnabled } = useTrace();

  if (!isTraceModeEnabled) return null;

  return (
    <>
      <style>{`
        body.trace-mode-active * {
          cursor: crosshair !important;
        }
      `}</style>
      
      <div
        data-trace-ui
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
      />
      
      <div
        data-trace-ui
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] 
                   bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg pointer-events-none"
      >
        <p className="text-sm font-medium">
          🔍 Modo Traza Activado - Haz click en cualquier elemento para inspeccionar
        </p>
        <p className="text-xs opacity-90 mt-1">
          Esc para cerrar | Cmd+Shift+T para desactivar
        </p>
      </div>
    </>
  );
}

export function TraceInspector() {
  const { isInspectorOpen, inspectedElement, closeInspector, metadata, liveEvents, clearLiveEvents } = useTrace();
  const [activeTab, setActiveTab] = React.useState<'static' | 'live'>('static');

  if (!isInspectorOpen || !inspectedElement || !metadata) return null;

  const { componentName, traceData = [] } = inspectedElement;
  
  const relevantLiveEvents = liveEvents.filter(event => 
    event.component?.includes(componentName) || 
    componentName.includes(event.component || '')
  );

  const reads = traceData.filter(t => 
    Object.values(metadata.entities).some(e => e.reads.includes(t))
  );
  const writes = traceData.filter(t =>
    Object.values(metadata.entities).some(e => e.writes.includes(t))
  );
  const computes = traceData.filter(t =>
    Object.values(metadata.entities).some(e => e.computes.includes(t))
  );

  const entitiesUsed = new Set<string>();
  Object.entries(metadata.entities).forEach(([entityName, entityTrace]) => {
    const hasEntry = [
      ...entityTrace.reads,
      ...entityTrace.writes,
      ...entityTrace.computes
    ].some(entry => traceData.includes(entry));
    
    if (hasEntry) entitiesUsed.add(entityName);
  });

  return (
    <div
      data-trace-ui
      className="fixed right-4 top-32 w-96 max-h-[calc(100vh-140px)] 
                 bg-white rounded-lg shadow-2xl border border-gray-200 
                 overflow-hidden z-[9999] flex flex-col"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg">{componentName}</h3>
            <p className="text-sm opacity-90">{traceData[0]?.file || 'Archivo desconocido'}</p>
          </div>
          <button onClick={closeInspector} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <FileCode className="w-4 h-4" />
            <span>{reads.length} lecturas</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="w-4 h-4" />
            <span>{writes.length} escrituras</span>
          </div>
          <div className="flex items-center gap-1">
            <Calculator className="w-4 h-4" />
            <span>{computes.length} cálculos</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab('static')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'static'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 Análisis Estático
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
            activeTab === 'live'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔴 En Vivo
          {relevantLiveEvents.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {relevantLiveEvents.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'static' ? (
          <>
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                📊 Entidades Usadas ({entitiesUsed.size})
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(entitiesUsed).map(entity => (
                  <span key={entity} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono">
                    {entity}
                  </span>
                ))}
              </div>
            </div>

            {reads.length > 0 && <TraceSection title="📖 Lecturas" entries={reads} color="blue" />}
            {writes.length > 0 && <TraceSection title="✏️ Escrituras" entries={writes} color="green" />}
            {computes.length > 0 && <TraceSection title="🧮 Cálculos" entries={computes} color="purple" />}

            {traceData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No se encontraron trazas para este componente</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-700">
                🔴 Eventos en Vivo ({relevantLiveEvents.length})
              </h4>
              {relevantLiveEvents.length > 0 && (
                <button
                  onClick={clearLiveEvents}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar
                </button>
              )}
            </div>

            {relevantLiveEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No hay eventos en vivo aún</p>
                <p className="text-xs mt-1">Interactúa con la app para ver trazas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relevantLiveEvents.slice().reverse().map((event) => (
                  <LiveEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <p className="text-xs text-gray-600">
          💡 Tab Estático: análisis del código | Tab Vivo: eventos en tiempo real
        </p>
      </div>
    </div>
  );
}

function TraceSection({ title, entries, color }: { 
  title: string; 
  entries: any[]; 
  color: 'blue' | 'green' | 'purple' 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div>
      <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>
      <div className="space-y-2">
        {entries.map((entry, idx: number) => (
          <div key={idx} className={`p-3 rounded border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-1">
              <code className="text-xs font-mono text-gray-800">
                {entry.file.split('/').pop()}
              </code>
              <span className="text-xs text-gray-500">línea {entry.line}</span>
            </div>
            
            {entry.fields && entry.fields.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.fields.map((field: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-white text-gray-700 text-xs rounded font-mono">
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveEventCard({ event }: { event: TraceEvent }) {
  const operationColors = {
    read: 'border-blue-200 bg-blue-50',
    write: 'border-green-200 bg-green-50',
    update: 'border-yellow-200 bg-yellow-50',
    delete: 'border-red-200 bg-red-50'
  };

  const hasErrors = event.quality.errors.length > 0;
  const hasWarnings = event.quality.warnings.length > 0;

  return (
    <div className={`p-3 rounded border ${operationColors[event.operation]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase">{event.operation}</span>
          <span className="text-xs text-gray-600">{event.collection}</span>
        </div>
        {event.quality.valid ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-600" />
        )}
      </div>

      <div className="text-xs text-gray-500 mb-2">
        {new Date(event.timestamp).toLocaleTimeString()} • {event.duration.toFixed(0)}ms
      </div>

      {(hasErrors || hasWarnings) && (
        <div className="mt-2 space-y-1">
          {event.quality.errors.map((error, i: number) => (
            <div key={i} className="text-xs text-red-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{error.field}: {error.message}</span>
            </div>
          ))}
          {event.quality.warnings.map((warning, i: number) => (
            <div key={i} className="text-xs text-yellow-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{warning.field}: {warning.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">Score: {event.quality.score}/100</span>
        {event.documentId && (
          <span className="text-xs text-gray-400 font-mono">{event.documentId.substring(0, 8)}...</span>
        )}
      </div>
    </div>
  );
}
