'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  onSave: (data: { scheduledFor: string; notes: string }) => Promise<void>;
};

export function QuickCreateVisitDialog({ open, onClose, accountId, accountName, onSave }: Props) {
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setScheduledFor(tomorrow.toISOString().slice(0, 16));
      setNotes('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!scheduledFor) return;
    
    setSaving(true);
    try {
      await onSave({ scheduledFor, notes });
      onClose();
    } catch (error) {
      console.error('Error creating visit:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="sb-card-glass-light max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Programar Visita</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary/50 flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Cliente</label>
            <div className="text-sm text-muted-foreground">{accountName}</div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Fecha y hora *
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objetivo de la visita, temas a tratar..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-secondary/50 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !scheduledFor}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Programar'}
          </button>
        </div>
      </div>
    </div>
  );
}
