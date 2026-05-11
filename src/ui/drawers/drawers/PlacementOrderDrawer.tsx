"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useEffect, useState } from 'react';
import { BaseDrawer } from '@/components/drawers/BaseDrawer';
import type { Address, Item, OrderSellOut, OrderLine } from '@/domain/ssot';
import { Save, Package } from 'lucide-react';

type Props = {
  onClose: () => void;
  accountId: string;
  accountName?: string;
  distributorPartyId: string;
  ownerId?: string;
  ownerName?: string;
};

export function PlacementOrderDrawer({ onClose, accountId, accountName, distributorPartyId, ownerId, ownerName }: Props) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState<Partial<OrderLine>>({ qty: 1, uom: 'unit', priceUnit: 0 });
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/items/fg', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setItems(json.items);
        else setItems([]);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  const subtitle = `${accountName || accountId} • Distribuidor`;

  const addLine = () => {
    if (!current.itemId || !current.qty || !current.priceUnit) return;
    const newItemId = current.itemId;
    setLines(prev => [...prev, { itemId: newItemId, name: items.find(i => i.id === newItemId)?.name, qty: current.qty || 1, uom: (current.uom || 'unit') as any, priceUnit: current.priceUnit!, discountPct: current.discountPct || 0 }]);
    setCurrent({ qty: 1, uom: 'unit', priceUnit: 0 });
  };

  const total = lines.reduce((s, l) => s + l.qty * l.priceUnit * (1 - (l.discountPct || 0) / 100), 0);

  const handleSave = async () => {
    if (lines.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/placement/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, distributorPartyId, ownerId, ownerName, lines }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error');
      setOpen(false);
      setTimeout(onClose, 240);
    } catch (e: any) {
      setError(e.message || 'Error al crear pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseDrawer
      open={open}
      onClose={() => { setOpen(false); setTimeout(onClose, 240); }}
      title={<span className="inline-flex items-center gap-2"><Package size={16} /> Pedido de Colocación</span>}
      subtitle={subtitle}
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">Total €{total.toFixed(2)}</div>
          <button className="sb-btn sb-btn--ghost" onClick={() => { setOpen(false); setTimeout(onClose, 240); }} disabled={saving}>Cancelar</button>
          <button className="sb-btn sb-btn--primary" onClick={handleSave} disabled={saving || lines.length === 0}><Save size={16} />Crear</button>
        </>
      }
    >
      {error && <div className="mb-3 p-3 border border-destructive/20 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="sb-card-glass-light p-4">
          <h3 className="font-semibold mb-3">Producto</h3>
          <select className="sb-input" value={current.itemId || ''} onChange={(e) => {
            const it = items.find(i => i.id === e.target.value);
            setCurrent(prev => ({ ...prev, itemId: it?.id, priceUnit: (it as any)?.priceList?.HORECA ?? it?.priceUnit ?? (it as any)?.priceBase ?? 0 }));
          }}>
            <option value="" disabled>Selecciona un producto</option>
            {items.map(it => (<option key={it.id} value={it.id}>{it.name} ({it.sku || it.id})</option>))}
          </select>
          {current.itemId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs mb-1">Cantidad</label>
                <input type="number" min={1} className="sb-input" value={current.qty || 1} onChange={(e) => setCurrent(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">UOM</label>
                <select className="sb-input" value={current.uom || 'unit'} onChange={(e) => setCurrent(prev => ({ ...prev, uom: e.target.value as any }))}>
                  <option value="unit">Unidad</option>
                  <option value="bottle">Botella</option>
                  <option value="case">Caja</option>
                  <option value="pallet">Pallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Precio €</label>
                <input type="number" min={0} step="0.01" className="sb-input" value={current.priceUnit || 0} onChange={(e) => setCurrent(prev => ({ ...prev, priceUnit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Desc. %</label>
                <input type="number" min={0} max={100} className="sb-input" value={current.discountPct || 0} onChange={(e) => setCurrent(prev => ({ ...prev, discountPct: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="md:col-span-4">
                <button className="sb-btn sb-btn--primary w-full" onClick={addLine}>Añadir</button>
              </div>
            </div>
          )}
        </div>

        <div className="sb-card-glass-light p-4">
          <h3 className="font-semibold mb-3">Líneas ({lines.length})</h3>
          <div className="space-y-2 max-h-[40vh] overflow-auto">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.name || l.itemId}</div>
                  <div className="text-xs text-muted-foreground">{l.qty} {l.uom} × €{l.priceUnit.toFixed(2)} {l.discountPct ? `(-${l.discountPct}%)` : ''}</div>
                </div>
                <button className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseDrawer>
  );
}
