/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/Banner.tsx
export function Banner({ kind="info", text }: { kind?: "info"|"warn"|"err"|"ok"; text: string }) {
  const cls = kind==="ok" ? "bg-emerald-50 text-emerald-900 border-emerald-300" :
              kind==="err"? "bg-red-50 text-red-900 border-red-300" :
              kind==="warn"? "bg-amber-50 text-amber-900 border-amber-300" :
                             "bg-sky-50 text-sky-900 border-sky-300";
  return (
    <div className={`border rounded-xl px-4 py-2 ${cls}`} role="status" aria-live="polite">
      {text}
    </div>
  );
}
