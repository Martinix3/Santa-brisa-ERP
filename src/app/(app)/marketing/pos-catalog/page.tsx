
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { PosCostCatalogEntry } from '@/domain/ssot';
import { SBCard, SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { Plus, Edit, Save, X, Tag } from 'lucide-react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';

function CatalogRow({ item, onEdit }: { item: PosCostCatalogEntry; onEdit: (item: PosCostCatalogEntry) => void; }) {
    return (
        <tr className="border-b hover:bg-zinc-50">
            <td className="p-3 font-mono text-xs">{item.code}</td>
            <td className="p-3 font-medium">{item.label}</td>
            <td className="p-3 text-right">{item.defaultUnitCost?.toFixed(2)}€</td>
            <td className="p-3">{item.uom}</td>
            <td className="p-3">
                <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}>
                    {item.status}
                </span>
            </td>
            <td className="p-3 text-right">
                <SBButton variant="ghost" size="sm" onClick={() => onEdit(item)}>
                    <Edit size={14} />
                </SBButton>
            </td>
        </tr>
    );
}

function CatalogFormDialog({ item, open, onClose, onSave }: {
    item: Partial<PosCostCatalogEntry> | null;
    open: boolean;
    onClose: () => void;
    onSave: (entry: PosCostCatalogEntry) => void;
}) {
    const [entry, setEntry] = useState<Partial<PosCostCatalogEntry>>({});
    
    React.useEffect(() => {
        if (item) {
            setEntry(item);
        } else {
            setEntry({ code: '', label: '', status: 'ACTIVE', uom: 'UNIT' });
        }
    }, [item]);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!entry.code || !entry.label) {
            alert('Código y Etiqueta son obligatorios');
            return;
        }
        onSave(entry as PosCostCatalogEntry);
    };

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={entry.createdAt ? "Editar Táctica" : "Nueva Táctica de Catálogo"}
                description="Define un tipo de acción de marketing estandarizada."
                onSubmit={handleSubmit}
                primaryAction={{ label: 'Guardar', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: onClose }}
            >
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Código</span>
                            <Input value={entry.code || ''} onChange={e => setEntry(p => ({...p, code: e.target.value.toUpperCase().replace(/\s/g, '_')}))} required placeholder="EJ: BARTENDER_GIFT" />
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Etiqueta</span>
                            <Input value={entry.label || ''} onChange={e => setEntry(p => ({...p, label: e.target.value}))} required placeholder="Regalo a Bartender" />
                        </label>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Coste Unitario (€)</span>
                            <Input type="number" value={entry.defaultUnitCost ?? ''} onChange={e => setEntry(p => ({...p, defaultUnitCost: Number(e.target.value)}))} />
                        </label>
                         <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Unidad de Medida</span>
                            <Select value={entry.uom || 'UNIT'} onChange={e => setEntry(p => ({...p, uom: e.target.value as any}))}>
                                <option value="UNIT">Unidad</option>
                                <option value="HOUR">Hora</option>
                                <option value="BATCH">Lote/Pack</option>
                            </Select>
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

export default function PosCatalogPage() {
    const { data, saveCollection } = useData();
    const [editingItem, setEditingItem] = useState<PosCostCatalogEntry | null>(null);

    const catalog = useMemo(() => data?.posCostCatalog || [], [data]);

    const handleSave = async (entry: PosCostCatalogEntry) => {
        const now = new Date().toISOString();
        let updatedEntry = { ...entry };

        if (entry.createdAt) { // Editing existing
            updatedEntry.updatedAt = now;
        } else { // Creating new
            updatedEntry.id = `poscat_${Date.now()}`;
            updatedEntry.createdAt = now;
            updatedEntry.updatedAt = now;
            updatedEntry.createdById = 'system'; // Debería ser el currentUser.id
        }

        const newCatalog = entry.createdAt 
            ? catalog.map(item => item.id === updatedEntry.id ? updatedEntry : item)
            : [...catalog, updatedEntry];

        await saveCollection('posCostCatalog', newCatalog);
        setEditingItem(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-800">Catálogo de Tácticas POS</h1>
                    <p className="text-sm text-zinc-600">Define las acciones de marketing estandarizadas para el punto de venta.</p>
                </div>
                <SBButton onClick={() => setEditingItem({})}>
                    <Plus size={16} className="mr-2"/>
                    Nueva Táctica
                </SBButton>
            </div>

            <SBCard title="Tácticas Definidas">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left">
                        <tr>
                            <th className="p-3 font-semibold text-zinc-600">Código</th>
                            <th className="p-3 font-semibold text-zinc-600">Etiqueta</th>
                            <th className="p-3 font-semibold text-zinc-600 text-right">Coste por Defecto</th>
                            <th className="p-3 font-semibold text-zinc-600">UOM</th>
                            <th className="p-3 font-semibold text-zinc-600">Estado</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {catalog.map(item => (
                            <CatalogRow key={item.id} item={item} onEdit={setEditingItem} />
                        ))}
                    </tbody>
                </table>
            </SBCard>

            <CatalogFormDialog
                item={editingItem}
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSave}
            />
        </div>
    );
}

