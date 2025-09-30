// src/features/quicklog/components/SBFlows.tsx
"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from "@/lib/dataprovider";
import { SBDialog, SBDialogContent, SBButton, Input, Select } from "@/components/ui";
import { toast } from "sonner";
import { Search, Plus, X } from 'lucide-react';
import type { Account, AccountType, Item, Uom } from '@/domain/ssot';

type SBFlowModalProps = {
  open: boolean;
  onClose: () => void;
  variant: 'createOrder' | 'editAccount';
  onSubmit: (payload: any) => Promise<void>;
  onSearchAccounts: (query: string) => Promise<Account[]>;
  onCreateAccount: (data: { name: string; city?: string; type?: AccountType }) => Promise<Account>;
  accounts: Account[];
  defaults?: Record<string, any>;
};

function AccountSelector({
  accounts,
  onSearch,
  onSelect,
  onCreate,
  initialValue,
}: {
  accounts: Account[];
  onSearch: (query: string) => Promise<Account[]>;
  onSelect: (account: Account) => void;
  onCreate: (name: string) => Promise<Account>;
  initialValue?: { id: string; name: string };
}) {
  const [query, setQuery] = useState(initialValue?.name || '');
  const [suggestions, setSuggestions] = useState<Account[]>([]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length > 2) {
      const results = await onSearch(q);
      if (results.length === 0) {
        setSuggestions([{ id: 'new', name: `Crear "${q}"` } as Account]);
      } else {
        setSuggestions(results);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = async (acc: Account) => {
    if (acc.id === 'new') {
      const newAccount = await onCreate(query);
      onSelect(newAccount);
    } else {
      onSelect(acc);
    }
    setQuery(acc.name);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar cuenta..."
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((acc) => (
            <li
              key={acc.id}
              className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
              onMouseDown={() => handleSelect(acc)}
            >
              <p className="font-medium text-sm">{acc.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function OrderForm({ onSubmit, items }: { onSubmit: (p: any) => void; items: Item[] }) {
  const [lines, setLines] = useState<{ itemId: string; qty: number; uom: Uom, priceUnit: number }[]>([{ itemId: '', qty: 1, uom: 'unit', priceUnit: 0 }]);
  const [note, setNote] = useState('');
  
  const addLine = () => setLines(prev => [...prev, { itemId: '', qty: 1, uom: 'unit', priceUnit: 0 }]);
  const updateLine = (index: number, field: 'itemId' | 'qty' | 'priceUnit', value: string) => {
    const newLines = [...lines];
    const numValue = Number(value);
    if (field === 'qty') newLines[index].qty = numValue > 0 ? numValue : 1;
    else if (field === 'priceUnit') newLines[index].priceUnit = numValue >= 0 ? numValue : 0;
    else newLines[index].itemId = value;
    setLines(newLines);
  };
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.some(l => !l.itemId || l.qty <= 0)) {
        toast.error("Todas las líneas deben tener un producto y una cantidad positiva.");
        return;
    }
    onSubmit({ items: lines, note });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Líneas de Pedido</label>
        {lines.map((line, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select value={line.itemId} onChange={(e) => updateLine(index, 'itemId', e.target.value)} className="flex-grow">
              <option value="" disabled>Selecciona producto</option>
              {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input type="number" value={line.qty} onChange={(e) => updateLine(index, 'qty', e.target.value)} className="w-20" min="1" />
            <Input type="number" value={line.priceUnit} onChange={(e) => updateLine(index, 'priceUnit', e.target.value)} className="w-24" placeholder="Precio" />
            <SBButton type="button" variant="ghost" onClick={() => removeLine(index)}><X size={16} /></SBButton>
          </div>
        ))}
        <SBButton type="button" variant="secondary" size="sm" onClick={addLine}><Plus size={14} className="mr-2"/>Añadir línea</SBButton>
      </div>
      <div>
        <label htmlFor="order-notes" className="text-sm font-medium">Notas</label>
        <textarea id="order-notes" value={note} onChange={e => setNote(e.target.value)} rows={2} className="mt-1 w-full border rounded-md p-2 text-sm" />
      </div>
      <div className="flex justify-end pt-2">
          <SBButton type="submit">Crear Pedido</SBButton>
      </div>
    </form>
  );
}

function EditAccountForm({ onSubmit, defaults }: { onSubmit: (p: any) => void; defaults: any }) {
  const [formState, setFormState] = useState(defaults);
  const handleChange = (field: string, value: string) => {
    setFormState((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5"><span className="text-sm font-medium">Nombre</span><Input value={formState.name} onChange={e => handleChange('name', e.target.value)} /></label>
            <label className="grid gap-1.5"><span className="text-sm font-medium">Tipo</span>
                <Select value={formState.type} onChange={e => handleChange('type', e.target.value)}>
                    <option value="HORECA">HORECA</option><option value="RETAIL">Retail</option><option value="ONLINE">Online</option><option value="PRIVADA">Privada</option>
                </Select>
            </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5"><span className="text-sm font-medium">Email Principal</span><Input type="email" value={formState.mainContactEmail} onChange={e => handleChange('mainContactEmail', e.target.value)} /></label>
            <label className="grid gap-1.5"><span className="text-sm font-medium">Teléfono Principal</span><Input value={formState.phone} onChange={e => handleChange('phone', e.target.value)} /></label>
        </div>
        <div className="flex justify-end pt-2">
            <SBButton type="submit">Guardar Cambios</SBButton>
        </div>
    </form>
  );
}

export function SBFlowModal(props: SBFlowModalProps) {
  const { open, onClose, variant, onSubmit, onSearchAccounts, onCreateAccount, accounts, defaults } = props;
  const { data } = useData();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(defaults?.id);
  
  const handleAccountSelect = (account: Account) => {
    setSelectedAccountId(account.id);
  };
  
  const handleSubmit = (payload: any) => {
    const finalPayload = variant === 'createOrder' ? { ...payload, accountId: selectedAccountId } : payload;
    onSubmit(finalPayload);
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={variant === 'createOrder' ? 'Nuevo Pedido de Venta' : 'Editar Cuenta'}
        maxWidth="42rem"
      >
        <div className="pt-4 space-y-4">
          {variant === 'createOrder' && !defaults?.id && (
             <AccountSelector
                accounts={accounts}
                onSearch={onSearchAccounts}
                onSelect={handleAccountSelect}
                onCreate={async (name: string) => onCreateAccount({ name })}
              />
          )}

          {variant === 'createOrder' && data?.items && (
            <OrderForm onSubmit={handleSubmit} items={data.items} />
          )}

          {variant === 'editAccount' && defaults && (
            <EditAccountForm onSubmit={onSubmit} defaults={defaults} />
          )}
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
