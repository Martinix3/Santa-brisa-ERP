"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

type MixData = {
  name: string;
  value: number;
  color: string;
};

type MixComercialDonutProps = {
  data: MixData[];
  title?: string;
};

const COLORS = ['#618E8F', '#F7D15F', '#D7713E', '#A7D8D9', '#9ca3af'];

export function MixComercialDonut({ data, title = 'Mix Comercial' }: MixComercialDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8">
        <p className="text-center text-muted-foreground">
          No hay datos para mostrar
        </p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `${Math.round(value)}€`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => {
              const percent = entry.payload.value ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
              return `${value} (${percent}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
