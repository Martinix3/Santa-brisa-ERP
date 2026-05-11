"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useData } from "@/lib/dataprovider";
import type { SystemConfig } from "@/domain/ssot";
import { SBCard } from "@/components/ui/ui-primitives";
import { Settings, Database, Server, CheckCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const { data } = useData();
  const systemConfig = data?.systemConfig;

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Configuración del Sistema
      </h1>
      
      <div className="sb-page__content">
        {/* System Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estado del Sistema</p>
                  <p className="text-2xl font-bold text-green-600">Operativo</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </SBCard>
          
          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Base de Datos</p>
                  <p className="text-2xl font-bold">Firestore</p>
                </div>
                <Database className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </SBCard>
          
          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Framework</p>
                  <p className="text-2xl font-bold">Next.js 15</p>
                </div>
                <Server className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </SBCard>
        </div>

        {/* System Configuration */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Configuración del Sistema</div>
          </div>
          <div className="sb-card__content">
            {systemConfig ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(systemConfig).map(([key, value]) => (
                    <div key={key} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay configuración del sistema disponible
              </p>
            )}
          </div>
        </SBCard>

        {/* System Info Card */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Información del Sistema</div>
          </div>
          <div className="sb-card__content">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Versión</span>
                <span className="font-mono">1.1.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Entorno</span>
                <span className="font-mono">Production</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Base de Datos</span>
                <span className="font-mono">Firestore</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Framework</span>
                <span className="font-mono">Next.js 15</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">TypeScript</span>
                <span className="font-mono">✓ Enabled</span>
              </div>
            </div>
          </div>
        </SBCard>
      </div>
    </div>
  );
}
