/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/KpiCard.tsx
/**
 * KpiCard Component - Design System v2.1
 * 
 * Componente para mostrar KPIs con glassmorphism, deltas y sparklines opcionales.
 * 100% tokenizado, sin colores hardcodeados.
 * 
 * @example
 * <KpiCard
 *   title="Pedidos pendientes"
 *   value={3}
 *   delta={{ dir: "down", label: "-2 vs. semana" }}
 *   foot="Últimos 7 días"
 * />
 */

type DeltaDir = "up" | "down" | "flat";

interface DeltaProps {
  dir: DeltaDir;
  label: string;
}

function Delta({ dir, label }: DeltaProps) {
  const cls =
    dir === "up"   ? "sb-kpi__delta sb-kpi__delta--up" :
    dir === "down" ? "sb-kpi__delta sb-kpi__delta--down" :
                     "sb-kpi__delta sb-kpi__delta--flat";
  
  const iconPath =
    dir === "up"   ? "M4 12l4-4 4 4" :
    dir === "down" ? "M4 8l4 4 4-4" :
                     "M4 12h8";
  
  return (
    <span className={cls} aria-label={label}>
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 16 16" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.6"
      >
        <path 
          d={iconPath} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
      {label}
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: DeltaProps;
  foot?: string;
  sparkSvgPath?: string;
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  delta,
  foot,
  sparkSvgPath,
  isLoading = false
}: KpiCardProps) {
  // Estado de carga con skeleton
  if (isLoading) {
    return (
      <article className="sb-kpi">
        <div className="sb-kpi__title sb-skeleton h-3 w-24"></div>
        <div className="mt-2 sb-skeleton h-8 w-32"></div>
        <div className="mt-2 sb-skeleton h-4 w-20"></div>
      </article>
    );
  }

  return (
    <article className="sb-kpi">
      {/* Título */}
      <div className="sb-kpi__title">{title}</div>
      
      {/* Valor + Delta */}
      <div className="flex items-baseline gap-2">
        <div className="sb-kpi__value">{value}</div>
        {delta && <Delta dir={delta.dir} label={delta.label} />}
      </div>
      
      {/* Sparkline opcional */}
      {sparkSvgPath && (
        <svg 
          viewBox="0 0 100 24" 
          className="sb-kpi__spark" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path 
            d={sparkSvgPath} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      )}
      
      {/* Footer opcional */}
      {foot && <div className="sb-kpi__foot">{foot}</div>}
    </article>
  );
}

/**
 * Grid de KPIs con auto-fit responsive
 */
export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="sb-kpi-grid">{children}</div>;
}
