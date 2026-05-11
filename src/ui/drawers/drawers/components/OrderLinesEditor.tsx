import React, { useState, useEffect } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { OrderLine, Item } from '@/domain/ssot';
import { searchSkus } from '@/server/actions/orders-data';
import { useDebounce } from '@/hooks/useDebounce';

interface OrderLinesEditorProps {
    lines: OrderLine[];
    onChange: (lines: OrderLine[]) => void;
    itemOptions: Item[];
    itemsLoading: boolean;
}

export function OrderLinesEditor({ lines, onChange, itemOptions, itemsLoading }: OrderLinesEditorProps) {
    const [currentLine, setCurrentLine] = useState<Partial<OrderLine>>({
        qty: 1,
        uom: 'unit',
        priceUnit: 0,
    });
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<Item[]>([]);
    const [productSearching, setProductSearching] = useState(false);
    const [showProductResults, setShowProductResults] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const debouncedProductSearch = useDebounce(productSearch, 300);

    useEffect(() => {
        if (debouncedProductSearch.length >= 2) {
            setProductSearching(true);
            searchSkus(debouncedProductSearch)
                .then(results => {
                    setProductResults(results);
                    setShowProductResults(true);
                })
                .finally(() => setProductSearching(false));
        } else {
            setProductResults([]);
            setShowProductResults(false);
        }
    }, [debouncedProductSearch]);

    const handleSelectProduct = (item: Item) => {
        setCurrentLine(prev => ({
            ...prev,
            itemId: item.id,
            name: item.name,
            priceUnit: item.priceUnit || item.priceBase || 0,
        }));
        setProductSearch(item.name);
        setShowProductResults(false);
    };

    const handleAddLine = () => {
        if (!currentLine.itemId || !currentLine.name || !currentLine.qty || !currentLine.priceUnit) {
            setErrors(['Complete todos los campos de la línea']);
            return;
        }

        const newLine: OrderLine = {
            itemId: currentLine.itemId!,
            name: currentLine.name!,
            qty: currentLine.qty!,
            uom: currentLine.uom || 'unit',
            priceUnit: currentLine.priceUnit!,
            discountPct: currentLine.discountPct || 0,
        };

        const updatedLines = editIndex !== null
            ? lines.map((l, i) => (i === editIndex ? newLine : l))
            : [...lines, newLine];

        onChange(updatedLines);

        // Reset
        setCurrentLine({
            qty: 1,
            uom: 'unit',
            priceUnit: 0,
        });
        setProductSearch('');
        setErrors([]);
        setEditIndex(null);
    };

    const handleRemoveLine = (index: number) => {
        const updatedLines = lines.filter((_, i) => i !== index);
        onChange(updatedLines);
    };

    return (
        <div className="space-y-6">
            <section className="sb-card-glass-light p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus size={20} />
                    Añadir Producto
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Producto *</label>
                        <select
                            className="sb-input"
                            value={currentLine.itemId || ''}
                            onChange={(e) => {
                                const sel = itemOptions.find(i => i.id === e.target.value);
                                if (sel) handleSelectProduct(sel);
                            }}
                        >
                            <option value="" disabled>{itemsLoading ? 'Cargando productos…' : 'Selecciona un producto'}</option>
                            {itemOptions.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.sku || item.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {currentLine.itemId && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">{currentLine.name}</div>
                                    <div className="text-xs text-muted-foreground">SKU: {currentLine.itemId}</div>
                                </div>
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setCurrentLine({ qty: 1, uom: 'unit', priceUnit: 0 });
                                        setProductSearch('');
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Cantidad *</label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => setCurrentLine(prev => ({ ...prev, qty: Math.max(1, (prev.qty || 1) - 1) }))}>-</button>
                                        <input
                                            type="number"
                                            min="1"
                                            className="sb-input text-center"
                                            value={currentLine.qty || 1}
                                            onChange={(e) => setCurrentLine(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                                        />
                                        <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => setCurrentLine(prev => ({ ...prev, qty: (prev.qty || 1) + 1 }))}>+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Unidad *</label>
                                    <select
                                        className="sb-input"
                                        value={currentLine.uom || 'unit'}
                                        onChange={(e) => setCurrentLine(prev => ({ ...prev, uom: e.target.value as any }))}
                                    >
                                        <option value="unit">Unidad</option>
                                        <option value="bottle">Botella</option>
                                        <option value="case">Caja</option>
                                        <option value="pallet">Pallet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Precio €*</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="sb-input"
                                        value={currentLine.priceUnit || 0}
                                        onChange={(e) => setCurrentLine(prev => ({ ...prev, priceUnit: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Desc. %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="sb-input"
                                        value={currentLine.discountPct || 0}
                                        onChange={(e) => setCurrentLine(prev => ({ ...prev, discountPct: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-background rounded border border-border/30">
                                <span className="text-sm font-medium">Subtotal:</span>
                                <span className="text-xl font-bold text-primary">
                                    €{((currentLine.qty || 0) * (currentLine.priceUnit || 0) * (1 - ((currentLine.discountPct || 0) / 100))).toFixed(2)}
                                </span>
                            </div>

                            {errors.length > 0 && (
                                <div className="text-sm text-destructive">{errors[0]}</div>
                            )}

                            <button type="button" className="sb-btn sb-btn--primary w-full" onClick={handleAddLine}>
                                {editIndex !== null ? 'Actualizar línea' : (<><Plus size={16} /> Añadir al Pedido</>)}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {lines && lines.length > 0 && (
                <section className="sb-card-glass-light p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Package size={20} />
                            Líneas ({lines.length})
                        </h3>
                        <button
                            type="button"
                            className="text-sm text-destructive hover:underline"
                            onClick={() => onChange([])}
                        >
                            Limpiar
                        </button>
                    </div>

                    <div className="space-y-3">
                        {lines.map((line, index) => {
                            const subtotal = line.qty * line.priceUnit;
                            const discount = subtotal * ((line.discountPct || 0) / 100);
                            const total = subtotal - discount;

                            return (
                                <div key={index} className="flex items-start gap-4 p-4 border border-border/30 rounded-lg">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold">{line.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {line.qty} {line.uom} × €{line.priceUnit.toFixed(2)}
                                            {line.discountPct && line.discountPct > 0 && <span className="text-warning ml-2">-{line.discountPct}%</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold">€{total.toFixed(2)}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => {
                                            setEditIndex(index);
                                            setCurrentLine({
                                                itemId: line.itemId,
                                                name: line.name,
                                                qty: line.qty,
                                                uom: line.uom,
                                                priceUnit: line.priceUnit,
                                                discountPct: line.discountPct || 0,
                                            });
                                            setProductSearch(line.name || '');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}>Editar</button>
                                        <button type="button" className="text-destructive hover:bg-destructive/10 p-1 rounded" onClick={() => handleRemoveLine(index)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-6 border-t space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-semibold">€{lines.reduce((s, l) => s + (l.qty * l.priceUnit), 0).toFixed(2)}</span>
                        </div>
                        {lines.some(l => l.discountPct && l.discountPct > 0) && (
                            <div className="flex justify-between text-warning">
                                <span>Descuentos:</span>
                                <span>-€{lines.reduce((s, l) => s + ((l.qty * l.priceUnit) * ((l.discountPct || 0) / 100)), 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold">Total:</span>
                            <span className="text-2xl font-bold text-primary">
                                €{lines.reduce((s, l) => {
                                    const sub = l.qty * l.priceUnit;
                                    const disc = sub * ((l.discountPct || 0) / 100);
                                    return s + (sub - disc);
                                }, 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
