// src/features/production/execution/components/RightSidebarPanel.tsx
"use client";
import React, { useTransition } from 'react';
import { SBCard, SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { AlertTriangle } from 'lucide-react';
import { addIncident } from '@/app/(app)/production/actions';
import { toast } from 'sonner';

export function RightSidebarPanel({ activeForm, setFormValue, orderIsLocked }: {
  activeForm: any;
  setFormValue: (field: string, value: any) => void;
  orderIsLocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAddIncident = async () => {
    if (!activeForm?.order || !activeForm.incidentText.trim()) return;
    startTransition(async () => {
      const r = await addIncident({
        orderId: activeForm.order!.id,
        severity: activeForm.incidentSeverity,
        summary: activeForm.incidentText.trim(),
      });
      if (r.ok) {
        const resultData = r.data as { incidentId: string };
        setFormValue('journal', [...(activeForm.journal || []), {id: `inc_${resultData.incidentId ?? Date.now()}`, at: new Date().toISOString(), kind:'INCIDENT', summary: activeForm.incidentText.trim()}]);
        setFormValue('incidentText', '');
        toast.success("Incidencia registrada");
      } else {
        toast.error(r.message ?? 'Error al añadir incidencia');
      }
    });
  };

  if (!activeForm) return null;

  return (
    <div className="space-y-4">
      <SBCard title="Control de orden">
        <div className="p-4 space-y-3">
          <Input placeholder="Nombre responsable" value={activeForm.responsibleId ?? ''} onChange={e=>setFormValue('responsibleId', e.target.value)} readOnly={orderIsLocked} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(activeForm.protocolChecks || [false, false, false, false]).map((v: boolean, i: number)=>(
              <label key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={v} onChange={()=> setFormValue('protocolChecks', activeForm.protocolChecks.map((c: boolean, ci: number)=> i===ci?!c:c))} disabled={orderIsLocked}/>
                Protocolos OK
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs font-medium">Producción Final (Qty)</label>
                <Input 
                  type="number"
                  value={activeForm.finalOutput.qty}
                  onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, qty: Number(e.target.value) || 0})}
                  readOnly={orderIsLocked}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Lote Final</label>
                <Input
                  placeholder="Ej. LFG-2509-01"
                  value={activeForm.finalOutput.lotNumber ?? ""}
                  onChange={e => setFormValue('finalOutput', {...activeForm.finalOutput, lotNumber: e.target.value})}
                  readOnly={orderIsLocked}
                />
              </div>
          </div>
        </div>
      </SBCard>
      <SBCard title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/><span>Incidencias</span></div>}>
        <div className="p-4 space-y-3">
          <textarea className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Descripción breve..." value={activeForm.incidentText || ''} onChange={e=>setFormValue('incidentText', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending} />
          <div className="flex items-center gap-2">
            <Select value={activeForm.incidentSeverity || 'LOW'} onChange={e=>setFormValue('incidentSeverity', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending}>
              <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option>
            </Select>
            <SBButton className="bg-amber-600 text-white" onClick={handleAddIncident} disabled={!activeForm.order || orderIsLocked || isPending || !activeForm.incidentText?.trim()}><AlertTriangle size={16}/> Añadir incidencia</SBButton>
          </div>
        </div>
      </SBCard>
    </div>
  );
}
