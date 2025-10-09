// src/features/warehouse/components/NewShipmentDialog.tsx

"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';
import type { Shipment, Account, Item, Party, SB_THEME, Uom, ShipmentLine, SalesUnit } from '@/domain/ssot.v7';
import { Plus, X, Search } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

type NewShipmentPayload = Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'> & {
    newCustomerName?: string;
};

interface NewShipmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (payload: NewShipmentPayload) => void;
    accounts: Account[];
    items: Item[];
}

function AccountSearch({
    accounts,
    onSelect,
    onFreeText,
}: {
    accounts: Account[];
    onSelect: (account: Account) => void;
    onFreeText: (text: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Account[]>([]);
    
    useEffect(() => {
        if (query.length > 1) {
            const lowerQuery = query.toLowerCase();
            const filtered = accounts.filter(acc => acc.name.toLowerCase().includes(lowerQuery));
            setSuggestions(filtered);
            if(filtered.length === 0) {
                onFreeText(query);
            }
        } else {
            setSuggestions([]);
            onFreeText('');
        }
    }, [query, accounts, onFreeText]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente por nombre..."
            />
            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((acc) => (
                        <li
                            key={acc.id}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                            onMouseDown={() => {
                                setQuery(acc.name);
                                onSelect(acc);
                                setSuggestions([]);
                            }}
                        >
                            {acc.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function NewShipmentDialog({ open, onClose, onSave, accounts, items }: NewShipmentDialogProps) {
    const { data } = useData();
    const [accountId, setAccountId] = useState<string | undefined>();
    const [newCustomerName, setNewCustomerName] = useState<string | undefined>();
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [lines, setLines] = useState<{ itemId: string; qty: number; name: string, uom: SalesUnit }[]>([{ itemId: '', qty: 1, name: '', uom: 'unit' }]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (open) {
            setAccountId(undefined);
            setNewCustomerName(undefined);
            setAddress('');
            setCity('');
            setPostalCode('');
            setLines([{ itemId: '', qty: 1, name: '', uom: 'unit' }]);
            setNotes('');
        }
    }, [open]);

    const handleAccountSelect = (account: Account) => {
        setAccountId(account.id);
        setNewCustomerName(undefined);
        const party = data?.parties.find(p => p.id === account?.partyId);
        if (party) {
            const mainAddress = (party.billingAddress ?? undefined);
            if (mainAddress) {
                setCity(mainAddress?.city ?? '');
                setAddress(mainAddress?.street ?? '');
                setPostalCode(mainAddress?.zip ?? '');
            }
        }
    };
    
    const handleFreeText = (text: string) => {
        setAccountId(undefined);
        setNewCustomerName(text);
    }

    const handleLineChange = (index: number, field: 'itemId' | 'qty', value: string) => {
        const newLines = [...lines];
        if (field === 'itemId') {
            const item = items.find(p => p.id === value);
            newLines[index].itemId = value;
            newLines[index].name = item?.name || 'Producto Desconocido';
        } else {
            newLines[index].qty = parseInt(value, 10) || 1;
        }
        setLines(newLines);
    };

    const addLine = () => setLines([...lines, { itemId: '', qty: 1, name: '', uom: 'unit' }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const account = accounts.find(a => a.id === accountId);

        if (!account && !newCustomerName) {
            alert('Selecciona un cliente o introduce un nombre para crearlo.');
            return;
        }

        const payload: NewShipmentPayload = {
            orderId: `manual_${Date.now()}`,
            accountId: accountId!,
            partyId: account?.partyId!,
            mode: 'PARCEL',
            status: 'pending',
            lines: lines as ShipmentLine[],
            customerName: account?.name || newCustomerName!,
            newCustomerName: newCustomerName && !account ? newCustomerName : undefined,
            addressLine1: address,
            city,
            postalCode,
            country: 'España',
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
                maxWidth="40rem"
            >
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Cliente</span>
                             <AccountSearch 
                                accounts={accounts} 
                                onSelect={handleAccountSelect} 
                                onFreeText={handleFreeText} 
                            />
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
                                    <Select value={line.itemId} onChange={e => handleLineChange(index, 'itemId', e.target.value)} required>
                                        <option value="">Selecciona producto</option>
                                        {items.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </Select>
                                    <Input type="number" min="1" value={line.qty} onChange={e => handleLineChange(index, 'qty', e.target.value)} className="w-20" required />
                                    <button type="button" onClick={() => removeLine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                             <button type="button" onClick={addLine} className="text-sm flex items-center gap-1 text-blue-600 hover:underline pt-2">
                                <Plus size={14} className="sb-icon" /> Añadir línea
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
