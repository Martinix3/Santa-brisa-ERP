// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { Interaction } from '@/domain/ssot';
import { ShoppingCart, MessageSquare, Plus, X, Euro, Users, Target, BarChart3, Heart } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

type Payload = 
  | { type: 'venta'; items: { sku: string; qty: number }[] }
  | { type: 'interaccion'; note: string; nextActionDate?: string }
  | { type: 'visita_plv', note: string; nextActionDate?: string; plvInstalled: boolean; plvNotes?: string; }
  | { type: 'cobro', amount: number; notes?: string; }
  | { type: 'evento_mkt', kpis: { cost: number, attendees: number, leads: number }, notes?: string }

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
  const productOptions = useMemo(
    () => (data?.products || []).filter((p) => p.active && p.sku),
    [data?.products]
  );
  const defaultSku = productOptions.find((p) => p.sku === 'SB-750')?.sku || productOptions[0]?.sku || '';
  
  const [mode, setMode] = useState<'venta' | 'interaccion'>('interaccion');
  const [note, setNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [items, setItems] = useState<{ sku: string; qty: number }[]>([{ sku: defaultSku, qty: 1 }]);
  
  const [plvInstalled, setPlvInstalled] = useState(false);
  const [plvNotes, setPlvNotes] = useState('');

  const [amountCollected, setAmountCollected] = useState(0);

  const [eventKpis, setEventKpis] = useState({ cost: 0, attendees: 0, leads: 0 });

  useEffect(() => {
    if (open) {
      if (task.kind === 'COBRO') {
        setMode('interaccion');
      } else {
        setMode('interaccion');
      }
      setNote('');
      setNextActionDate('');
      setItems([{ sku: defaultSku, qty: 1 }]);
      setPlvInstalled(false);
      setPlvNotes('');
      setAmountCollected(0);
      setEventKpis({ cost: 0, attendees: 0, leads: 0 });
    }
  }, [open, task.kind, defaultSku]);


  const addLine = () => setItems((prev) => [...prev, { sku: defaultSku, qty: 1 }]);
  const updateLine = (index: number, field: 'sku' | 'qty', value: string | number) => {
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
    
    switch (task.kind) {
      case 'VISITA':
        if (!note) return; // Add proper validation
        payload = { type: 'visita_plv', note, nextActionDate: nextActionDate || undefined, plvInstalled, plvNotes: plvNotes || undefined };
        break;
      case 'COBRO':
        if (amountCollected <= 0) return;
        payload = { type: 'cobro', amount: amountCollected, notes: note || undefined };
        break;
      case 'EVENTO_MKT':
        payload = { type: 'evento_mkt', kpis: eventKpis, notes: note || undefined };
        break;
      default: // LLAMADA, EMAIL, WHATSAPP, OTRO
        if (mode === 'interaccion') {
            if (!note) return;
            payload = { type: 'interaccion', note, nextActionDate: nextActionDate || undefined };
        } else {
            if (items.length === 0) return;
            payload = { type: 'venta', items };
        }
    }
    if (payload) {
      onComplete(task.id, payload);
    }
  };

  const renderContentForKind = () => {
      switch (task.kind) {
          case 'VISITA':
              return (
                  <div className="space-y-3">
                      <div className="grid gap-1.5">
                          <label htmlFor="task-note" className="text-sm font-medium text-zinc-700">Nota / Resultado de la Visita</label>
                          <textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Buena reunión, le dejamos muestras..." className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" rows={3} required />
                      </div>
                       <div className="grid gap-1.5">
                          <label htmlFor="next-action-date" className="text-sm font-medium text-zinc-700">Próxima acción (opcional)</label>
                          <input id="next-action-date" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div className="pt-2">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={plvInstalled} onChange={e => setPlvInstalled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"/>
                            <span className="text-sm font-medium text-zinc-700">Se instaló/entregó PLV</span>
                        </label>
                        {plvInstalled && (
                             <textarea value={plvNotes} onChange={e => setPlvNotes(e.target.value)} placeholder="Detalles del PLV (ej: 2 vasos, 1 posavasos)" className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" rows={2}/>
                        )}
                      </div>
                  </div>
              );
          case 'COBRO':
              return (
                  <div className="space-y-3">
                     <div className="grid gap-1.5">
                        <label htmlFor="amount-collected" className="text-sm font-medium text-zinc-700">Importe Cobrado (€)</label>
                        <input id="amount-collected" type="number" value={amountCollected || ''} onChange={e => setAmountCollected(Number(e.target.value))} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required/>
                     </div>
                     <div className="grid gap-1.5">
                        <label htmlFor="payment-notes" className="text-sm font-medium text-zinc-700">Notas (opcional)</label>
                        <textarea id="payment-notes" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Pagado en efectivo, transferencia..." className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" rows={2}/>
                     </div>
                  </div>
              );
           case 'EVENTO_MKT':
              return (
                  <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                           <div className="grid gap-1.5"><label className="text-xs">Coste (€)</label><input type="number" value={eventKpis.cost || ''} onChange={e => setEventKpis(k=>({...k, cost: +e.target.value}))}/></div>
                           <div className="grid gap-1.5"><label className="text-xs">Asistentes</label><input type="number" value={eventKpis.attendees || ''} onChange={e => setEventKpis(k=>({...k, attendees: +e.target.value}))}/></div>
                           <div className="grid gap-1.5"><label className="text-xs">Leads</label><input type="number" value={eventKpis.leads || ''} onChange={e => setEventKpis(k=>({...k, leads: +e.target.value}))}/></div>
                      </div>
                      <div className="grid gap-1.5"><label className="text-sm font-medium">Notas del Evento</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3}/></div>
                  </div>
              );
          default: // Fallback for LLAMADA, EMAIL, etc.
              return (
                <div className="space-y-4">
                  <div className="flex gap-2 border-b pb-4">
                    <button type="button" onClick={() => setMode('interaccion')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'interaccion' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}><MessageSquare size={16} /> Interacción</button>
                    <button type="button" onClick={() => setMode('venta')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'venta' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}><ShoppingCart size={16} /> Venta</button>
                  </div>
                  {mode === 'interaccion' ? (
                     <div className="space-y-3 animate-in fade-in">
                       <div className="grid gap-1.5"><label htmlFor="task-note" className="text-sm font-medium text-zinc-700">Nota / Resultado</label><textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Cliente interesado, enviar propuesta." className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" rows={4} required/></div>
                       <div className="grid gap-1.5"><label htmlFor="next-action-date" className="text-sm font-medium text-zinc-700">Próxima acción (opcional)</label><input id="next-action-date" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" /></div>
                     </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in">
                      <span className="text-sm font-medium text-zinc-700">Líneas del Pedido</span>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">{items.map((item, index) => (<div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center"><select id={`sku-${index}`} value={item.sku} onChange={(e) => updateLine(index, 'sku', e.target.value)} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"><option value="" disabled>Selecciona producto</option>{productOptions.map((p) => (<option key={p.sku} value={p.sku}>{p.name}</option>))}</select><input id={`qty-${index}`} type="number" min="1" value={item.qty} onChange={(e) => updateLine(index, 'qty', parseInt(e.target.value, 10))} className="h-10 w-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" /><button type="button" aria-label="Eliminar línea" onClick={() => removeLine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><X size={16} /></button></div>))}</div>
                      <button type="button" onClick={addLine} className="text-sm flex items-center gap-1 text-blue-600 hover:underline"><Plus size={14} /> Añadir línea</button>
                    </div>
                  )}
                </div>
              );
      }
  }

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={`Resultado de: ${task.note}`}
        description="Registra qué ha pasado. Esto completará la tarea."
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        primaryAction={{ label: 'Guardar y Completar', type: 'submit' }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose }}
      >
        {renderContentForKind()}
      </SBDialogContent>
    </SBDialog>
  );
}
