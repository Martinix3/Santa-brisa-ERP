// src/features/orders/components/NewOrderModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, Input, Select } from '@/components/ui/ui-primitives';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';

interface OrderLine {
    id: number;
    sku: string;
    qty: number;
    unitPrice: number;
}

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const { data } = useData();
    const [accountId, setAccountId] = useState('');
    const [lines, setLines] = useState<OrderLine[]>([
      { id: 1, sku: '', qty: 1, unitPrice: 0 }
    ]);

    const accounts = data?.accounts || [];
    const items = data?.items || [];

    useEffect(() => {
        if (!isOpen) {
            setAccountId('');
            setLines([{ id: 1, sku: '', qty: 1, unitPrice: 0 }]);
        }
    }, [isOpen]);

    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), sku: '', qty: 1, unitPrice: 0 }]);
    };

    const handleRemoveLine = (id: number) => {
        setLines(lines.filter(line => line.id !== id));
    };

    const handleLineChange = (id: number, field: keyof Omit<OrderLine, 'id'>, value: string | number) => {
        setLines(lines.map(line => 
            line.id === id ? { ...line, [field]: value } : line
        ));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formattedLines = lines.map(({ sku, qty, unitPrice }) => ({ sku, qty, unitPriceReported: unitPrice }));
        onSubmit({
            accountId,
            lines: formattedLines,
        });
        onClose();
    };
    
    const subtotal = lines.reduce((acc, line) => acc + (line.qty * line.unitPrice), 0);

    return (
        <SBDialog open={isOpen} onOpenChange={onClose}>
            <SBDialogContent
                title="Crear Nuevo Pedido"
                onSubmit={handleSubmit}
                primaryAction={{ label: 'Crear Pedido', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: onClose }}
                maxWidth="42rem"
            >
                <div className="space-y-6">
                    <div>
                        <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                        <Select 
                            id="customerName" 
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            required
                        >
                            <option value="" disabled>Selecciona un cliente...</option>
                            {accounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-700">Líneas de Producto</h3>
                        {lines.map((line, index) => (
                            <div key={line.id} className="grid grid-cols-[1fr_90px_110px_auto] gap-3 items-center">
                                <Select value={line.sku} onChange={e => handleLineChange(line.id, 'sku', e.target.value)} required>
                                    <option value="" disabled>Selecciona producto</option>
                                    {items.map((item: any) => <option key={item.id} value={item.sku}>{item.name}</option>)}
                                </Select>
                                <Input type="number" placeholder="Cant." value={line.qty} onChange={e => handleLineChange(line.id, 'qty', parseInt(e.target.value) || 0)} />
                                <Input type="number" placeholder="Precio U." value={line.unitPrice} onChange={e => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                {lines.length > 1 && (
                                  <SBButton type="button" variant="ghost" size="sm" onClick={() => handleRemoveLine(line.id)}>
                                      <Trash2 size={16} />
                                  </SBButton>
                                )}
                            </div>
                        ))}
                         <SBButton type="button" variant="secondary" size="sm" onClick={handleAddLine}><Plus size={14}/> Añadir línea</SBButton>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Subtotal</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                    </div>

                </div>
            </SBDialogContent>
        </SBDialog>
    );
};

export default NewOrderModal;