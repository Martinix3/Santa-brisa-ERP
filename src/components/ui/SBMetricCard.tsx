/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/SBMetricCard.tsx
'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';

export type MetricItem = {
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  trendValue?: string;
  highlight?: boolean; // Para KPIs destacados en cobre
};

export type SBMetricCardProps = {
  title: string;
  items: MetricItem[];
  footer?: {
    label: string;
    value: string | number;
    highlight?: boolean;
  };
  icon?: LucideIcon;
  variant?: 'default' | 'compact';
  className?: string;
};

export function SBMetricCard({
  title,
  items,
  footer,
  icon: Icon,
  variant = 'default',
  className = '',
}: SBMetricCardProps) {
  const isCompact = variant === 'compact';

  return (
    <section 
      className={`sb-card-glass-light metrics rounded-2xl transition-all duration-200 hover:shadow-md ${
        isCompact ? 'p-3' : 'p-4'
      } ${className}`}
      style={{
        boxShadow: '0 2px 8px -2px rgba(0,0,0,.08), 0 1px 4px -1px rgba(0,0,0,.06)',
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <Icon 
            size={16} 
            className="text-muted-foreground" 
            style={{ opacity: 0.7 }}
          />
        )}
        <h4 
          className={`font-semibold tracking-tight ${
            isCompact ? 'text-xs' : 'text-sm'
          }`}
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {title}
        </h4>
      </div>

      {/* Items Grid - Alineación derecha para valores */}
      <div className={`grid grid-cols-[1fr_auto] ${isCompact ? 'gap-y-1' : 'gap-y-1.5'}`}>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {/* Label */}
            <span 
              className={isCompact ? 'text-xs' : 'text-sm'}
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {item.label}
            </span>
            
            {/* Value con trend opcional */}
            <div className="flex items-center gap-1.5 justify-end">
              <span 
                className={`font-semibold ${isCompact ? 'text-sm' : 'text-base'}`}
                style={{ 
                  color: item.highlight 
                    ? 'hsl(var(--sb-copper))' 
                    : 'hsl(var(--foreground))',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {item.value}
              </span>
              
              {/* Trend indicator */}
              {item.trend && (
                <span 
                  className="text-xs"
                  style={{ 
                    color: item.trend === 'up' 
                      ? 'hsl(var(--success))' 
                      : 'hsl(var(--destructive))',
                    opacity: 0.8
                  }}
                >
                  {item.trend === 'up' ? '↑' : '↓'}
                  {item.trendValue}
                </span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Footer con separador */}
      {footer && (
        <>
          <hr 
            className="my-2.5" 
            style={{ 
              borderTop: '1px solid hsl(var(--border))',
              opacity: 0.5
            }}
          />
          <div className="flex items-center justify-between">
            <span 
              className={`font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {footer.label}
            </span>
            <span 
              className={`font-semibold ${isCompact ? 'text-sm' : 'text-base'}`}
              style={{ 
                color: footer.highlight 
                  ? 'hsl(var(--sb-copper))' 
                  : 'hsl(var(--foreground))',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {footer.value}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

// Variante compacta para espacios reducidos
export function SBMetricCardCompact(props: Omit<SBMetricCardProps, 'variant'>) {
  return <SBMetricCard {...props} variant="compact" />;
}
