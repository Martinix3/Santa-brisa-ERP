/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/MoveStageDrawer.tsx
'use client';
import React from 'react';
import type { StageKey } from '@/components/pipeline/types';

const STAGES: StageKey[] = ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'];

export function MoveStageDrawer({
  id,
  from,
  onSubmit,
  onClose,
}: {
  id: string;
  from: StageKey;
  onSubmit?: (to: StageKey) => Promise<void> | void;
  onClose: () => void;
}) {
  const [to, setTo] = React.useState<StageKey>(from);

  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Mover etapa</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      </header>
      <div className="sb-drawer__body grid gap-3">
        <div className="text-sm">
          Oportunidad: <b>{id}</b>
        </div>
        <label className="text-xs opacity-70">Etapa destino</label>
        <select
          className="sb-input"
          value={to}
          onChange={(e) => setTo(e.currentTarget.value as StageKey)}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="sb-btn sb-btn--primary"
          onClick={async () => {
            await onSubmit?.(to);
            onClose();
          }}
        >
          Mover
        </button>
      </footer>
    </aside>
  );
}
