
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial, Account } from '@/domain';
import { Plus, X, Package } from 'lucide-react';

const TACTIC_CODES = [
    "ICE_BUCKET", "GLASSWARE", "BARTENDER_INCENTIVE", "MENU_PLACEMENT",
    "CHALKBOARD", "TWO_FOR_ONE", "HAPPY_HOUR", "SECONDARY_PLACEMENT", "OTHER"
];

function TacticItemRow({
    item,
    onUpdate,
    onRemove,
    costCatalog,
    plvInventory
}: {
    item: Partial<PosTacticItem>;
    onUpdate: (item: Partial<PosTacticItem>) => void;
    onRemove: () => void;
    costCatalog: PosCostCatalogEntry[];
    plvInventory: PlvMaterial[];
}) {
    const [itemType, setItemType] = useState<'catalog' | 'plv' | 'adhoc'>('adhoc');
    
    const handleCatalogSelect = (code: string) => {
        const catItem = costCatalog.find(c => c.code === code);
        if(catItem) {
            onUpdate({ catalogCode: code, description: catItem.label, unitCost: catItem.defaultUnitCost, uom: catItem.uom });
        }
    }
    
    const handlePlvSelect = (assetId: string) => {
        const plvItem = plvInventory.find(p => p.id === assetId);
        if(plvItem) {
            onUpdate({ assetId, description: plvItem.kind, qty: 1 });
        }
    }

    return (
        <div className="p-3 border rounded-lg bg-zinc-50/50 space-y-2">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                     <button type="button" onClick={() => setItemType('catalog')} className={`text-xs px-2 py-1 rounded ${itemType === 'catalog' ? 'bg-blue-200 text-blue-800' : 'bg-zinc-200'}`}>Desde Catálogo</button>
                     <button type="button" onClick={() => setItemType('plv')} className={`text-xs px-2 py-1 rounded ${itemType === 'plv' ? 'bg-green-200 text-green-800' : 'bg-zinc-200'}`}>Desde Inventario PLV</button>
                     <button type="button" onClick={() => setItemType('adhoc')} className={`text-xs px-2 py-1 rounded ${itemType === 'adhoc' ? 'bg-yellow-200 text-yellow-800' : 'bg-zinc-200'}`}>Ad-hoc</button>
                </div>
                <button type="button" onClick={onRemove}><X size={16} className="text-red-500"/></button>
            </div>
             
             {itemType === 'catalog' && (
                <Select onChange={e => handleCatalogSelect(e.target.value)} value={item.catalogCode || ''}>
                    <option value="">Selecciona del catálogo...</option>
                    {costCatalog.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </Select>
            )}

            {itemType === 'plv' && (
                <Select onChange={e => handlePlvSelect(e.target.value)} value={item.assetId || ''}>
                    <option value="">Selecciona PLV...</option>
                    {plvInventory.map(p => <option key={p.id} value={p.id}>{p.kind} ({p.id})</option>)}
                </Select>
            )}

            <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Descripción" value={item.description || ''} onChange={e => onUpdate({ ...item, description: e.target.value })} required disabled={itemType !== 'adhoc'}/>
                <Input placeholder="Coste total" type="number" value={item.actualCost ?? ''} onChange={e => onUpdate({ ...item, actualCost: Number(e.target.value) })} required disabled={itemType !== 'adhoc'}/>
            </div>
        </div>
    );
}


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
    const [tactic, setTactic] = useState<Partial<PosTactic>>({});

    useEffect(() => {
        if(open) {
            setTactic(tacticBeingEdited || { status: 'active', executionScore: 80, items: [] });
        }
    }, [open, tacticBeingEdited]);

    const handleItemUpdate = (index: number, updatedItem: Partial<PosTacticItem>) => {
        const newItems = [...(tactic.items || [])];
        newItems[index] = { ...newItems[index], ...updatedItem };
        setTactic(prev => ({...prev, items: newItems as PosTacticItem[]}));
    };

    const handleAddItem = () => {
        const newItem: Partial<PosTacticItem> = { description: '', actualCost: 0 };
        setTactic(prev => ({...prev, items: [...(prev.items || []), newItem] as PosTacticItem[]}));
    };
    
    const handleRemoveItem = (index: number) => {
        setTactic(prev => ({...prev, items: prev.items?.filter((_, i) => i !== index) as PosTacticItem[]}));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!tactic.accountId || !tactic.tacticCode || tactic.executionScore === undefined || !tactic.items?.length) {
            alert('Por favor, completa todos los campos requeridos: cuenta, táctica, ejecución y al menos una partida de coste.');
            return;
        }
        onSave(tactic as any);
    };

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={tacticBeingEdited ? `Editar Táctica ${tacticBeingEdited.tacticCode}` : "Nueva Táctica POS"}
                description="Registra una acción en el punto de venta y sus costes asociados."
                onSubmit={handleSave}
                primaryAction={{ label: tacticBeingEdited ? "Guardar Cambios" : "Crear Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
                size="lg"
            >
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="grid gap-1.5 md:col-span-2">
                            <span className="text-sm font-medium">Cuenta</span>
                            <Select value={tactic.accountId || ''} onChange={e => setTactic(p => ({...p, accountId: e.target.value}))} required>
                                <option value="" disabled>Selecciona una cuenta</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </Select>
                        </label>
                        <label className="grid gap-1.5">
                             <span className="text-sm font-medium">Ejecución (0-100)</span>
                            <Input type="number" min="0" max="100" value={tactic.executionScore ?? ''} onChange={e => setTactic(p => ({...p, executionScore: Number(e.target.value)}))} required/>
                        </label>
                    </div>
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Tipo de Táctica</span>
                        <Select value={tactic.tacticCode || ''} onChange={e => setTactic(p => ({...p, tacticCode: e.target.value}))} required>
                            <option value="" disabled>Selecciona un tipo</option>
                            {TACTIC_CODES.map(code => <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>)}
                        </Select>
                    </label>

                    <div>
                        <span className="text-sm font-medium">Partidas de Coste</span>
                        <div className="space-y-2 mt-1 p-3 border rounded-lg bg-zinc-50">
                            {tactic.items?.map((item, index) => (
                                <TacticItemRow 
                                    key={index}
                                    item={item}
                                    onUpdate={updatedItem => handleItemUpdate(index, updatedItem)}
                                    onRemove={() => handleRemoveItem(index)}
                                    costCatalog={costCatalog}
                                    plvInventory={plvInventory}
                                />
                            ))}
                            <button type="button" onClick={handleAddItem} className="text-sm flex items-center gap-1 text-blue-600 hover:underline pt-2">
                                <Plus size={14}/> Añadir partida
                            </button>
                        </div>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

