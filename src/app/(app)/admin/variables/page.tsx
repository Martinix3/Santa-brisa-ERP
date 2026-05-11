/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Suspense } from "react";
import { SystemConfigEditor } from "@/features/admin/components/SystemConfigEditor";
import { getSystemConfig } from "@/features/admin/actions";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Variables del Sistema | Admin",
  description: "Configuración de alertas, tiempos y KPIs del sistema",
};

export default async function VariablesPage() {
  const config = await getSystemConfig();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="sb-h2">Variables del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura alertas, thresholds y reglas de negocio
        </p>
      </header>

      <Suspense fallback={<div>Cargando configuración...</div>}>
        <SystemConfigEditor initialConfig={config} />
      </Suspense>
    </div>
  );
}
