'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from 'react';
import { useData } from '@/lib/dataprovider';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { PipelineList } from '@/components/pipeline/PipelineList';
import { PipelineItem, StageKey, PipelineFilters } from '@/components/pipeline/types';
import { Filter, X } from 'lucide-react';
import { fetchPipelineData, updatePipelineStage } from '@/server/actions/pipeline.actions';
import { accountsToPipelineItems } from '@/lib/pipeline-helpers';

// Fallback mock data for development
const FALLBACK_PIPELINE_DATA: PipelineItem[] = [
  {
    id: 'acc-001',
    name: 'Restaurante El Patio',
    stage: 'POTENCIAL',
    city: 'Madrid',
    zone: 'Centro',
    lastInteractionDays: 5,
    lastInteractionDate: new Date('2025-10-16'),
    lastOrderDays: undefined,
    posInstalled: false,
    estValueEUR: 12500,
    isTarget: true,
    hasAlerts: true,
    noConsumption: false,
    commercialId: 'com-001',
    distributorPartyId: 'dist-001',
  },
  {
    id: 'acc-002',
    name: 'Hotel Costa Azul',
    stage: 'SEGUIMIENTO',
    city: 'Barcelona',
    zone: 'Noreste',
    lastInteractionDays: 12,
    lastInteractionDate: new Date('2025-10-09'),
    lastOrderDays: 45,
    posInstalled: true,
    estValueEUR: 45000,
    isTarget: false,
    hasAlerts: false,
    noConsumption: true,
    commercialId: 'com-002',
    distributorPartyId: 'dist-002',
  },
  {
    id: 'acc-003',
    name: 'Catering Eventos Premium',
    stage: 'ACTIVA',
    city: 'Valencia',
    zone: 'Este',
    lastInteractionDays: 3,
    lastInteractionDate: new Date('2025-10-18'),
    lastOrderDays: 15,
    posInstalled: true,
    estValueEUR: 28000,
    isTarget: true,
    hasAlerts: false,
    noConsumption: false,
    commercialId: 'com-001',
    distributorPartyId: 'dist-001',
  },
  {
    id: 'acc-004',
    name: 'Bar La Esquina',
    stage: 'FALLIDA',
    city: 'Sevilla',
    zone: 'Sur',
    lastInteractionDays: 30,
    lastInteractionDate: new Date('2025-09-21'),
    lastOrderDays: 90,
    posInstalled: false,
    estValueEUR: 8000,
    isTarget: false,
    hasAlerts: true,
    noConsumption: true,
    commercialId: 'com-003',
    distributorPartyId: 'dist-003',
  },
  {
    id: 'acc-005',
    name: 'Distribuidora Norte',
    stage: 'POTENCIAL',
    city: 'Bilbao',
    zone: 'Norte',
    lastInteractionDays: 2,
    lastInteractionDate: new Date('2025-10-19'),
    lastOrderDays: undefined,
    posInstalled: false,
    estValueEUR: 65000,
    isTarget: true,
    hasAlerts: false,
    noConsumption: false,
    commercialId: 'com-002',
    distributorPartyId: 'dist-002',
  },
];

export function PipelineClient() {
  const [items, setItems] = React.useState<PipelineItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<'board' | 'list'>('board');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<PipelineFilters>({});
  const [newAccountOpen, setNewAccountOpen] = React.useState(false);
  const [newAccountName, setNewAccountName] = React.useState('');
  const [newAccountCity, setNewAccountCity] = React.useState('');
  const [creatingAccount, setCreatingAccount] = React.useState(false);
  const { currentUser } = useData();

  // Load pipeline data from Firebase
  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await fetchPipelineData();
        
        if (result.success && result.data) {
          const pipelineItems = accountsToPipelineItems(result.data);
          setItems(pipelineItems);
        } else {
          throw new Error(result.error || 'Failed to load pipeline data');
        }
      } catch (err) {
        console.error('[PipelineClient] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use fallback data in case of error
        setItems(FALLBACK_PIPELINE_DATA);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Get unique values for filter dropdowns
  const zones = React.useMemo(() => 
    Array.from(new Set(items.map(i => i.zone).filter(Boolean))),
    [items]
  );
  const commercials = React.useMemo(() => 
    Array.from(new Set(items.map(i => i.commercialId).filter(Boolean))),
    [items]
  );
  const distributors = React.useMemo(() => 
    Array.from(new Set(items.map(i => i.distributorPartyId).filter(Boolean))),
    [items]
  );

  // Apply filters
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      if (filters.query && !item.name.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      if (filters.zone && item.zone !== filters.zone) {
        return false;
      }
      if (filters.commercialId && item.commercialId !== filters.commercialId) {
        return false;
      }
      if (filters.distributorPartyId && item.distributorPartyId !== filters.distributorPartyId) {
        return false;
      }
      if (filters.withPOS !== undefined && item.posInstalled !== filters.withPOS) {
        return false;
      }
      if (filters.onlyTargets && !item.isTarget) {
        return false;
      }
      if (filters.withAlerts && !item.hasAlerts) {
        return false;
      }
      return true;
    });
  }, [items, filters]);

  const handleMove = async (itemId: string, from: StageKey, to: StageKey) => {
    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, stage: to, lastInteractionDays: 0 }
          : item
      )
    );

    // Persist to Firebase
    try {
      const result = await updatePipelineStage(itemId, to);
      
      if (!result.success) {
        // Revert on error
        setItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? { ...item, stage: from }
              : item
          )
        );
        console.error('[PipelineClient] Failed to update stage:', result.error);
      }
    } catch (err) {
      // Revert on error
      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, stage: from }
            : item
        )
      );
      console.error('[PipelineClient] Error updating stage:', err);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  // Show loading state
  if (loading) {
    return (
      <div className="pipeline-container">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--sb-copper] mx-auto mb-4"></div>
            <p className="text-sm opacity-70">Cargando pipeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-container">
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Mostrando datos de ejemplo. Verifica la conexión a Firebase.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="pipeline-header">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline de Ventas</h1>
          <p className="text-sm opacity-70 mt-1">
            Gestiona oportunidades y seguimiento de cuentas
          </p>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex gap-2">
          <button
            className="sb-btn sb-btn--primary"
            onClick={() => setNewAccountOpen(true)}
          >
            Nueva cuenta
          </button>
          <button
            className={`sb-btn ${showFilters ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[--sb-yellow] text-black">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
          <button
            className={`sb-btn ${view === 'board' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
            onClick={() => setView('board')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Kanban
          </button>
          <button
            className={`sb-btn ${view === 'list' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
            onClick={() => setView('list')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Lista
          </button>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel sb-card-glass-light p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filtros</h3>
            {hasActiveFilters && (
              <button
                className="sb-btn sb-btn--ghost text-xs"
                onClick={clearFilters}
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label className="text-xs opacity-70 mb-1 block">Buscar</label>
              <input
                type="text"
                placeholder="Nombre de cuenta..."
                className="sb-input w-full"
                value={filters.query || ''}
                onChange={(e) => setFilters({ ...filters, query: e.target.value || undefined })}
              />
            </div>

            {/* Zone */}
            <div>
              <label className="text-xs opacity-70 mb-1 block">Zona</label>
              <select
                className="sb-input w-full"
                value={filters.zone || ''}
                onChange={(e) => setFilters({ ...filters, zone: e.target.value || undefined })}
              >
                <option value="">Todas</option>
                {zones.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Commercial */}
            <div>
              <label className="text-xs opacity-70 mb-1 block">Comercial</label>
              <select
                className="sb-input w-full"
                value={filters.commercialId || ''}
                onChange={(e) => setFilters({ ...filters, commercialId: e.target.value || undefined })}
              >
                <option value="">Todos</option>
                {commercials.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Distributor */}
            <div>
              <label className="text-xs opacity-70 mb-1 block">Distribuidor</label>
              <select
                className="sb-input w-full"
                value={filters.distributorPartyId || ''}
                onChange={(e) => setFilters({ ...filters, distributorPartyId: e.target.value || undefined })}
              >
                <option value="">Todos</option>
                {distributors.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              className={`sb-btn sb-btn--ghost text-xs ${filters.onlyTargets ? 'bg-[--sb-copper]/10 text-[--sb-copper]' : ''}`}
              onClick={() => setFilters({ ...filters, onlyTargets: !filters.onlyTargets || undefined })}
            >
              Solo Targets
            </button>
            <button
              className={`sb-btn sb-btn--ghost text-xs ${filters.withAlerts ? 'bg-[--sb-yellow]/10 text-[--sb-yellow]' : ''}`}
              onClick={() => setFilters({ ...filters, withAlerts: !filters.withAlerts || undefined })}
            >
              Con Alertas
            </button>
            <button
              className={`sb-btn sb-btn--ghost text-xs ${filters.withPOS ? 'bg-[--sb-green]/10 text-[--sb-green]' : ''}`}
              onClick={() => setFilters({ ...filters, withPOS: !filters.withPOS || undefined })}
            >
              Con POS
            </button>
          </div>
        </div>
      )}

      {/* Pipeline View */}
      <div className="pipeline-content">
        {view === 'board' ? (
          <PipelineBoard items={filteredItems} onMove={handleMove} />
        ) : (
          <PipelineList items={filteredItems} onMove={handleMove} />
        )}
      </div>

      {newAccountOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setNewAccountOpen(false)}>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Nueva cuenta</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm block mb-1">Nombre</label>
                <input className="sb-input w-full" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Nombre de la cuenta" />
              </div>
              <div>
                <label className="text-sm block mb-1">Ciudad (opcional)</label>
                <input className="sb-input w-full" value={newAccountCity} onChange={(e) => setNewAccountCity(e.target.value)} placeholder="Ciudad" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="sb-btn sb-btn--ghost" onClick={() => setNewAccountOpen(false)}>Cancelar</button>
              <button
                className="sb-btn sb-btn--primary"
                disabled={!newAccountName || creatingAccount}
                onClick={async () => {
                  try {
                    setCreatingAccount(true);
                    const res = await fetch('/api/accounts/create', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: newAccountName, city: newAccountCity, ownerId: currentUser?.id })
                    });
                    const json = await res.json();
                    if (!json.success) throw new Error(json.error || 'Error');
                    setNewAccountOpen(false);
                    setNewAccountName(''); setNewAccountCity('');
                    // Opcional: refrescar datos
                    // window.location.reload();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setCreatingAccount(false);
                  }
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pipeline-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 1.5rem;
          padding: 1rem;
        }

        .pipeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          background: var(--sb-surface);
          border-radius: var(--sb-radius-lg);
          border: 1px solid var(--sb-border);
        }

        .pipeline-content {
          flex: 1;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .pipeline-header {
            flex-direction: column;
            gap: 1rem;
          }

          .pipeline-header > div:last-child {
            width: 100%;
          }

          .pipeline-header button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
