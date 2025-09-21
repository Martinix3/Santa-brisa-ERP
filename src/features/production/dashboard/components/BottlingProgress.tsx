// src/features/production/dashboard/components/BottlingProgress.tsx
"use client";
import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { SB_COLORS } from "@/domain/ssot";


export function BottlingProgress({ data }: { data: { date: string; planned: number; real: number }[] }) {
    return (
        <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString('es-ES')} uds`} />
                    <Legend verticalAlign="top" height={36} iconType="circle"/>
                    <Area type="monotone" dataKey="planned" name="Planificadas" stroke={SB_COLORS.primary.copper} fill={SB_COLORS.primary.copper} fillOpacity={0.1} />
                    <Area type="monotone" dataKey="real" name="Reales" stroke={SB_COLORS.primary.teal} fill={SB_COLORS.primary.teal} fillOpacity={0.2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
