
"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { PosTactic, PosCostCatalogEntry, Account, PlvMaterial } from '@/domain';
import { useData } from '@/lib/dataprovider';

const TACTIC_CODES = [
    "ICE_BUCKET", "GLASSWARE", "BARTENDER_INCENTIVE", "MENU_PLACEMENT",
    "CHALKBOARD", "TWO_FOR_ONE", "HAPPY_HOUR", "SECONDARY_PLACEMENT", "OTHER"
];

function AccountSearch({ initialAccountId, onSelectionChange }: { 
    initialAccountId?: string;
    onSelectionChange: (selection: { accountId?: string }) => void 
}) {
    const { data: santaData } = useData();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Account[]>([]);
    
    useEffect(() => {
        if(initialAccountId && santaData?.accounts) {
            const acc = santaData.accounts.find(a => a.id === initialAccountId);
            if(acc && acc.name !== query) setQuery(acc.name);
        }
    }, [initialAccountId, santaData?.accounts, query]);

    useEffect(() => {
        if (query.length > 1 && santaData?.accounts) {
            const lowerQuery = query.toLowerCase();
            const filteredAccounts = santaData.accounts.filter(a => 
                a.name.toLowerCase().includes(lowerQuery)
            );
            setResults(filteredAccounts);
            const exactMatch = filteredAccounts.find(a => a.name.toLowerCase() === lowerQuery);
            if (!exactMatch) {
                onSelectionChange({ accountId: undefined });
            }
        } else {
            setResults([]);
            onSelectionChange({ accountId: undefined });
        }
    }, [query, santaData, onSelectionChange]);

    return (
        <div className="relative">
            <input
                id="account-search"
                name="account-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar cuenta..."
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                required
                disabled={!!initialAccountId}
            />
            {results.length > 0 && query.length > 1 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                    {results.map(account => (
                        <li key={account.id} 
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                            onMouseDown={() => {
                                setQuery(account.name);
                                onSelectionChange({ accountId: account.id });
                                setResults([]);
                            }}
                        >
                            <p className="font-medium text-sm">{account.name}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function NewPosTacticDialog({
    open, onClose, onSave, tacticBeingEdited, accounts
}: {
    open: boolean;
    onClose: () => void;
    onSave: (data: Omit<PosTactic, 'id' | 'createdAt' | 'createdById'> & { id?: string }) => void;
    tacticBeingEdited: PosTactic | null;
    accounts: Account[];
    costCatalog: PosCostCatalogEntry[];
    plvInventory: PlvMaterial[];
}) {
    const [tactic, setTactic] = useState<Partial<PosTactic>>({});

    useEffect(() => {
        if(open) {
            const initial = tacticBeingEdited || { status: 'active', executionScore: 80, accountId: accounts.length === 1 ? accounts[0].id : undefined };
            setTactic(initial);
        }
    }, [open, tacticBeingEdited, accounts]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!tactic.accountId || !tactic.tacticCode || tactic.actualCost === undefined) {
            alert('Por favor, completa todos los campos requeridos: cuenta, táctica y coste.');
            return;
        }
        if(tactic.executionScore === undefined) {
          tactic.executionScore = 0;
        }
        onSave(tactic as any);
    };
    
    const handleAccountSelectionChange = useCallback((selection: { accountId?: string }) => {
        setTactic(p => ({ ...p, accountId: selection.accountId }));
    }, []);

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={tacticBeingEdited ? `Editar Táctica ${tacticBeingEdited.tacticCode}` : "Registrar Nueva Táctica POS"}
                description="Rellena los datos de la acción realizada en el punto de venta."
                onSubmit={handleSave}
                primaryAction={{ label: tacticBeingEdited ? "Guardar Táctica" : "Guardar Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
                size="md"
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Cuenta</span>
                        <AccountSearch
                            initialAccountId={tactic.accountId}
                            onSelectionChange={handleAccountSelectionChange}
                        />
                    </label>
                    
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Táctica</span>
                        <Select value={tactic.tacticCode || ''} onChange={e => setTactic(p => ({...p, tacticCode: e.target.value}))} required>
                            <option value="" disabled>Selecciona un tipo</option>
                            {TACTIC_CODES.map(code => <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>)}
                        </Select>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Coste Total (€)</span>
                            <Input type="number" min="0" value={tactic.actualCost ?? ''} onChange={e => setTactic(p => ({...p, actualCost: Number(e.target.value)}))} required/>
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Ejecución (0-100)</span>
                            <Input type="number" min="0" max="100" value={tactic.executionScore ?? ''} onChange={e => setTactic(p => ({...p, executionScore: Number(e.target.value)}))} />
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
