// src/components/forms/Field.tsx
"use client";
import React from "react";

export function Field({
  label, name, required, error, children
}: { label: string; name: string; required?: boolean; error?: string; children: React.ReactNode }) {
  const id = React.useId();
  const errId = `${id}-err`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}{required && " *"}</label>
      {React.isValidElement(children)
        ? React.cloneElement(children as any, {
            id, name, "aria-invalid": !!error, "aria-describedby": error ? errId : undefined,
            className: `${(children as any).props.className ?? ""} ${error ? "ring-1 ring-red-400" : ""}`
          })
        : children}
      {error && <p id={errId} className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// util: mueve el foco al primer error
export function focusFirstError(fieldErrors?: Record<string,string>) {
  if (!fieldErrors) return;
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;
  // Busca input por name (soporta items[0].quantity)
  const el = document.querySelector<HTMLElement>(`[name="${CSS.escape(firstKey)}"]`);
  el?.focus();
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
