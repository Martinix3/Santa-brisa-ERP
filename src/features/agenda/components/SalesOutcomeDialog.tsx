
// src/features/agenda/components/SalesOutcomeDialog.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import type { Interaction, PosCostCatalogEntry, Item, OrderLine } from "@/domain/ssot";
import { placeOrder } from "@/app/(app)/orders/actions";
import { createInteraction } from "@/app/(app)/agenda/actions";
import { createPosTacticsBatch, type PosLineInput } from "@/features/pos/server/pos-actions";
import { PosLinesPicker } from "@/features/pos/PosLinesPicker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SBDialog, SBDialogContent, SBButton, Input, Select } from "@/components/ui/ui-primitives";


type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Interaction | null;
};

export function SalesOutcomeDialog({ open, onOpenChange, task }: Props) {
  const { data, currentUser } = useData();
  const router = useRouter();
  const [mode, setMode] = useState<"PEDIDO" | "INTERACCION" | "POS" | "">("");
  const [saving, setSaving] = useState(false);

  // Pedido rápido
  const [lines, setLines] = useState<Partial<OrderLine>[]>([{ qty: 1 }]);

  // Próxima interacción
  const [nextNote, setNextNote] = useState("");
  const [nextDate, setNextDate] = useState("");

  // POS
  const [posLines, setPosLines] = useState<PosLineInput[]>([]);
  const posCatalog = useMemo(() => ((data as any)?.posCostCatalog || []) as PosCostCatalogEntry[], [data]);
  const skuOptions = useMemo(() =>
    (data?.items || []).filter(i => (i as any).active && (i as any).category === 'fg').map(i => ({ value: i.sku, label: i.name, id: i.id })), [data?.items]
  );
  
  const account = useMemo(() => data?.accounts.find(a => a.id === task?.accountId), [data?.accounts, task]);
  const distributorId = account?.distributorPartyId;

  useEffect(() => {
    if (!open) {
      setMode("");
      setLines([{ qty: 1 }]);
      setNextNote("");
      setNextDate("");
      setPosLines([]);
    }
  }, [open]);

  if (!open || !task) return null;
  const close = () => { onOpenChange(false); setMode(""); };

  const save = async () => {
    try {
      if (!task.accountId) {
        toast.error("La tarea no tiene cuenta asociada");
        return;
      }
      setSaving(true);

      if (mode === "PEDIDO") {
        const validLines = lines.filter(l => l.itemId && l.qty && l.qty > 0) as OrderLine[];
        if (validLines.length === 0) {
          toast.error("Añade al menos una línea válida");
          setSaving(false); return;
        }
        await placeOrder({ accountId: task.accountId, lines: validLines, distributorId, createdById: currentUser!.id });
        toast.success("Pedido registrado");
      }

      if (mode === "INTERACCION") {
        if (!nextNote) { toast.error("Escribe una nota"); setSaving(false); return; }
        await createInteraction({
          accountId: task.accountId,
          createdById: currentUser!.id,
          dept: 'VENTAS',
          kind: "VISITA",
          note: nextNote,
          plannedFor: nextDate || undefined
        });
        toast.success("Próxima interacción creada");
      }

      if (mode === "POS") {
        if (!posLines.length) { toast.error("Añade al menos una táctica POS"); setSaving(false); return; }
        await createPosTacticsBatch({ accountId: task.accountId, createdById: currentUser!.id, lines: posLines });
        toast.success("Táctica POS registrada");
      }

      close();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al guardar resultado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="Resultado de la tarea">
        <div className="space-y-4">
          <div className="flex gap-2">
            {["PEDIDO", "INTERACCION", "POS"].map(opt => (
              <button key={opt}
                className={`text-sm px-3 py-1 rounded border ${mode === opt ? "bg-black text-white" : ""}`}
                onClick={() => setMode(opt as any)}
              >
                {opt === "PEDIDO" ? "Pedido" : opt === "INTERACCION" ? "Otra interacción" : "Táctica POS"}
              </button>
            ))}
          </div>

          {mode === "PEDIDO" && (
            <div className="space-y-2 border rounded p-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2">
                   <Select 
                     className="flex-1" 
                     value={l.itemId} 
                     onChange={e => {
                       const item = skuOptions.find(i => i.id === e.target.value);
                       setLines(s => s.map((x, i) => i === idx ? { ...x, itemId: e.target.value, name: item?.label } : x));
                     }}
                   >
                    <option value="">-- Selecciona producto --</option>
                    {skuOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                  <Input type="number" className="w-20" value={l.qty}
                    onChange={e => setLines(s => s.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) || 1 } : x))} />
                  <SBButton variant="ghost" size="sm" onClick={() => setLines(s => s.filter((_, i) => i !== idx))}>Quitar</SBButton>
                </div>
              ))}
              <SBButton size="sm" variant="outline" onClick={() => setLines(s => [...s, { qty: 1 }])}>+ Añadir línea</SBButton>
            </div>
          )}

          {mode === "INTERACCION" && (
            <div className="space-y-2">
              <Input placeholder="Nota próxima interacción" value={nextNote} onChange={e => setNextNote(e.target.value)} />
              <Input type="datetime-local" value={nextDate} onChange={e => setNextDate(e.target.value)} />
            </div>
          )}

          {mode === "POS" && (
            <div className="space-y-2">
              <PosLinesPicker catalog={posCatalog} lines={posLines} setLines={setPosLines} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <SBButton variant="secondary" onClick={close} disabled={saving}>Cancelar</SBButton>
            <SBButton variant="primary" onClick={save} disabled={saving || !mode}>{saving ? "Guardando..." : "Guardar"}</SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
