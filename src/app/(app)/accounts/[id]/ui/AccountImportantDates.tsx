"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useEffect, useState, useTransition } from 'react';
import { addAccountDate, getAccountDates } from '../server-actions';

export default function AccountImportantDates({ accountId }: { accountId: string }) {
  const [dates, setDates] = useState<Array<{ id: string; label: string; date: string }>>([]);
  const [label, setLabel] = useState('Cumpleaños');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getAccountDates(accountId);
        if (res.success && res.data) setDates(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

  const onAdd = () => {
    if (!date || !label.trim()) return;
    startTransition(async () => {
      const res = await addAccountDate(accountId, label.trim(), date);
      if (res.success) {
        const reload = await getAccountDates(accountId);
        if (reload.success && reload.data) setDates(reload.data);
        setLabel('Cumpleaños');
        setDate('');
      } else {
        alert(res.message || 'Error añadiendo fecha');
      }
    });
  };

  return (
    <div className="sb-card-glass-light p-4 space-y-3">
      <h3 className="font-semibold">Fechas importantes</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay fechas guardadas.</p>
      ) : (
        <ul className="space-y-2">
          {dates.map(d => (
            <li key={d.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded border border-border/30">
              <span className="font-medium text-sm">{d.label}</span>
              <span className="text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString('es-ES')}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="sb-input" placeholder="Etiqueta (p. ej., Cumpleaños)" value={label} onChange={e => setLabel(e.target.value)} />
        <input className="sb-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="sb-btn sb-btn--primary" onClick={onAdd} disabled={pending || !date || !label.trim()}>
          {pending ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>
    </div>
  );
}

