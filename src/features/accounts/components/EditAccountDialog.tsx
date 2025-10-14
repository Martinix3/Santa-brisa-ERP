'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import type { Segment, CommercialFlow, Stage, PartyRoleType } from '@/domain/ssot';

type EditAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  account?: {
    id?: string;
    name: string;
    tradeName?: string;
    fiscalId?: string;
    segment: Segment;
    flow: CommercialFlow;
    stage: Stage;
    roles?: PartyRoleType[];
    email?: string;
    phone?: string;
    mobile?: string;
    addr?: {
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
  };
  onSave: (data: any) => Promise<void>;
};

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'HORECA', label: 'Horeca' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'PRIVADA', label: 'Venta Privada' },
  { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
  { value: 'ONLINE', label: 'Online' },
];

const FLOWS: { value: CommercialFlow; label: string }[] = [
  { value: 'DIRECT', label: 'Venta Directa' },
  { value: 'PLACEMENT', label: 'Colocación' },
];

const STAGES: { value: Stage; label: string }[] = [
  { value: 'POTENCIAL', label: 'Potencial' },
  { value: 'SEGUIMIENTO', label: 'En Seguimiento' },
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'CERRADA', label: 'Cerrada' },
  { value: 'FALLIDA', label: 'Fallida' },
  { value: 'BAJA', label: 'Baja' },
];

const ROLES: { value: PartyRoleType; label: string }[] = [
  { value: 'CUSTOMER', label: 'Cliente' },
  { value: 'SUPPLIER', label: 'Proveedor' },
  { value: 'DISTRIBUTOR', label: 'Distribuidor' },
  { value: 'INFLUENCER', label: 'Influencer' },
  { value: 'OTHER', label: 'Otro' },
];

export function EditAccountDialog({ open, onClose, account, onSave }: EditAccountDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<'basic' | 'address'>('basic');
  
  // Form state
  const [name, setName] = React.useState(account?.name || '');
  const [tradeName, setTradeName] = React.useState(account?.tradeName || '');
  const [fiscalId, setFiscalId] = React.useState(account?.fiscalId || '');
  const [segment, setSegment] = React.useState<Segment>(account?.segment || 'HORECA');
  const [flow, setFlow] = React.useState<CommercialFlow>(account?.flow || 'DIRECT');
  const [stage, setStage] = React.useState<Stage>(account?.stage || 'POTENCIAL');
  const [selectedRoles, setSelectedRoles] = React.useState<PartyRoleType[]>(account?.roles || ['CUSTOMER']);
  const [email, setEmail] = React.useState(account?.email || '');
  const [phone, setPhone] = React.useState(account?.phone || '');
  const [mobile, setMobile] = React.useState(account?.mobile || '');
  
  // Address state
  const [street, setStreet] = React.useState(account?.addr?.street || '');
  const [city, setCity] = React.useState(account?.addr?.city || '');
  const [province, setProvince] = React.useState(account?.addr?.province || '');
  const [postalCode, setPostalCode] = React.useState(account?.addr?.postalCode || '');
  const [country, setCountry] = React.useState(account?.addr?.country || 'España');

  // Reset form when account changes
  React.useEffect(() => {
    if (account) {
      setName(account.name || '');
      setTradeName(account.tradeName || '');
      setFiscalId(account.fiscalId || '');
      setSegment(account.segment || 'HORECA');
      setFlow(account.flow || 'DIRECT');
      setStage(account.stage || 'POTENCIAL');
      setSelectedRoles(account.roles || ['CUSTOMER']);
      setEmail(account.email || '');
      setPhone(account.phone || '');
      setMobile(account.mobile || '');
      setStreet(account.addr?.street || '');
      setCity(account.addr?.city || '');
      setProvince(account.addr?.province || '');
      setPostalCode(account.addr?.postalCode || '');
      setCountry(account.addr?.country || 'España');
    }
  }, [account]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        fiscalId: fiscalId.trim() || undefined,
        segment,
        flow,
        stage,
        roles: selectedRoles,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        mobile: mobile.trim() || undefined,
        addr: {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          province: province.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || undefined,
        },
      });
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Error al guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: PartyRoleType) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="sb-drawer__overlay" onClick={onClose} />

      {/* Drawer */}
      <aside className="sb-drawer">
        {/* Header */}
        <div className="sb-drawer__header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {account?.id ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <nav className="grid grid-cols-2 text-sm border-b border-border/30 -mx-4 px-4 mt-4">
            <button
              className={`py-3 font-medium transition-colors ${
                tab === 'basic'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('basic')}
            >
              Básico
            </button>
            <button
              className={`py-3 font-medium transition-colors ${
                tab === 'address'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('address')}
            >
              Dirección
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {tab === 'basic' ? (
            <>
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nombre <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Nombre de la cuenta"
                />
              </div>

              {/* Nombre comercial */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nombre comercial
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Nombre comercial"
                />
              </div>

              {/* NIF/CIF */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  NIF/CIF
                </label>
                <input
                  type="text"
                  value={fiscalId}
                  onChange={(e) => setFiscalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="B12345678"
                />
              </div>

              {/* Tipo (Roles) */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Este contacto es...
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        selectedRoles.includes(role.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segmento */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Segmento
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as Segment)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {SEGMENTS.map((seg) => (
                    <option key={seg.value} value={seg.value}>
                      {seg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de venta */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Tipo de venta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FLOWS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFlow(f.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        flow === f.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Estado
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {STAGES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="email@ejemplo.com"
                />
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="971 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Móvil
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="600 123 456"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Dirección
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Calle, número"
                />
              </div>

              {/* Población y Código postal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Población
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Código postal
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="07001"
                  />
                </div>
              </div>

              {/* Provincia */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Provincia
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Provincia"
                />
              </div>

              {/* País */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  País
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="España">España</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Francia">Francia</option>
                  <option value="Alemania">Alemania</option>
                  <option value="Italia">Italia</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sb-drawer__footer">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-sm font-medium hover:bg-background/60 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
