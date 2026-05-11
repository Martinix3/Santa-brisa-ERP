"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { ExternalLink, RefreshCw, Check, X, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { syncAccount, getAccountsSyncStatus } from "@/server/actions/holded-accounts-sync";
import type { Account } from "@/domain/ssot";

// ============================================================================
// TYPES
// ============================================================================

interface AccountWithSyncStatus extends Account {
  partyName?: string;
  partyCif?: string;
  syncStatusLabel: string;
  syncStatusVariant: 'success' | 'warning' | 'error' | 'default';
}

type FilterType = 'all' | 'synced' | 'pending' | 'errors';

// ============================================================================
// COMPONENT
// ============================================================================

export default function AccountsSyncStatus() {
  const [accounts, setAccounts] = useState<AccountWithSyncStatus[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountWithSyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, filter, searchTerm]);

  async function loadAccounts() {
    setIsLoading(true);
    try {
      const result = await getAccountsSyncStatus();
      
      if (!result.success) {
        toast.error("Error al cargar cuentas");
        return;
      }

      // Enriquecer con info de sync
      const enriched: AccountWithSyncStatus[] = result.accounts.map((acc: Account) => {
        let syncStatusLabel = "Sin sincronizar";
        let syncStatusVariant: 'success' | 'warning' | 'error' | 'default' = 'default';

        if (acc.syncError) {
          syncStatusLabel = "Error";
          syncStatusVariant = 'error';
        } else if (acc.holdedId && acc.syncedToHolded) {
          syncStatusLabel = "Sincronizado";
          syncStatusVariant = 'success';
        } else if (acc.holdedId) {
          syncStatusLabel = "Parcial";
          syncStatusVariant = 'warning';
        }

        return {
          ...acc,
          syncStatusLabel,
          syncStatusVariant,
        };
      });

      setAccounts(enriched);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Error al cargar cuentas");
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...accounts];

    // Filtro por estado
    if (filter === 'synced') {
      filtered = filtered.filter(a => a.holdedId && a.syncedToHolded);
    } else if (filter === 'pending') {
      filtered = filtered.filter(a => !a.holdedId);
    } else if (filter === 'errors') {
      filtered = filtered.filter(a => a.syncError);
    }

    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.partyName?.toLowerCase().includes(term) ||
        a.partyCif?.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  }

  async function handleSync(accountId: string) {
    setSyncingId(accountId);
    try {
      const result = await syncAccount(accountId);
      
      if (result.success) {
        toast.success("Sincronización exitosa");
        await loadAccounts(); // Recargar
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
      setSyncingId(null);
    }
  }

  function getSyncIcon(account: AccountWithSyncStatus) {
    if (account.syncError) {
      return <X size={16} className="text-red-600" />;
    } else if (account.holdedId && account.syncedToHolded) {
      return <Check size={16} className="text-green-600" />;
    } else if (account.holdedId) {
      return <AlertCircle size={16} className="text-yellow-600" />;
    } else {
      return <Clock size={16} className="text-zinc-400" />;
    }
  }

  function getBadgeClasses(variant: string) {
    const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    
    switch (variant) {
      case 'success':
        return `${base} bg-green-100 text-green-800`;
      case 'warning':
        return `${base} bg-yellow-100 text-yellow-800`;
      case 'error':
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-zinc-100 text-zinc-800`;
    }
  }

  return (
    <div className="sb-card">
      {/* Header */}
      <div className="p-5 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">
            Estado de Sincronización
          </h3>
          <button
            onClick={loadAccounts}
            disabled={isLoading}
            className="sb-btn sb-btn--ghost sb-btn--sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          {/* Tabs de filtro */}
          <div className="flex items-center gap-2">
            {[
              { value: 'all', label: 'Todas' },
              { value: 'synced', label: 'Sincronizadas' },
              { value: 'pending', label: 'Pendientes' },
              { value: 'errors', label: 'Con Errores' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as FilterType)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === tab.value
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar cuenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sb-input flex-1 max-w-xs"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Cuenta
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                CIF
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Última Sync
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-600">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Cargando cuentas...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-zinc-500">
                  No se encontraron cuentas
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-zinc-900">
                      {account.name}
                    </div>
                    {account.holdedId && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        ID Holded: {account.holdedId.slice(0, 12)}...
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-600">
                      {account.partyCif || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={getBadgeClasses(account.syncStatusVariant)}>
                      {getSyncIcon(account)}
                      {account.syncStatusLabel}
                    </span>
                    {account.syncError && (
                      <div className="text-xs text-red-600 mt-1">
                        {account.syncError}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-600">
                      {account.lastSyncAt
                        ? new Date(account.lastSyncAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSync(account.id)}
                        disabled={syncingId === account.id}
                        className="sb-btn sb-btn--ghost sb-btn--sm"
                        title="Sincronizar"
                      >
                        <RefreshCw
                          size={14}
                          className={syncingId === account.id ? "animate-spin" : ""}
                        />
                      </button>
                      
                      {account.holdedId && (
                        <a
                          href={`https://app.holded.com/contacts/${account.holdedId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sb-btn sb-btn--ghost sb-btn--sm"
                          title="Ver en Holded"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con count */}
      {!isLoading && filteredAccounts.length > 0 && (
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50">
          <p className="text-sm text-zinc-600">
            Mostrando <span className="font-medium">{filteredAccounts.length}</span> de{' '}
            <span className="font-medium">{accounts.length}</span> cuentas
          </p>
        </div>
      )}
    </div>
  );
}
