
"use client";
import React, { useMemo, useState } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { Interaction } from '@/domain';
import { useData } from '@/lib/dataprovider';

const POS_TACTICS_DICTIONARY = [
    "ICE_BUCKET", "GLASSWARE", "BARTENDER_INCENTIVE", "MENU_PLACEMENT",
    "CHALKBOARD", "TWO_FOR_ONE", "HAPPY_HOUR", "SECONDARY_PLACEMENT", "OTHER"
];

export function NewPosTacticDialog({
    open,
    onClose,
    onSave,
    accountId,
}: {
    open: boolean,
    onClose: () => void,
    onSave: (data: Omit<Interaction, 'id' | 'createdAt' | 'status' | 'userId'>) => void,
    accountId: string,
}) {
    const { data } = useData();
    const [tacticCode, setTacticCode] = useState(POS_TACTICS_DICTIONARY[0]);
    const [costTotal, setCostTotal] = useState<number | ''>('');
    const [executionScore, setExecutionScore] = useState<number | ''>(80);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (costTotal === '' || executionScore === '') {
            alert('Por favor, completa todos los campos requeridos.');
            return;
        }

        const newInteractionData: Omit<Interaction, 'id' | 'createdAt' | 'status' | 'userId'> = {
            accountId: accountId,
            kind: 'OTRO',
            dept: 'MARKETING',
            note: `Táctica POS: ${tacticCode}`,
            plannedFor: new Date().toISOString(),
            posTactic: {
                tacticCode,
                startDate: new Date().toISOString(),
                costTotal: Number(costTotal),
                executionScore: Number(executionScore),
            }
        };

        onSave(newInteractionData);
        onClose();
    };
    
    const account = data?.accounts.find(a => a.id === accountId);

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={`Nueva Táctica para ${account?.name || 'la cuenta'}`}
                description="Rellena los datos de la acción realizada en el punto de venta."
                onSubmit={handleSave}
                primaryAction={{ label: "Guardar Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Táctica</span>
                        <select value={tacticCode} onChange={e => setTacticCode(e.target.value)} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                            {POS_TACTICS_DICTIONARY.map(code => <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>)}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Coste Total (€)</span>
                            <input type="number" value={costTotal} onChange={e => setCostTotal(e.target.value === '' ? '' : Number(e.target.value))} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required/>
                        </label>
                         <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Ejecución (0-100)</span>
                            <input type="number" min="0" max="100" value={executionScore} onChange={e => setExecutionScore(e.target.value === '' ? '' : Number(e.target.value))} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required/>
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

