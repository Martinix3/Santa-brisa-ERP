/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'dark' | 'light' | 'subtle';
  icon?: React.ReactNode;
}

export function KpiCard({ 
  label, 
  value, 
  hint, 
  trend, 
  variant = 'light',
  icon 
}: KpiCardProps) {
  const cardClass = variant === 'dark' 
    ? 'sb-card-glass-dark' 
    : variant === 'subtle' 
    ? 'sb-card-glass-subtle' 
    : 'sb-card-glass-light';

  const trendClass = trend === 'up' 
    ? 'text-success' 
    : trend === 'down' 
    ? 'text-destructive' 
    : 'text-muted-foreground';

  return (
    <div className={`${cardClass} p-4 hover-raise`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs opacity-70">{label}</div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
      <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
        {value}
      </div>
      {hint && (
        <div className={`text-xs ${trendClass}`}>
          {hint}
        </div>
      )}
    </div>
  );
}
