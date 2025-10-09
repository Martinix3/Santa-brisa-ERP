// src/features/accounts/components/AccountDetailPage.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import type { Account, Interaction as InteractionType, OrderSellOut, InteractionKind } from '@/domain/ssot';
import { computeAccountKPIs, accountOwnerDisplay, getDistributorForAccount } from '@/lib/sb-core';
import { 
  Phone, Mail, MapPin, Building2, Briefcase, ShoppingCart, 
  MessageSquare, Calendar, ChevronLeft, Edit2, Check, X,
  Clock, DollarSign, Package, ArrowUpRight, AlertCircle, TrendingUp, FileText
} from "lucide-react";
import Link from 'next/link';
import { toast } from 'sonner';
import { SBButton } from '@/components/ui';

const formatEUR = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const interactionIcons: Record<InteractionKind, React.ElementType> = {
  VISITA: User, LLAMADA: Phone, EMAIL: Mail, OTRO: MessageSquare,
  WHATSAPP: MessageSquare, COBRO: DollarSign, EVENTO_MKT: Calendar
};

function EditableField({ label, value, onSave, type = 'text', options, icon: Icon, multiline = false }: { 
  label: string; value: string; onSave: (newValue: string) => void;
  type?: 'text' | 'select'; options?: { value: string; label: string }[];
  icon?: React.ElementType; multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue !== value) onSave(editValue);
    setIsEditing(false);
  };

  return (
    <div className="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-50">
      {Icon && <Icon className="h-4 w-4 text-zinc-400 mt-1" />}
      <div className="flex-1">
        <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-900 flex-1">{value || '—'}</div>
            <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded">
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            {type === 'select' && options ? (
              <select value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm flex-1 px-2 py-1 border rounded" autoFocus>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            ) : multiline ? (
              <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm flex-1 px-2 py-1 border rounded" rows={3} autoFocus />
            ) : (
              <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm flex-1 px-2 py-1 border rounded" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }} />
            )}
            <button onClick={handleSave} className="p-1 hover:bg-green-100 rounded text-green-600"><Check className="h-4 w-4" /></button>
            <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-100 rounded text-red-600"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, suffix, color = 'zinc' }: {
  icon: React.ElementType; label: string; value: string | number; suffix?: string; color?: 'zinc' | 'green' | 'amber' | 'red';
}) {
  const colors = { zinc: 'bg-zinc-50 border-zinc-200', green: 'bg-green-50 border-green-200', 
    amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200' };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 opacity-60" />
        <span className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-sm opacity-75">{suffix}</span>}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: InteractionType | OrderSellOut }) {
  if ('lines' in activity) {
    const order = activity as OrderSellOut;
    return (
      <div className="flex items-start gap-3 p-3 hover:bg-zinc-50 rounded-lg">
        <div className="p-2 rounded-lg bg-green-100"><ShoppingCart className="h-4 w-4 text-green-700" /></div>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-semibold text-green-900">{formatEUR(order.totalAmount || 0)}</span>
            <span className="text-xs text-zinc-500">{formatDate(String(order.createdAt))}</span>
          </div>
          <div className="text-sm text-zinc-700">{(order.lines || []).map(l => `${l.qty} ${l.name}`).join(', ')}</div>
        </div>
      </div>
    );
  }
  const int = activity as InteractionType;
  const Icon = interactionIcons[int.kind] || MessageSquare;
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-zinc-50 rounded-lg">
      <div className="p-2 rounded-lg bg-zinc-100"><Icon className="h-4 w-4 text-zinc-700" /></div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium capitalize">{int.kind}</span>
          <span className="text-xs text-zinc-500">{formatDate(int.createdAt)}</span>
        </div>
        {int.note && <div className="text-sm text-zinc-600 italic">"{int.note}"</div>}
      </div>
    </div>
  );
}

export function AccountDetailPageContent() {
  const params = useParams();
  if (!params || !params.accountId) notFound();
  const accountId = params.accountId as string;

  const { data: santaData, saveAllCollections } = useData();

  const { account, party, unifiedActivity, kpis, owner, distributor } = useMemo(() => {
    if (!santaData || !accountId) return { account: null, party: null, unifiedActivity: [], kpis: null, owner: null, distributor: null };
    const acc = santaData.accounts.find(a => a.id === accountId);
    if (!acc) return { account: null, party: null, unifiedActivity: [], kpis: null, owner: null, distributor: null };
    const pty = santaData.parties.find(p => p.id === acc.partyId);
    const interactions = (santaData.interactions || []).filter(i => i.accountId === accountId);
    const orders = (santaData.ordersSellOut || []).filter(o => o.accountId === accountId);
    const unified = [...interactions, ...orders];
    unified.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
    const endDate = new Date();
    const startDate = new Date(); startDate.setDate(endDate.getDate() - 90);
    const kpiData = computeAccountKPIs({ data: santaData, accountId: acc.id, startIso: startDate.toISOString(), endIso: endDate.toISOString() });
    const own = accountOwnerDisplay(acc, santaData.users || [], santaData.partyRoles || []);
    const dist = getDistributorForAccount(acc, santaData.partyRoles || [], santaData.parties || []);
    return { account: acc, party: pty, unifiedActivity: unified, kpis: kpiData, owner: own, distributor: dist };
  }, [accountId, santaData]);

  const handleUpdateField = async (field: string, value: any, isPartyField = false) => {
    if (!account || !party) return;
    try {
      if (isPartyField) {
        await saveAllCollections({ parties: [{ ...party, [field]: value, updatedAt: new Date().toISOString() }] });
      } else {
        await saveAllCollections({ accounts: [{ ...account, [field]: value, updatedAt: new Date().toISOString() }] });
      }
      toast.success('Campo actualizado');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  if (!santaData) return <div className="p-6 text-center">Cargando...</div>;
  if (!account || !party || !kpis) return <div className="p-6 text-center">Cuenta no encontrada</div>;

  const mainEmail = (party.emails ?? []).find(e => e.isPrimary)?.value || '';
  const mainPhone = (party.phones ?? []).find(p => p.isPrimary)?.value || '';
  const segmentOpts = [{ value: 'HORECA', label: 'Horeca' }, { value: 'RETAIL', label: 'Retail' }, 
    { value: 'ONLINE', label: 'Online' }, { value: 'DISTRIBUIDOR', label: 'Distribuidor' }, { value: 'PRIVADA', label: 'Privada' }];
  const stageOpts = [{ value: 'POTENCIAL', label: 'Potencial' }, { value: 'ACTIVA', label: 'Activa' }, 
    { value: 'SEGUIMIENTO', label: 'Seguimiento' }, { value: 'FALLIDA', label: 'Fallida' }, { value: 'CERRADA', label: 'Cerrada' }];
  const needsAttention = (kpis.daysSinceLastOrder ?? 999) > 45 || (kpis.daysSinceLastVisit ?? 0) > 30;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4">
            <ChevronLeft className="h-4 w-4" />Volver
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-zinc-900 mb-2">{account.name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{party.billingAddress?.city || 'Sin ciudad'}</span>
                <span>•</span><span>{account.accountType}</span><span>•</span><span className="font-medium">{account.accountStage}</span>
                {distributor && <><span>•</span><span className="text-teal-700">Dist: {distributor.name}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {needsAttention && <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />Requiere atención</div>}
              <SBButton size="sm" variant="primary"><Calendar className="h-4 w-4" />Nueva Actividad</SBButton>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Rendimiento (90 días)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={Package} label="Unidades" value={kpis.unitsSold} suffix="uds" />
                <KPICard icon={ShoppingCart} label="Pedidos" value={kpis.orderCount} />
                <KPICard icon={DollarSign} label="Ticket Medio" value={formatEUR(kpis.avgTicket)} />
                <KPICard icon={Clock} label="Días s/ Pedido" value={kpis.daysSinceLastOrder ?? '—'} 
                  color={kpis.daysSinceLastOrder ? (kpis.daysSinceLastOrder > 45 ? 'red' : kpis.daysSinceLastOrder > 30 ? 'amber' : 'green') : 'zinc'} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Actividad Reciente</h2>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {unifiedActivity.slice(0, 15).map((act, i) => <ActivityItem key={i} activity={act} />)}
                {unifiedActivity.length === 0 && <div className="text-center py-8 text-zinc-500 text-sm">Sin actividad registrada</div>}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Información General */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Información General</h2>
              <div className="space-y-1">
                <EditableField label="Nombre Legal" value={party.legalName || party.name} onSave={(v) => handleUpdateField('legalName', v, true)} icon={Building2} />
                <EditableField label="Nombre Comercial" value={account.name} onSave={(v) => handleUpdateField('name', v)} icon={Briefcase} />
                <EditableField label="CIF/NIF" value={party.taxId || ''} onSave={(v) => handleUpdateField('taxId', v, true)} icon={FileText} />
                <EditableField label="Segmento" value={account.accountType} onSave={(v) => handleUpdateField('segment', v)} type="select" options={segmentOpts} icon={Briefcase} />
                <EditableField label="Estado" value={account.accountStage} onSave={(v) => handleUpdateField('stage', v)} type="select" options={stageOpts} icon={TrendingUp} />
                <EditableField label="Comercial Responsable" value={owner || ''} onSave={(v) => handleUpdateField('ownerId', v)} icon={User} />
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Contacto</h2>
              <div className="space-y-1">
                <EditableField label="Teléfono Principal" value={mainPhone} onSave={(v) => handleUpdateField('phones', [{ value: v, isPrimary: true }], true)} icon={Phone} />
                <EditableField label="Email Principal" value={mainEmail} onSave={(v) => handleUpdateField('emails', [{ value: v, isPrimary: true }], true)} icon={Mail} />
                <EditableField label="Sitio Web" value={(party as any).website || ''} onSave={(v) => handleUpdateField('website', v, true)} icon={Building2} />
                <EditableField label="Persona de Contacto" value={(party as any).contactPerson || ''} onSave={(v) => handleUpdateField('contactPerson', v, true)} icon={User} />
              </div>
            </div>

            {/* Dirección */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Dirección</h2>
              <div className="space-y-1">
                <EditableField label="Calle" value={party.billingAddress?.street || ''} onSave={(v) => handleUpdateField('billingAddress', { ...party.billingAddress, street: v }, true)} icon={MapPin} />
                <EditableField label="Ciudad" value={party.billingAddress?.city || ''} onSave={(v) => handleUpdateField('billingAddress', { ...party.billingAddress, city: v }, true)} icon={MapPin} />
                <EditableField label="Provincia" value={party.billingAddress?.province || ''} onSave={(v) => handleUpdateField('billingAddress', { ...party.billingAddress, province: v }, true)} icon={MapPin} />
                <EditableField label="Código Postal" value={party.billingAddress?.zip || ''} onSave={(v) => handleUpdateField('billingAddress', { ...party.billingAddress, zip: v }, true)} icon={MapPin} />
                <EditableField label="País" value={party.billingAddress?.country || 'España'} onSave={(v) => handleUpdateField('billingAddress', { ...party.billingAddress, country: v }, true)} icon={MapPin} />
              </div>
            </div>

            {/* Características del Local */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Características del Local</h2>
              <div className="space-y-1">
                <EditableField 
                  label="Tipo de Local" 
                  value={(account as any).localType || ''} 
                  onSave={(v) => handleUpdateField('localType', v)} 
                  type="select"
                  options={[
                    { value: '', label: 'Sin especificar' },
                    { value: 'RESTAURANTE', label: 'Restaurante' },
                    { value: 'BAR_TAPAS', label: 'Bar de Tapas' },
                    { value: 'BAR_COPAS', label: 'Bar de Copas / Nocturno' },
                    { value: 'COCTELERIA', label: 'Coctelería' },
                    { value: 'CAFETERIA', label: 'Cafetería' },
                    { value: 'GASTROBAR', label: 'Gastrobar' },
                    { value: 'TABERNA', label: 'Taberna' },
                    { value: 'TERRAZA', label: 'Terraza' },
                    { value: 'HOTEL', label: 'Hotel' },
                    { value: 'CATERING', label: 'Catering' },
                    { value: 'OTRO', label: 'Otro' }
                  ]}
                  icon={Briefcase} 
                />
                <EditableField label="Aforo Aproximado" value={String((account as any).capacity || '')} onSave={(v) => handleUpdateField('capacity', Number(v) || 0)} icon={User} />
                <EditableField label="Horario" value={(account as any).openingHours || ''} onSave={(v) => handleUpdateField('openingHours', v)} icon={Clock} />
                <EditableField label="Valoración (1-5)" value={String((account as any).rating || '')} onSave={(v) => handleUpdateField('rating', Number(v) || 0)} icon={TrendingUp} />
                <EditableField label="Google Place ID" value={(party as any).googlePlaceId || ''} onSave={(v) => handleUpdateField('googlePlaceId', v, true)} icon={MapPin} />
                <EditableField label="Tipo según Google" value={(party as any).googlePlaceType || ''} onSave={(v) => handleUpdateField('googlePlaceType', v, true)} icon={MapPin} />
              </div>
            </div>

            {/* Información Comercial */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Información Comercial</h2>
              <div className="space-y-1">
                <EditableField label="Objetivo Anual" value={String((account as any).targetAmount || '')} onSave={(v) => handleUpdateField('targetAmount', Number(v) || 0)} icon={DollarSign} />
                <EditableField label="Días de Pago" value={String((account as any).paymentTermDays || '')} onSave={(v) => handleUpdateField('paymentTermDays', Number(v) || 0)} icon={Clock} />
                <EditableField label="Límite de Crédito" value={String((account as any).creditLimit || '')} onSave={(v) => handleUpdateField('creditLimit', Number(v) || 0)} icon={DollarSign} />
                <EditableField label="Descuento %" value={String((account as any).discount || '')} onSave={(v) => handleUpdateField('discount', Number(v) || 0)} icon={TrendingUp} />
              </div>
            </div>

            {/* Notas */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Notas y Observaciones</h2>
              <div className="space-y-1">
                <EditableField label="Notas Internas" value={account.notes || ''} onSave={(v) => handleUpdateField('notes', v)} icon={FileText} multiline />
                <EditableField label="Preferencias" value={(account as any).preferences || ''} onSave={(v) => handleUpdateField('preferences', v)} icon={FileText} multiline />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
