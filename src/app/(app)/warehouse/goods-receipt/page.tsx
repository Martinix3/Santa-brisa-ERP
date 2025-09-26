
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, Input, Select, Textarea } from '@/components/ui/ui-primitives';
import { Plus, Trash2, Box, Truck } from 'lucide-react';
import type { Party, Material, GoodsReceipt, Lot } from '@/domain/ssot';

type LineItem = {
    materialId: string;
    lotId: string;
    qty: number;
    unitCost: number;
};

export default function GoodsReceiptPage() {
    const { data, currentUser, saveAllCollections } = useData();
    const [supplierId, setSupplierId] = useState('');
    const [deliveryNote, setDeliveryNote] = useState('');
    const [lines, setLines] = useState<LineItem[]>([{ materialId: '', lotId: '', qty: 0, unitCost: 0 }]);
    const [sendToQc, setSendToQc] = useState(true);

    const suppliers = useMemo(() => {
        return (data?.parties || []).filter(p => p.roles?.includes('SUPPLIER'));
    }, [data?.parties]);

    const materials = useMemo(() => {
        return (data?.materials || []).filter(m => m.category === 'raw' || m.category === 'packaging');
    }, [data?.materials]);
    
    const handleLineChange = (index: number, field: keyof LineItem, value: string | number) => {
        const newLines = [...lines];
        const line = newLines[index];
        (line as any)[field] = value;
        if(field === 'materialId') {
            const material = materials.find(m => m.id === value);
            line.unitCost = material?.standardCost ?? 0;
        }
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { materialId: '', lotId: '', qty: 0, unitCost: 0 }]);
    };
    
    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!supplierId || !deliveryNote || lines.some(l => !l.materialId || !l.qty)) {
            alert('Por favor, completa todos los campos obligatorios.');
            return;
        }

        const now = new Date();
        const receiptId = `gr_${now.getTime()}`;
        const newLots: Lot[] = [];

        const receipt: GoodsReceipt = {
            id: receiptId,
            receiptNumber: `GR-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
            supplierPartyId: supplierId,
            deliveryNote,
            receivedAt: now.toISOString(),
            status: sendToQc ? 'pending_qc' : 'completed',
            createdById: currentUser?.id,
            lines: lines.map((line, index) => {
                const material = materials.find(m => m.id === line.materialId)!;
                const newLotId = `lot_${receiptId}_${index}`;
                
                const newLot: Lot = {
                    id: newLotId,
                    lotCode: line.lotId, // Usamos el lote del proveedor como lotCode
                    sku: material.sku,
                    quantity: line.qty,
                    createdAt: now.toISOString(),
                    supplierId: supplierId,
                    quality: { qcStatus: sendToQc ? 'hold' : 'release', results: {} },
                };
                newLots.push(newLot);

                return {
                    materialId: line.materialId,
                    sku: material.sku,
                    lotId: newLotId,
                    qty: line.qty,
                    uom: material.uom || 'uds',
                    unitCost: line.unitCost,
                };
            }),
        };

        await saveAllCollections({
            goodsReceipts: [...(data?.goodsReceipts || []), receipt],
            lots: [...(data?.lots || []), ...newLots],
        });

        alert('Recepción de mercancía guardada con éxito.');
        // Reset form
        setSupplierId('');
        setDeliveryNote('');
        setLines([{ materialId: '', lotId: '', qty: 0, unitCost: 0 }]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3">
                    <Truck /> Recepción de Mercancía
                </h1>
            </div>

            <SBCard title="Registrar Entrada de Material">
                <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <label className="grid gap-1.5">
                            <span className="font-medium">Proveedor</span>
                            <Select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                                <option value="" disabled>Selecciona un proveedor</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
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
                                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center">
                                    <Select value={line.materialId} onChange={e => handleLineChange(index, 'materialId', e.target.value)} required>
                                        <option value="">Selecciona material...</option>
                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </Select>
                                    <Input value={line.lotId} onChange={e => handleLineChange(index, 'lotId', e.target.value)} placeholder="Lote del proveedor" required/>
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
