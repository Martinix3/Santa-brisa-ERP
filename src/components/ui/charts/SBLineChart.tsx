// src/components/ui/charts/SBLineChart.tsx
"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSBChartTheme } from './theme';

export function SBLineChart({ data, lines, height = 300 }: { data: any[], lines: { dataKey: string, name: string }[], height?: number }) {
    const theme = getSBChartTheme();
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                    <XAxis dataKey="name" stroke={theme.axis} />
                    <YAxis stroke={theme.axis} />
                    <Tooltip contentStyle={{ backgroundColor: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}` }} />
                    {lines.map((line, index) => (
                        <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} name={line.name} stroke={theme.line[index % theme.line.length]} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
