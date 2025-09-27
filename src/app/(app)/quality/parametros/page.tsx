
"use client";
import React, { useState } from 'react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { QcPlan, QcTestSpec, SafetyProtocol } from '@/domain/ssot';

// Mock data - en una app real, vendría de useData()
const mockPlans: QcPlan[] = [
    { id: 'plan_fg_sb750', name: 'Plan Estándar Santa Brisa 750ml', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), specs: [
        { parameterId: 'ph', required: true, point: 'FINAL_QC', targetRange: { min: 3.2, max: 3.8 } },
        { parameterId: 'density', required: true, point: 'FINAL_QC', targetRange: { min: 1.04, max: 1.06 } },
    ]},
];

const mockProtocols: SafetyProtocol[] = [
    { id: 'proto_preprod', title: 'Checklist Pre-Producción', category: 'PRODUCCION', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [
        { id: 'chk1', text: 'Limpieza de tanques verificada', mandatory: true },
        { id: 'chk2', text: 'Equipos de protección personal correctos', mandatory: true },
    ]},
];

export default function ParametrosPage() {
    const [plans, setPlans] = useState(mockPlans);
    const [protocols, setProtocols] = useState(mockProtocols);

    // Aquí irían las funciones para CRUD (llamarían a server actions)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Parámetros y Planes de Control</h1>
                <SBButton><Plus size={16} className="mr-2"/> Nuevo Plan/Protocolo</SBButton>
            </div>

            <SBCard title="Planes de Calidad (QC Plans)">
                <div className="divide-y divide-zinc-100">
                    {plans.map(plan => (
                        <div key={plan.id} className="p-4 hover:bg-zinc-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold">{plan.name}</h4>
                                    <p className="text-xs text-zinc-500">{plan.specs.length} especificaciones</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${plan.active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                        {plan.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <SBButton size="sm" variant="ghost"><Edit size={14}/></SBButton>
                                    <SBButton size="sm" variant="ghost"><Trash2 size={14}/></SBButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SBCard>

            <SBCard title="Protocolos de Seguridad">
                 <div className="divide-y divide-zinc-100">
                    {protocols.map(proto => (
                        <div key={proto.id} className="p-4 hover:bg-zinc-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold">{proto.title}</h4>
                                    <p className="text-xs text-zinc-500">{proto.category} - {proto.items.length} ítems</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className={`px-2 py-0.5 text-xs rounded-full ${proto.active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                        {proto.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <SBButton size="sm" variant="ghost"><Edit size={14}/></SBButton>
                                    <SBButton size="sm" variant="ghost"><Trash2 size={14}/></SBButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SBCard>
        </div>
    );
}
