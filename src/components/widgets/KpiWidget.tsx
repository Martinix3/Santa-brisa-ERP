/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/widgets/KpiWidget.tsx
import { useDrawer } from '@/ui/drawers/drawer-registry';

export function KpiWidget({ id, label, value, hint }:{
  id:string; label:string; value:string; hint?:string;
}) {
  const { open } = useDrawer();
  return (
    <button
      onClick={()=>open('kpi-breakdown',{ kpiId:id })}
      className="
        sb-card-glass-light
        p-4 lg:p-5 rounded-2xl text-left transition-all
        active:scale-[0.98] hover:shadow-md
        border-b-2 border-transparent hover:border-[--sb-copper]
      ">
      <div className="text-xs lg:text-sm text-[--sb-muted]">{label}</div>
      <div className="text-xl lg:text-2xl xl:text-3xl font-semibold text-[--sb-text] mt-1">{value}</div>
      {hint && <div className="text-xs lg:text-sm text-[--sb-muted] mt-1">{hint}</div>}
    </button>
  );
}
