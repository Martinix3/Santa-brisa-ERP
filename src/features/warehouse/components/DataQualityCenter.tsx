// src/features/warehouse/components/DataQualityCenter.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, CheckCircle, ServerCrash } from 'lucide-react';
import { toast } from 'sonner';
import { performDataQualityCheck } from '@/app/(app)/warehouse/inventory/actions'; // Importamos la Server Action
import type { DataAnomaly } from '@/lib/data-quality/types'; // Importamos el tipo

// Un pequeño componente helper para mostrar un icono según la severidad
const SeverityIcon = ({ severity }: { severity: DataAnomaly['severity'] }) => {
  if (severity === 'CRITICAL') {
    return <ShieldAlert size={16} className="text-red-500" />;
  }
  return <AlertTriangle size={16} className="text-amber-500" />;
};

export function DataQualityCenter() {
  // Estado para manejar la carga de la auditoría
  const [isChecking, startCheckTransition] = useTransition();
  
  // Estado para almacenar las anomalías encontradas
  const [anomalies, setAnomalies] = useState<DataAnomaly[]>([]);
  
  // Estado para saber si la auditoría ya se ha ejecutado al menos una vez
  const [hasRun, setHasRun] = useState(false);

  const handleRunAudit = () => {
    startCheckTransition(async () => {
      toast.info("Iniciando auditoría de calidad de datos...");
      const result = await performDataQualityCheck();

      if (result.ok) {
        setAnomalies(result.data);
        setHasRun(true);
        if (result.data.length === 0) {
          toast.success("Auditoría completada. ¡Todo en orden!");
        } else {
          toast.warning(`Auditoría completada. Se encontraron ${result.data.length} problemas.`);
        }
      } else {
        toast.error(`Error en la auditoría: ${result.message}`);
      }
    });
  };
  
  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = anomalies.filter(a => a.severity === 'WARNING').length;

  return (
    <SBCard>
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                <ShieldCheck size={24} className="text-[color:var(--sb-accent-logistica)]" />
                <div>
                    <h3 className="font-semibold">Centro de Calidad de Datos</h3>
                    <p className="text-xs text-zinc-500">Audita el inventario en busca de errores e inconsistencias.</p>
                </div>
                </div>
                <SBButton onClick={handleRunAudit} disabled={isChecking} variant="outline" className="border-[color:var(--sb-accent-logistica)] text-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)]/10">
                <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
                {isChecking ? 'Auditando...' : 'Ejecutar Auditoría'}
                </SBButton>
            </div>
            
            {/* --- Área de Resultados --- */}
            <div className="mt-4 border-t pt-4">
                {!hasRun && !isChecking && (
                <div className="text-center text-sm text-zinc-500 py-6">
                    <p>Haz clic en "Ejecutar Auditoría" para verificar la integridad de los datos de tu inventario.</p>
                </div>
                )}

                {isChecking && (
                    <div className="text-center text-sm text-zinc-500 py-6 animate-pulse">
                        <p>Analizando registros... Por favor, espera.</p>
                    </div>
                )}

                {hasRun && !isChecking && (
                <div>
                    {anomalies.length === 0 ? (
                    <div className="text-center text-green-600 bg-green-50 rounded-lg p-6">
                        <CheckCircle size={32} className="mx-auto mb-2" />
                        <h4 className="font-bold">¡Sin problemas encontrados!</h4>
                        <p className="text-sm">La integridad de los datos del inventario es correcta.</p>
                    </div>
                    ) : (
                    <div>
                        <div className="mb-4 text-sm">
                        <span className="font-semibold">Resumen:</span> {criticalCount} errores <span className="font-semibold text-red-600">críticos</span> y {warningCount} <span className="font-semibold text-amber-600">advertencias</span>.
                        </div>
                        <div className="divide-y divide-zinc-200 border rounded-lg">
                        {/* Encabezados de la tabla */}
                        <div className="grid grid-cols-[auto_1fr_2fr_1fr_auto] items-center gap-4 px-4 py-2 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                            <span>Severidad</span>
                            <span>Regla</span>
                            <span>Mensaje</span>
                            <span>Entidad Afectada</span>
                            <span>Acción</span>
                        </div>
                        {/* Filas de la tabla */}
                        {anomalies.map((anomaly, index) => (
                            <div key={index} className="grid grid-cols-[auto_1fr_2fr_1fr_auto] items-center gap-4 px-4 py-3 text-sm">
                            <SeverityIcon severity={anomaly.severity} />
                            <span className="font-mono text-xs">{anomaly.ruleId}</span>
                            <p>{anomaly.message}</p>
                            <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{anomaly.offendingEntity.type}: {anomaly.offendingEntity.id}</span>
                            <SBButton size="sm" variant="outline">Corregir</SBButton>
                            </div>
                        ))}
                        </div>
                    </div>
                    )}
                </div>
                )}
            </div>
        </div>
    </SBCard>
  );
}
