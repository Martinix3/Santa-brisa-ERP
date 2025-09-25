

"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';
import type { PosTactic, PosTacticItem, PosCostCatalogEntry, Account, PlvMaterial } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { Plus, X, Package, Tag, AlertCircle } from 'lucide-react';

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

const TacticItemRow = ({
  item,
  index,
  onChange,
  onRemove,
  costCatalog,
  plvInventory,
}: {
  item: Partial<PosTacticItem>;
  index: number;
  onChange: (index: number, updatedItem: Partial<PosTacticItem>) => void;
  onRemove: (index: number) => void;
  costCatalog: PosCostCatalogEntry[];
  plvInventory: PlvMaterial[];
}) => {
    const itemOptions = useMemo(() => {
        return [
            ...costCatalog.map(c => ({ value: `cat_${c.code}`, label: `[Coste] ${c.label}`, type: 'catalog' })),
            ...plvInventory.map(p => ({ value: `plv_${p.id}`, label: `[PLV] ${p.kind}`, type: 'plv' })),
        ];
    }, [costCatalog, plvInventory]);

    const handleItemChange = (value: string) => {
        const [type, id] = value.split('_');
        if (type === 'catalog') {
            const catItem = costCatalog.find(c => c.code === id);
            if (catItem) {
                onChange(index, { catalogCode: catItem.code, description: catItem.label, unitCost: catItem.defaultUnitCost, qty: 1, actualCost: catItem.defaultUnitCost || 0, assetId: undefined });
            }
        } else if (type === 'plv') {
            const plvItem = plvInventory.find(p => p.id === id);
             if (plvItem) {
                onChange(index, { assetId: plvItem.id, description: plvItem.kind, unitCost: plvItem.purchaseCost, qty: 1, actualCost: plvItem.purchaseCost || 0, catalogCode: undefined });
            }
        }
    };
    
    const selectedAsset = item.assetId ? plvInventory.find(p => p.id === item.assetId) : null;
    const stockAvailable = selectedAsset?.usesCount ?? 0;
    const stockShortage = (item.qty || 0) > stockAvailable;

    return (
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
            <Select onChange={(e) => handleItemChange(e.target.value)} value={item.assetId ? `plv_${item.assetId}` : (item.catalogCode ? `cat_${item.catalogCode}`: '')}>
                <option value="">Selecciona concepto o material</option>
                <optgroup label="Costes de Catálogo">
                    {costCatalog.map(c => <option key={c.code} value={`cat_${c.code}`}>{c.label}</option>)}
                </optgroup>
                 <optgroup label="Material PLV (Inventario)">
                    {plvInventory.map(p => <option key={p.id} value={`plv_${p.id}`}>{p.kind} (SKU: {p.sku})</option>)}
                </optgroup>
            </Select>
            <Input type="number" placeholder="Cantidad" value={item.qty ?? 1} onChange={e => onChange(index, { qty: Number(e.target.value), actualCost: (item.unitCost || 0) * Number(e.target.value) })}/>
            <div className="relative">
                <Input type="number" placeholder="Coste" value={item.actualCost ?? 0} onChange={e => onChange(index, { actualCost: Number(e.target.value) })}/>
                {stockShortage && <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" title={`Stock insuficiente. Disponible: ${stockAvailable}`}/>}
            </div>
            <button type="button" onClick={() => onRemove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><X size={16}/></button>
        </div>
    );
};


export function NewPosTacticDialog({
    open, onClose, onSave, tacticBeingEdited, accounts, costCatalog, plvInventory
}: {
    open: boolean;
    onClose: () => void;
    onSave: (data: Omit<PosTactic, 'id' | 'createdAt' | 'createdById'> & { id?: string }) => void;
    tacticBeingEdited: PosTactic | null;
    accounts: Account[];
    costCatalog: PosCostCatalogEntry[];
    plvInventory: PlvMaterial[];
}) {
    const [tactic, setTactic] = useState<Partial<PosTactic>>({ items: [{id: '', description: '', actualCost: 0}] });

    useEffect(() => {
        if(open) {
            const initial = tacticBeingEdited || { status: 'active', executionScore: 80, accountId: accounts.length === 1 ? accounts[0].id : undefined, items: [{id: '', description: '', actualCost: 0}] };
            setTactic(initial);
        }
    }, [open, tacticBeingEdited, accounts]);
    
    const handleItemChange = (index: number, updatedItem: Partial<PosTacticItem>) => {
        const newItems = [...(tactic.items || [])];
        newItems[index] = { ...newItems[index], ...updatedItem };
        const totalCost = newItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
        setTactic(p => ({...p, items: newItems, actualCost: totalCost }));
    };
    
    const addItem = () => setTactic(p => ({...p, items: [...(p.items || []), {id: '', description: '', actualCost: 0}]}));
    const removeItem = (index: number) => setTactic(p => {
        const newItems = (p.items || []).filter((_, i) => i !== index);
        const totalCost = newItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
        return {...p, items: newItems, actualCost: totalCost};
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!tactic.accountId || !tactic.items?.length || tactic.items.some(i => !i.catalogCode && !i.assetId)) {
            alert('Por favor, completa la cuenta y al menos una línea de táctica válida.');
            return;
        }
        onSave(tactic as any);
    };
    
    const handleAccountSelectionChange = useCallback((selection: { accountId?: string }) => {
        setTactic(p => ({ ...p, accountId: selection.accountId }));
    }, []);

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={tacticBeingEdited ? `Editar Táctica` : "Registrar Nueva Táctica POS"}
                description="Define los materiales y costes asociados a esta acción de marketing."
                onSubmit={handleSave}
                primaryAction={{ label: "Guardar Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
                maxWidth="42rem"
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Cuenta</span>
                        <AccountSearch
                            initialAccountId={tactic.accountId}
                            onSelectionChange={handleAccountSelectionChange}
                            accounts={accounts}
                        />
                    </label>
                    
                    <div>
                        <span className="text-sm font-medium">Líneas de la Táctica</span>
                        <div className="mt-2 space-y-2 border rounded-lg p-3 bg-zinc-50/50">
                            {(tactic.items || []).map((item, index) => (
                                <TacticItemRow
                                    key={index}
                                    item={item}
                                    index={index}
                                    onChange={handleItemChange}
                                    onRemove={removeItem}
                                    costCatalog={costCatalog}
                                    plvInventory={plvInventory}
                                />
                            ))}
                            <SBButton type="button" variant="secondary" size="sm" onClick={addItem}>
                                <Plus size={14} className="mr-2"/> Añadir Línea
                            </SBButton>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Coste Total (€)</span>
                            <Input type="number" min="0" value={tactic.actualCost ?? ''} readOnly className="bg-zinc-100" />
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
