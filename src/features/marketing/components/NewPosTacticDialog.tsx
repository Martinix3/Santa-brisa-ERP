// src/features/marketing/components/NewPosTacticDialog.tsx
"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';
import type { PosTactic, Account, PosCostCatalogEntry, PlvMaterial } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { Plus, X, Package, Tag, AlertCircle } from 'lucide-react';
import { PosLineInput } from '@/features/pos/server/pos-actions';

function AccountSearch({ initialAccountId, onSelectionChange, accounts }: { 
    initialAccountId?: string;
    onSelectionChange: (selection: { accountId?: string }) => void;
    accounts: Account[];
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Account[]>([]);
    
    useEffect(() => {
        if(initialAccountId && accounts) {
            const acc = accounts.find(a => a.id === initialAccountId);
            if(acc && acc.name !== query) setQuery(acc.name);
        }
    }, [initialAccountId, accounts, query]);

    useEffect(() => {
        if (query.length > 1 && accounts) {
            const lowerQuery = query.toLowerCase();
            const filteredAccounts = accounts.filter(a => 
                a.name.toLowerCase().includes(lowerQuery)
            );
            setResults(filteredAccounts);
        } else {
            setResults([]);
        }
    }, [query, accounts]);

    return (
        <div className="relative">
            <Input
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    if(initialAccountId) onSelectionChange({ accountId: undefined });
                }}
                placeholder="Buscar cuenta..."
                required
                disabled={!!initialAccountId && accounts.length === 1}
            />
            {results.length > 0 && query.length > 1 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
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

const TacticItemRow = ({
  item,
  index,
  onChange,
  onRemove,
  catalog,
}: {
  item: Partial<PosLineInput>;
  index: number;
  onChange: (index: number, updatedItem: Partial<PosLineInput>) => void;
  onRemove: (index: number) => void;
  catalog: PosCostCatalogEntry[];
}) => {
    
    const handleTypeChange = (value: 'CATALOGO' | 'CUSTOM') => {
        onChange(index, { kind: value, catalogItemId: undefined, description: '' });
    };

    const handleCatalogChange = (value: string) => {
        const catItem = catalog.find(c => c.id === value);
        onChange(index, { catalogItemId: value, estCostOverride: catItem?.defaultCost, description: catItem?.name });
    };

    return (
        <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-2 items-center p-2 border rounded-md bg-white">
            <Select value={item.kind} onChange={(e) => handleTypeChange(e.target.value as any)} className="w-32">
                <option value="CATALOGO">Catálogo</option>
                <option value="CUSTOM">Custom</option>
            </Select>
            
            {item.kind === 'CATALOGO' ? (
                <Select value={item.catalogItemId || ''} onChange={(e) => handleCatalogChange(e.target.value)}>
                    <option value="">Selecciona un ítem...</option>
                    {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
            ) : (
                <Input value={item.description || ''} onChange={(e) => onChange(index, { description: e.target.value })} placeholder="Descripción de la acción"/>
            )}
            
            <Input type="number" placeholder="Coste (€)" value={item.estCostOverride ?? ''} onChange={e => onChange(index, { estCostOverride: Number(e.target.value) || undefined })}/>
            <Input type="date" value={item.scheduleAt || ''} onChange={e => onChange(index, { scheduleAt: e.target.value })}/>
            
            <button type="button" onClick={() => onRemove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><X size={16}/></button>
        </div>
    );
};

export function NewPosTacticDialog({
    open, onClose, onSave, tacticBeingEdited, accounts
}: {
    open: boolean;
    onClose: () => void;
    onSave: (data: { lines: PosLineInput[], accountId: string }) => void;
    tacticBeingEdited: PosTactic | null;
    accounts: Account[];
}) {
    const { data } = useData();
    const [accountId, setAccountId] = useState<string | undefined>();
    const [lines, setLines] = useState<Partial<PosLineInput>[]>([{ kind: 'CATALOGO' }]);

    const catalog = useMemo(() => (data?.posCostCatalog || []) as PosCostCatalogEntry[], [data]);

    useEffect(() => {
        if(open) {
            setAccountId(tacticBeingEdited?.accountId ?? (accounts.length === 1 ? accounts[0].id : undefined));
            setLines(tacticBeingEdited?.id ? (tacticBeingEdited.items || []).map(i => ({
                kind: i.catalogCode ? 'CATALOGO' : 'CUSTOM',
                catalogItemId: i.catalogCode,
                description: i.description,
                estCostOverride: i.unitCost,
                qty: i.qty
            })) : [{ kind: 'CATALOGO' }]);
        }
    }, [open, tacticBeingEdited, accounts]);
    
    const handleItemChange = (index: number, updatedItem: Partial<PosLineInput>) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], ...updatedItem };
        setLines(newLines);
    };
    
    const addItem = () => setLines(p => [...p, { kind: 'CATALOGO' }]);
    const removeItem = (index: number) => setLines(p => p.filter((_, i) => i !== index));

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!accountId || !lines?.length) {
            alert('Por favor, completa la cuenta y al menos una línea de táctica.');
            return;
        }
        onSave({ accountId, lines: lines as PosLineInput[] });
    };
    
    const handleAccountSelectionChange = useCallback((selection: { accountId?: string }) => {
        setAccountId(selection.accountId);
    }, []);

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={tacticBeingEdited ? `Editar Táctica` : "Registrar Nueva Táctica POS"}
                description="Define los materiales, servicios y costes asociados a esta acción de marketing."
                onSubmit={handleSave}
                primaryAction={{ label: "Guardar Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
                maxWidth="48rem"
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Cuenta</span>
                        <AccountSearch
                            initialAccountId={accountId}
                            onSelectionChange={handleAccountSelectionChange}
                            accounts={accounts}
                        />
                    </label>
                    
                    <div>
                        <span className="text-sm font-medium">Líneas de la Táctica</span>
                        <div className="mt-2 space-y-2 border rounded-lg p-3 bg-zinc-50/50">
                            {(lines || []).map((item, index) => (
                                <TacticItemRow
                                    key={index}
                                    item={item}
                                    index={index}
                                    onChange={handleItemChange}
                                    onRemove={removeItem}
                                    catalog={catalog}
                                />
                            ))}
                            <SBButton type="button" variant="secondary" size="sm" onClick={addItem}>
                                <Plus size={14} className="mr-2"/> Añadir Línea
                            </SBButton>
                        </div>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
