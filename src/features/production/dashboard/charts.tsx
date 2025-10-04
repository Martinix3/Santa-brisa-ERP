// src/features/production/dashboard/charts.tsx
"use client";
import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";

// Colores base tomados de los tokens del sistema de diseño
const THEME_COLORS = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  border: 'hsl(var(--border))',
};

export function AreaBasic({ data, xKey, yKey, height = 220, unit, color }: { data: any[]; xKey: string; yKey: string; height?: number; unit?: string; color?: string }) {
  const chartColor = color || THEME_COLORS.primary;
  const chartId = React.useId();

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
          <Tooltip formatter={(v: any) => unit ? `${v.toLocaleString('es-ES')} ${unit}` : v.toLocaleString('es-ES')} />
          <Area type="monotone" dataKey={yKey} stroke={chartColor} fill={`url(#gradient-${chartId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarBasic({ data, xKey, yKey, height = 220, unit, color }: { data: any[]; xKey: string; yKey: string; height?: number; unit?: string; color?: string }) {
  const chartColor = color || THEME_COLORS.accent;

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
          <Tooltip formatter={(v: any) => unit ? `${v.toLocaleString('es-ES')} ${unit}` : v.toLocaleString('es-ES')} />
          <Bar dataKey={yKey} fill={chartColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineBasic({ data, xKey, yKey, height = 220, unit, color }: { data: any[]; xKey: string; yKey: string; height?: number; unit?: string; color?: string }) {
  const chartColor = color || THEME_COLORS.success;

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => typeof v === 'number' ? `${v.toFixed(3)} €` : v} />
          <Tooltip formatter={(v: any) => unit ? `${Number(v).toFixed(3)} ${unit}` : Number(v).toFixed(3)} />
          <Line type="monotone" dataKey={yKey} stroke={chartColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}