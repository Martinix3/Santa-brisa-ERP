
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
  itemId?: string;
  supplierLot: string;
  qty: number;
  unitCost: number;
  uom?: Uom;
  expiryAt?: string | null;
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

  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [sendToQc, setSendToQc] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ key: `q_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, uom: 'unit', expiryAt: null }]);
  const [saving, setSaving] = useState(false);
  const addLine = () => setLines(l => [...l, { key: `q_${Date.now()}`, supplierLot:'', qty:0, unitCost:0, uom:'unit', expiryAt:null }]);
  const rmLine = (i:number) => setLines(l => l.filter((_,idx)=>idx!==i));

  const save = async () => {
    if (!supplierId || !deliveryNote || lines.some(l => !l.itemId || !l.qty || !l.supplierLot)) return;
    setSaving(true);
    try {
      const res = await createGoodsReceipt({ supplierId, deliveryNote, lines, sendToQc });
      onSuccess?.(res);
      onOpenChange(false);
      // reset rápido
      setSupplierId(undefined); setDeliveryNote('');
      setLines([{ key: `q_${Date.now()}`, supplierLot: '', qty: 0, unitCost: 0, uom: 'unit', expiryAt: null }]);
    } finally { setSaving(false); }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="Entrada rápida de mercancía"
                       maxWidth="40rem">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Proveedor</span>
              <Select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Selecciona proveedor…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Albarán</span>
              <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ej: 2025/ABC-001" />
            </label>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            {lines.map((ln, i) => (
              <div key={ln.key} className="grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.9fr_auto] gap-2 items-center">
                <Select value={ln.itemId} onChange={e => setLines(arr => { const n=[...arr]; n[i]={...n[i], itemId:e.target.value}; return n; })}>
                  <option value="">Item…</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
                <Input placeholder="Lote prov."
                       value={ln.supplierLot}
                       onChange={e => setLines(arr => { const n=[...arr]; n[i]={...n[i], supplierLot:e.target.value}; return n; })}/>
                <Input type="number" placeholder="Qty"
                       value={ln.qty || ''}
                       onChange={e => setLines(arr => { const n=[...arr]; n[i]={...n[i], qty:Number(e.target.value)||0}; return n; })}/>
                <Input type="number" step="0.01" placeholder="€/u"
                       value={ln.unitCost || ''}
                       onChange={e => setLines(arr => { const n=[...arr]; n[i]={...n[i], unitCost:Number(e.target.value)||0}; return n; })}/>
                <Input type="date"
                       value={ln.expiryAt ?? ''}
                       onChange={e => setLines(arr => { const n=[...arr]; n[i]={...n[i], expiryAt:e.target.value||null}; return n; })}/>
                <button className="p-2 hover:bg-zinc-100 rounded" onClick={() => rmLine(i)}>
                  <Trash2 className="w-4 h-4 text-red-500"/>
                </button>
              </div>
            ))}
            <SBButton variant="secondary" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1"/> Añadir
            </SBButton>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sendToQc} onChange={e => setSendToQc(e.target.checked)} />
              <span className="text-sm">Enviar a QC (cuarentena)</span>
            </label>
            <SBButton onClick={save} disabled={saving || !supplierId || !deliveryNote}>
              {saving ? 'Guardando…' : 'Guardar'}
            </SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
