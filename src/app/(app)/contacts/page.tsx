'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Party, PartyRole } from '@/domain/ssot';
import { pullHoldedContactsAction, pushPartyToHoldedAction } from './actions';
import { Mail, Phone, Link as LinkIcon, RefreshCw, Menu, Filter } from 'lucide-react';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';

type RoleKey = PartyRole['role'] | 'CUSTOMER' | 'SUPPLIER' | 'OTHER';
type StatusKey = NonNullable<Party['status']>;

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Proveedor',
  OTHER: 'Otro',
};
const STATUS_LABEL: Record<StatusKey, string> = {
  PROVISIONAL: 'Provisional',
  ENRIQUECIDO: 'Enriquecido',
  VINCULADO: 'Vinculado',
  CONFIABLE: 'Confiable',
};

function getPrimaryEmail(p: Party): string | undefined {
  const e = (p.emails ?? []).find(e => (e as any)?.isPrimary)?.value
    ?? (p.emails ?? [])[0]?.value;
  const legacy = (p.contacts ?? []).find(c => c.isPrimary && c.type === 'email')?.value
    ?? (p.contacts ?? []).find(c => c.type === 'email')?.value;
  return e || legacy;
}
function getPrimaryPhone(p: Party): string | undefined {
  const t = (p.phones ?? []).find(t => (t as any)?.isPrimary)?.value
    ?? (p.phones ?? [])[0]?.value;
  const legacy = (p.contacts ?? []).find(c => c.isPrimary && c.type === 'phone')?.value
    ?? (p.contacts ?? []).find(c => c.type === 'phone')?.value;
  return t || legacy;
}
function getCity(p: Party): string | undefined {
  const addr = (p.addresses ?? [])[0] as any;
  return addr?.city ?? p.billingAddress?.city ?? p.shippingAddress?.city ?? undefined;
}

export default function ContactsPage() {
  const data = useData<{ parties: Party[]; partyRoles?: PartyRole[] }>();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [city, setCity] = useState<string>('ALL');
  const [isPending, start] = useTransition();

  const parties: Party[] = data?.parties ?? [];

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of parties) {
      const c = getCity(p);
      if (c) set.add(c);
      if (set.size > 200) break;
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [parties]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return parties.filter(p => {
      if (role !== 'ALL' && !(p.roles ?? []).includes(role as RoleKey)) return false;
      if (status !== 'ALL' && p.status !== (status as StatusKey)) return false;
      if (city !== 'ALL' && (getCity(p) ?? '') !== city) return false;

      if (!s) return true;
      const haystack = [
        p.legalName, p.tradeName, p.vat, getCity(p),
        getPrimaryEmail(p), getPrimaryPhone(p),
      ].filter(Boolean).join(' ').toLowerCase();

      const legacy = (p.contacts ?? []).some(c => c.value?.toLowerCase?.().includes(s));
      return haystack.includes(s) || legacy;
    });
  }, [parties, q, role, status, city]);

  const onPull = (since?: string) =>
    start(async () => {
      const fd = new FormData();
      if (since) fd.set('since', since);
      await pullHoldedContactsAction(fd);
    });

  const onSync = (id: string) =>
    start(async () => {
      await pushPartyToHoldedAction(id);
    });

  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Contactos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Buscar nombre, ciudad, VAT..."
              className="pl-9"
            />
            <Filter size={16} className="absolute left-3 top-2.5 text-zinc-400" />
          </div>
          <Select value={role} onChange={e=>setRole(e.target.value)}>
            <option value="ALL">Todos los roles</option>
            <option value="CUSTOMER">Cliente</option>
            <option value="SUPPLIER">Proveedor</option>
            <option value="OTHER">Otro</option>
          </Select>
          <Select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="ALL">Todos los estados</option>
            <option value="PROVISIONAL">Provisional</option>
            <option value="ENRIQUECIDO">Enriquecido</option>
            <option value="VINCULADO">Vinculado</option>
            <option value="CONFIABLE">Confiable</option>
          </Select>
          <Select value={city} onChange={e=>setCity(e.target.value)}>
            <option value="ALL">Todas las ciudades</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <SBButton
            variant="secondary"
            disabled={isPending}
            onClick={()=>onPull()}
            title="Pull contactos desde Holded"
          >
            <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} /> Pull Holded
          </SBButton>
          <SBButton as="a" href="/contacts/merge" variant="secondary">Fusiones</SBButton>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Comercial</th>
              <th className="px-3 py-2">VAT</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Holded</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => {
              const email = getPrimaryEmail(p);
              const phone = getPrimaryPhone(p);
              const cty = getCity(p);
              return (
                <tr key={p.id} className="border-t hover:bg-zinc-50">
                  <td className="px-3 py-2 font-medium">{p.legalName || p.name}</td>
                  <td className="px-3 py-2">{p.tradeName || '—'}</td>
                  <td className="px-3 py-2">{p.vat || p.taxId || '—'}</td>
                  <td className="px-3 py-2">{cty || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {email && <span className="inline-flex items-center gap-1 text-zinc-700"><Mail size={14}/>{email}</span>}
                      {phone && <span className="inline-flex items-center gap-1 text-zinc-700"><Phone size={14}/>{phone}</span>}
                      {!email && !phone && <span className="text-zinc-400">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(p.roles ?? []).map(r => (
                        <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100">
                          {ROLE_LABEL[r] ?? r}
                        </span>
                      ))}
                      {p.status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                          {STATUS_LABEL[p.status]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {p.external?.holdedContactId ? (
                      <button
                        disabled={isPending}
                        onClick={()=>onSync(p.id)}
                        className="inline-flex items-center gap-1 text-emerald-700"
                        title="Actualizar en Holded"
                      >
                        <LinkIcon size={14}/> vinculado
                      </button>
                    ) : (
                      <button
                        disabled={isPending}
                        onClick={()=>onSync(p.id)}
                        className="text-blue-600 underline"
                      >
                        Vincular
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="p-1 rounded hover:bg-zinc-100" title="Más acciones">
                      <Menu size={16}/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-zinc-500">
                  Sin resultados. Ajusta filtros o haz Pull de Holded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-500">
        {list.length} resultados · {parties.length} contactos totales
      </div>
    </div>
  );
}
