// src/components/charts/SBBarChart.tsx
"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getSBChartTheme } from "./theme";

type BarConf = { dataKey: string; name?: string; stackId?: string };
export function SBBarChart({ data, bars }: { data: any[]; bars: BarConf[] }) {
  const t = getSBChartTheme();
  return (
    <div className="sb-card">
      <div className="sb-card__header"><div className="sb-card__title">Distribución</div></div>
      <div className="sb-card__content h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={t.colors.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: t.colors.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: t.colors.grid }}/>
            <YAxis tick={{ fill: t.colors.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: t.colors.grid }}/>
            <Tooltip contentStyle={{ background: t.colors.bg, border: `1px solid ${t.colors.grid}` }} />
            {bars.map((b, i) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} stackId={b.stackId} fill={t.colors.series[i % t.colors.series.length]} radius={[8,8,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}