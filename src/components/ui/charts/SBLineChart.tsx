// src/components/charts/SBLineChart.tsx
"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getSBChartTheme } from "./theme";

type LineConf = { dataKey: string; name?: string };
export function SBLineChart({ data, lines }: { data: any[]; lines: LineConf[] }) {
  const t = getSBChartTheme();
  return (
    <div className="sb-card">
      <div className="sb-card__header"><div className="sb-card__title">Tendencia</div></div>
      <div className="sb-card__content h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={t.colors.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: t.colors.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: t.colors.grid }}/>
            <YAxis tick={{ fill: t.colors.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: t.colors.grid }}/>
            <Tooltip contentStyle={{ background: t.colors.bg, border: `1px solid ${t.colors.grid}` }} />
            {lines.map((l, i) => (
              <Line key={l.dataKey} type="monotone" dataKey={l.dataKey} name={l.name} stroke={t.colors.series[i % t.colors.series.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}