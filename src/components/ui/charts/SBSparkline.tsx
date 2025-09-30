// src/components/ui/charts/SBSparkline.tsx
"use client";
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getSBChartTheme } from './theme';

export function SBSparkline({ data, dataKey, color }: { data: any[]; dataKey: string; color?: string }) {
    const theme = getSBChartTheme();
    const strokeColor = color || theme.line[0];
    return (
        <div style={{ width: '100%', height: 50 }}>
            <ResponsiveContainer>
                <LineChart data={data}>
                    <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
