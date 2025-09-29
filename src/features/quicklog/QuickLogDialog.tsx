// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useMemo, useState } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ⬇️ Server actions (adapta a tus rutas reales)
import { createInteraction } from "@/app/(app)/agenda/actions";               // (accountId, userId, kind, note, plannedFor)
import { placeOrder } from "@/app/(app)/orders/actions";                      // (accountId, distributorId, lines[], createdById)
import { createPosTacticsBatch, type PosLineInput } from "@/features/pos/server/pos-actions";

// ⬇️ Selector POS multi-líneas
import { PosLinesPicker } from "@/features/pos/PosLinesPicker";

// Si no vienes desde la ficha de cuenta, selecciona una
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  defaultTab?: "INTERACCION" | "PEDIDO";
};

export function QuickLogDialog({ open, onOpenChange, accountId, defaultTab = "INTERACCION" }: Props) {
  const router = useRouter();
  const { data, currentUser } = useData();

  // pestañas
  const [tab, setTab] = useState<"INTERACCION" | "PEDIDO">(defaultTab);

  // estado común
  const [selectedAccount, setSelectedAccount] = useState(accountId || "");
  const [saving, setSaving] = useState(false);

  // --- INTERACCIÓN ---
  const [note, setNote] = useState("");
  const [plannedFor, setPlannedFor] = useState<string>("");

  // --- PEDIDO (colocación) ---
  const [distributorId, setDistributorId] = useState("SANTA_BRISA");
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([{ sku: "", qty: 1 }]);

  // --- POS (compartido en ambas pestañas) ---
  const [posLines, setPosLines] = useState<PosLineInput[]>([]);
  const posCatalog = useMemo(() => ((data as any)?.posCatalog || []) as { id: string; name: string }[], [data]);

  const accountOptions = useMemo(
    () => (data?.accounts || []).map(a => ({ value: a.id, label: a.name })),
    [data?.accounts]
  );
  
  const skuOptions = useMemo(() => (data?.items || []).map(i => ({ value: i.sku, label: i.name })), [data?.items]);

  const resetAll = () => {
    setNote(""); setPlannedFor("");
    setDistributorId("SANTA_BRISA");
    setLines([{ sku: "", qty: 1 }]);
    setPosLines([]);
  };

  const ensureAccountSelected = () => {
    if (accountId) return accountId;
    if (!selectedAccount) {
      toast.error("Selecciona una cuenta");
      throw new Error("missing-account");
    }
    return selectedAccount;
  };

  const save = async () => {
    try {
      setSaving(true);
      const accId = ensureAccountSelected();

      if (tab === "INTERACCION") {
        // 1) Interacción
        await createInteraction({
          accountId: accId,
          createdById: currentUser!.id,
          kind: "VISITA",
          note: note || undefined,
          plannedFor: plannedFor || undefined,
          dept: 'VENTAS'
        });

        // 2) POS (opcional)
        if (posLines.length) {
          await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: posLines });
        }

        toast.success(`Interacción guardada${posLines.length ? " + POS" : ""}`);
      }

      if (tab === "PEDIDO") {
        // Validaciones mínimas de pedido
        if (!lines.length || !lines.some(l => l.sku.trim() && l.qty > 0)) {
          toast.error("Añade al menos una línea (SKU + cantidad > 0)");
          setSaving(false);
          return;
        }

        // 1) Pedido (sell-out)
        const created = await placeOrder({
          accountId: accId,
          distributorId,
          lines,
          createdById: currentUser!.id
        });

        // 2) POS (opcional)
        if (posLines.length) {
          await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: posLines });
        }

        toast.success(`Pedido colocado${posLines.length ? " + POS" : ""}`);
        // navega al detalle si quieres
        if (created?.id) router.push(`/orders/${created.id}`);
      }

      resetAll();
      onOpenChange(false);
    } catch (e: any) {
      if (e?.message !== "missing-account") {
        console.error(e);
        toast.error(e?.message || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={(v) => { if(!v) resetAll(); onOpenChange(v); }}>
      <SBDialogContent title="QuickLog (Interacción / Pedido)">
        {/* Cuenta si no vienes desde la ficha */}
        {!accountId && (
          <div className="mb-3">
            <label className="text-xs text-zinc-600">Cuenta</label>
            <Select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
            >
              <option value="">Selecciona cuenta</option>
              {accountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            className={`text-sm px-3 py-1 rounded border ${tab === "INTERACCION" ? "bg-black text-white" : ""}`}
            onClick={() => setTab("INTERACCION")}
          >
            Interacción
          </button>
          <button
            className={`text-sm px-3 py-1 rounded border ${tab === "PEDIDO" ? "bg-black text-white" : ""}`}
            onClick={() => setTab("PEDIDO")}
          >
            Pedido (colocación)
          </button>
        </div>

        {/* Tab: Interacción */}
        {tab === "INTERACCION" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-600">Nota</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una nota..." />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Fecha/hora (opcional)</label>
              <Input type="datetime-local" value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} />
            </div>

            {/* POS (opcional, múltiples líneas) */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Añadir tácticas POS (opcional)</h4>
                <span className="text-xs text-zinc-500">Se registran en Marketing</span>
              </div>
              <PosLinesPicker catalog={posCatalog} lines={posLines} setLines={setPosLines} />
            </div>
          </div>
        )}

        {/* Tab: Pedido */}
        {tab === "PEDIDO" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="text-xs text-zinc-600">Distribuidor</label>
                <Select
                  value={distributorId}
                  onChange={e => setDistributorId(e.target.value)}
                >
                    <option value="SANTA_BRISA">Santa Brisa</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Líneas de pedido</div>
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select className="flex-1" value={l.sku}
                    onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,sku:e.target.value}:x))}>
                    <option value="">-- SKU --</option>
                    {skuOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      setLines((s) =>
                        s.map((x, i) =>
                          i === idx ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x
                        )
                      )
                    }
                    className="w-24"
                  />
                  <SBButton variant="ghost" onClick={() => setLines((s) => s.filter((_, i) => i !== idx))}>
                    Quitar
                  </SBButton>
                </div>
              ))}
              <SBButton variant="outline" size="sm" onClick={() => setLines((s) => [...s, { sku: "", qty: 1 }])}>
                + Añadir línea
              </SBButton>
            </div>

            {/* POS (opcional, múltiples líneas) */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Añadir tácticas POS (opcional)</h4>
                <span className="text-xs text-zinc-500">Se registran en Marketing</span>
              </div>
              <PosLinesPicker catalog={posCatalog} lines={posLines} setLines={setPosLines} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-5">
          <SBButton variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </SBButton>
          <SBButton variant="primary" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
