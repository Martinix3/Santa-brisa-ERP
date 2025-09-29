// src/features/orders/components/NewOrderModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

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
    const [accountId, setAccountId] = useState('');
    const [lines, setLines] = useState<OrderLine[]>([
      { id: 1, sku: '', qty: 1, unitPrice: 0 }
    ]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Pedido</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="py-6 space-y-6">
                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">Cliente (Account ID)</label>
                            <input 
                                type="text" 
                                id="customerName" 
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F4C542]" 
                                placeholder="Buscar cliente por nombre o ID..."
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-700">Líneas de Producto</h3>
                            {lines.map((line, index) => (
                                <div key={line.id} className="grid grid-cols-[1fr_90px_110px_auto] gap-3 items-center">
                                    <input type="text" placeholder="SKU del producto" value={line.sku} onChange={e => handleLineChange(line.id, 'sku', e.target.value)} className="border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-[#F4C542]" required />
                                    <input type="number" placeholder="Cant." value={line.qty} onChange={e => handleLineChange(line.id, 'qty', parseInt(e.target.value) || 0)} className="border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-[#F4C542]" />
                                    <input type="number" placeholder="Precio U." value={line.unitPrice} onChange={e => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-[#F4C542]" />
                                    {lines.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveLine(line.id)} className="text-red-500 hover:text-red-700 p-2">
                                          <Trash2 size={16} />
                                      </button>
                                    )}
                                </div>
                            ))}
                             <button type="button" onClick={handleAddLine} className="text-sm font-semibold text-[#B25A32] hover:text-[#F26D3D] flex items-center gap-1">
                                <Plus size={14}/> Añadir línea
                            </button>
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
                    <div className="mt-2 flex justify-end space-x-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button type="submit" style={{backgroundColor: '#F4C542'}} className="text-black py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium hover:opacity-90">
                            Crear Pedido
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewOrderModal;
