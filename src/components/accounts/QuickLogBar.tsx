"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from 'react';
import { Sparkles, Loader2, Mic } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import type { ProcessedSummary } from '@/features/quicklog/components/QuickLogConfirmation';

export function QuickLogBar({ accountId, onSaved }: { accountId?: string; onSaved?: () => void }) {
  const { currentUser, data } = useData();
  const [notes, setNotes] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [summary, setSummary] = React.useState<ProcessedSummary | null>(null);
  const aiEnabled = process.env.NEXT_PUBLIC_QUICKLOG_AI === 'true';

  const handleProcess = async () => {
    if (!notes.trim()) return;
    if (!currentUser?.id) return toast.error('Usuario no identificado');
    setProcessing(true);
    try {
      const { processQuickLogNotes } = await import('@/features/quicklog/utils/process-quicklog');
      const processed = await processQuickLogNotes(notes, currentUser.id, accountId, { userAccounts: data?.accounts || [] });
      setSummary(processed);
    } catch (e) {
      console.error('[QuickLogBar] process error', e);
      toast.error('No se pudo procesar la nota');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!summary || !currentUser?.id) return;
    try {
      const { saveQuickLogData } = await import('@/server/actions/quicklog.actions');
      const res = await saveQuickLogData(summary, currentUser.id, notes);
      if (res.success) {
        toast.success('Guardado');
        setNotes('');
        setSummary(null);
        onSaved?.();
        window.dispatchEvent(new CustomEvent('data:refresh'));
      } else {
        toast.error(res.message || 'Error guardando');
      }
    } catch (e) {
      console.error('[QuickLogBar] save error', e);
      toast.error('Error guardando');
    }
  };

  return (
    <div className="sb-card-glass-light p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-primary" />
        <span className="text-sm font-medium">Acción rápida</span>
        <span className="text-xs text-muted-foreground ml-auto">{aiEnabled ? 'IA activada' : 'Modo reglas'}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="sb-input flex-1"
          placeholder="Ej.: Visita hoy. 4 cajas Original. Instalar POS en barra."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={processing}
        />
        <button className="sb-btn sb-btn--secondary" onClick={handleProcess} disabled={!notes.trim() || processing}>
          {processing ? (<><Loader2 size={16} className="animate-spin" /> Procesando</>) : (<><Sparkles size={16} /> Procesar</>)}
        </button>
      </div>
      {summary && (
        <div className="mt-3 p-3 bg-secondary/20 border border-border/30 rounded">
          <div className="text-sm mb-2">Acciones detectadas: <strong>{summary.actions.length}</strong> · Cliente: <strong>{summary.account.name}</strong></div>
          <div className="flex gap-2">
            <button className="sb-btn sb-btn--primary" onClick={handleSave} disabled={processing}>Guardar</button>
            <button className="sb-btn sb-btn--ghost" onClick={() => setSummary(null)} disabled={processing}>Editar nota</button>
          </div>
        </div>
      )}
    </div>
  );
}

