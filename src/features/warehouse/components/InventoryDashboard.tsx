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
      { name: 'En QC (Retenido)', value: stats.PENDING },
      { name: 'Rechazado', value: stats.FAILED },
    ].filter(d => d.value > 0);
  }, [summaries]);

  const totalValue = useMemo(() => {
      return summaries.reduce((acc, s) => acc + (s.totalValue || 0), 0);
  }, [summaries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SBCard title="Stock por Estado de QC">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={qcData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                {qcData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name.startsWith('Liberado') ? 'PASSED' : entry.name.startsWith('En QC') ? 'PENDING' : 'FAILED']} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} und.`}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SBCard>
      
      <SBCard title="Valor Total del Inventario">
         <p className="text-3xl font-bold">{totalValue.toLocaleString('es-ES', {style:'currency', currency:'EUR'})}</p>
         <p className="text-sm text-zinc-500">Basado en el coste estándar.</p>
      </SBCard>
    </div>
  );
}
