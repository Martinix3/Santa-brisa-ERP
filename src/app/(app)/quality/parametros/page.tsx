"use client";

/* ============================================================================
 * /quality/parametros — Configuración de Calidad
 * - Catálogo de parámetros (ParameterCatalog)
 * - Planes de QC (QcPlan + QcTestSpec)
 * - Protocolos de seguridad (SafetyProtocol)
 * Usa datos reales desde useData() y aplica acento --sb-accent-calidad.
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { Plus, Trash2, Save, Wrench, FlaskConical, ShieldCheck, Settings } from "lucide-react";
import type {
  SantaData,
  ParameterCatalog, QcPlan, QcTestSpec, Range, QcPoint, QcMethod, Unit,
  SafetyProtocol
} from "@/domain/ssot";

// ==========================
// Helpers UI
// ==========================
function Section({ title, subtitle, children }: React.PropsWithChildren<{title:string; subtitle?:string}>) {
  return (
    <SBCard title={title} accent="hsl(var(--sb-accent-calidad))">
      <div className="p-4">
        {subtitle && <p className="text-sm text-zinc-600 mb-3">{subtitle}</p>}
        {children}
      </div>
    </SBCard>
  );
}

function Field({ label, children, className="" }: React.PropsWithChildren<{label:string; className?:string}>) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-zinc-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function TinyBadge({ children }: React.PropsWithChildren) {
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">{children}</span>;
}

// ==========================
// Acciones (stubs)
// Conecta aquí tu persistencia (Firestore / API).
// Devuelven {ok:boolean, message?:string, data?:T}
// ==========================
async function createParameter(p: Omit<ParameterCatalog,"id"|"createdAt"|"updatedAt"> & Partial<Pick<ParameterCatalog,"notes">>) {
  // TODO: POST → /api/quality/parameters
  const id = `param_${Date.now()}`;
  return { ok: true, data: { ...p, id } };
}

// ... (El resto del archivo permanece igual)
