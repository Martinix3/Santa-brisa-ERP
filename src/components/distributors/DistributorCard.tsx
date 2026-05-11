"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import Link from "next/link";
import {
  Building2,
  Users,
  Euro,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { DistributorWithKPIs } from "@/types/distributors";

interface DistributorCardProps {
  distributor: DistributorWithKPIs;
}

export function DistributorCard({ distributor }: DistributorCardProps) {
  // Status configuration
  const statusConfig =
    distributor.status === "ACTIVO"
      ? {
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-800",
          icon: CheckCircle2,
          borderClass: "border-l-emerald-500",
        }
      : {
          color: "text-neutral-600 dark:text-neutral-400",
          bg: "bg-neutral-50 dark:bg-neutral-950/30",
          border: "border-neutral-200 dark:border-neutral-800",
          icon: AlertCircle,
          borderClass: "border-l-neutral-300 dark:border-l-neutral-700",
        };

  const StatusIcon = statusConfig.icon;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return "Sin actividad";
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Link href={`/distributor/distribuidores/${distributor.id}`} className="block">
      <div
        className={`sb-card-glass-light hover-raise border-l-4 ${statusConfig.borderClass} h-full flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-neutral-400" />
              <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                {distributor.name}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {distributor.flow === "DIRECT" ? "Interno" : "Externo"}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={`sb-badge ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} flex items-center gap-1.5 px-2.5 py-1`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{distributor.status}</span>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
          {/* Total Accounts */}
          <div className="sb-kpi">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Cuentas
              </span>
            </div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-white">
              {distributor.activeAccounts}/{distributor.totalAccounts}
            </div>
            <p className="text-xs text-neutral-500">Activas/Total</p>
          </div>

          {/* Sell-in Volume */}
          <div className="sb-kpi">
            <div className="flex items-center gap-1.5 mb-1">
              <Euro className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Sell-In YTD
              </span>
            </div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-white">
              {formatCurrency(distributor.totalSellIn)}
            </div>
          </div>

          {/* Average Order Value */}
          <div className="sb-kpi">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Ticket Medio
              </span>
            </div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">
              {formatCurrency(distributor.avgOrderValue)}
            </div>
          </div>

          {/* Last Activity */}
          <div className="sb-kpi">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Último Pedido
              </span>
            </div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">
              {formatDate(distributor.lastOrderDate)}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          {/* Stage Badge */}
          {distributor.stage && (
            <span className="sb-badge bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              <span className="text-xs font-medium">{distributor.stage}</span>
            </span>
          )}

          {/* Owner */}
          {distributor.ownerId && (
            <span className="text-xs text-neutral-500 dark:text-neutral-500 ml-auto">
              Rep: {distributor.ownerId.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
