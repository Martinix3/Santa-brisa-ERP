
"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, Input, Select } from '@/components/ui/ui-primitives';
import { Plus, Trash2, Truck, Search, Info, X } from 'lucide-react';
import type { Party, Material, GoodsReceipt, Lot, StockMove, Uom } from '@/domain/ssot';
import { createGoodsReceipt } from './actions';

function SearchableSelect<T extends {id: string, name: string}>({
    items,
    onSelect,
    onFreeText,
    placeholder,
    initialValue
}: {
    items: T[];
    onSelect: (item: T) => void;
    onFreeText: (text: string) => void;
    placeholder: string;
    initialValue?: string;
}) {
    const [query, setQuery] = useState(initialValue || '');
    const [suggestions, setSuggestions] = useState<T[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setQuery(initialValue || '');
    }, [initialValue]);

    useEffect(() => {
        if (query.length > 1) {
            const filtered = items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
            setSuggestions(filtered);
            setIsOpen(true);
            if (filtered.length === 0) {
              const exact = items.some(i => i.name.toLowerCase() === query.toLowerCase());
              if (!exact) onFreeText(query);
            }
        } else {
            setSuggestions([]);
            setIsOpen(false);
            onFreeText('');
        }
    }, [query, items, onFreeText]);

    const handleSelect = (item: T) => {
        setQuery(item.name);
        onSelect(item);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                onFocus={() => { if (query.length > 1) setIsOpen(true); }}
                placeholder={placeholder}
            />
            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                    {suggestions.map(item => (
                        <li key={item.id}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                            onMouseDown={() => handleSelect(item)}
                        >
                            <p className="font-medium text-sm">{item.name}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Notification({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    const baseClasses = "flex items-center gap-3 p-3 rounded-lg border";
    const typeClasses = type === 'success'
        ? "bg-green-50 border-green-200 text-green-800"
        : "bg-red-50 border-red-200 text-red-800";
    
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <Info size={16} className="flex-shrink-0" />
            <p className="text-sm font-medium flex-grow">{message}</p>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10">
                <X size={14} />
            </button>
        </div>
    );
}

type LineItem = {
    key: string; // Add a key for stable rendering
    materialId?: string;
    newMaterialName?: string;
    newMaterialCategory?: Material['category'];
    supplierLot: string;
    qty: number;
    unitCost: number;
    uom?: Uom;
};

export default function GoodsReceiptPage() {
    const { data } = useData();
    const [supplierId, setSupplierId] = useState<string | undefined>();
    const [newSupplierName, setNewSupplierName] = useState<string | undefined>();
    const [deliveryNote, setDeliveryNote] = useState('');
    const [lines, setLines] = useState<LineItem[]>([{ key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
    const [sendToQc, setSendToQc] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const suppliers = useMemo(() => (data?.parties || []).filter(p => (p.roles || []).includes('SUPPLIER')), [data?.parties]);
    const materials = useMemo(() => data?.materials || [], [data?.materials]);
    
    const handleLineChange = useCallback((index: number, field: keyof LineItem, value: any) => {
        setLines(currentLines => {
            const newLines = [...currentLines];
            const line = { ...newLines[index] };
            (line as any)[field] = value;

            if (field === 'materialId') {
                const material = materials.find(m => m.id === value);
                line.unitCost = material?.standardCost ?? 0;
                line.uom = material?.uom ?? 'uds';
                line.newMaterialName = undefined;
            }
            if (field === 'newMaterialName') {
                line.materialId = undefined;
            }
            newLines[index] = line;
            return newLines;
        });
    }, [materials]);

    const addLine = () => setLines([...lines, { key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

    const handleSave = async () => {
        setNotification(null);
        setIsSaving(true);
        if ((!supplierId && !newSupplierName) || !deliveryNote || lines.some(l => (!l.materialId && !l.newMaterialName) || !l.qty || !l.supplierLot)) {
            setNotification({ message: 'Por favor, completa Proveedor, Albarán y todas las líneas de producto.', type: 'error' });
            setIsSaving(false);
            return;
        }

        const payload = {
            supplierId,
            newSupplierName: newSupplierName && !supplierId ? newSupplierName : undefined,
            deliveryNote,
            lines,
            sendToQc,
        };

        try {
            await createGoodsReceipt(payload);
            setNotification({ message: 'Recepción de mercancía guardada con éxito.', type: 'success' });
            // Reset form
            setSupplierId(undefined);
            setNewSupplierName(undefined);
            setDeliveryNote('');
            setLines([{ key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
        } catch (error) {
            console.error("Failed to save goods receipt:", error);
            setNotification({ message: (error as Error).message || 'Error al guardar la recepción.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3">
                    <Truck /> Recepción de Mercancía
                </h1>
            </div>
            
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

            <SBCard title="Registrar Entrada de Material">
                <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <label className="grid gap-1.5">
                            <span className="font-medium">Proveedor</span>
                             <SearchableSelect<Party>
                                items={suppliers}
                                onSelect={item => { 
                                  setSupplierId(item.id); 
                                  setNewSupplierName(undefined);
                                }}
                                onFreeText={useCallback(text => setNewSupplierName(text), [])}
                                placeholder="Buscar o crear proveedor..."
                                initialValue={supplierId ? suppliers.find(s => s.id === supplierId)?.name : newSupplierName}
                            />
                        </label>
                         <label className="grid gap-1.5">
                            <span className="font-medium">Nº de Albarán del Proveedor</span>
                            <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ej: 2024/ABC-123" required />
                        </label>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Líneas de Producto</h4>
                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 text-sm font-semibold text-zinc-600 px-2">
                                <span>Material</span>
                                <span>Lote Proveedor</span>
                                <span className="text-right">Cantidad Recibida</span>
                                <span className="text-right">Coste Unitario</span>
                                <div />
                            </div>
                            {lines.map((line, index) => (
                                <div key={line.key} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-start">
                                    <div className="space-y-1">
                                        <SearchableSelect<Material>
                                            items={materials}
                                            onSelect={item => handleLineChange(index, 'materialId', item.id)}
                                            onFreeText={useCallback((text) => handleLineChange(index, 'newMaterialName', text), [handleLineChange, index])}
                                            placeholder="Buscar o crear material..."
                                            initialValue={line.materialId ? materials.find(m=>m.id === line.materialId)?.name : line.newMaterialName}
                                        />
                                        {line.newMaterialName && !line.materialId && (
                                            <Select value={line.newMaterialCategory} onChange={e => handleLineChange(index, 'newMaterialCategory', e.target.value as Material['category'])}>
                                                <option value="raw">Materia Prima</option>
                                                <option value="packaging">Packaging</option>
                                                <option value="label">Etiqueta</option>
                                                <option value="consumable">Consumible</option>
                                                <option value="intermediate">Intermedio</option>
                                                <option value="merchandising">Merchandising</option>
                                            </Select>
                                        )}
                                    </div>
                                    <Input value={line.supplierLot} onChange={e => handleLineChange(index, 'supplierLot', e.target.value)} placeholder="Lote del proveedor" required/>
                                    <Input type="number" value={line.qty || ''} onChange={e => handleLineChange(index, 'qty', e.target.value)} className="text-right" required/>
                                    <Input type="number" step="0.01" value={line.unitCost || ''} onChange={e => handleLineChange(index, 'unitCost', e.target.value)} className="text-right" required/>
                                    <SBButton variant="ghost" size="sm" onClick={() => removeLine(index)}><Trash2 className="h-4 w-4 text-red-500" /></SBButton>
                                </div>
                            ))}
                             <SBButton variant="secondary" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-2" />Añadir Línea</SBButton>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={sendToQc} onChange={e => setSendToQc(e.target.checked)} />
                            <span>Enviar lotes a cuarentena (QC)</span>
                        </label>
                        <SBButton onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Recepción'}
                        </SBButton>
                    </div>
                </div>
            </SBCard>
        </div>
    );
}

