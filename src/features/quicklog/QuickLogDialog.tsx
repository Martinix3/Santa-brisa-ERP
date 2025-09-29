// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useMemo, useState, useCallback } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2 } from 'lucide-react';

// ⬇️ Server actions (adapta a tus rutas reales)
import { createInteraction } from "@/app/(app)/agenda/actions";
import { placeOrder } from "@/app/(app)/orders/actions";
import { createPosTacticsBatch, type PosLineInput } from "@/features/pos/server/pos-actions";
import { createAccountAndParty } from "./actions/create-account-action";

// ⬇️ Selector POS multi-líneas
import { PosLinesPicker } from "@/features/pos/PosLinesPicker";
import type { Account, Party } from "@/domain/ssot";


function AccountSearch({
  accounts,
  onSelect,
  onFreeText,
  initialAccountId,
}: {
  accounts: Account[];
  onSelect: (account: Account) => void;
  onFreeText: (text: string) => void;
  initialAccountId?: string;
}) {
  const [query, setQuery] = useState(() => accounts.find(a => a.id === initialAccountId)?.name || '');
  const [suggestions, setSuggestions] = useState<Account[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (newQuery.length > 1) {
      const lowerQuery = newQuery.toLowerCase();
      const filtered = accounts.filter(acc => acc.name.toLowerCase().includes(lowerQuery));
      setSuggestions(filtered);
      
      // Si no hay sugerencias, podría ser un nuevo cliente
      if (filtered.length === 0) {
        onFreeText(newQuery);
      }
    } else {
      setSuggestions([]);
      onFreeText(''); // Limpia el texto libre si la consulta es corta
    }
  };

  const handleSelect = (account: Account) => {
    setQuery(account.name);
    onSelect(account);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder="Buscar o crear cuenta..."
          disabled={!!initialAccountId}
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(acc => (
            <li key={acc.id} onMouseDown={() => handleSelect(acc)} className="px-3 py-2 cursor-pointer hover:bg-zinc-100">
              <p className="font-medium text-sm">{acc.name}</p>
              <p className="text-xs text-zinc-500">{acc.id}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// Si no vienes desde la ficha de cuenta, selecciona una
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  defaultTab?: "INTERACCION" | "PEDIDO";
};

export function QuickLogDialog({ open, onOpenChange, accountId, defaultTab = "INTERACCION" }: Props) {
  const router = useRouter();
  const { data, currentUser, saveAllCollections } = useData();

  // pestañas
  const [tab, setTab] = useState<"INTERACCION" | "PEDIDO">(defaultTab);

  // estado común
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(accountId ? data?.accounts.find(a => a.id === accountId) || null : null);
  const [newAccountName, setNewAccountName] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // --- INTERACCIÓN ---
  const [note, setNote] = useState("");
  const [plannedFor, setPlannedFor] = useState<string>("");

  // --- PEDIDO (colocación) ---
  const [distributorId, setDistributorId] = useState("SB");
  const [lines, setLines] = useState<{ sku: string; qty: number, unitPriceReported?: number }[]>([{ sku: "", qty: 1 }]);

  // --- POS (compartido en ambas pestañas) ---
  const [posLines, setPosLines] = useState<Partial<PosLineInput>[]>([]);
  const posCatalog = useMemo(() => ((data as any)?.posCatalog || []) as { id: string; name: string }[], [data]);

  const accountOptions = useMemo(
    () => (data?.accounts || []).map(a => ({ value: a.id, label: a.name })),
    [data?.accounts]
  );
  
  const skuOptions = useMemo(() => (data?.items || []).filter(i => (i as any).category === 'fg').map(i => ({ value: i.sku, label: i.name })), [data?.items]);

  const addLine = ()=> setLines(s=>[...s,{sku:"",qty:1}]);
  const removeLine = (idx:number)=> setLines(s => s.filter((_,i)=>i!==idx));

  const resetAll = () => {
    setSelectedAccount(null);
    setNewAccountName(undefined);
    setNote(""); setPlannedFor("");
    setDistributorId("SB");
    setLines([{ sku: "", qty: 1 }]);
    setPosLines([]);
  };

  const ensureAccountSelected = async (): Promise<string> => {
    if (accountId) return accountId;
    if (selectedAccount) return selectedAccount.id;
    if (newAccountName) {
      // Crear nueva cuenta
      const { account } = await createAccountAndParty({ name: newAccountName, ownerId: currentUser!.id });
      // Actualizar el estado local para que el resto de la app lo vea
      saveAllCollections({ 
        parties: [account.party as Party], 
        accounts: [account.account] 
      });
      toast.success(`Nueva cuenta creada: ${account.account.name}`);
      return account.account.id;
    }
    toast.error("Selecciona o crea una cuenta");
    throw new Error("missing-account");
  };

  const save = async () => {
    try {
      setSaving(true);
      const accId = await ensureAccountSelected();

      if (tab === "INTERACCION") {
        await createInteraction({
          accountId: accId,
          createdById: currentUser!.id,
          kind: "VISITA",
          note: note || undefined,
          plannedFor: plannedFor || undefined,
          dept: 'VENTAS'
        });
        if (posLines.length) {
          await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: posLines as PosLineInput[] });
        }
        toast.success(`Interacción guardada${posLines.length ? " + POS" : ""}`);
      }

      if (tab === "PEDIDO") {
        if (!lines.length || !lines.some(l => l.sku.trim() && l.qty > 0)) {
          toast.error("Añade al menos una línea (SKU + cantidad > 0)");
          setSaving(false); return;
        }
        const created = await placeOrder({
          accountId: accId,
          distributorId,
          lines,
          createdById: currentUser!.id
        });
        if (posLines.length) {
          await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: posLines as PosLineInput[] });
        }
        toast.success(`Pedido colocado${posLines.length ? " + POS" : ""}`);
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
            <AccountSearch 
              accounts={data?.accounts || []}
              onSelect={(acc) => { setSelectedAccount(acc); setNewAccountName(undefined); }}
              onFreeText={(text) => { setSelectedAccount(null); setNewAccountName(text); }}
            />
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
                <Select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}>
                    <option value="SB">Santa Brisa</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Líneas de pedido</div>
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select className="border rounded px-2 py-1 flex-1" value={l.sku}
                    onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,sku:e.target.value}:x))}>
                    <option value="">-- Selecciona producto --</option>
                    {skuOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  <Input type="number" min={1} className="border rounded px-2 py-1 w-24" value={l.qty}
                    onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,qty:Math.max(1, Number(e.target.value)||1)}:x))} />
                  <Input type="number" step="0.01" placeholder="€ opcional" className="border rounded px-2 py-1 w-28"
                    value={l.unitPriceReported ?? ""} onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,unitPriceReported:Number(e.target.value)||undefined}:x))} />
                  <SBButton variant="ghost" onClick={() => removeLine(idx)}>
                    <Trash2 className="w-4 h-4 text-red-500"/>
                  </SBButton>
                </div>
              ))}
              <SBButton variant="outline" size="sm" onClick={addLine}>
                + Añadir línea
              </SBButton>
            </div>

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
          <SBButton onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
