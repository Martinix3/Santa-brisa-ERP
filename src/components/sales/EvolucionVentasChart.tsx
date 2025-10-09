"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type EvolucionData = {
  fecha: string;
  importe: number;
};

type EvolucionVentasChartProps = {
  data: EvolucionData[];
  title?: string;
};

export function EvolucionVentasChart({ data, title = 'Evolución de Ventas' }: EvolucionVentasChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8">
        <p className="text-center text-muted-foreground">
          No hay datos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="fecha" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${Math.round(value)}€`}
          />
          <Tooltip 
            formatter={(value: number) => [`${Math.round(value)}€`, 'Importe']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="importe" 
            stroke="#618E8F" 
            strokeWidth={2}
            dot={{ fill: '#618E8F', r: 4 }}
            activeDot={{ r: 6 }}
            name="Ventas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
