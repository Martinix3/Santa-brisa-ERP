/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/RegisterEventDrawer.tsx
'use client';
import React from 'react';
import { Calendar, Clock, MapPin, Users, Tag, FileText } from 'lucide-react';
import { createMarketingEvent } from '@/server/actions/sales-interactions.actions';
import { useData } from '@/lib/dataprovider';

type EventType = 'DEGUSTACION' | 'FORMACION' | 'FERIA' | 'PRESENTACION' | 'OTRO';

interface RegisterEventDrawerProps {
  accountId: string;
  accountName?: string;
  onClose: () => void;
}

export function RegisterEventDrawer({
  accountId,
  accountName,
  onClose,
}: RegisterEventDrawerProps) {
  const [eventType, setEventType] = React.useState<EventType>('DEGUSTACION');
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = React.useState('10:00');
  const [endTime, setEndTime] = React.useState('12:00');
  const [location, setLocation] = React.useState('');
  const [attendees, setAttendees] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [products, setProducts] = React.useState('');
  const [budget, setBudget] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { currentUser } = useData();

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Por favor añade un título para el evento');
      return;
    }

    if (!currentUser?.id) {
      alert('Usuario no identificado');
      return;
    }

    setSaving(true);
    try {
      const result = await createMarketingEvent({
        accountId,
        eventType,
        title,
        description,
        date,
        startTime,
        endTime,
        location,
        attendees: attendees ? parseInt(attendees) : undefined,
        products,
        budget: budget ? parseFloat(budget) : undefined,
        notes,
        userId: currentUser.id,
      });

      if (result.success) {
        alert('Evento registrado correctamente');
        onClose();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error registrando evento:', error);
      alert('Error al registrar el evento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <div>
          <h3 className="text-xl font-semibold">Registrar Evento</h3>
          {accountName && (
            <p className="text-sm text-muted-foreground mt-1">{accountName}</p>
          )}
        </div>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="sb-drawer__body space-y-4">
        {/* Tipo de Evento */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Tipo de Evento</label>
          <div className="grid grid-cols-2 gap-2">
            {(['DEGUSTACION', 'FORMACION', 'FERIA', 'PRESENTACION', 'OTRO'] as EventType[]).map((t) => (
              <button
                key={t}
                className={`sb-btn ${eventType === t ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
                onClick={() => setEventType(t)}
              >
                <Tag className="w-4 h-4" />
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Información Básica */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Información del Evento</label>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Título del Evento *
            </label>
            <input
              type="text"
              className="sb-input w-full"
              placeholder="Ej: Degustación Productos Premium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              <FileText className="w-3 h-3 inline" /> Descripción
            </label>
            <textarea
              className="sb-textarea w-full"
              rows={2}
              placeholder="Breve descripción del evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Fecha y Horario</label>
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
                <Clock className="w-3 h-3 inline" /> Inicio
              </label>
              <input
                type="time"
                className="sb-input w-full"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <Clock className="w-3 h-3 inline" /> Fin
              </label>
              <input
                type="time"
                className="sb-input w-full"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Ubicación y Asistentes */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Ubicación y Asistentes</label>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              <MapPin className="w-3 h-3 inline" /> Ubicación
            </label>
            <input
              type="text"
              className="sb-input w-full"
              placeholder="Dirección o lugar del evento"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              <Users className="w-3 h-3 inline" /> Nº Asistentes Estimados
            </label>
            <input
              type="number"
              className="sb-input w-full"
              placeholder="0"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Productos y Presupuesto */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Productos y Presupuesto</label>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Productos a Presentar
            </label>
            <textarea
              className="sb-textarea w-full"
              rows={2}
              placeholder="Lista de productos que se presentarán..."
              value={products}
              onChange={(e) => setProducts(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Presupuesto Estimado (€)
            </label>
            <input
              type="number"
              className="sb-input w-full"
              placeholder="0.00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Notas Adicionales */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Notas Adicionales</label>
          <textarea
            className="sb-textarea w-full"
            rows={3}
            placeholder="Observaciones, requisitos especiales, material necesario..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          disabled={saving || !title.trim()}
        >
          {saving ? 'Guardando...' : 'Registrar Evento'}
        </button>
      </footer>
    </aside>
  );
}
