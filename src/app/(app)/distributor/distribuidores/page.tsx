/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Metadata } from "next";
import { Suspense } from "react";
import { getDistributorsWithKPIs } from "@/server/actions/distributors";
import { DistributorsContent } from "@/components/distributors/DistributorsContent";
import { Building2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Distribuidores | Santa Brisa ERP",
  description: "Gestión de distribuidores con KPIs y análisis de rendimiento",
};

export default async function DistribuidoresPage() {
  const result = await getDistributorsWithKPIs();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Distribuidores
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Gestión y análisis de rendimiento de distribuidores
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Building2 className="w-12 h-12 animate-pulse text-neutral-400" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Cargando distribuidores...
              </p>
            </div>
          </div>
        }
      >
        <DistributorsContent
          initialDistributors={result.success && result.data ? result.data : []}
        />
      </Suspense>
    </div>
  );
}
