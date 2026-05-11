/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/trace/TraceProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { firestoreTracer, traceEventBus, type TraceEvent } from '@/lib/trace/FirestoreTracer';

interface TraceMetadata {
  timestamp: string;
  version: string;
  entities: Record<string, EntityTrace>;
  stats: {
    totalFiles: number;
    totalComponents: number;
    totalReads: number;
    totalWrites: number;
    totalComputes: number;
  };
}

interface EntityTrace {
  reads: TraceEntry[];
  writes: TraceEntry[];
  computes: TraceEntry[];
}

interface TraceEntry {
  component: string;
  file: string;
  fields: string[];
  line: number;
  code?: string;
  verified?: boolean;
}

interface InspectedElement {
  element: HTMLElement;
  componentName: string;
  entityUsed?: string;
  traceData?: TraceEntry[];
}

interface TraceContextValue {
  // Estado
  isTraceModeEnabled: boolean;
  metadata: TraceMetadata | null;
  inspectedElement: InspectedElement | null;
  isInspectorOpen: boolean;
  liveEvents: TraceEvent[];

  // Acciones
  toggleTraceMode: () => void;
  inspectElement: (element: HTMLElement) => void;
  closeInspector: () => void;
  loadMetadata: () => Promise<void>;
  enableLiveTrace: () => void;
  disableLiveTrace: () => void;
  clearLiveEvents: () => void;
}

const TraceContext = createContext<TraceContextValue | undefined>(undefined);

export function TraceProvider({ children }: { children: ReactNode }) {
  const [isTraceModeEnabled, setIsTraceModeEnabled] = useState(false);
  const [metadata, setMetadata] = useState<TraceMetadata | null>(null);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<TraceEvent[]>([]);



  const loadMetadata = React.useCallback(async () => {
    try {
      // En desarrollo, cargar desde el archivo
      const response = await fetch('/trace-metadata.json');
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar trace-metadata.json. Ejecuta: npm run trace:map');
    }
  }, []);

  const enableLiveTrace = React.useCallback(() => {
    firestoreTracer.enable();
    console.log('🔴 Trazabilidad en VIVO activada');
  }, []);

  const disableLiveTrace = React.useCallback(() => {
    firestoreTracer.disable();
    console.log('⚫ Trazabilidad en vivo desactivada');
  }, []);

  const closeInspector = React.useCallback(() => {
    setIsInspectorOpen(false);
    setInspectedElement(null);
  }, []);

  const toggleTraceMode = React.useCallback(() => {
    setIsTraceModeEnabled(prev => {
      const next = !prev;
      if (next) {
        console.log('🔍 Modo Traza ACTIVADO');
        console.log('💡 Tip: Haz click en cualquier elemento para inspeccionar');
        console.log('⌨️  Atajos: Cmd+Shift+T (toggle), Escape (cerrar inspector)');
        enableLiveTrace();
      } else {
        console.log('✅ Modo Traza DESACTIVADO');
        closeInspector();
        disableLiveTrace();
      }
      return next;
    });
  }, [enableLiveTrace, disableLiveTrace, closeInspector]);

  const clearLiveEvents = React.useCallback(() => {
    setLiveEvents([]);
    firestoreTracer.clearEvents();
  }, []);

  const findComponentTraces = React.useCallback((componentName: string): {
    entities: string[];
    entries: TraceEntry[];
  } => {
    if (!metadata) return { entities: [], entries: [] };

    const entries: TraceEntry[] = [];
    const entities: string[] = [];

    // Buscar en todas las entidades
    Object.entries(metadata.entities).forEach(([entityName, entityTrace]) => {
      const allEntries = [
        ...entityTrace.reads,
        ...entityTrace.writes,
        ...entityTrace.computes
      ];

      const matchingEntries = allEntries.filter(entry =>
        entry.component === componentName ||
        entry.component.includes(componentName) ||
        componentName.includes(entry.component)
      );

      if (matchingEntries.length > 0) {
        entities.push(entityName);
        entries.push(...matchingEntries);
      }
    });

    return { entities, entries };
  }, [metadata]);

  const detectComponentName = React.useCallback((element: HTMLElement): string | null => {
    // Estrategia 1: data-component attribute
    const dataComponent = element.closest('[data-component]');
    if (dataComponent) {
      return dataComponent.getAttribute('data-component');
    }

    // Estrategia 2: buscar en los padres por nombres de archivo conocidos
    // Esto es una heurística basada en la estructura de clases/IDs
    const classList = Array.from(element.classList);
    const possibleComponents = [
      'AccountCard', 'AccountsPage', 'OrdersTable', 'KpiCard',
      'QuickLog', 'Dashboard', 'Pipeline', 'TaskList'
    ];

    for (const comp of possibleComponents) {
      if (classList.some(c => c.toLowerCase().includes(comp.toLowerCase()))) {
        return comp;
      }
    }

    // Estrategia 3: buscar por texto único del componente
    const text = element.textContent?.trim();
    if (text) {
      // Buscar en metadata qué componente podría renderizar este texto
      // (simplificado por ahora)
    }

    return null;
  }, []);

  const inspectElement = React.useCallback((element: HTMLElement) => {
    if (!metadata) {
      console.warn('⚠️ Metadata no cargado. Ejecuta: npm run trace:map');
      return;
    }

    // Intentar detectar el componente
    const componentName = detectComponentName(element) || 'UnknownComponent';

    console.log('🔍 Click en elemento:', element.tagName, element.className);
    console.log('🔍 Componente detectado:', componentName);

    // Buscar trazas relacionadas con este componente
    const relatedTraces = findComponentTraces(componentName);

    setInspectedElement({
      element,
      componentName,
      entityUsed: relatedTraces.entities[0],
      traceData: relatedTraces.entries
    });

    setIsInspectorOpen(true);

    console.log('📊 Trazas encontradas:', relatedTraces.entries.length);
    console.log('💡 Si no ves trazas, intenta: 1) Navegar a otra página, 2) Ver tab "En Vivo"');
  }, [metadata, detectComponentName, findComponentTraces]);

  // Cargar metadata al montar
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Escuchar eventos en vivo del FirestoreTracer
  useEffect(() => {
    const unsubscribe = traceEventBus.on((event) => {
      setLiveEvents(prev => {
        const newEvents = [...prev, event];
        // Mantener solo últimos 100 eventos
        return newEvents.slice(-100);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + T para toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTraceMode();
      }

      // Escape para cerrar inspector
      if (e.key === 'Escape' && isInspectorOpen) {
        closeInspector();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isInspectorOpen, toggleTraceMode, closeInspector]);

  // Click handler cuando está en modo traza
  useEffect(() => {
    if (!isTraceModeEnabled) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Si click en el toggle, inspector, o elementos interactivos del inspector, permitir
      if (target.closest('[data-trace-ui]')) {
        // NO prevenir el evento, dejar que funcione normalmente
        return;
      }

      // Solo para clicks fuera del UI de traza:
      e.preventDefault();
      e.stopPropagation();

      inspectElement(target);
    };

    // Capturar en fase de captura para interceptar antes que otros handlers
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isTraceModeEnabled, inspectElement]);

  const value: TraceContextValue = {
    isTraceModeEnabled,
    metadata,
    inspectedElement,
    isInspectorOpen,
    liveEvents,
    toggleTraceMode,
    inspectElement,
    closeInspector,
    loadMetadata,
    enableLiveTrace,
    disableLiveTrace,
    clearLiveEvents
  };

  return (
    <TraceContext.Provider value={value}>
      {children}
    </TraceContext.Provider>
  );
}

export function useTrace() {
  const context = useContext(TraceContext);
  if (context === undefined) {
    throw new Error('useTrace debe usarse dentro de TraceProvider');
  }
  return context;
}
