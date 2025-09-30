// src/components/ui/charts/SBBarChart.tsx
"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSBChartTheme } from './theme';

export function SBBarChart({ data, lines, height = 300 }: { data: any[], lines: { dataKey: string, name: string }[], height?: number }) {
    const theme = getSBChartTheme();
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                    <XAxis dataKey="name" stroke={theme.axis} />
                    <YAxis stroke={theme.axis} />
                    <Tooltip contentStyle={{ backgroundColor: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}` }} />
                    {lines.map((line, index) => (
                        <Bar key={line.dataKey} dataKey={line.dataKey} name={line.name} fill={theme.line[index % theme.line.length]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
