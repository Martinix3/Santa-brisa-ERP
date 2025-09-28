// src/app/(app)/warehouse/goods-receipt/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, Input, Select, DataTableSB } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { Plus, Trash2, Truck, Search, Info, X, PackagePlus, UserPlus } from 'lucide-react';
import type { Party, Item, GoodsReceipt, Uom, ItemCategory, PartyRole } from '@/domain/ssot';
import { createGoodsReceipt, createSupplier, createItem } from './actions';
import { toast } from "sonner";

type LineItem = {
  key: string;
  itemId?: string;
  newItemName?: string;
  newItemCategory?: ItemCategory;
  supplierLot: string;
  qty: number;
  unitCost: number;
  uom?: Uom;
  expiryAt?: string | null;
};

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function SearchableSelect<T extends { id: string; name: string }>({
  items, onSelect, onFreeText, placeholder, initialValue, onNew
}: {
  items: T[]; onSelect: (item: T) => void; onFreeText: (text: string) => void;
  placeholder: string; initialValue?: string; onNew?: () => void;
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

  const options = [...suggestions];
  if (onNew && query.length > 1 && !suggestions.some(s => norm(s.name) === norm(query))) {
      options.push({ id: '__new__', name: `Crear "${query}"` } as T);
  }

  return (
    <div className="relative">
      <Input value={query}
             onChange={e => setQuery(e.target.value)}
             onBlur={() => setTimeout(() => setIsOpen(false), 120)}
             onFocus={() => { if ((query?.trim()?.length || 0) > 1) setIsOpen(true); }}
             placeholder={placeholder}/>
      {isOpen && options.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
          {options.map(item => (
            <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                onMouseDown={() => {
                    if (item.id === '__new__') {
                        onNew?.();
                    } else {
                        handleSelect(item);
                    }
                }}>
              <p className={`font-medium text-sm ${item.id === '__new__' ? 'text-blue-600' : ''}`}>{item.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateSupplierDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (party: Party) => void; }) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Indica un nombre de proveedor."); return; }
    setSaving(true);
    try {
      const party = await createSupplier({ name: name.trim(), taxId: taxId.trim() || undefined });
      onCreated(party);
      onOpenChange(false);
      setName(""); setTaxId("");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="Nuevo proveedor" maxWidth="28rem">
        <div className="space-y-3">
          <label className="grid gap-1.5"><span className="text-sm">Nombre</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="grid gap-1.5"><span className="text-sm">CIF (opcional)</span><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></label>
          <div className="flex justify-end pt-2">
            <SBButton onClick={save} disabled={saving || !name.trim()}>{saving ? "Creando…" : "Crear"}</SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}

function CreateItemDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (item: Item) => void; }) {
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [uom, setUom] = useState<Uom>("unit");
    const [category, setCategory] = useState<ItemCategory>('raw');
    const [stdCost, setStdCost] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) { toast.error("Nombre del SKU requerido."); return; }
        setSaving(true);
        try {
            const item = await createItem({ name: name.trim(), sku: sku.trim() || undefined, uom, category, stdCost });
            onCreated(item);
            onOpenChange(false);
            setName(""); setSku(""); setStdCost(0); setUom("unit"); setCategory('raw');
        } catch (e: any) { toast.error(e?.message ?? "No se pudo crear el SKU.");
        } finally { setSaving(false); }
    };
    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <SBDialogContent title="Nuevo SKU" maxWidth="34rem">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="grid gap-1.5 md:col-span-2"><span className="text-sm">Nombre</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
                    <label className="grid gap-1.5"><span className="text-sm">SKU (opcional)</span><Input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
                    <label className="grid gap-1.5"><span className="text-sm">UdM</span>
                        <Select value={uom} onChange={(e) => setUom(e.target.value as Uom)}>
                            <option value="unit">unit</option><option value="kg">kg</option><option value="L">L</option><option value="g">g</option><option value="mL">mL</option>
                        </Select>
                    </label>
                    <label className="grid gap-1.5"><span className="text-sm">Categoría</span>
                        <Select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                            <option value="raw">Materia Prima</option><option value="pack">Packaging</option><option value="consumable">Consumible</option>
                            <option value="intermediate">Intermedio</option><option value="fg">Producto Terminado</option><option value="merch">Merchandising</option>
                        </Select>
                    </label>
                    <label className="grid gap-1.5"><span className="text-sm">Coste estándar</span><Input type="number" value={stdCost} onChange={(e) => setStdCost(Number(e.target.value) || 0)} /></label>
                </div>
                <div className="flex justify-end pt-3">
                    <SBButton onClick={save} disabled={saving || !name.trim()}>{saving ? "Creando…" : "Crear"}</SBButton>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

function GoodsReceiptForm({ onSaveSuccess, onCancel }: { onSaveSuccess: (info: { receiptId: string; receiptNumber: string }) => void, onCancel: () => void }) {
  const { data, setData } = useData();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [newSupplierName, setNewSupplierName] = useState<string | undefined>();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<LineItem[]>([{
    key: `line_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, newItemCategory: 'raw', uom: 'unit', expiryAt: null
  }]);
  
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState<number | null>(null);

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
    if ((!supplierId && !newSupplierName) || !deliveryNote || !receiptDate ||
        lines.some(l => (!l.itemId && !l.newItemName) || !l.qty || l.qty <= 0 || !l.supplierLot)) {
      setNotification({ message: 'Proveedor, albarán, fecha y todas las líneas completas.', type: 'error' });
      setIsSaving(false); return;
    }
    try {
      const payloadLines = lines.map(l => {
          const item = items.find(i => i.id === l.itemId);
          return {
              itemId: l.itemId,
              newItemName: l.newItemName,
              newItemCategory: l.newItemCategory,
              supplierLot: l.supplierLot,
              qty: l.qty,
              unitCost: l.unitCost || item?.stdCost || 0,
              uom: l.uom || item?.uom || 'unit',
              expiryAt: l.expiryAt
          };
      });

      const res = await createGoodsReceipt({
        supplierId,
        newSupplierName: newSupplierName && !supplierId ? newSupplierName : undefined,
        deliveryNote,
        receiptDate,
        lines: payloadLines,
      });
      setNotification({ message: `Recepción guardada (#${res.receiptNumber}).`, type: 'success' });
      onSaveSuccess(res);
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
    <>
      <div className="space-y-6">
        {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <label className="grid gap-1.5">
              <span className="font-medium">Proveedor</span>
              <SearchableSelect<Party>
                items={suppliers}
                onSelect={it => { setSupplierId(it.id); setNewSupplierName(undefined); }}
                onFreeText={handleFreeTextSupplier}
                placeholder="Buscar o crear proveedor..."
                initialValue={supplierId ? suppliers.find(s => s.id === supplierId)?.name : newSupplierName}
                onNew={() => setIsNewSupplierOpen(true)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-medium">Nº de Albarán del Proveedor</span>
              <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ej: 2025/ABC-123" required />
            </label>
            <label className="grid gap-1.5">
              <span className="font-medium">Fecha de Recepción</span>
              <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} required />
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
                      onNew={() => setIsNewItemOpen(index)}
                    />
                    {line.newItemName && !line.itemId && (
                      <Select value={line.newItemCategory}
                              onChange={e => handleLineChange(index, 'newItemCategory', e.target.value as ItemCategory)}>
                        <option value="raw">Materia Prima</option>
                        <option value="pack">Packaging</option>
                        <option value="label">Etiqueta</option>
                        <option value="consumable">Consumible</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="merch">Merchandising</option>
                      </Select>
                    )}
                  </div>

                  <Input value={line.supplierLot} onChange={e => handleLineChange(index, 'supplierLot', e.target.value)} placeholder="Lote del proveedor" required/>
                  <Input type="number" value={line.qty || ''} onChange={e => handleLineChange(index, 'qty', Number(e.target.value) || 0)} className="text-right" required/>
                  <Input type="number" step="0.01" value={line.unitCost || ''} onChange={e => handleLineChange(index, 'unitCost', Number(e.target.value) || 0)} className="text-right" required/>
                  <Input type="date" value={line.expiryAt ?? ''} onChange={e => handleLineChange(index, 'expiryAt', e.target.value || null)} placeholder="AAAA-MM-DD" />
                  <SBButton variant="ghost" size="sm" onClick={() => removeLine(index)}><Trash2 className="h-4 w-4 text-red-500" /></SBButton>
                </div>
              ))}
              <SBButton variant="secondary" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-2" /> Añadir Línea</SBButton>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div></div>
            <div className="flex items-center gap-2">
                <SBButton variant="secondary" onClick={onCancel}>Cancelar</SBButton>
                <SBButton onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Recepción'}</SBButton>
            </div>
          </div>
        </div>
      </div>
      <CreateSupplierDialog
        open={isNewSupplierOpen}
        onOpenChange={setIsNewSupplierOpen}
        onCreated={(party) => {
            if (data) setData({ ...data, parties: [...data.parties, party], partyRoles: [...data.partyRoles, {id: `role_${Date.now()}`, partyId: party.id, role: 'SUPPLIER', isActive: true, data: {}}] });
            setSupplierId(party.id); setNewSupplierName(undefined);
        }}
      />
      {isNewItemOpen !== null && (
        <CreateItemDialog
            open={isNewItemOpen !== null}
            onOpenChange={() => setIsNewItemOpen(null)}
            onCreated={(item) => {
                if (data) setData({ ...data, items: [...data.items, item] });
                handleLineChange(isNewItemOpen, 'itemId', item.id);
            }}
        />
      )}
    </>
  );
}

export default function GoodsReceiptPageContainer() {
    const { data } = useData();
    const [showForm, setShowForm] = useState(false);
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    
    useEffect(() => {
        if(data?.goodsReceipts) {
            const sorted = [...data.goodsReceipts].sort((a,b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
            setReceipts(sorted);
        }
    }, [data?.goodsReceipts]);

    const handleSaveSuccess = (info: { receiptId: string; receiptNumber: string }) => {
        const newReceipt = { id: info.receiptId, receiptNumber: info.receiptNumber, receivedAt: new Date().toISOString(), lines: [], status: 'completed' };
        setReceipts(prev => [newReceipt as GoodsReceipt, ...prev]);
        setShowForm(false);
    };

    const cols: Col<GoodsReceipt>[] = [
        { key: 'receiptNumber', header: 'Nº Recepción', render: r => <span className="font-mono text-xs">{r.receiptNumber}</span> },
        { key: 'supplier', header: 'Proveedor', render: r => <span>{data?.parties.find(p => p.id === r.supplierPartyId)?.name || 'N/A'}</span> },
        { key: 'deliveryNote', header: 'Albarán Proveedor', render: r => <span>{r.deliveryNote}</span> },
        { key: 'receivedAt', header: 'Fecha', render: r => <span>{new Date(r.receivedAt).toLocaleDateString('es-ES')}</span> },
        { key: 'lines', header: 'Líneas', className: "text-right", render: r => <span>{r.lines.length}</span> },
        { key: 'status', header: 'Estado', render: r => <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span> },
    ];

    if (showForm) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3"><Truck /> Nueva Recepción de Mercancía</h1>
                </div>
                <GoodsReceiptForm onSaveSuccess={handleSaveSuccess} onCancel={() => setShowForm(false)} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3"><Truck /> Historial de Recepciones</h1>
                <SBButton onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva Recepción
                </SBButton>
            </div>
            <DataTableSB rows={receipts} cols={cols as any[]} />
        </div>
    );
}