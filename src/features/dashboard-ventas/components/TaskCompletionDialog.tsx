// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input, Select, Textarea, SBButton, SBDialog, SBDialogContent, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import type { Interaction, Payload, Item, SantaData, OrderLine as SsotOrderLine } from '@/domain/ssot';
import { ShoppingCart, MessageSquare, Plus, XCircle, HelpingHand } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import { completeTask } from '@/app/(app)/ops/actions'; // Correct action import

type OrderLine = {
    itemId: string;
    qty: number;
    priceUnit: number;
};

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
  const { data, currentUser } = useData();
  const [isSaving, setIsSaving] = useState(false);

  // States for each mode
  const [interactionNote, setInteractionNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([{ itemId: '', qty: 1, priceUnit: 0 }]);
  const [failedNote, setFailedNote] = useState('');
  
  const [currentMode, setCurrentMode] = useState<'interaccion' | 'venta' | 'fallido'>('interaccion');
  const memoizedState = useMemo(() => ({ interactionNote, nextActionDate, orderLines, failedNote }), [interactionNote, nextActionDate, orderLines, failedNote]);

  const itemOptions = useMemo(
    () => (data?.items || []).filter((p) => p.active && p.category === 'fg'),
    [data?.items]
  );
  
  useEffect(() => {
    if (open) {
      console.info('[Telemetry] task_dialog_opened', { variant: 'complete', taskId: task.id });
      setInteractionNote(task.note || '');
      // Keep other states as they are, to preserve inputs when switching modes
    }
  }, [open, task.id, task.note]);
  
  const handleModeChange = (mode: 'interaccion' | 'venta' | 'fallido') => {
    console.info('[Telemetry] task_complete_mode_selected', { mode });
    setCurrentMode(mode);
  };

  const addLine = () => setOrderLines((prev) => [...prev, { itemId: '', qty: 1, priceUnit: 0 }]);
  const updateLine = (index: number, field: keyof OrderLine, value: any) => {
    setOrderLines((prev) => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  };
  const removeLine = (index: number) => setOrderLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    console.info('[Telemetry] task_complete_submitted', { withFollowup: !!nextActionDate });
    let payload: Payload | null = null;
    let validationError: string | null = null;

    if (currentMode === 'interaccion') {
        if (!interactionNote) validationError = "La nota de la interacción es obligatoria.";
        else payload = { type: 'interaccion', note: interactionNote, nextActionDate: nextActionDate || undefined };
    } else if (currentMode === 'venta') {
        if (orderLines.length === 0 || orderLines.some(it => !it.itemId || it.qty <= 0)) validationError = "Revisa las líneas del pedido.";
        else payload = { type: 'venta', items: orderLines.map(l => ({...l, uom: 'unit' as const})) as SsotOrderLine[] };
    } else if (currentMode === 'fallido') {
        if (!failedNote) validationError = "Es obligatorio indicar el motivo del fallo.";
        else payload = { type: 'interaccion', note: `FALLIDA: ${failedNote}` };
    }

    if (validationError) {
      console.error('[Telemetry] task_validation_error', { mode: currentMode, error: validationError });
      onError?.(validationError);
      return;
    }
    
    if (!payload) return;
    
    setIsSaving(true);
    try {
      const result = await completeTask(task.id, payload);
      if (result.ok) onSuccess(result);
      else throw new Error('Server action failed');
    } catch (error: any) {
      onError?.(error.message || 'Error desconocido al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={`Resultado de: ${task.note}`}
        description="Registra qué ha pasado. Esto completará la tarea."
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        primaryAction={{ label: isSaving ? 'Guardando...' : 'Guardar y Completar', type: 'submit', disabled: isSaving }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose, disabled: isSaving }}
      >
        <div className="space-y-4 pt-2">
            <Tabs value={currentMode} onValueChange={(v) => handleModeChange(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="interaccion"><MessageSquare size={14} className="mr-1.5"/> Interacción</TabsTrigger>
                <TabsTrigger value="venta"><ShoppingCart size={14} className="mr-1.5"/>Venta</TabsTrigger>
                <TabsTrigger value="fallido"><XCircle size={14} className="mr-1.5"/>Fallida</TabsTrigger>
              </TabsList>
              
              <TabsContent value="interaccion" className="pt-2 space-y-3">
                 <div className="grid gap-1.5">
                     <label htmlFor="task-note">Nota / Resultado</label>
                     <Textarea id="task-note" value={interactionNote} onChange={(e) => setInteractionNote(e.target.value)} required rows={3}/>
                 </div>
                 <div className="grid gap-1.5">
                     <label htmlFor="next-action-date">Programar próxima acción (opcional)</label>
                     <Input id="next-action-date" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
                 </div>
              </TabsContent>
              
              <TabsContent value="venta" className="pt-2 space-y-3">
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {orderLines.map((line, index) => (
                         <div key={index} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                             <Select value={line.itemId} onChange={(e) => updateLine(index, 'itemId', e.target.value)}><option value="" disabled>Selecciona...</option>{itemOptions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</Select>
                             <Input type="number" min="1" value={line.qty} onChange={(e) => updateLine(index, 'qty', parseInt(e.target.value))} className="w-20" />
                             <Input type="number" step="0.01" value={line.priceUnit} onChange={(e) => updateLine(index, 'priceUnit', parseFloat(e.target.value))} className="w-24" placeholder="Precio" />
                             <SBButton type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}><XCircle size={16} /></SBButton>
                         </div>
                     ))}
                 </div>
                 <SBButton type="button" variant="secondary" size="sm" onClick={addLine}><Plus size={14} className="mr-2"/>Añadir línea</SBButton>
              </TabsContent>
              
              <TabsContent value="fallido" className="pt-2 space-y-3">
                  <div className="grid gap-1.5">
                     <label htmlFor="failed-note">Motivo del fallo (obligatorio)</label>
                     <Textarea id="failed-note" value={failedNote} onChange={(e) => setFailedNote(e.target.value)} placeholder="Ej: No interesado en el precio, ya trabaja con otra marca..." required rows={3}/>
                 </div>
              </TabsContent>
            </Tabs>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
