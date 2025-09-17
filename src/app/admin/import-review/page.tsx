
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminDb } from '@/server/firebaseAdmin'; // Esto es un alias, pero la importación real será manejada por el server component
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Check, Edit2, AlertTriangle, PlusCircle, RefreshCw } from 'lucide-react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { DocumentData, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';


type StagedItem = {
    id: string;
    type: 'create' | 'update';
    proposedData: Record<string, any>;
    existingAccountId?: string;
    status: 'pending' | 'approved' | 'ignored';
};

// Componente Cliente que usa Suspense
function ImportReviewPageContent() {
    const searchParams = useSearchParams();
    const importId = searchParams.get('importId');
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStagedItems() {
            if (!importId) {
                setError("No se ha proporcionado un ID de importación.");
                setLoading(false);
                return;
            }
            try {
                // Esto se ejecutaría en el servidor, aquí lo simulamos.
                // En una implementación real, esto sería una Server Action o una API route.
                const response = await fetch(`/api/admin/get-staged-import?importId=${importId}`);
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Error al cargar los datos pre-importados.");
                }
                const data = await response.json();
                setStagedItems(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStagedItems();
    }, [importId]);
    
    const handleApprove = async () => {
        try {
            const response = await fetch('/api/admin/approve-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ importId }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al aprobar la importación.');
            }
            alert('¡Importación completada con éxito!');
            // Opcional: redirigir o actualizar la vista
            window.location.href = '/accounts';
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    if (loading) {
        return <div className="p-6 text-center">Cargando revisión de importación...</div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-600">{error}</div>;
    }

    const toCreate = stagedItems.filter(item => item.type === 'create');
    const toUpdate = stagedItems.filter(item => item.type === 'update');

    return (
        <div className="space-y-6">
            <p className="text-zinc-600">Revisa los contactos importados de Holded antes de guardarlos definitivamente en el sistema.</p>

            <div className="flex justify-end gap-3">
                <SBButton variant="secondary">Descartar Importación</SBButton>
                <SBButton onClick={handleApprove}>
                    <Check className="mr-2 h-4 w-4" /> Aprobar y Guardar ({stagedItems.length})
                </SBButton>
            </div>

            <SBCard title={`Cuentas Nuevas a Crear (${toCreate.length})`}>
                <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-zinc-50 text-xs font-semibold uppercase">
                        <span>Nombre</span>
                        <span>CIF</span>
                        <span>Ciudad</span>
                        <span>Teléfono</span>
                    </div>
                    {toCreate.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-4 p-3 hover:bg-green-50/50">
                            <div className="font-medium flex items-center gap-2"><PlusCircle size={14} className="text-green-600"/>{item.proposedData.name}</div>
                            <div>{item.proposedData.cif || '—'}</div>
                            <div>{item.proposedData.city || '—'}</div>
                            <div>{item.proposedData.phone || '—'}</div>
                        </div>
                    ))}
                </div>
            </SBCard>

            <SBCard title={`Cuentas Existentes a Actualizar (${toUpdate.length})`}>
                 <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-zinc-50 text-xs font-semibold uppercase">
                        <span>Nombre</span>
                        <span>CIF</span>
                        <span>Ciudad</span>
                        <span>Teléfono</span>
                    </div>
                    {toUpdate.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-4 p-3 hover:bg-yellow-50/50">
                            <div className="font-medium flex items-center gap-2"><RefreshCw size={14} className="text-yellow-700"/>{item.proposedData.name}</div>
                            <div>{item.proposedData.cif || '—'}</div>
                            <div>{item.proposedData.city || '—'}</div>
                            <div>{item.proposedData.phone || '—'}</div>
                        </div>
                    ))}
                </div>
            </SBCard>
        </div>
    );
}

export default function ImportReviewPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
            <ModuleHeader title="Revisión de Importación de Holded" icon={Edit2} />
            <div className="p-6 max-w-6xl mx-auto">
                <ImportReviewPageContent />
            </div>
        </Suspense>
    );
}
