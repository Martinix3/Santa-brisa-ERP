// FILE: src/features/ops/components/CreateTaskModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import type { Department, TaskKind, Account } from '@/domain/ssot';
import { SBDialog, SBDialogContent, SBButton, Input, Select, Textarea, Field } from '@/components/ui';

export function CreateTaskModal({ open, onClose, onCreate, accounts }: { 
    open: boolean; 
    onClose: () => void; 
    onCreate: (payload: any) => void;
    accounts: Account[];
}) {
  const [accountId, setAccountId] = useState('');
  const [dept, setDept] = useState<Department>('VENTAS');
  const [kind, setKind] = useState<TaskKind>('VISITA');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [durationMin, setDurationMin] = useState<number>(45);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if(open) {
        // Reset state when opening
        setAccountId('');
        setDept('VENTAS');
        setKind('VISITA');
        setTitle('');
        setDate('');
        setTime('');
        setDurationMin(45);
        setNotes('');
    }
  }, [open]);

  const handleCreate = ()=>{
    const when = date && time ? new Date(`${date}T${time}:00`).toISOString() : undefined;
    onCreate({ 
        accountId, 
        dept, 
        kind: kind,
        note: title || `${kind} para ${accounts.find(a => a.id === accountId)?.name}`,
        plannedFor: when, 
    });
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent title="Crear nueva tarea">
        <div className="sb-dialog__body space-y-4">
            <Field name="accountId" label="Cuenta (opcional)">
                <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">-- Sin cuenta asociada --</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field name="dept" label="Departamento">
                    <Select value={dept} onChange={e=>setDept(e.target.value as Department)}>
                        <option>VENTAS</option><option>MARKETING</option><option>CALIDAD</option><option>FINANZAS</option><option>PRODUCCION</option><option>ALMACEN</option><option>PERSONAL</option>
                    </Select>
                </Field>
                <Field name="kind" label="Tipo de Tarea">
                    <Select value={kind} onChange={e=>setKind(e.target.value as TaskKind)}>
                        <option value="VISITA">Visita</option>
                        <option value="NOTA">Nota</option>
                        <option value="PEDIDO">Pedido</option>
                        <option value="POS_EVT">Evento POS</option>
                        <option value="POS_PLV">Material PLV</option>
                    </Select>
                </Field>
            </div>
            <Field name="title" label="Título / Resumen">
                <Input placeholder="Título de la tarea" value={title} onChange={e=>setTitle(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field name="date" label="Fecha (opcional)">
                    <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
                </Field>
                <Field name="time" label="Hora (opcional)">
                    <Input type="time" value={time} onChange={e=>setTime(e.target.value)} />
                </Field>
            </div>
        </div>
        <div className="sb-dialog__footer">
          <SBButton variant="ghost" onClick={onClose}>Cancelar</SBButton>
          <SBButton variant="primary" onClick={handleCreate}>Crear Tarea</SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}