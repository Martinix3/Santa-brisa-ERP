// src/features/warehouse/components/QuickGoodsReceiptDialog.tsx
"use client";
import React, { useMemo, useState } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { Party, Item, Uom } from "@/domain/ssot";
import { createGoodsReceipt } from "@/app/(app)/warehouse/goods-receipt/actions";
import { Plus, Trash2, Truck } from "lucide-react";

type Line = {
  key: string;
  itemId: string;
  supplierLot: string;
  qty: number;
};

export function QuickGoodsReceiptDialog({
  open, onOpenChange, onSuccess
}: { open: boolean; onOpenChange: (v:boolean)=>void; onSuccess?: (info: {receiptId:string;receiptNumber:string})=>void }) {
  const { data } = useData();
  const suppliers = useMemo(() => {
    if (!data?.parties || !data?.partyRoles) return [];
    const supplierIds = new Set(data.partyRoles.filter(r => r.role === 'SUPPLIER').map(r => r.partyId));
    return data.parties.filter(p => supplierIds.has(p.id));
  }, [data?.parties, data?.partyRoles]);

  const items = useMemo(() => data?.items || [], [data?.items]);

  const [supplierId, setSupplierId] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [lines, setLines] = useState<Line[]>([{ key: `q_${Date.now()}`, itemId: '', supplierLot: '', qty: 0 }]);
  const [saving, setSaving] = useState(false);

  const addLine = () => setLines(l => [...l, { key: `q_${Date.now()}`, itemId: '', supplierLot: '', qty: 0 }]);
  const rmLine = (i:number) => setLines(l => l.filter((_,idx)=>idx!==i));
  const updateLine = (index: number, field: keyof Line, value: any) => {
    setLines(curr => {
        const next = [...curr];
        (next[index] as any)[field] = value;
        return next;
    });
  };

  const save = async () => {
    if (!supplierId || !deliveryNote || lines.some(l => !l.itemId || !l.qty || !l.supplierLot)) {
      alert("Por favor, completa todos los campos.");
      return;
    }
    setSaving(true);
    try {
      // Adaptamos el payload al formato esperado por createGoodsReceipt
      const payloadLines = lines.map(l => ({
        ...l,
        unitCost: items.find(it => it.id === l.itemId)?.stdCost || 0,
        uom: items.find(it => it.id === l.itemId)?.uom || 'unit',
      }));

      const res = await createGoodsReceipt({ supplierId, deliveryNote, lines: payloadLines });

      onSuccess?.(res);
      onOpenChange(false);
      // reset
      setSupplierId(''); setDeliveryNote('');
      setLines([{ key: `q_${Date.now()}`, itemId: '', supplierLot: '', qty: 0 }]);
    } catch (e) {
      console.error(e);
      alert((e as Error).message || "Error al guardar");
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title={<div className="flex items-center gap-2"><Truck/> Entrada rápida de mercancía</div>}
                       maxWidth="40rem">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Proveedor</span>
              <Select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">Selecciona proveedor…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Albarán</span>
              <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ej: 2025/ABC-001" required/>
            </label>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            {lines.map((ln, i) => (
              <div key={ln.key} className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-2 items-center">
                <Select value={ln.itemId} onChange={e => updateLine(i, 'itemId', e.target.value)} required>
                  <option value="">Selecciona un ítem...</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
                <Input placeholder="Lote del proveedor"
                       value={ln.supplierLot}
                       onChange={e => updateLine(i, 'supplierLot', e.target.value)} required />
                <Input type="number" placeholder="Cantidad"
                       value={ln.qty || ''}
                       onChange={e => updateLine(i, 'qty', Number(e.target.value) || 0)} required />
                <button className="p-2 hover:bg-zinc-100 rounded" onClick={() => rmLine(i)}>
                  <Trash2 className="w-4 h-4 text-red-500"/>
                </button>
              </div>
            ))}
            <SBButton variant="secondary" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1"/> Añadir
            </SBButton>
          </div>

          <div className="flex items-center justify-end pt-2">
            <SBButton onClick={save} disabled={saving || !supplierId || !deliveryNote}>
              {saving ? 'Guardando…' : 'Guardar'}
            </SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
