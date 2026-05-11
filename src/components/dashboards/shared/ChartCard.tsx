"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartCardProps {
  title: string;
  data: any[];
  dataKey?: string;
  categories?: string[];
  colors?: string[];
  type?: 'line' | 'bar' | 'area';
  height?: number;
  variant?: 'dark' | 'light' | 'subtle';
  xAxisKey?: string;
  formatter?: (value: number) => string;
  className?: string;
}

export function ChartCard({
  title,
  data,
  dataKey,
  categories,
  colors = ['hsl(var(--primary))'],
  type = 'line',
  height = 192,
  variant = 'light',
  xAxisKey = 'name',
  formatter,
  className
}: ChartCardProps) {
  const cardClass = variant === 'dark'
    ? 'sb-card-glass-dark'
    : variant === 'subtle'
      ? 'sb-card-glass-subtle'
      : 'sb-card-glass-light';

  const ChartComponent = type === 'bar'
    ? BarChart
    : type === 'area'
      ? AreaChart
      : LineChart;

  const DataComponent = type === 'bar'
    ? Bar
    : type === 'area'
      ? Area
      : Line;

  // Determine keys to render: either categories array or single dataKey
  const keys = categories || (dataKey ? [dataKey] : []);

  return (
    <div className={`${cardClass} p-5 ${className || ''}`}>
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div style={{ height: `${height}px` }} className="-mx-2">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                formatter={formatter}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                }}
              />
              {keys.map((key, index) => (
                <DataComponent
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={type === 'area' ? `${colors[index % colors.length]}33` : colors[index % colors.length]}
                  strokeWidth={type === 'line' ? 3 : 0}
                  dot={type === 'line' ? false : undefined}
                />
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sin datos
          </div>
        )}
      </div>
    </div>
  );
}
