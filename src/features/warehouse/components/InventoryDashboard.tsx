// src/features/warehouse/components/InventoryDashboard.tsx
"use client";

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { SkuStockSummary } from '@/lib/inventory';
import { SBCard } from '@/components/ui/ui-primitives';

interface Props {
  summaries: SkuStockSummary[];
}

const COLORS = {
  PASSED: '#22c55e', // green-500
  PENDING: '#f97316', // orange-500
  FAILED: '#ef4444',   // red-500
};

export function InventoryDashboard({ summaries }: Props) {
  const qcData = useMemo(() => {
    const stats = { PASSED: 0, PENDING: 0, FAILED: 0 };
    summaries.forEach(s => {
      stats.PASSED += s.passedQty;
      stats.PENDING += s.pendingQty;
      stats.FAILED += s.failedQty;
    });
    
    return [
      { name: 'Liberado', value: stats.PASSED },
      { name: 'En QC', value: stats.PENDING },
      { name: 'Rechazado', value: stats.FAILED },
    ].filter(d => d.value > 0);
  }, [summaries]);

  const totalValue = useMemo(() => {
      return summaries.reduce((acc, s) => acc + (s.totalValue || 0), 0);
  }, [summaries]);

  const totalUnits = useMemo(() => {
    return summaries.reduce((acc, s) => acc + s.totalPhysical, 0);
  }, [summaries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <SBCard title="">
        <div className="flex justify-between items-center p-3">
          <div>
            <p className="text-xs text-zinc-500">Valor Total del Inventario</p>
            <p className="text-2xl font-bold">{totalValue.toLocaleString('es-ES', {style:'currency', currency:'EUR'})}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Unidades Totales</p>
            <p className="text-2xl font-bold">{totalUnits.toLocaleString('es-ES')}</p>
          </div>
        </div>
      </SBCard>
      <SBCard title="">
        <div style={{ width: '100%', height: 100 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={qcData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={5}>
                {qcData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name.startsWith('Liberado') ? 'PASSED' : entry.name.startsWith('En QC') ? 'PENDING' : 'FAILED']} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} und.`}/>
              <Legend iconSize={8} wrapperStyle={{fontSize: "12px"}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SBCard>
    </div>
  );
}
