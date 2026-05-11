'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useState } from 'react';

export function TaskQuickEditDrawer({
  taskId,
  title: initialTitle = 'Tarea',
  dueISO: initialDue,
  status: initialStatus = 'OPEN',
  onClose,
}: {
  taskId?: string;
  title?: string;
  dueISO?: string;
  status?: 'OPEN'|'DONE'|'CANCELLED';
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [dueISO, setDueISO] = useState(initialDue);
  const [status, setStatus] = useState<'OPEN'|'DONE'|'CANCELLED'>(initialStatus);

  const save = () => {
    // TODO: persistir en interactions/tasks (SSOT) – mutate + toast
    onClose();
  };

  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Editar tarea</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>

      <div className="sb-drawer__body grid gap-3">
        <div>
          <div className="text-xs opacity-70">Título</div>
          <input className="sb-input" value={title} onChange={e => setTitle(e.currentTarget.value)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs opacity-70">Fecha/Hora</div>
            <input type="datetime-local" className="sb-input" value={toLocalInput(dueISO)} onChange={e => setDueISO(fromLocalInput(e.currentTarget.value))} />
          </div>
          <div>
            <div className="text-xs opacity-70">Estado</div>
            <select className="sb-input" value={status} onChange={e => setStatus(e.currentTarget.value as any)}>
              <option value="OPEN">Abierta</option>
              <option value="DONE">Hecha</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
        </div>

        <p className="text-[11px] opacity-60">
          Cambios rápidos. Para acciones avanzadas (asignar, subtareas) usa la vista completa de la tarea.
        </p>
      </div>

      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="sb-btn sb-btn--primary" onClick={save}>Guardar</button>
      </footer>
    </aside>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n:number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local?: string) {
  if (!local) return undefined;
  // Se guarda en ISO; el backend decide TZ
  return new Date(local).toISOString();
}
