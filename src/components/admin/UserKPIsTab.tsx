"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { User } from "@/domain/ssot";
import { Target, TrendingUp, Users, DollarSign } from "lucide-react";

interface UserKPIsTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
}

export function UserKPIsTab({ formData, updateFormData }: UserKPIsTabProps) {
  const kpis = formData.kpiBaseline || {};

  const updateKPIs = (updates: Partial<typeof kpis>) => {
    updateFormData({ kpiBaseline: { ...kpis, ...updates } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Target size={20} />
        <p className="text-sm">Define los objetivos mensuales para este usuario.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <DollarSign size={16} />
            Revenue Objetivo (€)
          </label>
          <input
            type="number"
            value={kpis.revenue || ''}
            onChange={(e) => updateKPIs({ revenue: Number(e.target.value) })}
            placeholder="10000"
            className="w-full px-4 py-2 border border-border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp size={16} />
            Unidades Vendidas
          </label>
          <input
            type="number"
            value={kpis.unitsSold || ''}
            onChange={(e) => updateKPIs({ unitsSold: Number(e.target.value) })}
            placeholder="1000"
            className="w-full px-4 py-2 border border-border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Users size={16} />
            Visitas Mensuales
          </label>
          <input
            type="number"
            value={kpis.visits || ''}
            onChange={(e) => updateKPIs({ visits: Number(e.target.value) })}
            placeholder="20"
            className="w-full px-4 py-2 border border-border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Target size={16} />
            Nuevas Cuentas
          </label>
          <input
            type="number"
            value={kpis.newAccounts || ''}
            onChange={(e) => updateKPIs({ newAccounts: Number(e.target.value) })}
            placeholder="5"
            className="w-full px-4 py-2 border border-border rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
