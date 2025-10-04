// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { SBDialog, SBDialogContent, SBButton, Input, Select, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2 } from 'lucide-react';

// Server actions
import { createInteraction } from "@/server/actions/agenda.actions";
import { placeOrder } from "@/server/actions/orders.actions";
import { createPosTacticsBatch } from '@/server/actions/pos-tactics.service';
import type { PosLineInput } from '@/server/actions/pos-tactics.service';
import { createAccountAndParty } from "@/server/actions/create-account.action";

import { PosLinesPicker } from "@/features/pos/PosLinesPicker";
import type { Account, Party, PosCostCatalogEntry, Item } from "@/domain/ssot";
import { SANTA_BRISA_DISTRIB_ID } from "@/lib/authz";


// ============================================================================
// SUB-COMPONENT: AccountSearch
// ============================================================================
function AccountSearch({ accounts, onSelect, onFreeText, initialAccountId }: { accounts: Account[]; onSelect: (account: Account) => void; onFreeText: (text: string) => void; initialAccountId?: string; }) {
  const [query, setQuery] = useState(() => accounts.find(a => a.id === initialAccountId)?.name || '');
  const [suggestions, setSuggestions] = useState<Account[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery.length > 1) {
      const lowerQuery = newQuery.toLowerCase();
      const filtered = accounts.filter(acc => acc.name.toLowerCase().includes(lowerQuery));
      setSuggestions(filtered);
      if (filtered.length === 0) { onFreeText(newQuery); }
    } else {
      setSuggestions([]);
      onFreeText('');
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder="Buscar o crear cuenta..."
          disabled={!!initialAccountId}
          className="pl-9"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((acc: Account) => (
            <li key={acc.id} onMouseDown={() => handleSelect(acc)} className="px-3 py-2 cursor-pointer hover:bg-secondary">
              <p className="font-medium text-sm text-foreground">{acc.name}</p>
              <p className="text-xs text-muted-foreground">{acc.id}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  defaultTab?: "INTERACCION" | "PEDIDO";
};

type OrderLine = {
  sku: string;
  qty: number;
  unitPriceReported?: number;
};

// ============================================================================
// MAIN COMPONENT: QuickLogDialog
// ============================================================================
export function QuickLogDialog({ open, onOpenChange, accountId, defaultTab = "INTERACCION" }: Props) {
  const router = useRouter();
  const { data, currentUser, saveAllCollections } = useData();
  const [tab, setTab] = useState<string>(defaultTab);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(accountId ? data?.accounts.find(a => a.id === accountId) || null : null);
  const [newAccountName, setNewAccountName] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [plannedFor, setPlannedFor] = useState<string>("");
  const [distributorId, setDistributorId] = useState(SANTA_BRISA_DISTRIB_ID);
  const [lines, setLines] = useState<OrderLine[]>([{ sku: "", qty: 1 }]);
  const [posLines, setPosLines] = useState<Partial<PosLineInput>[]>([]);
  const posCatalog = useMemo(() => ((data as any)?.posCostCatalog || []) as PosCostCatalogEntry[], [data]);
  const skuOptions = useMemo(() => (data?.items || []).filter(i => (i as any).category === 'fg').map(i => ({ value: i.sku, label: i.name })), [data?.items]);

  useEffect(() => {
    if (selectedAccount) {
      setDistributorId(selectedAccount.distributorPartyId || SANTA_BRISA_DISTRIB_ID);
    }
  }, [selectedAccount]);

  const addLine = () => setLines((s: OrderLine[]) => [...s, { sku: "", qty: 1 }]);
  const removeLine = (idx: number) => setLines((s: OrderLine[]) => s.filter((_, i: number) => i !== idx));

  const resetAll = useCallback(() => {
    setTab(defaultTab);
    const initialAccount = accountId ? data?.accounts.find(a => a.id === accountId) || null : null;
    setSelectedAccount(initialAccount);
    setDistributorId(initialAccount?.distributorPartyId || SANTA_BRISA_DISTRIB_ID);
    setNewAccountName(undefined);
    setNote(""); setPlannedFor("");
    setLines([{ sku: "", qty: 1 }]);
    setPosLines([]);
  }, [accountId, data?.accounts, defaultTab]);

  const ensureAccountSelected = async (): Promise<string> => {
    if (accountId) return accountId;
    if (selectedAccount) return selectedAccount.id;
    if (newAccountName) {
      const { account } = await createAccountAndParty({ 
        name: newAccountName, 
        ownerId: currentUser!.id,
        distributorPartyId: distributorId !== 'SB' ? distributorId : undefined,
      });
      saveAllCollections({ parties: [account.party as Party], accounts: [account.account] });
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
      
      // Filtra las líneas POS antes de enviarlas
      const validPosLines = posLines.filter(
        (l: any) => ((l.kind === 'CATALOGO' && l.catalogItemId) || (l.kind === 'CUSTOM' && l.desc))
      );

      if (tab === "INTERACCION") {
        await createInteraction({ accountId: accId, createdById: currentUser!.id, kind: "VISITA", note: note || undefined, plannedFor: plannedFor || undefined, dept: 'VENTAS' });
        if (validPosLines.length) await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: validPosLines as PosLineInput[] });
        toast.success(`Interacción guardada${validPosLines.length ? " + POS" : ""}`);
      }
      if (tab === "PEDIDO") {
        const validLines = lines.filter(l => l.sku.trim() && l.qty > 0);
        if (!validLines.length) {
          toast.error("Añade al menos una línea válida (SKU + cantidad > 0)");
          setSaving(false); return;
        }
        const finalDistributorId = distributorId;
        const created = await placeOrder({ accountId: accId, distributorId: finalDistributorId, lines, createdById: currentUser!.id });
        if (validPosLines.length) await createPosTacticsBatch({ accountId: accId, createdById: currentUser!.id, lines: validPosLines as PosLineInput[] });
        toast.success(`Pedido colocado${validPosLines.length ? " + POS" : ""}`);
        if (created?.id) router.push(`/orders/${created.id}`);
      }
      onOpenChange(false);
    } catch (e: any) {
      if (e?.message !== "missing-account") { console.error(e); toast.error(e?.message || "Error al guardar"); }
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => resetAll(), 150);
      return () => clearTimeout(timer);
    }
  }, [open, resetAll]);

  const renderLabel = (text: string) => <label className="text-xs font-medium text-muted-foreground">{text}</label>;

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="QuickLog">
        <div className="space-y-4 py-4">
          {!accountId && (
            <div>
              {renderLabel("Cuenta")}
              <AccountSearch accounts={data?.accounts || []} onSelect={(acc) => { setSelectedAccount(acc); setNewAccountName(undefined); }} onFreeText={(text) => { setSelectedAccount(null); setNewAccountName(text); }} />
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="INTERACCION">Interacción</TabsTrigger>
              <TabsTrigger value="PEDIDO">Pedido (colocación)</TabsTrigger>
            </TabsList>
            <TabsContent value="INTERACCION">
              <div className="space-y-4 pt-2">
                <div>{renderLabel("Nota")}<Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una nota de la visita..." /></div>
                <div>{renderLabel("Fecha/hora de la visita (opcional)")}<Input type="datetime-local" value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} /></div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-foreground">Añadir tácticas POS (opcional)</h4><span className="text-xs text-muted-foreground">Se registran en Marketing</span></div>
                  <PosLinesPicker catalog={posCatalog} lines={posLines} setLines={setPosLines} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="PEDIDO">
              <div className="space-y-4 pt-2">
                <div>{renderLabel("Distribuidor")}
                  <Select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}>
                      <option value="SB">Santa Brisa</option>
                      {(data?.partyRoles.filter(r => r.role === 'DISTRIBUTOR').map(r => data.parties.find(p => p.id === r.partyId)) || []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Líneas de pedido</div>
                  {lines.map((l: OrderLine, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select className="flex-1" value={l.sku} onChange={e => setLines(s => s.map((x, i) => i === idx ? { ...x, sku: e.target.value } : x))}><option value="">-- Selecciona producto --</option>{skuOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                      <Input type="number" min={1} className="w-20" value={l.qty} onChange={e => setLines(s => s.map((x, i) => i === idx ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x))} />
                      <Input type="number" step="0.01" placeholder="€ (opc.)" className="w-24" value={l.unitPriceReported ?? ""} onChange={e => setLines(s => s.map((x, i) => i === idx ? { ...x, unitPriceReported: Number(e.target.value) || undefined } : x))} />
                      <SBButton variant="ghost" size="sm" onClick={() => removeLine(idx)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></SBButton>
                    </div>
                  ))}
                  <SBButton variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-2" />Añadir línea</SBButton>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-foreground">Añadir tácticas POS (opcional)</h4><span className="text-xs text-muted-foreground">Se registran en Marketing</span></div>
                  <PosLinesPicker catalog={posCatalog} lines={posLines} setLines={setPosLines} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <SBButton variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</SBButton>
          <SBButton onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
