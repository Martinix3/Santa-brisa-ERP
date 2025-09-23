'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Filter, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { PullButton } from './PullButton';
import { pullHoldedContactsAction } from './actions';

type Row = {
  id: string;
  legalName: string;
  tradeName?: string;
  vat?: string;
  city?: string;
  email?: string;
  phone?: string;
  roles: string[];
  holded?: boolean;
  updatedAt?: string;
};

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Proveedor',
  OTHER: 'Otro',
};

const ROLE_STYLE: Record<string, string> = {
  CUSTOMER: 'bg-amber-50 text-amber-800 border border-amber-200',
  SUPPLIER: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
  OTHER: 'bg-zinc-50 text-zinc-700 border border-zinc-200',
};

export default function ContactsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'ALL'|'CUSTOMER'|'SUPPLIER'|'OTHER'>('ALL');
  const [city, setCity] = useState<'ALL'|string>('ALL');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch('/api/contacts', { cache: 'no-store' });
      const json = await res.json();
      if (mounted && json?.ok) setRows(json.rows || []);
    })();
    return () => { mounted = false; };
  }, []);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.city) set.add(r.city);
    return ['ALL', ...Array.from(set).sort((a,b)=>a.localeCompare(b,'es'))] as const;
  }, [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r => {
      if (role !== 'ALL' && !r.roles.includes(role)) return false;
      if (city !== 'ALL' && (r.city ?? '') !== city) return false;
      if (!s) return true;
      const hay = [r.legalName, r.tradeName, r.vat, r.city, r.email, r.phone]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, role, city]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-[#FFF8E6] p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#9E4E27]">Contactos</h1>
          <p className="text-sm text-[#9E4E27]/80">Clientes, proveedores y otros — sincronizados con Holded</p>
        </div>
        <PullButton action={pullHoldedContactsAction}/>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Buscar nombre, ciudad, VAT, email o teléfono…"
              className="w-full border rounded-lg px-3 py-2 pl-9"
            />
            <Filter size={16} className="absolute left-3 top-2.5 text-zinc-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={role}
                onChange={(e)=>setRole(e.target.value as any)}
                className="appearance-none border rounded-lg px-3 py-2 pr-8"
                title="Rol"
              >
                <option value="ALL">Todos</option>
                <option value="CUSTOMER">Clientes</option>
                <option value="SUPPLIER">Proveedores</option>
                <option value="OTHER">Otros</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-zinc-400" />
            </div>
            <div className="relative">
              <select
                value={city}
                onChange={(e)=>setCity(e.target.value as any)}
                className="appearance-none border rounded-lg px-3 py-2 pr-8"
                title="Ciudad"
              >
                {cityOptions.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Todas las ciudades' : c}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-zinc-400" />
            </div>
          </div>
        </div>
        <a href="/contacts/merge" className="border rounded-lg px-3 py-2 hover:bg-zinc-50">Fusiones</a>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.tradeName || r.legalName}</div>
                  {r.tradeName && <div className="text-xs text-zinc-500">{r.legalName}</div>}
                  {r.vat && <div className="text-[11px] text-zinc-400 mt-0.5">VAT: {r.vat}</div>}
                </td>
                <td className="px-3 py-2">{r.city || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {r.email ? <span className="inline-flex items-center gap-1 text-zinc-700"><Mail size={14}/>{r.email}</span> : null}
                    {r.phone ? <span className="inline-flex items-center gap-1 text-zinc-700"><Phone size={14}/>{r.phone}</span> : null}
                    {!r.email && !r.phone && <span className="text-zinc-400">—</span>}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.roles ?? []).map((x) => (
                      <span key={x} className={`text-xs px-2 py-0.5 rounded-full ${ROLE_STYLE[x] ?? ROLE_STYLE.OTHER}`}>
                        {ROLE_LABEL[x] ?? x}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.holded ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700"><LinkIcon size={14}/> Holded</span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <a href={`/contacts/${r.id}`} className="text-blue-600 underline">Ver</a>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-zinc-500">Sin resultados. Ajusta filtros o haz Pull desde Holded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-500">{list.length} resultados · {rows.length} contactos totales</div>
    </div>
  );
}