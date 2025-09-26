// src/components/ui/FormStatusBar.tsx
"use client";
export function FormStatusBar({ dirty, saving }: { dirty: boolean; saving: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>{saving ? "Guardando…" : dirty ? "Cambios sin guardar" : "Todo guardado"}</div>
      {saving && <div className="h-1 w-24 overflow-hidden rounded bg-slate-200">
        <div className="h-full w-1/2 animate-[progress_1s_linear_infinite] bg-slate-500" />
      </div>}
      <style>{`@keyframes progress { from { transform: translateX(-100%);} to { transform: translateX(200%);} }`}</style>
    </div>
  );
}
