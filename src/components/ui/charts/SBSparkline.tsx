// src/components/charts/SBSparkline.tsx
"use client";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { getSBChartTheme } from "./theme";

export function SBSparkline({ data, dataKey = "y", height = 36 }: { data: any[]; dataKey?: string; height?: number }) {
  const t = getSBChartTheme();
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
          <Line type="monotone" dataKey={dataKey} stroke={t.colors.series[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}