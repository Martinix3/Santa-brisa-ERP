// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { Interaction, InteractionKind, Payload, Item } from '@/domain/ssot';
import { ShoppingCart, MessageSquare, Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

export function TaskCompletionDialog({
  task,
  open,
  onClose,
  onComplete,
}: {
  task: Interaction;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string, payload: Payload) => void;
}) {
  const { data } = useData();

  const itemOptions = useMemo(
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
      setNote('');
      setNextActionDate('');
      setItems([{ itemId: defaultItemId, qty: 1 }]);
    }
  }, [open, defaultItemId]);

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

  const handleSubmit = () => {
    let payload: Payload | null = null;
    
    if (mode === 'interaccion') {
        if (!note) return alert("La nota de la interacción es obligatoria.");
        payload = { type: 'interaccion', note, nextActionDate: nextActionDate || undefined };
    } else {
        if (items.length === 0 || items.some(it => !it.itemId || it.qty <=0)) return alert("Revisa las líneas del pedido.");
        payload = { type: 'venta', items };
    }
    
    if (payload) {
      onComplete(task.id, payload);
    }
  };

  const renderContent = () => {
      return (
        <div className="space-y-4">
          <div className="flex gap-2 border-b pb-4">
            <button type="button" onClick={() => setMode('interaccion')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'interaccion' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}><MessageSquare size={16} /> Registrar Interacción</button>
            <button type="button" onClick={() => setMode('venta')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'venta' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}><ShoppingCart size={16} /> Crear Venta</button>
          </div>

          {mode === 'interaccion' ? (
             <div className="space-y-3 animate-in fade-in">
               <div className="grid gap-1.5"><label htmlFor="task-note" className="text-sm font-medium text-zinc-700">Nota / Resultado</label><Textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Cliente interesado, enviar propuesta." className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" rows={4} required/></div>
               <div className="grid gap-1.5"><label htmlFor="next-action-date" className="text-sm font-medium text-zinc-700">Próxima acción (opcional)</label><Input id="next-action-date" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" /></div>
             </div>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <span className="text-sm font-medium text-zinc-700">Líneas del Pedido</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">{items.map((item, index) => (<div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center"><Select id={`item-${index}`} value={item.itemId} onChange={(e) => updateLine(index, 'itemId', e.target.value)}><option value="" disabled>Selecciona producto</option>{itemOptions.map((p: Item) => (<option key={p.id} value={p.id}>{p.name}</option>))}</Select><Input id={`qty-${index}`} type="number" min="1" value={item.qty} onChange={(e) => updateLine(index, 'qty', parseInt(e.target.value, 10))} className="w-20" /><button type="button" aria-label="Eliminar línea" onClick={() => removeLine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><X size={16} /></button></div>))}</div>
              <button type="button" onClick={addLine} className="text-sm flex items-center gap-1 text-blue-600 hover:underline"><Plus size={14} /> Añadir línea</button>
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
          primaryAction={{ label: 'Guardar y Completar', type: 'submit' }}
          secondaryAction={{ label: 'Cancelar', onClick: onClose }}
        >
          {renderContent()}
        </SBDialogContent>
      </SBDialog>
    </>
  );
}
