// src/app/(app)/warehouse/goods-receipt/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { Plus, Trash2, Truck, Search, Info, X, Calendar } from 'lucide-react';
import type { Party, Item, GoodsReceipt, Uom } from '@/domain/ssot';
import { createGoodsReceipt } from './actions';

type LineItem = {
  key: string;
  itemId?: string;
  newItemName?: string;
  newItemCategory?: Item['category'];
  supplierLot: string;
  qty: number;
  unitCost: number;
  uom?: Uom;
  expiryAt?: string | null;
};

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function SearchableSelect<T extends { id: string; name: string }>({
  items, onSelect, onFreeText, placeholder, initialValue
}: {
  items: T[]; onSelect: (item: T) => void; onFreeText: (text: string) => void;
  placeholder: string; initialValue?: string;
}) {
  const [query, setQuery] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debRef = useRef<number | null>(null);

  useEffect(() => { setQuery(initialValue || ''); }, [initialValue]);
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => {
      const q = query.trim();
      if (q.length > 1) {
        const filtered = items.filter(it => norm(it.name).includes(norm(q)));
        setSuggestions(filtered);
        setIsOpen(true);
        if (filtered.length === 0) {
          const exact = items.some(i => norm(i.name) === norm(q));
          if (!exact) onFreeText(q);
        }
      } else { setSuggestions([]); setIsOpen(false); onFreeText(''); }
    }, 120);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query, items, onFreeText]);

  const handleSelect = (item: T) => { setQuery(item.name); onSelect(item); setIsOpen(false); };

  return (
    <div className="relative">
      <Input value={query}
             onChange={e => setQuery(e.target.value)}
             onBlur={() => setTimeout(() => setIsOpen(false), 120)}
             onFocus={() => { if ((query?.trim()?.length || 0) > 1) setIsOpen(true); }}
             placeholder={placeholder}/>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map(item => (
            <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                onMouseDown={() => handleSelect(item)}>
              <p className="font-medium text-sm">{item.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notification({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  const base = "flex items-center gap-3 p-3 rounded-lg border";
  const tone = type === 'success' ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-red-50 border-red-200 text-red-800";
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`${base} ${tone}`}>
      <Info size={16} className="flex-shrink-0" />
      <p className="text-sm font-medium flex-grow">{message}</p>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10"><X size={14} /></button>
    </div>
  );
}

export default function GoodsReceiptPage() {
  const { data } = useData();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [newSupplierName, setNewSupplierName] = useState<string | undefined>();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{
    key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newItemCategory: 'raw', uom: 'unit', expiryAt: null
  }]);
  const [sendToQc, setSendToQc] = useState(true);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const suppliers = useMemo(() => {
    if (!data?.parties || !data?.partyRoles) return [];
    const supplierIds = new Set(data.partyRoles.filter(r => r.role === 'SUPPLIER').map(r => r.partyId));
    return data.parties.filter(p => supplierIds.has(p.id));
  }, [data?.parties, data?.partyRoles]);

  const items = useMemo(() => data?.items || [], [data?.items]);

  const handleLineChange = (index: number, field: keyof LineItem, value: any) => {
    setLines(curr => {
      const next = [...curr]; const line = { ...next[index] } as any;
      line[field] = value;
      if (field === 'itemId') {
        const it = items.find(m => m.id === value);
        line.unitCost = it?.stdCost ?? 0;
        line.uom = it?.uom ?? 'unit';
        line.newItemName = undefined;
      }
      if (field === 'newItemName') { line.itemId = undefined; }
      next[index] = line;
      return next;
    });
  };

  const addLine = () => setLines([...lines, {
    key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newItemCategory: 'raw', uom: 'unit', expiryAt: null
  }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setNotification(null); setIsSaving(true);
    if ((!supplierId && !newSupplierName) || !deliveryNote ||
        lines.some(l => (!l.itemId && !l.newItemName) || !l.qty || !l.supplierLot)) {
      setNotification({ message: 'Proveedor, albarán y todas las líneas completas.', type: 'error' });
      setIsSaving(false); return;
    }
    try {
      const res = await createGoodsReceipt({
        supplierId,
        newSupplierName: newSupplierName && !supplierId ? newSupplierName : undefined,
        deliveryNote,
        lines,
        sendToQc,
      });
      setNotification({ message: `Recepción guardada (#${res.receiptNumber}).`, type: 'success' });
      setSupplierId(undefined); setNewSupplierName(undefined); setDeliveryNote('');
      setLines([{ key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newItemCategory: 'raw', uom: 'unit', expiryAt: null }]);
    } catch (e:any) {
      console.error(e);
      setNotification({ message: e?.message || 'Error al guardar la recepción.', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const handleFreeTextSupplier = useCallback((text: string) => {
    const exact = suppliers.some(s => norm(s.name) === norm(text));
    if (!exact) { setNewSupplierName(text); setSupplierId(undefined); }
  }, [suppliers]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3">
          <Truck /> Recepción de Mercancía
        </h1>
      </div>

      {notification && <Notification {...notification} onClose={() => setNotification(null)} />}

      <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <label className="grid gap-1.5">
            <span className="font-medium">Proveedor</span>
            <SearchableSelect<Party>
              items={suppliers}
              onSelect={it => { setSupplierId(it.id); setNewSupplierName(undefined); }}
              onFreeText={handleFreeTextSupplier}
              placeholder="Buscar o crear proveedor..."
              initialValue={supplierId ? suppliers.find(s => s.id === supplierId)?.name : newSupplierName}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="font-medium">Nº de Albarán del Proveedor</span>
            <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ej: 2025/ABC-123" required />
          </label>
        </div>

        <div>
          <h4 className="font-medium mb-2">Líneas de Producto</h4>
          <div className="space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 text-sm font-semibold text-zinc-600 px-2">
              <span>Material</span>
              <span>Lote Proveedor</span>
              <span className="text-right">Cantidad</span>
              <span className="text-right">Coste Unit.</span>
              <span>Caducidad</span>
              <div />
            </div>

            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-start">
                <div className="space-y-1">
                  <SearchableSelect<Item>
                    items={items}
                    onSelect={it => handleLineChange(index, 'itemId', it.id)}
                    onFreeText={txt => handleLineChange(index, 'newItemName', txt)}
                    placeholder="Buscar o crear item..."
                    initialValue={line.itemId ? items.find(m => m.id === line.itemId)?.name : line.newItemName}
                  />
                  {line.newItemName && !line.itemId && (
                    <Select value={line.newItemCategory}
                            onChange={e => handleLineChange(index, 'newItemCategory', e.target.value as Item['category'])}>
                      <option value="raw">Materia Prima</option>
                      <option value="pack">Packaging</option>
                      <option value="label">Etiqueta</option>
                      <option value="consumable">Consumible</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="merch">Merchandising</option>
                    </Select>
                  )}
                </div>

                <Input value={line.supplierLot}
                       onChange={e => handleLineChange(index, 'supplierLot', e.target.value)}
                       placeholder="Lote del proveedor" required/>

                <Input type="number" value={line.qty || ''}
                       onChange={e => handleLineChange(index, 'qty', Number(e.target.value) || 0)}
                       className="text-right" required/>

                <Input type="number" step="0.01" value={line.unitCost || ''}
                       onChange={e => handleLineChange(index, 'unitCost', Number(e.target.value) || 0)}
                       className="text-right" required/>

                <Input type="date" value={line.expiryAt ?? ''}
                       onChange={e => handleLineChange(index, 'expiryAt', e.target.value || null)}
                       placeholder="AAAA-MM-DD" />

                <SBButton variant="ghost" size="sm" onClick={() => removeLine(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </SBButton>
              </div>
            ))}

            <SBButton variant="secondary" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-2" /> Añadir Línea
            </SBButton>
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
    </div>
  );
}
