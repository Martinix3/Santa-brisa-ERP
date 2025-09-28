// src/features/warehouse/components/QuickGoodsReceiptDialog.tsx
"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { Party, Item, Uom, ItemCategory, PartyRole } from "@/domain/ssot";
import { createGoodsReceipt, createSupplier, createItem, reportIncident } from "@/app/(app)/warehouse/goods-receipt/actions";
import { Plus, Trash2, Truck, AlertTriangle, Factory, PackagePlus, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Line = {
  key: string;
  itemId: string;
  supplierLot: string;
  qty: number;
  unitCost?: number;
  uom?: Uom;
  locationId?: string; // destino
  autoLot?: boolean;
  expiryAt?: string | null;
};

type IncidentDraft = {
  hasIncident: boolean;
  kind: "DAMAGED" | "MISSING" | "DOCUMENT" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  notes: string;
};

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Generador simple de lotes automáticos (ajusta a tu convención)
function generateLotNumber(item: Item | undefined) {
  const dt = new Date();
  const y = String(dt.getUTCFullYear()).slice(2);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const base = item?.id?.split("_").pop()?.toUpperCase().slice(0, 3) ?? "ITM";
  const prefix = (item as any)?.category?.startsWith("raw") ? "L" + base : "FG-" + base;
  const rand = Math.floor(Math.random() * 89) + 10; // 2 dígitos
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function QuickGoodsReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (info: { receiptId: string; receiptNumber: string }) => void;
}) {
  const { data, setData } = useData();

  const parties = data?.parties as Party[] | undefined;
  const roles = data?.partyRoles as PartyRole[] | undefined;
  const itemsAll = data?.items as Item[] | undefined;

  const suppliers = useMemo(() => {
    if (!parties || !roles) return [];
    const supplierIds = new Set(roles.filter((r) => r.role === "SUPPLIER").map((r) => r.partyId));
    return parties.filter((p) => supplierIds.has(p.id));
  }, [parties, roles]);

  const items = useMemo(() => itemsAll ?? [], [itemsAll]);

  // Estado del formulario
  const [date, setDate] = useState(nowIsoDate());
  const [supplierId, setSupplierId] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: `q_${Date.now()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true },
  ]);

  const [saving, setSaving] = useState(false);

  // Helpers
  const setLine = (idx: number, patch: Partial<Line>) =>
    setLines((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const addLine = () =>
    setLines((l) => [
      ...l,
      { key: `q_${Date.now()}_${Math.random()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true },
    ]);

  const rmLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const selectedItem = (id?: string) => items.find((it) => it.id === id);
  
  // Validación
  const missing =
    !supplierId ||
    !deliveryNote ||
    !date ||
    lines.length === 0 ||
    lines.some((l) => !l.itemId || !l.qty || l.qty <= 0);

  // Guardar
  const save = async () => {
    if (missing) {
      toast.error("Revisa: proveedor, albarán, fecha y líneas (SKU y cantidad > 0).");
      return;
    }

    setSaving(true);
    try {
      const payloadLines = lines.map((l) => {
        const it = selectedItem(l.itemId);
        const lot = l.supplierLot?.trim() || (l.autoLot ? generateLotNumber(it) : "");
        const uom = l.uom || it?.uom || ("unit" as Uom);
        const unitCost = l.unitCost ?? it?.stdCost ?? 0;
        return {
          itemId: l.itemId,
          supplierLot: lot,
          qty: Number(l.qty),
          uom,
          unitCost,
          expiryAt: l.expiryAt,
        };
      });

      const res = await createGoodsReceipt({
        supplierId,
        deliveryNote: deliveryNote.trim(),
        receiptDate: date,
        lines: payloadLines,
      });

      toast.success("Recepción creada correctamente.");
      onSuccess?.(res);
      onOpenChange(false);
      // reset
      setSupplierId("");
      setDeliveryNote("");
      setDate(nowIsoDate());
      setLines([{ key: `q_${Date.now()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true }]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al guardar recepción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entrada rápida de mercancía
          </div>
        }
        maxWidth="40rem"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-sm font-medium">Proveedor</span>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Selecciona proveedor…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5">
                <span className="text-sm font-medium">Fecha</span>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Albarán</span>
            <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Ej: 2025/ABC-001" required/>
          </label>

          <div className="space-y-2 rounded-md border p-3">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center text-xs font-semibold text-zinc-500">
                <span>Producto</span>
                <span>Lote Proveedor</span>
                <span className="text-right">Cantidad</span>
                <div/>
            </div>
            {lines.map((ln, i) => (
              <div key={ln.key} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                <Select value={ln.itemId} onChange={(e) => setLine(i, { itemId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {items.map((it) => (<option key={it.id} value={it.id}>{it.name}</option>))}
                </Select>
                <Input placeholder="Lote" value={ln.supplierLot} onChange={(e) => setLine(i, { supplierLot: e.target.value })}/>
                <Input type="number" placeholder="Qty" value={ln.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} className="text-right"/>
                <button className="p-2 hover:bg-zinc-100 rounded" onClick={() => rmLine(i)}><Trash2 className="w-4 h-4 text-red-500"/></button>
              </div>
            ))}
            <SBButton variant="secondary" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1"/> Añadir
            </SBButton>
          </div>

          <div className="flex justify-end pt-2">
            <SBButton onClick={save} disabled={saving || missing}>
              {saving ? "Guardando…" : "Guardar Recepción"}
            </SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}