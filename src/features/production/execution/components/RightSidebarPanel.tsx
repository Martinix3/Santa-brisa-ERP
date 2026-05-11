/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/production/execution/components/RightSidebarPanel.tsx
"use client";
import React, { useTransition } from 'react';
import { SBCard, SBButton, Input, Select, Textarea } from '@/components/ui/ui-primitives';
import { AlertTriangle } from 'lucide-react';
import { addIncident } from '@/server/actions/production.actions';
import { toast } from 'sonner';

export function RightSidebarPanel({ activeForm, setFormValue, orderIsLocked }: {
  activeForm: any;
  setFormValue: (field: string, value: any) => void;
  orderIsLocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  // ✅ Generar lote automáticamente si no existe
  React.useEffect(() => {
    if (activeForm?.order && !activeForm.finalOutput?.lotNumber) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const autoLot = `LFG-${year}${month}${day}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      setFormValue('finalOutput', { ...activeForm.finalOutput, lotNumber: autoLot });
    }
  }, [activeForm?.order, activeForm?.finalOutput, setFormValue]);

  const handleAddIncident = async () => {
    if (!activeForm?.order || !activeForm.incidentText?.trim()) return;
    startTransition(async () => {
      const r = await addIncident({
        orderId: activeForm.order!.id,
        severity: activeForm.incidentSeverity || 'LOW',
        summary: activeForm.incidentText!.trim(),
      });
      if (!r.ok) {
        toast.error(r.message ?? 'Error al añadir incidencia');
        return;
      }
      const resultData = r.data as { incidentId: string };
      setFormValue('journal', [...(activeForm.journal || []), { id: `inc_${resultData.incidentId ?? Date.now()}`, at: new Date().toISOString(), kind: 'INCIDENT', summary: activeForm.incidentText!.trim() }]);
      setFormValue('incidentText', '');
      toast.success("Incidencia registrada");
    });
  };

  if (!activeForm) return null;

  return (
    <div className="space-y-4">
      <SBCard title="Control de Orden">
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Responsable <span className="text-destructive">*</span></label>
            <Input placeholder="Nombre del responsable" value={activeForm.responsibleId ?? ''} onChange={e => setFormValue('responsibleId', e.target.value)} readOnly={orderIsLocked} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Protocolos <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(activeForm.protocolChecks || [false, false, false, false]).map((v: boolean, i: number) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="checkbox" className="sb-checkbox" checked={v} onChange={() => setFormValue('protocolChecks', (activeForm.protocolChecks || [false, false, false, false]).map((c: boolean, ci: number) => i === ci ? !c : c))} disabled={orderIsLocked} />
                  Protocolo {i + 1}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cantidad Real Producida <span className="text-destructive">*</span></label>
              <Input
                type="number"
                step="0.001"
                placeholder="Cantidad final producida"
                value={activeForm.finalOutput.qty ?? ''}
                onChange={e => setFormValue('finalOutput', { ...activeForm.finalOutput, qty: Number(e.target.value) || 0 })}
                readOnly={orderIsLocked}
              />
              <p className="text-xs text-muted-foreground mt-1">💡 Cantidad real obtenida (puede diferir de la teórica)</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Lote Final <span className="text-destructive">*</span></label>
              <Input
                placeholder="Auto-generado"
                value={activeForm.finalOutput.lotNumber ?? ''}
                onChange={e => setFormValue('finalOutput', { ...activeForm.finalOutput, lotNumber: e.target.value })}
                readOnly={orderIsLocked}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">🏷️ Generado automáticamente, editable</p>
            </div>
          </div>
        </div>
      </SBCard>
      <SBCard title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span>Incidencias</span></div>}>
        <div className="p-4 space-y-3">
          <Textarea rows={3} placeholder="Descripción breve..." value={activeForm.incidentText || ''} onChange={e => setFormValue('incidentText', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending} />
          <div className="flex items-center gap-2">
            <Select value={activeForm.incidentSeverity || 'LOW'} onChange={e => setFormValue('incidentSeverity', e.target.value)} disabled={!activeForm.order || orderIsLocked || isPending}>
              <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option>
            </Select>
            <SBButton variant="destructive" onClick={handleAddIncident} disabled={!activeForm.order || orderIsLocked || isPending || !activeForm.incidentText?.trim()}><AlertTriangle size={16} /> Añadir incidencia</SBButton>
          </div>
        </div>
      </SBCard>
    </div>
  );
}
