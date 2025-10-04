// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { SBDialog, SBDialogContent, SBButton, Input, Select, Textarea, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { useData } from "@/lib/dataprovider";
import type { Account, Department, InteractionKind, Item, OrderSellOut, Party, PartyRole, User } from "@/domain/ssot";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  onSaved: (payload: any, openTask?: boolean) => void;
  defaultTab?: "INTERACCION" | "PEDIDO" | "EVENTO";
};

type InteractionState = {
  kind: InteractionKind;
  dept: Department;
  note: string;
  date: string;
  result?: 'OK' | 'RESPUESTA_NEGATIVA';
  scheduleFollowUp: boolean;
  followUpDate?: string;
};

type OrderState = {
  distributorId: string;
  lines: { sku: string; qty: number }[];
  date: string;
  note: string;
};

type EventState = {
  type: 'degustacion' | 'PLV' | 'promo';
  date: string;
  kpiEsperado?: string;
  note: string;
  isAccountAssociated: boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

const nowISODate = () => new Date().toISOString().slice(0, 10);

function AccountSelector({ accounts, onSelect, initialAccountId, disabled }: {
  accounts: Account[];
  onSelect: (accountId: string | undefined) => void;
  initialAccountId?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={initialAccountId || ''} onChange={e => onSelect(e.target.value)} disabled={disabled}>
      <option value="">Seleccionar cuenta...</option>
      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
    </Select>
  );
}

// ============================================================================
// MAIN COMPONENT: QuickLogDialog
// ============================================================================

export function QuickLogDialog({
  open, onOpenChange, accountId, onSaved, defaultTab = "INTERACCION"
}: Props) {
  const { data, currentUser } = useData();
  const [tab, setTab] = useState<string>(defaultTab);
  const [localAccountId, setLocalAccountId] = useState<string | undefined>(accountId);
  const [error, setError] = useState<string | null>(null);

  // States for each tab, preserved on tab change
  const [interactionState, setInteractionState] = useState<InteractionState>({
    kind: 'VISITA', dept: 'VENTAS', note: '', date: nowISODate(), scheduleFollowUp: false
  });
  const [orderState, setOrderState] = useState<OrderState>({
    distributorId: '', lines: [{ sku: '', qty: 1 }], date: nowISODate(), note: ''
  });
  const [eventState, setEventState] = useState<EventState>({
    type: 'degustacion', date: nowISODate(), note: '', isAccountAssociated: !!accountId
  });

  const accounts = useMemo(() => data?.accounts || [], [data]);
  const distributors = useMemo(() => {
    if (!data?.partyRoles || !data?.parties) return [];
    const distIds = new Set(data.partyRoles.filter(r => r.role === 'DISTRIBUTOR').map(r => r.partyId));
    return data.parties.filter(p => distIds.has(p.id));
  }, [data]);
  const items = useMemo(() => (data?.items || []).filter(i => (i as any).category === 'fg'), [data]);


  useEffect(() => {
    if (open) {
      console.info('[Telemetry] quicklog_opened', { accountId, tab: defaultTab });
      setLocalAccountId(accountId);
      setEventState(s => ({ ...s, isAccountAssociated: !!accountId }));
      setError(null);
    }
  }, [open, accountId, defaultTab]);

  const validate = (): boolean => {
    setError(null);
    let validationError: string | null = null;
    if (tab === "INTERACCION" && !interactionState.kind) {
      validationError = "El tipo de interacción es obligatorio.";
    }
    if (tab === "PEDIDO") {
      if (!orderState.distributorId) validationError = "El distribuidor es obligatorio.";
      else if (orderState.lines.filter(l => l.sku && l.qty > 0).length === 0) {
        validationError = "El pedido debe tener al menos una línea con producto y cantidad.";
      }
    }
    if (tab === "EVENTO" && eventState.isAccountAssociated && !localAccountId) {
      validationError = "Se requiere una cuenta para un evento asociado.";
    }

    if (validationError) {
      console.warn('[Telemetry] quicklog_validation_error', { field: validationError, tab });
      setError(validationError);
      return false;
    }
    return true;
  };

  const handleSave = (openTask: boolean = false) => {
    if (!validate()) return;

    let payload: any = { accountId: localAccountId, userId: currentUser?.id };

    if (tab === "INTERACCION") {
      payload = { ...payload, type: 'interaction', ...interactionState };
    } else if (tab === "PEDIDO") {
      payload = { ...payload, type: 'order', ...orderState };
    } else if (tab === "EVENTO") {
      payload = { ...payload, type: 'event', ...eventState };
    }
    
    if (interactionState.scheduleFollowUp && interactionState.followUpDate) {
        payload.followUp = true;
    }

    onSaved(payload, openTask);
  };
  
  const handleTabChange = (newTab: string) => {
    console.info('[Telemetry] quicklog_tab_changed', { tab: newTab });
    setTab(newTab);
  }

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="QuickLog" maxWidth="40rem">
        <div className="pt-4 space-y-4">
          <AccountSelector
            accounts={accounts}
            onSelect={setLocalAccountId}
            initialAccountId={localAccountId}
            disabled={!!accountId} // Bloquea si viene preconfigurado
          />

          <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="INTERACCION">Interacción</TabsTrigger>
              <TabsTrigger value="PEDIDO">Pedido</TabsTrigger>
              <TabsTrigger value="EVENTO">Evento</TabsTrigger>
            </TabsList>

            <TabsContent value="INTERACCION" className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select value={interactionState.kind} onChange={e => setInteractionState(s => ({ ...s, kind: e.target.value as InteractionKind }))}>
                  <option value="VISITA">Visita</option> <option value="LLAMADA">Llamada</option> <option value="EMAIL">Email</option> <option value="WHATSAPP">Whatsapp</option>
                </Select>
                <Select value={interactionState.dept} onChange={e => setInteractionState(s => ({ ...s, dept: e.target.value as Department }))}>
                  <option value="VENTAS">Ventas</option> <option value="MARKETING">Marketing</option> <option value="OPS">Ops</option>
                </Select>
              </div>
              <Input type="date" value={interactionState.date} onChange={e => setInteractionState(s => ({ ...s, date: e.target.value }))} />
              <Textarea placeholder="Notas de la interacción..." value={interactionState.note} onChange={e => setInteractionState(s => ({ ...s, note: e.target.value }))} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={interactionState.scheduleFollowUp} onChange={e => setInteractionState(s => ({ ...s, scheduleFollowUp: e.target.checked }))}/>Programar seguimiento</label>
                {interactionState.scheduleFollowUp && <Input type="date" className="w-40" value={interactionState.followUpDate || ''} onChange={e => setInteractionState(s => ({ ...s, followUpDate: e.target.value }))} />}
              </div>
            </TabsContent>

            <TabsContent value="PEDIDO" className="pt-4 space-y-3">
              <Select value={orderState.distributorId} onChange={e => setOrderState(s => ({ ...s, distributorId: e.target.value }))} required>
                <option value="">Seleccionar distribuidor...</option>
                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <div className="space-y-2">
                {orderState.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={line.sku} onChange={e => { const newLines = [...orderState.lines]; newLines[idx].sku = e.target.value; setOrderState(s => ({...s, lines: newLines})); }} className="flex-1">
                      <option value="">Seleccionar producto...</option>
                      {items.map(item => <option key={item.id} value={item.sku}>{item.name}</option>)}
                    </Select>
                    <Input type="number" min="1" value={line.qty} onChange={e => { const newLines = [...orderState.lines]; newLines[idx].qty = Number(e.target.value) || 1; setOrderState(s => ({...s, lines: newLines})); }} className="w-20" />
                    <SBButton variant="ghost" size="sm" onClick={() => setOrderState(s => ({...s, lines: s.lines.filter((_, i) => i !== idx)}))}><Trash2 size={16} /></SBButton>
                  </div>
                ))}
                <SBButton variant="outline" size="sm" onClick={() => setOrderState(s => ({...s, lines: [...s.lines, {sku: '', qty: 1}]}))}><Plus size={14} className="mr-1"/>Añadir línea</SBButton>
              </div>
            </TabsContent>

            <TabsContent value="EVENTO" className="pt-4 space-y-3">
               <Select value={eventState.type} onChange={e => setEventState(s => ({ ...s, type: e.target.value as any }))}>
                  <option value="degustacion">Degustación</option> <option value="PLV">Entrega PLV</option> <option value="promo">Aplicar Promo</option>
                </Select>
               <Input type="date" value={eventState.date} onChange={e => setEventState(s => ({ ...s, date: e.target.value }))} />
               <Input placeholder="KPI esperado (opcional)" value={eventState.kpiEsperado || ''} onChange={e => setEventState(s => ({ ...s, kpiEsperado: e.target.value }))} />
               <Textarea placeholder="Notas del evento..." value={eventState.note} onChange={e => setEventState(s => ({ ...s, note: e.target.value }))} />
            </TabsContent>

          </Tabs>
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <SBButton variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</SBButton>
          <SBButton variant="secondary" onClick={() => handleSave(true)}>Guardar y Abrir Task</SBButton>
          <SBButton variant="primary" onClick={() => handleSave(false)}>Guardar</SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
