'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { pullHoldedContactsAction, pushPartyToHoldedAction } from './actions';
import type { Party } from '@/domain/ssot';

export default function ContactsPage() {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');

  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);
        const res = await fetch('/api/contacts', { cache: 'no-store' });
        if (!res.ok) throw new Error('CONTACTS_API_FAILED');
        const { rows } = await res.json();
        setParties(rows);
      } catch (e: any) {
        setError(e.message || 'Error al cargar los contactos');
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);
  
  const list = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return parties;
    return (parties ?? []).filter(p =>
      (p.legalName || '').toLowerCase().includes(s) ||
      (p.tradeName || '').toLowerCase().includes(s) ||
      (p.vat || '').toLowerCase().includes(s) ||
      (p.email?.value || '').toLowerCase().includes(s) ||
      (p.phone?.value || '').toLowerCase().includes(s)
    );
  }, [parties, q]);

  if(loading) return <div className="p-4">Cargando contactos...</div>
  if(error) return <div className="p-4 text-red-600">Error: {error}</div>

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
              <td>{p.email?.value}</td>
              <td>{p.phone?.value}</td>
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
