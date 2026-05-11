"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Euro, CreditCard, Wallet, AlertCircle } from "lucide-react";
import { getFinancialKPIs } from "@/server/actions/holded-treasury-sync";

// ============================================================================
// TYPES
// ============================================================================

interface FinancialKPIs {
  totalRevenue: number;
  collectedRevenue: number;
  pendingCollection: number;
  collectionRate: number;
  totalExpenses: number;
  paidExpenses: number;
  pendingPayment: number;
  netCashFlow: number;
  byMethod: {
    method: string;
    amount: number;
    count: number;
  }[];
  monthlyTrend: {
    month: string;
    income: number;
    expense: number;
    netFlow: number;
  }[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FinanceKPIs() {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  async function loadKPIs() {
    setIsLoading(true);
    try {
      const result = await getFinancialKPIs();
      if (result.success && result.kpis) {
        setKpis(result.kpis);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="sb-card p-5 animate-pulse">
            <div className="h-4 bg-zinc-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-zinc-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="sb-card p-8">
        <div className="flex items-center justify-center gap-3 text-zinc-600">
          <AlertCircle size={20} />
          <span>No se pudieron cargar los KPIs financieros</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1: Ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Total Facturado
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Euro size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {formatCurrency(kpis.totalRevenue)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Ingresos totales
          </p>
        </div>

        {/* Collected Revenue */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Cobrado
            </span>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-900">
            {formatCurrency(kpis.collectedRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${kpis.collectionRate}%` }}
              />
            </div>
            <span className="text-xs font-medium text-green-600">
              {kpis.collectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Pending Collection */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Pendiente Cobro
            </span>
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {formatCurrency(kpis.pendingCollection)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Por cobrar
          </p>
        </div>

        {/* Net Cash Flow */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Flujo Neto
            </span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              kpis.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {kpis.netCashFlow >= 0 ? (
                <TrendingUp size={20} className="text-green-600" />
              ) : (
                <TrendingDown size={20} className="text-red-600" />
              )}
            </div>
          </div>
          <div className={`text-3xl font-bold ${
            kpis.netCashFlow >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatCurrency(kpis.netCashFlow)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Ingresos - Gastos
          </p>
        </div>
      </div>

      {/* KPI Cards Row 2: Egresos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Expenses */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Total Gastos
            </span>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <CreditCard size={20} className="text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {formatCurrency(kpis.totalExpenses)}
          </div>
        </div>

        {/* Paid Expenses */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Pagado
            </span>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Wallet size={20} className="text-zinc-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {formatCurrency(kpis.paidExpenses)}
          </div>
        </div>

        {/* Pending Payment */}
        <div className="sb-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600">
              Pendiente Pago
            </span>
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {formatCurrency(kpis.pendingPayment)}
          </div>
        </div>
      </div>

      {/* By Method Breakdown */}
      <div className="sb-card p-5">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          Por Método de Pago
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {kpis.byMethod.map((item: any) => (
            <div key={item.method} className="text-center">
              <div className="text-sm font-medium text-zinc-600 mb-1">
                {item.method}
              </div>
              <div className="text-xl font-bold text-zinc-900">
                {formatCurrency(item.amount)}
              </div>
              <div className="text-xs text-zinc-500">
                {item.count} {item.count === 1 ? 'movimiento' : 'movimientos'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
