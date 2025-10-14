import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartCardProps {
  title: string;
  data: any[];
  dataKey: string;
  type?: 'line' | 'bar' | 'area';
  height?: number;
  variant?: 'dark' | 'light' | 'subtle';
  xAxisKey?: string;
  formatter?: (value: number) => string;
}

export function ChartCard({ 
  title, 
  data, 
  dataKey,
  type = 'line',
  height = 192,
  variant = 'light',
  xAxisKey = 'name',
  formatter
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

  return (
    <div className={`${cardClass} p-5`}>
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
              <DataComponent
                type="monotone"
                dataKey={dataKey}
                stroke="hsl(var(--primary))"
                fill={type === 'area' ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--primary))'}
                strokeWidth={type === 'line' ? 3 : 0}
                dot={type === 'line' ? false : undefined}
              />
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
