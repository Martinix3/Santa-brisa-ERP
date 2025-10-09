// src/features/quicklog/components/SBFlows.tsx
"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from "@/lib/dataprovider";
import { SBDialog, SBDialogContent, SBButton, Input, Select } from "@/components/ui";
import { toast } from "sonner";
import { Search, Plus, X, MapPin, Upload, Image as ImageIcon, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import type { Account, AccountType, Item, Uom, Stage, Segment, CommercialFlow, Party } from '@/domain/ssot';
import { ACCOUNT_STAGE_META } from '@/domain/ssot';

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
  const [lines, setLines] = useState<{ sku: string; qty: number; uom: Uom, priceUnit: number }[]>([{ sku: '', qty: 1, uom: 'UNIT', priceUnit: 0 }]);
  const [note, setNote] = useState('');
  
  const addLine = () => setLines(prev => [...prev, { sku: '', qty: 1, uom: 'UNIT', priceUnit: 0 }]);
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

function EditAccountForm({ onSubmit, defaults, users, distributors }: { onSubmit: (p: any) => void; defaults: any; users: User[]; distributors: { value: string; label: string }[] }) {
  const [formState, setFormState] = useState({
    ...defaults,
    photos: defaults.photos || [],
    documents: defaults.documents || [],
    location: defaults.location || null,
  });

  const handleChange = (field: string, value: any) => {
    setFormState((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Aquí iría la lógica de subida real a Storage
      const newPhotos = Array.from(files).map(f => URL.createObjectURL(f));
      handleChange('photos', [...formState.photos, ...newPhotos]);
      toast.success(`${files.length} foto(s) añadida(s)`);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newDocs = Array.from(files).map(f => ({
        id: Math.random().toString(36),
        name: f.name,
        url: URL.createObjectURL(f),
        type: 'other' as const,
        uploadedAt: new Date().toISOString(),
      }));
      handleChange('documents', [...formState.documents, ...newDocs]);
      toast.success(`${files.length} documento(s) añadido(s)`);
    }
  };

  const removePhoto = (index: number) => {
    handleChange('photos', formState.photos.filter((_: any, i: number) => i !== index));
  };

  const removeDocument = (index: number) => {
    handleChange('documents', formState.documents.filter((_: any, i: number) => i !== index));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange('location', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success('Ubicación capturada');
        },
        () => toast.error('No se pudo obtener la ubicación')
      );
    }
  };

  const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
    { value: 'HORECA', label: 'HORECA' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'PRIVADA', label: 'Venta Privada' },
    { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
  ];

  const STAGE_OPTIONS: { value: Stage; label: string }[] = Object.entries(ACCOUNT_STAGE_META).map(([key, meta]) => ({
    value: key as Stage,
    label: meta.label,
  }));

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      {/* Sección: Información Básica */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Información Básica</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Nombre de la Cuenta *</span>
            <Input value={formState.name} onChange={e => handleChange('name', e.target.value)} required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Segmento *</span>
            <Select value={formState.accountType} onChange={e => handleChange('segment', e.target.value)} required>
              {SEGMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Sub-tipo <span className="text-xs text-zinc-500">(opcional)</span></span>
          <Input value={formState.subType || ''} onChange={e => handleChange('subType', e.target.value)} placeholder="ej: Bar de tapas, Tienda gourmet..." />
        </label>
      </section>

      {/* Sección: Clasificación Comercial */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Clasificación Comercial</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Estado (Stage) *</span>
            <Select value={formState.stage} onChange={e => handleChange('stage', e.target.value)} required>
              {STAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </label>
          {formState.flow === 'COLOCACION' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Comercial Asignado *</span>
              <Select value={formState.salesRepId} onChange={e => handleChange('ownerId', e.target.value)} required>
                <option value="">Selecciona...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </label>
          )}
          {formState.flow === 'DIRECTA' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Comercial Asignado <span className="text-xs text-zinc-500">(opcional)</span></span>
              <Select value={formState.salesRepId || ''} onChange={e => handleChange('ownerId', e.target.value)}>
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </label>
          )}
        </div>
        
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Flujo Comercial *</span>
          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flow"
                value="DIRECTA"
                checked={formState.flow === 'DIRECTA'}
                onChange={e => handleChange('flow', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">Venta Directa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flow"
                value="COLOCACION"
                checked={formState.flow === 'COLOCACION'}
                onChange={e => handleChange('flow', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">Colocación</span>
            </label>
          </div>
        </label>

        {formState.flow === 'COLOCACION' && (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Distribuidor *</span>
            <Select value={formState.distributorId || ''} onChange={e => handleChange('distributorPartyId', e.target.value)} required>
              <option value="">Selecciona distribuidor...</option>
              {distributors.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Origen <span className="text-xs text-zinc-500">(opcional)</span></span>
            <Input value={formState.source || ''} onChange={e => handleChange('source', e.target.value)} placeholder="ej: Referido, Feria, Web..." />
          </label>
          <label className="flex items-center gap-2 pt-8">
            <input
              type="checkbox"
              checked={formState.isTarget || false}
              onChange={e => handleChange('isTarget', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Cuenta Objetivo</span>
          </label>
        </div>
      </section>

      {/* Sección: Datos de Contacto */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Datos de Contacto</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">CIF/NIF</span>
            <Input value={formState.vat || ''} onChange={e => handleChange('vat', e.target.value)} placeholder="B12345678" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Teléfono</span>
            <Input value={formState.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+34 600 000 000" />
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Email Principal</span>
          <Input type="email" value={formState.mainContactEmail || ''} onChange={e => handleChange('mainContactEmail', e.target.value)} placeholder="contacto@empresa.com" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Dirección</span>
          <Input value={formState.address || ''} onChange={e => handleChange('address', e.target.value)} placeholder="Calle Principal, 123" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Ciudad</span>
          <Input value={formState.city || ''} onChange={e => handleChange('city', e.target.value)} placeholder="Madrid" />
        </label>
      </section>

      {/* Sección: Ubicación */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Ubicación GPS</h3>
        {formState.location ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Ubicación capturada</p>
                <p className="text-xs text-green-700">Lat: {formState.location.lat.toFixed(6)}, Lng: {formState.location.lng.toFixed(6)}</p>
              </div>
            </div>
            <SBButton type="button" variant="ghost" size="sm" onClick={() => handleChange('location', null)}>
              <X size={16} />
            </SBButton>
          </div>
        ) : (
          <SBButton type="button" variant="secondary" onClick={handleGetLocation} className="w-full">
            <MapPin size={16} className="mr-2" /> Capturar Ubicación Actual
          </SBButton>
        )}
      </section>

      {/* Sección: Fotos */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Fotos</h3>
        <div className="grid grid-cols-4 gap-2">
          {formState.photos.map((photo: string, idx: number) => (
            <div key={idx} className="relative group aspect-square">
              <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <label className="aspect-square border-2 border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50">
            <ImageIcon className="h-8 w-8 text-zinc-400 mb-1" />
            <span className="text-xs text-zinc-500">Añadir foto</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
      </section>

      {/* Sección: Documentos */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Documentos</h3>
        <div className="space-y-2">
          {formState.documents.map((doc: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between bg-zinc-50 border rounded-lg p-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium">{doc.name}</span>
              </div>
              <SBButton type="button" variant="ghost" size="sm" onClick={() => removeDocument(idx)}>
                <Trash2 size={14} className="text-red-600" />
              </SBButton>
            </div>
          ))}
          <label className="border-2 border-dashed border-zinc-300 rounded-lg p-4 flex flex-col items-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50">
            <Upload className="h-6 w-6 text-zinc-400 mb-2" />
            <span className="text-sm text-zinc-600">Subir documento</span>
            <span className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG (máx 10MB)</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleDocumentUpload} className="hidden" />
          </label>
        </div>
      </section>

      {/* Sección: Notas */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide border-b pb-2">Notas</h3>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Notas Generales</span>
          <textarea
            value={formState.notes || ''}
            onChange={e => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Información adicional sobre la cuenta..."
          />
        </label>
      </section>

      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white pb-2">
        <SBButton type="button" variant="secondary" onClick={() => onSubmit(formState)}>
          Cancelar
        </SBButton>
        <SBButton type="button" onClick={() => onSubmit(formState)}>
          Guardar Cambios
        </SBButton>
      </div>
    </div>
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

  const users = data?.teamMembers || [];
  const distributorRoles = (data?.partyRoles || []).filter(r => r.role === 'DISTRIBUTOR');
  const distributorOptions = distributorRoles.map(role => {
    const party = data?.accounts.find(p => p.id === role.partyId);
    return { value: role.partyId, label: party?.name || role.partyId };
  }).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={variant === 'createOrder' ? 'Nuevo Pedido de Venta' : 'Editar Cuenta'}
        maxWidth="56rem"
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
            <EditAccountForm 
              onSubmit={onSubmit} 
              defaults={defaults}
              users={users}
              distributors={distributorOptions}
            />
          )}
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
