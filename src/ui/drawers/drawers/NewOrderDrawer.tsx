/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/NewOrderDrawer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Save, AlertCircle, Users, Store, ShoppingCart,
  UtensilsCrossed, Search, UserPlus, Package, X
} from 'lucide-react';
import type { OrderSellOut, OrderLine, Address, Account, Item } from '@/domain/ssot';
import { OrderSellOutRules, calculateOrderTotal } from '@/domain/ssot-v2-plus-schemas';
import { searchAccounts, searchDistributors, listOrderItems } from '@/server/actions/orders-data';
import { createAccountAndParty } from '@/server/actions/create-account.action';
import { useDebounce } from '@/hooks/useDebounce';
import { BaseDrawer } from '@/components/drawers/BaseDrawer';
import { AddressForm } from './components/AddressForm';
import { OrderLinesEditor } from './components/OrderLinesEditor';

interface NewOrderDrawerProps {
  accountId?: string;
  accountName?: string;
  onClose: () => void;
  onSave?: (order: Partial<OrderSellOut>) => Promise<void>;
}

type TabId = 'basic' | 'lines' | 'shipping' | 'summary';

const CHANNELS = [
  { value: 'PRIVATE', label: 'Privado', icon: Users },
  { value: 'DISTRIBUTOR', label: 'Distribuidor', icon: Store },
  { value: 'ONLINE', label: 'Online', icon: ShoppingCart },
  { value: 'HORECA', label: 'Horeca', icon: UtensilsCrossed },
] as const;

const FLOWS = [
  { value: 'DIRECT', label: 'Venta Directa' },
  { value: 'PLACEMENT', label: 'Placement' },
] as const;

export function NewOrderDrawer({ onClose, onSave }: NewOrderDrawerProps) {
  // Drawer V2: control de animación de salida
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<Partial<OrderSellOut>>({
    status: 'open',
    currency: 'EUR',
    channel: 'PRIVATE',
    flow: 'DIRECT',
    source: 'MANUAL',
    lines: [],
  });

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<Account[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showClientResults, setShowClientResults] = useState(false);

  const [itemOptions, setItemOptions] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [distributorSearch, setDistributorSearch] = useState('');
  const [distributorResults, setDistributorResults] = useState<Account[]>([]);
  const [distributorSearching, setDistributorSearching] = useState(false);
  const [showDistributorResults, setShowDistributorResults] = useState(false);

  // Create client modal state
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', city: '', vat: '' });
  const [creatingClient, setCreatingClient] = useState(false);

  const [billingAddress, setBillingAddress] = useState<Partial<Address>>({
    country: 'ES',
    countryCode: 'ES',
  });

  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>({
    country: 'ES',
    countryCode: 'ES',
  });

  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Persistencia de borrador (localStorage)
  const DRAFT_KEY = 'new-order-draft-v1';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.formData) setFormData(draft.formData);
        if (draft.billingAddress) setBillingAddress(draft.billingAddress);
        if (draft.shippingAddress) setShippingAddress(draft.shippingAddress);
        if (typeof draft.sameAsBilling === 'boolean') setSameAsBilling(draft.sameAsBilling);
        if (draft.activeTab) setActiveTab(draft.activeTab as TabId);
        if (draft.clientSearch) setClientSearch(draft.clientSearch);
      }
    } catch { }
  }, []);
  useEffect(() => {
    const payload = { formData, billingAddress, shippingAddress, sameAsBilling, activeTab, clientSearch };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch { }
  }, [formData, billingAddress, shippingAddress, sameAsBilling, activeTab, clientSearch]);

  // Debounced search values
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const debouncedDistributorSearch = useDebounce(distributorSearch, 300);

  // Search effects
  useEffect(() => {
    if (debouncedClientSearch.length >= 2) {
      setClientSearching(true);
      searchAccounts(debouncedClientSearch)
        .then(results => {
          setClientResults(results);
          setShowClientResults(true);
        })
        .finally(() => setClientSearching(false));
    } else {
      setClientResults([]);
      setShowClientResults(false);
    }
  }, [debouncedClientSearch]);

  // Cargar lista completa de items activos
  useEffect(() => {
    setItemsLoading(true);
    listOrderItems()
      .then(setItemOptions)
      .finally(() => setItemsLoading(false));
  }, []);

  useEffect(() => {
    if (debouncedDistributorSearch.length >= 2) {
      setDistributorSearching(true);
      searchDistributors(debouncedDistributorSearch)
        .then(results => {
          setDistributorResults(results);
          setShowDistributorResults(true);
        })
        .finally(() => setDistributorSearching(false));
    } else {
      setDistributorResults([]);
      setShowDistributorResults(false);
    }
  }, [debouncedDistributorSearch]);

  // Real-time validation
  useEffect(() => {
    const newFieldWarnings: Record<string, string> = {};

    if (!formData.accountId) {
      newFieldWarnings.accountId = 'Cliente es obligatorio';
    }
    if (!formData.customerName) {
      newFieldWarnings.customerName = 'Nombre del cliente es obligatorio';
    }
    if (!formData.lines || formData.lines.length === 0) {
      newFieldWarnings.lines = 'Debe añadir al menos una línea de pedido';
    }
    if (formData.flow === 'PLACEMENT' && !formData.distributorPartyId) {
      newFieldWarnings.distributorPartyId = 'Distribuidor es obligatorio para Placement';
    }

    setFieldWarnings(newFieldWarnings);
  }, [formData]);

  // Handlers
  const handleInputChange = (field: keyof OrderSellOut, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
      setWarnings([]);
    }
  };

  const handleSelectClient = (account: Account) => {
    setFormData(prev => ({
      ...prev,
      accountId: account.id,
      customerName: account.name,
      customerVat: account.partyId, // Usar partyId como VAT temporal
    }));
    setClientSearch(account.name);
    setShowClientResults(false);
  };

  const handleSelectDistributor = (account: Account) => {
    setFormData(prev => ({
      ...prev,
      distributorPartyId: account.partyId,
    }));
    setDistributorSearch(account.name);
    setShowDistributorResults(false);
  };

  const handleCreateClient = async () => {
    if (!newClientData.name) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    setCreatingClient(true);
    try {
      const result = await createAccountAndParty({
        name: newClientData.name,
        city: newClientData.city,
        type: 'PRIVADA',
        ownerId: 'system',
      });

      if (result.account) {
        const account = result.account.account;
        setFormData(prev => ({
          ...prev,
          accountId: account.id,
          customerName: account.name,
          customerVat: newClientData.vat,
        }));
        setClientSearch(account.name);
        setShowCreateClient(false);
        setNewClientData({ name: '', city: '', vat: '' });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error al crear el cliente');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleLinesChange = (lines: OrderLine[]) => {
    setFormData(prev => ({
      ...prev,
      lines,
      totalAmount: calculateOrderTotal(lines)
    }));
  };

  const validateForm = (): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!formData.accountId) errors.push('Cliente es obligatorio');
    if (!formData.lines || formData.lines.length === 0) errors.push('Debe añadir al menos una línea');
    if (!formData.customerName) errors.push('Nombre del cliente es obligatorio');

    if (formData.accountId && formData.lines && formData.lines.length > 0) {
      const orderForValidation = {
        ...formData,
        billingAddress: billingAddress as Address,
        shippingAddress: sameAsBilling ? billingAddress as Address : shippingAddress as Address,
      } as OrderSellOut;

      const businessValidation = OrderSellOutRules.validateAll(orderForValidation);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const handleSave = async () => {
    const validation = validateForm();
    setErrors(validation.errors);
    setWarnings(validation.warnings);

    if (!validation.valid) return;

    setLoading(true);
    try {
      const orderToSave: Partial<OrderSellOut> = {
        ...formData,
        billingAddress: billingAddress as Address,
        shippingAddress: sameAsBilling ? billingAddress as Address : shippingAddress as Address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(orderToSave);
      }
      // limpiar borrador al guardar y cerrar
      try { localStorage.removeItem(DRAFT_KEY); } catch { }
      handleClose(true);
    } catch (error) {
      console.error('Error saving order:', error);
      setErrors(['Error al guardar el pedido']);
    } finally {
      setLoading(false);
    }
  };

  // Cierre con animación
  const handleClose = (force = false) => {
    const dirty = (formData.accountId || (formData.lines && formData.lines.length > 0) || formData.customerName);
    if (!force && dirty) {
      const ok = window.confirm('Hay cambios sin guardar. ¿Cerrar el pedido de todos modos?');
      if (!ok) return;
    }
    setOpen(false);
    setTimeout(() => onClose(), 240);
  };

  // Atajo de teclado: Ctrl/Cmd + Enter = Guardar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Subtítulo con info clave
  const subtitle = [
    formData.customerName ? `Cliente: ${formData.customerName}` : null,
    formData.channel ? `Canal: ${formData.channel}` : null,
    formData.lines && formData.lines.length > 0 ? `${formData.lines.length} líneas` : null,
    formData.totalAmount && formData.totalAmount > 0 ? `Total €${formData.totalAmount.toFixed(2)}` : null,
  ].filter(Boolean).join(' • ');

  // Tabs del drawer
  const TabsEl = (
    <div className="px-3 md:px-4 flex gap-1 overflow-x-auto">
      <button
        onClick={() => setActiveTab('basic')}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
      >
        Información Básica
        {fieldWarnings.accountId && <span className="ml-1 text-destructive">⚠</span>}
      </button>
      <button
        onClick={() => setActiveTab('lines')}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'lines' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
      >
        Líneas ({formData.lines?.length || 0})
        {fieldWarnings.lines && <span className="ml-1 text-destructive">⚠</span>}
      </button>
      <button
        onClick={() => setActiveTab('shipping')}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'shipping' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
      >
        Envío
      </button>
      <button
        onClick={() => setActiveTab('summary')}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
      >
        Resumen
      </button>
    </div>
  );

  return (
    <>
      <BaseDrawer
        open={open}
        onClose={() => handleClose()}
        title={
          <span className="inline-flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Nuevo Pedido
          </span>
        }
        subtitle={subtitle}
        tabs={TabsEl}
        footer={
          <>
            <button className="sb-btn sb-btn--ghost" onClick={() => handleClose()} disabled={loading}>
              Cancelar
            </button>
            <button className="sb-btn sb-btn--primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : (<><Save size={16} /> Crear Pedido</>)}
            </button>
          </>
        }
        className="sb-drawer--wide"
        initialFocusRef={undefined}
      >
        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertCircle size={16} />
              Errores
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((error, i) => <li key={i}>• {error}</li>)}
            </ul>
          </div>
        )}

        {activeTab === 'basic' && (
          <div className="space-y-6">
            <section className="sb-card-glass-light p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={20} />
                Cliente
              </h3>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Buscar Cliente *</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className="sb-input pr-10"
                        placeholder="Nombre, CIF o email..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        onFocus={() => clientResults.length > 0 && setShowClientResults(true)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && clientResults[0]) handleSelectClient(clientResults[0]); }}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />

                      {showClientResults && clientResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {clientResults.map(account => (
                            <button
                              key={account.id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-secondary/10 transition-colors border-b border-border/30 last:border-0"
                              onClick={() => handleSelectClient(account)}
                            >
                              <div className="font-semibold">{account.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{account.segment}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {showClientResults && clientResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">Sin resultados</div>
                    )}
                    <button type="button" className="sb-btn sb-btn--secondary" onClick={() => setShowCreateClient(true)}>
                      <UserPlus size={16} />
                    </button>
                    {formData.accountId && (
                      <button type="button" className="sb-btn sb-btn--ghost" onClick={() => { setFormData(prev => ({ ...prev, accountId: undefined, customerName: undefined, customerVat: undefined })); setClientSearch(''); }}>
                        Limpiar
                      </button>
                    )}
                  </div>
                  {clientSearching && <div className="text-xs text-muted-foreground mt-1">Buscando...</div>}
                  {fieldWarnings.accountId && (
                    <div className="text-xs text-destructive mt-1">{fieldWarnings.accountId}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Canal *</label>
                    <select className="sb-input" value={formData.channel || ''} onChange={(e) => handleInputChange('channel', e.target.value)}>
                      {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Flujo</label>
                    <select className="sb-input" value={formData.flow || ''} onChange={(e) => handleInputChange('flow', e.target.value)}>
                      {FLOWS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>

                {formData.flow === 'PLACEMENT' && (
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Distribuidor *</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="sb-input pr-10"
                        placeholder="Nombre del distribuidor..."
                        value={distributorSearch}
                        onChange={(e) => setDistributorSearch(e.target.value)}
                        onFocus={() => distributorResults.length > 0 && setShowDistributorResults(true)}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      {showDistributorResults && distributorResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {distributorResults.map(account => (
                            <button
                              key={account.id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-secondary/10 transition-colors border-b border-border/30 last:border-0"
                              onClick={() => handleSelectDistributor(account)}
                            >
                              <div className="font-semibold">{account.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{account.segment}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {fieldWarnings.distributorPartyId && (
                        <div className="text-xs text-destructive mt-1">{fieldWarnings.distributorPartyId}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'lines' && (
          <OrderLinesEditor
            lines={formData.lines || []}
            onChange={handleLinesChange}
            itemOptions={itemOptions}
            itemsLoading={itemsLoading}
          />
        )}

        {activeTab === 'shipping' && (
          <AddressForm
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            sameAsBilling={sameAsBilling}
            setSameAsBilling={setSameAsBilling}
          />
        )}

        {activeTab === 'summary' && (
          <div className="sb-card-glass-light p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen del Pedido</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Cliente:</span> {formData.customerName || '—'}</div>
              <div><span className="text-muted-foreground">Canal:</span> {formData.channel}</div>
              {formData.flow === 'PLACEMENT' && <div><span className="text-muted-foreground">Distribuidor:</span> {distributorSearch || '—'}</div>}
              <div className="pt-2 border-t">
                <div className="flex justify-between"><span>Subtotal</span><span>€{(formData.lines || []).reduce((s, l) => s + l.qty * l.priceUnit, 0).toFixed(2)}</span></div>
                {formData.lines?.some(l => l.discountPct && l.discountPct > 0) && (
                  <div className="flex justify-between text-warning"><span>Descuentos</span><span>-€{(formData.lines || []).reduce((s, l) => s + (l.qty * l.priceUnit) * ((l.discountPct || 0) / 100), 0).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-semibold text-primary"><span>Total</span><span>€{formData.totalAmount?.toFixed(2) || '0.00'}</span></div>
              </div>
            </div>
          </div>
        )}
      </BaseDrawer>

      {showCreateClient && (
        <div className="sb-dialog__overlay" onClick={() => setShowCreateClient(false)}>
          <div className="sb-dialog__content" onClick={(e) => e.stopPropagation()}>
            <div className="sb-dialog">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus size={20} />
                  Crear Nuevo Cliente
                </h3>
                <button className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => setShowCreateClient(false)} disabled={creatingClient}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    className="sb-input"
                    placeholder="Nombre completo"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={creatingClient}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad</label>
                  <input
                    type="text"
                    className="sb-input"
                    placeholder="Ciudad"
                    value={newClientData.city}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={creatingClient}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CIF/VAT</label>
                  <input
                    type="text"
                    className="sb-input"
                    placeholder="CIF o VAT"
                    value={newClientData.vat}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, vat: e.target.value }))}
                    disabled={creatingClient}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <button className="sb-btn sb-btn--ghost" onClick={() => setShowCreateClient(false)} disabled={creatingClient}>
                  Cancelar
                </button>
                <button className="sb-btn sb-btn--primary" onClick={handleCreateClient} disabled={creatingClient || !newClientData.name}>
                  {creatingClient ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
