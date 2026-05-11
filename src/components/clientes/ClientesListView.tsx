/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/clientes/ClientesListView.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Calendar,
  MapPin,
  Euro,
  CheckCircle2,
  TrendingUp,
  Package,
  Users
} from 'lucide-react';
import type { Account } from '@/domain/ssot';

interface ClienteListItem {
  id: string;
  name: string;
  city?: string;
  lastInteractionDate?: string;
  totalValue?: number;
  status?: 'active' | 'inactive' | 'prospect';
  hasActiveOrders?: boolean;
  totalOrders?: number;
}

const STATUS_COLORS = {
  active: 'bg-[--sb-green]/10 text-[--sb-green] border-[--sb-green]/20',
  inactive: 'bg-[--sb-copper]/10 text-[--sb-copper] border-[--sb-copper]/20',
  prospect: 'bg-[--sb-yellow]/10 text-[--sb-yellow] border-[--sb-yellow]/20',
};

const STATUS_LABEL = {
  active: 'Activo',
  inactive: 'Inactivo',
  prospect: 'Prospecto',
};

const STATUS_ICON = {
  active: <CheckCircle2 className="w-5 h-5" />,
  inactive: <Building2 className="w-5 h-5" />,
  prospect: <TrendingUp className="w-5 h-5" />,
};

export function ClientesListView({
  accounts,
  title = 'Clientes (lista)',
}: {
  accounts: Account[];
  title?: string;
}) {
  const router = useRouter();

  const handleClientClick = (id: string) => {
    router.push(`/ventas/clientes/${id}`);
  };

  // Convertir accounts a formato de lista
  const items: ClienteListItem[] = accounts.map(account => ({
    id: account.id,
    name: account.name,
    city: account.location?.address, // Usar location.address en lugar de city
    lastInteractionDate: account.lastInteractionAt || account.updatedAt || account.createdAt,
    totalValue: 0, // TODO: Calcular desde pedidos
    status: account.stage === 'ACTIVA' ? 'active' : account.stage === 'POTENCIAL' ? 'prospect' : 'inactive',
    hasActiveOrders: false, // TODO: Verificar pedidos activos
    totalOrders: 0, // TODO: Contar pedidos
  }));

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? 'cliente' : 'clientes'}
        </p>
      </div>

      {/* Compact Single-Line Layout */}
      <div className="space-y-2">
        {items.map((item) => {
          const formattedDate = item.lastInteractionDate
            ? new Date(item.lastInteractionDate).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              })
            : null;

          const status = item.status || 'prospect';

          return (
            <div
              key={item.id}
              className="sb-card-glass-light rounded-lg p-3 hover:bg-white/5 transition-all duration-200 border border-white/5 cursor-pointer"
              onClick={() => handleClientClick(item.id)}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${STATUS_COLORS[status]}`}>
                    {STATUS_ICON[status]}
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold hover:text-[--sb-aqua] transition-colors truncate">
                    {item.name}
                  </span>
                </div>

                {/* City */}
                {item.city && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{item.city}</span>
                  </div>
                )}

                {/* Date */}
                {formattedDate && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{formattedDate}</span>
                  </div>
                )}

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${STATUS_COLORS[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>

                {/* Total Orders */}
                {item.totalOrders !== undefined && item.totalOrders > 0 && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums hidden lg:inline">
                      {item.totalOrders}
                    </span>
                  </div>
                )}

                {/* Value */}
                {item.totalValue !== undefined && item.totalValue > 0 && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums hidden lg:inline">
                      {item.totalValue.toLocaleString('es-ES')}
                    </span>
                  </div>
                )}

                {/* Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClientClick(item.id);
                  }}
                  className="text-sm font-medium text-[--sb-aqua] hover:text-[--sb-aqua]/80 transition-colors flex-shrink-0 hidden xl:block"
                >
                  Ver →
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-12 text-center sb-card-glass-light rounded-xl">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No hay clientes para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}
