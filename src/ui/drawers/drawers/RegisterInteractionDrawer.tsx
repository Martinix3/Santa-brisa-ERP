/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/RegisterInteractionDrawer.tsx
'use client';
import React from 'react';
import { Calendar, Clock, User, MessageSquare, Phone, Mail, MapPin, Camera } from 'lucide-react';
import { createInteraction } from '@/server/actions/sales-interactions.actions';
import { useData } from '@/lib/dataprovider';

type InteractionType = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'REUNION' | 'OTRO';

interface RegisterInteractionDrawerProps {
  accountId: string;
  accountName?: string;
  onClose: () => void;
}

export function RegisterInteractionDrawer({
  accountId,
  accountName,
  onClose,
}: RegisterInteractionDrawerProps) {
  const [mode, setMode] = React.useState<'past' | 'future'>('past');
  const [type, setType] = React.useState<InteractionType>('VISITA');
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = React.useState(new Date().toTimeString().slice(0, 5));
  const [duration, setDuration] = React.useState('30');
  const [notes, setNotes] = React.useState('');
  const [outcome, setOutcome] = React.useState('');
  const [nextAction, setNextAction] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { currentUser } = useData();

  const handleSave = async () => {
    if (!notes.trim()) {
      alert('Por favor añade notas sobre la interacción');
      return;
    }

    if (!currentUser?.id) {
      alert('Usuario no identificado');
      return;
    }

    setSaving(true);
    try {
      const result = await createInteraction({
        accountId,
        type,
        date: `${date}T${time}`,
        duration: parseInt(duration),
        notes,
        outcome: mode === 'past' ? outcome : undefined,
        nextAction,
        userId: currentUser.id,
        isPast: mode === 'past',
      });

      if (result.success) {
        alert('Interacción registrada correctamente');
        onClose();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error guardando interacción:', error);
      alert('Error al guardar la interacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <div>
          <h3 className="text-xl font-semibold">Registrar Interacción</h3>
          {accountName && (
            <p className="text-sm text-muted-foreground mt-1">{accountName}</p>
          )}
        </div>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="sb-drawer__body space-y-4">
        {/* Modo: Pasada o Futura */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Tipo de Registro</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`sb-btn ${mode === 'past' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
              onClick={() => setMode('past')}
            >
              Registrar (pasada)
            </button>
            <button
              className={`sb-btn ${mode === 'future' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
              onClick={() => setMode('future')}
            >
              Programar (futura)
            </button>
          </div>
        </div>

        {/* Tipo de Interacción */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Tipo de Interacción</label>
          <div className="grid grid-cols-2 gap-2">
            {(['VISITA', 'LLAMADA', 'EMAIL', 'REUNION', 'OTRO'] as InteractionType[]).map((t) => (
              <button
                key={t}
                className={`sb-btn ${
                  type === t ? 'sb-btn--primary' : 'sb-btn--ghost'
                }`}
                onClick={() => setType(t)}
              >
                {t === 'VISITA' && <MapPin className="w-4 h-4" />}
                {t === 'LLAMADA' && <Phone className="w-4 h-4" />}
                {t === 'EMAIL' && <Mail className="w-4 h-4" />}
                {t === 'REUNION' && <User className="w-4 h-4" />}
                {t === 'OTRO' && <MessageSquare className="w-4 h-4" />}
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Fecha y Hora</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <Calendar className="w-3 h-3 inline" /> Fecha
              </label>
              <input
                type="date"
                className="sb-input w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <Clock className="w-3 h-3 inline" /> Hora
              </label>
              <input
                type="time"
                className="sb-input w-full"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Duración (min)
              </label>
              <input
                type="number"
                className="sb-input w-full"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                step="5"
              />
            </div>
          </div>
        </div>

        {/* Notas de la Interacción */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">
            <MessageSquare className="w-4 h-4 inline" /> Notas de la Interacción *
          </label>
          <textarea
            className="sb-textarea w-full"
            rows={4}
            placeholder="¿Qué se habló? ¿Qué temas se trataron?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Resultado (solo si es pasada) */}
        {mode === 'past' && (
          <div className="sb-card-glass-light p-4 space-y-3">
            <label className="text-sm font-semibold">Resultado</label>
            <select
              className="sb-input w-full"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="POSITIVO">Positivo</option>
              <option value="NEUTRAL">Neutral</option>
              <option value="NEGATIVO">Negativo</option>
              <option value="PENDIENTE">Pendiente seguimiento</option>
            </select>
          </div>
        )}

        {/* Próxima Acción */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Próxima Acción</label>
          <textarea
            className="sb-textarea w-full"
            rows={2}
            placeholder="¿Qué hay que hacer a continuación?"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
          />
        </div>
      </div>

      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="sb-btn sb-btn--primary"
          onClick={handleSave}
          disabled={saving || !notes.trim()}
        >
          {saving ? 'Guardando...' : (mode === 'past' ? 'Guardar Interacción' : 'Programar Interacción')}
        </button>
      </footer>
    </aside>
  );
}
