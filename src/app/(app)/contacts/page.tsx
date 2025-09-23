
'use client';
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Party } from '@/domain/ssot';
import { pullHoldedContactsAction, pushPartyToHoldedAction } from './actions';

export default function ContactsPage() {
  const { data } = useData() as { data: { parties: Party[] } };
  const parties = data?.parties || [];
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (parties ?? []).filter(p =>
      (p.legalName || '').toLowerCase().includes(s) ||
      (p.tradeName || '').toLowerCase().includes(s) ||
      (p.vat || '').toLowerCase().includes(s) ||
      (p.emails ?? []).some(e => (typeof e === 'string' ? e : e.value).toLowerCase().includes(s)) ||
      (p.phones ?? []).some(t => (typeof t === 'string' ? t : t.value).toLowerCase().includes(s))
    );
  }, [parties, q]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar nombre, CIF, email o teléfono" className="w-full border rounded px-3 py-2"/>
        <form action={pullHoldedContactsAction}>
          <input type="hidden" name="since" value="" />
          <button className="border rounded px-3 py-2">Pull Holded</button>
        </form>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b"><th>Nombre</th><th>Comercial</th><th>VAT</th><th>Email</th><th>Tel</th><th>Estado</th><th>Holded</th></tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id} className="border-b hover:bg-zinc-50">
              <td>{p.legalName}</td>
              <td>{p.tradeName}</td>
              <td>{p.vat}</td>
              <td>{p.emails?.[0] && (typeof p.emails[0] === 'string' ? p.emails[0] : p.emails[0].value)}</td>
              <td>{p.phones?.[0] && (typeof p.phones[0] === 'string' ? p.phones[0] : p.phones[0].value)}</td>
              <td><span className="text-xs px-2 py-1 rounded bg-zinc-100">{p.status ?? '—'}</span></td>
              <td>
                {p.external?.holdedContactId ? (
                  <button className="text-green-700" onClick={() => pushPartyToHoldedAction(p.id)}>Actualizar</button>
                ) : (
                  <button className="text-blue-600 underline" onClick={() => pushPartyToHoldedAction(p.id)}>Vincular</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
