
// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { Input, Select, Textarea, SBButton, SBDialog, SBDialogContent } from '@/components/ui';
import type { Interaction, Payload, Item, SantaData } from '@/domain/ssot';
import { ShoppingCart, MessageSquare, Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import { completeTask } from '@/app/(app)/ops/actions'; // Importar la acción correcta

export function TaskCompletionDialog({
  task,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  task: Interaction;
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onError?: (message: string) => void;
}) {
  const { data, currentUser, saveAllCollections } = useData();
  const [isSaving, setIsSaving] = useState(false);

  const itemOptions = React.useMemo(
    () => (data?.items || []).filter((p) => p.active && p.category === 'fg'),
    [data?.items]
  );
  const defaultItemId = itemOptions.find((p) => p.sku === 'SB-750')?.id || itemOptions[0]?.id || '';
  
  const [mode, setMode] = useState<'venta' | 'interaccion'>('interaccion');
  const [note, setNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [items, setItems] = useState<{ itemId: string; qty: number }[]>([{ itemId: defaultItemId, qty: 1 }]);

  useEffect(() => {
    if (open) {
      setMode('interaccion');
      setNote(task.note || ''); // Pre-fill with task note
      setNextActionDate('');
      setItems([{ itemId: defaultItemId, qty: 1 }]);
      setIsSaving(false);
    }
  }, [open, task.note, defaultItemId]);

  const addLine = () => setItems((prev) => [...prev, { itemId: defaultItemId, qty: 1 }]);
  const updateLine = (index: number, field: 'itemId' | 'qty', value: string | number) => {
    const newItems = [...items];
    if (field === 'qty') {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      newItems[index][field] = Number.isFinite(n) && n > 0 ? n : 1;
    } else {
      newItems[index][field] = value as string;
    }
    setItems(newItems);
  };
  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!data || !currentUser) {
        onError?.("No se pudo obtener la información del usuario o los datos de la aplicación.");
        return;
    }

    let payload: Payload | null = null;
    if (mode === 'interaccion') {
        if (!note) { onError?.("La nota de la interacción es obligatoria."); return; }
        payload = { type: 'interaccion', note, nextActionDate: nextActionDate || undefined };
    } else {
        if (items.length === 0 || items.some(it => !it.itemId || it.qty <=0)) { onError?.("Revisa las líneas del pedido."); return; }
        payload = { type: 'venta', items };
    }
    if (!payload) return;

    setIsSaving(true);
    try {
        // We only need to pass the ID to the server action
        const result = await completeTask(task.id, payload);
        if (result.ok) {
            onSuccess(result);
        } else {
            throw new Error('Server action failed');
        }

    } catch (error: any) {
        onError?.(error.message || 'Error desconocido al guardar.');
    } finally {
        setIsSaving(false);
    }
  };
  
  const renderContent = () => {
      return (
        <div className="space-y-4">
          <div className="flex gap-2 border-b pb-4">
            <SBButton type="button" variant={mode === 'interaccion' ? 'primary' : 'secondary'} onClick={() => setMode('interaccion')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors`}><MessageSquare size={16} /> Registrar Interacción</SBButton>
            <SBButton type="button" variant={mode === 'venta' ? 'primary' : 'secondary'} onClick={() => setMode('venta')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors`}><ShoppingCart size={16} /> Crear Venta</SBButton>
          </div>

          {mode === 'interaccion' ? (
             <div className="space-y-3 animate-in fade-in">
               <div className="grid gap-1.5"><label htmlFor="task-note" className="text-sm font-medium text-zinc-700">Nota / Resultado</label><Textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Cliente interesado, enviar propuesta." className="w-full" rows={4} required/></div>
               <div className="grid gap-1.5"><label htmlFor="next-action-date" className="text-sm font-medium text-zinc-700">Próxima acción (opcional)</label><Input id="next-action-date" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="w-full" /></div>
             </div>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <span className="text-sm font-medium text-zinc-700">Líneas del Pedido</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">{items.map((item, index) => (<div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center"><Select id={`item-${index}`} value={item.itemId} onChange={(e) => updateLine(index, 'itemId', e.target.value)}><option value="" disabled>Selecciona producto</option>{itemOptions.map((p: Item) => (<option key={p.id} value={p.id}>{p.name}</option>))}</Select><Input id={`qty-${index}`} type="number" min="1" value={item.qty} onChange={(e) => updateLine(index, 'qty', e.target.value)} className="w-20" /><SBButton type="button" variant="ghost" onClick={() => removeLine(index)}><X size={16} /></SBButton></div>))}</div>
              <SBButton type="button" variant="secondary" size="sm" onClick={addLine}><Plus size={14} className="mr-2"/>Añadir línea</SBButton>
            </div>
          )}
        </div>
      );
  }

  return (
    <>
      <SBDialog open={open} onOpenChange={onClose}>
        <SBDialogContent
          title={`Resultado de: ${task.note}`}
          description="Registra qué ha pasado. Esto completará la tarea."
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleSubmit(); }}
          primaryAction={{ label: isSaving ? 'Guardando...' : 'Guardar y Completar', type: 'submit', disabled: isSaving }}
          secondaryAction={{ label: 'Cancelar', onClick: onClose, disabled: isSaving }}
        >
          {renderContent()}
        </SBDialogContent>
      </SBDialog>
    </>
  );
}
