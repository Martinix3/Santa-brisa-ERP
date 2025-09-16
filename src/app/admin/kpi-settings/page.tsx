

"use client";

import React, { useState, useEffect } from 'react';
import type { User } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import { Save, SlidersHorizontal } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';

function KPISettingsPageContent() {
    const { data, setData, currentUser } = useData();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (data) {
            setUsers(data.users);
        }
    }, [data]);

    const handleBaselineChange = (userId: string, field: 'revenue' | 'unitsSold' | 'visits', value: string) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return;

        setUsers(currentUsers =>
            currentUsers.map(user => {
                if (user.id === userId) {
                    return {
                        ...user,
                        kpiBaseline: {
                            ...(user.kpiBaseline || {}),
                            [field]: numValue
                        }
                    };
                }
                return user;
            })
        );
    };

    const handleSaveChanges = () => {
        if (!data) return;
        setData({ ...data, users: users });
        alert('¡Ajustes de KPI guardados!');
    };
    
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'owner') {
        return (
            <div className="p-6 text-center text-red-600">
                Acceso denegado. Esta página es solo para administradores.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-zinc-600 mt-1">
                Establece los valores iniciales o de base para las métricas de cada comercial.
                Estos valores se sumarán a los datos reales registrados en el CRM.
            </p>

            <SBCard title="Ajustes de Base para KPIs de Comerciales">
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-4 gap-4 px-2 py-2 text-xs font-semibold uppercase text-zinc-500 border-b">
                        <span>Comercial</span>
                        <span className="text-right">Ingresos Base (€)</span>
                        <span className="text-right">Unidades Base</span>
                        <span className="text-right">Visitas Base</span>
                    </div>

                    {users.filter(u => u.role === 'comercial' || u.role === 'owner').map(user => (
                        <div key={user.id} className="grid grid-cols-4 gap-4 items-center p-2 rounded-lg hover:bg-zinc-50">
                            <span className="font-medium">{user.name}</span>
                            <Input
                                type="number"
                                placeholder="0"
                                className="text-right"
                                value={user.kpiBaseline?.revenue || ''}
                                onChange={e => handleBaselineChange(user.id, 'revenue', e.target.value)}
                            />
                            <Input
                                type="number"
                                placeholder="0"
                                className="text-right"
                                value={user.kpiBaseline?.unitsSold || ''}
                                onChange={e => handleBaselineChange(user.id, 'unitsSold', e.target.value)}
                            />
                            <Input
                                type="number"
                                placeholder="0"
                                className="text-right"
                                value={user.kpiBaseline?.visits || ''}
                                onChange={e => handleBaselineChange(user.id, 'visits', e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-zinc-50 flex justify-end">
                    <SBButton onClick={handleSaveChanges}>
                        <Save size={16} /> Guardar Cambios
                    </SBButton>
                </div>
            </SBCard>
        </div>
    );
}

export default function KPISettingsPage() {
    return (
        <AuthGuard>
            <AuthenticatedLayout>
                 <ModuleHeader title="Ajustes de KPIs" icon={SlidersHorizontal}/>
                <div className="p-6">
                    <KPISettingsPageContent />
                </div>
            </AuthenticatedLayout>
        </AuthGuard>
    );
}
