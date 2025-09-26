

"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, Input, Select, Textarea } from '@/components/ui/ui-primitives';
import { Plus, Trash2, Box, Truck, Search, Building, Info, X } from 'lucide-react';
import type { Party, Material, GoodsReceipt, Lot, StockMove, Uom } from '@/domain/ssot';

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const uniqueSku = (base: string, existingSkus: string[]) => {
  let candidate = base;
  let i = 1;
  while (existingSkus.includes(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
};

const makeSku = (name: string, category: string, existingSkus: string[]) => {
  const cat = (category || 'raw').toUpperCase().slice(0, 3);
  const slug = norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 12);
  const base = `${cat}-${slug || 'ITEM'}`;
  return uniqueSku(base, existingSkus);
};

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;


const MATERIAL_CATEGORIES: Material['category'][] = ['raw', 'packaging', 'label', 'consumable', 'intermediate', 'merchandising'];

type LineItem = {
    materialId?: string;
    newMaterialName?: string;
    newMaterialCategory?: Material['category'];
    supplierLot: string;
    qty: number;
    unitCost: number;
    uom?: Uom;
};

// Autocomplete/Search component
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

    const handleFreeText = useCallback(onFreeText, []);

    useEffect(() => {
        if (query.length > 1) {
            const filtered = items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
            setSuggestions(filtered);
            setIsOpen(true);
            if (filtered.length === 0) {
              const exact = items.some(i => i.name.toLowerCase() === query.toLowerCase());
              if (!exact) handleFreeText(query);
            }
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    }, [query, items, handleFreeText]);

    const handleSelect = (item: T) => {
        setQuery(item.name);
        onSelect(item);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <Input
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                }}
                onBlur={() => {
                  setTimeout(() => setIsOpen(false), 150);
                }}
                onFocus={() => {
                  if (query.length > 1) setIsOpen(true);
                }}
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


export default function GoodsReceiptPage() {
    const { data, currentUser, saveAllCollections } = useData();
    const [supplierId, setSupplierId] = useState<string | undefined>();
    const [newSupplierName, setNewSupplierName] = useState<string | undefined>();
    const [deliveryNote, setDeliveryNote] = useState('');
    const [lines, setLines] = useState<LineItem[]>([{ supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
    const [sendToQc, setSendToQc] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const suppliers = useMemo(() => {
        return (data?.parties || []).filter(p => (p.roles || []).includes('SUPPLIER'));
    }, [data?.parties]);

    const materials = useMemo(() => {
        return data?.materials || [];
    }, [data?.materials]);
    
    const handleLineChange = useCallback((index: number, field: keyof LineItem, value: any) => {
        const newLines = [...lines];
        const line = newLines[index];
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

        setLines(newLines);
    }, [lines, materials]);

    const addLine = () => {
        setLines([...lines, { supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
    };
    
    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setNotification(null);
        if ((!supplierId && !newSupplierName) || !deliveryNote || lines.some(l => (!l.materialId && !l.newMaterialName) || !l.qty || !l.supplierLot)) {
            setNotification({ message: 'Por favor, completa Proveedor, Albarán y todas las líneas de producto.', type: 'error' });
            return;
        }

        const now = new Date();
        const receiptId = uid('gr');
        
        const newLots: Lot[] = [];
        const newStockMoves: StockMove[] = [];
        const newMaterials: Material[] = [];
        const newParties: Party[] = [];
        const finalLines: GoodsReceipt['lines'] = [];

        let finalSupplierId = supplierId;

        // Create new supplier if needed
        if (newSupplierName && !supplierId) {
            const newPartyId = uid('party');
            const nowIso = now.toISOString();
            const newParty: Party = {
                id: newPartyId,
                name: newSupplierName,
                legalName: newSupplierName,
                kind: 'ORG',
                roles: ['SUPPLIER'],
                createdAt: nowIso,
                updatedAt: nowIso,
            } as Party;
            newParties.push(newParty);
            finalSupplierId = newPartyId;
        }

        const existingSkus = materials.map(m => m.sku);

        for (const [index, line] of lines.entries()) {
            let materialId = line.materialId;
            let sku = '';
            let uom: Uom = line.uom || 'uds';

            // Create new material if needed
            if (line.newMaterialName && !line.materialId) {
                const newMaterialId = uid('mat');
                const cat = line.newMaterialCategory || 'raw';
                const newSku = makeSku(line.newMaterialName, cat, existingSkus);

                const newMaterial: Material = {
                    id: newMaterialId,
                    sku: newSku,
                    name: line.newMaterialName,
                    category: cat,
                    uom: ((line.uom as Uom) || 'uds') as Uom,
                    standardCost: line.unitCost || 0,
                } as any;

                newMaterials.push(newMaterial);
                existingSkus.push(newSku);
                materialId = newMaterialId;
                sku = newSku;
                uom = newMaterial.uom as Uom;
            } else {
                const m = materials.find(mm => mm.id === materialId);
                sku = m?.sku || '';
                uom = (m?.uom as Uom) || ('uds' as Uom);
            }
            
            const newLotId = uid(`lot_${receiptId}_${index}`);
            
            const newLot: Lot = {
                id: newLotId,
                sku: sku,
                quantity: line.qty,
                createdAt: now.toISOString(),
                supplierId: finalSupplierId,
                supplierBatch: line.supplierLot,
                quality: { qcStatus: sendToQc ? 'hold' : 'release', results: {} },
            };
            newLots.push(newLot);

            newStockMoves.push({
                id: `sm_rcpt_${newLot.id}`,
                sku: newLot.sku,
                lotId: newLot.id,
                qty: newLot.quantity,
                uom: uom,
                reason: 'receipt',
                toLocation: sendToQc ? 'QC/AREA' : 'RM/MAIN',
                occurredAt: now.toISOString(),
                createdAt: now.toISOString(),
                ref: { goodsReceiptId: receiptId },
                unitCost: line.unitCost
            });

            finalLines.push({
                materialId: materialId!,
                sku: sku,
                lotId: newLotId,
                qty: line.qty,
                uom: uom,
                unitCost: line.unitCost
            });
        }
        
        const receipt: GoodsReceipt = {
            id: receiptId,
            receiptNumber: `GR-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
            supplierPartyId: finalSupplierId!,
            deliveryNote,
            receivedAt: now.toISOString(),
            status: sendToQc ? 'pending_qc' : 'completed',
            createdById: currentUser?.id,
            lines: finalLines,
        };

        try {
            await saveAllCollections({
                goodsReceipts: [...(data?.goodsReceipts || []), receipt],
                lots: [...(data?.lots || []), ...newLots],
                stockMoves: [...(data?.stockMoves || []), ...newStockMoves],
                materials: [...(data?.materials || []), ...newMaterials],
                parties: [...(data?.parties || []), ...newParties],
            });

            setNotification({ message: 'Recepción de mercancía guardada con éxito.', type: 'success' });
            // Reset form
            setSupplierId(undefined);
            setNewSupplierName(undefined);
            setDeliveryNote('');
            setLines([{ supplierLot: '', qty: 0, unitCost: 0, newMaterialCategory: 'raw', uom: 'uds' }]);
        } catch (error) {
            console.error("Failed to save goods receipt:", error);
            setNotification({ message: 'Error al guardar la recepción.', type: 'error' });
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
                                onFreeText={useCallback(text => { 
                                    const exact = suppliers.some(s => s.name.toLowerCase() === text.toLowerCase());
                                    if (!exact) { 
                                      setNewSupplierName(text); 
                                      setSupplierId(undefined); 
                                    }
                                }, [suppliers])}
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
                                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-start">
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
                                                {MATERIAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                        <SBButton onClick={handleSave}>
                            Guardar Recepción
                        </SBButton>
                    </div>
                </div>
            </SBCard>
        </div>
    );
}
