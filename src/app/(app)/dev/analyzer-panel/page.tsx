/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Metadata } from "next";
import { Suspense } from "react";
import { AnalyzerPanelContent } from "@/features/dev/analyzer-panel/components/AnalyzerPanelContent";
import { Bot } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Analyzer Panel | Santa Brisa ERP",
  description: "Panel para ejecutar y visualizar los resultados de los analizadores de IA",
};

export default async function AnalyzerPanelPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Analyzer Panel
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Ejecuta y visualiza los resultados de los analizadores de IA
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Bot className="w-12 h-12 animate-pulse text-neutral-400" />
              <p className="text-neutral-600 dark:text-neutral-400">Cargando panel...</p>
            </div>
          </div>
        }
      >
        <AnalyzerPanelContent />
      </Suspense>
    </div>
  );
}
