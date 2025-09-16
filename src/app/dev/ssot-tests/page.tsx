

"use client";

import React, { useMemo } from 'react';
import { runSmokeTests } from '@/domain/ssot.helpers';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import { CheckCircle, XCircle } from 'lucide-react';

function TestResult({ label, success, details }: { label: string, success: boolean, details: string[] }) {
    const bgColor = success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = success ? 'text-green-800' : 'text-red-800';
    const Icon = success ? CheckCircle : XCircle;

    return (
        <div className={`p-4 rounded-lg border ${bgColor}`}>
            <h3 className={`flex items-center gap-2 font-semibold ${textColor}`}>
                <Icon size={20} />
                {label}: {success ? 'PASS' : 'FAIL'}
            </h3>
            <ul className="mt-2 text-xs list-disc list-inside space-y-1">
                {details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                ))}
            </ul>
        </div>
    );
}

export default function SSOTTestsPage() {
    const testResults = useMemo(() => runSmokeTests(), []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-zinc-800">Smoke Tests del SSOT</h1>
            <p className="text-zinc-600">
                Esta página ejecuta una serie de pruebas de integridad sobre el modelo de datos unificado (SSOT)
                para verificar que las relaciones, cálculos y funciones principales se comportan como se espera.
            </p>
            
            <SBCard title="Resultados de las Pruebas" accent={SB_COLORS.admin}>
                <div className="p-4 space-y-4">
                    <TestResult 
                        label="Integridad de Claves Foráneas (FK)"
                        success={testResults.details.fk_validation.pass}
                        details={testResults.details.fk_validation.errors.length > 0 ? testResults.details.fk_validation.errors : ["Todas las relaciones son correctas."]}
                    />
                    <TestResult 
                        label="Cálculo de Coste de BOM"
                        success={testResults.details.bom_cost_rollup.pass}
                        details={[testResults.details.bom_cost_rollup.message]}
                    />
                    <TestResult 
                        label="Trazabilidad Inversa de Lote"
                        success={testResults.details.traceability.pass}
                        details={[testResults.details.traceability.message]}
                    />
                </div>
            </SBCard>

            <SBCard title="Resultado General" accent={SB_COLORS.admin}>
                <div className={`p-6 text-center rounded-b-2xl ${testResults.pass ? 'bg-green-100' : 'bg-red-100'}`}>
                    {testResults.pass ? (
                        <div className="flex flex-col items-center gap-2 text-green-900">
                            <CheckCircle size={40} />
                            <p className="text-xl font-bold">¡Todas las pruebas pasaron con éxito!</p>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center gap-2 text-red-900">
                            <XCircle size={40} />
                            <p className="text-xl font-bold">Algunas pruebas fallaron.</p>
                            <p>Revisa los detalles más arriba para identificar los problemas.</p>
                        </div>
                    )}
                </div>
            </SBCard>
        </div>
    );
}

    