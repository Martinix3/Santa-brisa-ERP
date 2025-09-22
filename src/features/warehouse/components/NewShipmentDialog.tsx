
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select } from '@/components/ui/ui-primitives';
import type { Shipment, Account, Product, Party } from '@/domain/ssot';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

type NewShipmentPayload = Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>;

interface NewShipmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (payload: NewShipmentPayload) => void;
    accounts: Account[];
    products: Product[];
}

export function NewShipmentDialog({ open, onClose, onSave, accounts, products }: NewShipmentDialogProps) {
    const { data } = useData();
    const [accountId, setAccountId] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [lines, setLines] = useState<{ sku: string; qty: number; name: string, uom: 'uds' }[]>([{ sku: '', qty: 1, name: '', uom: 'uds' }]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (open) {
            setAccountId('');
            setAddress('');
            setCity('');
            setLines([{ sku: '', qty: 1, name: '', uom: 'uds' }]);
            setNotes('');
        }
    }, [open]);

    const handleAccountChange = (selectedAccountId: string) => {
        setAccountId(selectedAccountId);
        const account = accounts.find(a => a.id === selectedAccountId);
        const party = data?.parties.find(p => p.id === account?.partyId);
        if (party) {
            const mainAddress = party.addresses.find(a => a.isPrimary) || party.addresses[0];
            if (mainAddress) {
                setCity(mainAddress.city);
                setAddress(mainAddress.street);
            }
        }
    };

    const handleLineChange = (index: number, field: 'sku' | 'qty', value: string) => {
        const newLines = [...lines];
        if (field === 'sku') {
            const product = products.find(p => p.sku === value);
            newLines[index].sku = value;
            newLines[index].name = product?.name || 'Producto Desconocido';
        } else {
            newLines[index].qty = parseInt(value, 10) || 1;
        }
        setLines(newLines);
    };

    const addLine = () => setLines([...lines, { sku: '', qty: 1, name: '', uom: 'uds' }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
            alert('Selecciona un cliente válido.');
            return;
        }
        const now = new Date().toISOString();
        const payload: NewShipmentPayload = {
            orderId: `manual_${Date.now()}`,
            accountId,
            partyId: account.partyId,
            mode: 'PARCEL',
            status: 'pending',
            lines,
            customerName: account.name,
            addressLine1: address,
            city,
            notes,
        };
        onSave(payload);
    };

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title="Crear Nuevo Envío Manual"
                description="Rellena los datos para crear un envío que no está ligado a un pedido de venta."
                onSubmit={handleSubmit}
                primaryAction={{ label: 'Crear Envío', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: onClose }}
                size="lg"
            >
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Cliente</span>
                            <Select value={accountId} onChange={e => handleAccountChange(e.target.value)} required>
                                <option value="" disabled>Selecciona un cliente</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </Select>
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Ciudad</span>
                            <Input value={city} onChange={e => setCity(e.target.value)} required />
                        </label>
                    </div>
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Dirección</span>
                        <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, número, piso..." required />
                    </label>
                    
                    <div>
                        <span className="text-sm font-medium">Líneas del Envío</span>
                        <div className="mt-2 space-y-2 border rounded-lg p-3 bg-zinc-50/50">
                            {lines.map((line, index) => (
                                <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                                    <Select value={line.sku} onChange={e => handleLineChange(index, 'sku', e.target.value)} required>
                                        <option value="">Selecciona producto</option>
                                        {products.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                                    </Select>
                                    <Input type="number" min="1" value={line.qty} onChange={e => handleLineChange(index, 'qty', e.target.value)} className="w-20" required />
                                    <button type="button" onClick={() => removeLine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                             <button type="button" onClick={addLine} className="text-sm flex items-center gap-1 text-blue-600 hover:underline pt-2">
                                <Plus size={14} /> Añadir línea
                            </button>
                        </div>
                    </div>

                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Notas (opcional)</span>
                        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones especiales para el almacén o transporte."/>
                    </label>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
