'use client';
import React, { useState, useEffect } from 'react';
import type { Department, TaskKind, Account } from '@/domain/ssot';

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

  if (!open) return null;

  const handleCreate = ()=>{
    const when = date && time ? new Date(`${date}T${time}:00`).toISOString() : undefined;
    onCreate({ 
        accountId, 
        dept, 
        uiKind: kind, // Mapeamos a uiKind para Interaction
        title: title || `${kind} para ${accounts.find(a => a.id === accountId)?.name}`,
        note: notes,
        plannedFor: when, 
        startAt: when,
        durationMin 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}>
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 space-y-3" onClick={(e)=>e.stopPropagation()}>
        <div className="font-semibold text-lg">Crear tarea</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm col-span-2">Cuenta
            <select className="w-full border rounded-lg p-2" value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">-- Sin cuenta --</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Departamento
            <select className="w-full border rounded-lg p-2" value={dept} onChange={e=>setDept(e.target.value as Department)}>
              <option>VENTAS</option><option>MARKETING</option><option>CALIDAD</option><option>FINANZAS</option><option>PRODUCCION</option><option>ALMACEN</option><option>PERSONAL</option>
            </select>
          </label>
          <label className="text-sm">Tipo
            <select className="w-full border rounded-lg p-2" value={kind} onChange={e=>setKind(e.target.value as TaskKind)}>
              <option value="VISITA">Visita</option><option value="LLAMADA">Llamada</option><option value="PEDIDO">Pedido</option><option value="MKT">Evento MKT</option><option value="QC">Control calidad</option><option value="FIN">Finanzas</option><option value="OTRO">Otro</option>
            </select>
          </label>
          <label className="text-sm col-span-2">Título / Resumen
            <input className="w-full border rounded-lg p-2" placeholder="Título de la tarea" value={title} onChange={e=>setTitle(e.target.value)} />
          </label>
          <label className="text-sm">Fecha
            <input type="date" className="w-full border rounded-lg p-2" value={date} onChange={e=>setDate(e.target.value)} />
          </label>
          <label className="text-sm">Hora
            <input type="time" className="w-full border rounded-lg p-2" value={time} onChange={e=>setTime(e.target.value)} />
          </label>
          <label className="text-sm">Duración
            <select className="w-full border rounded-lg p-2" value={durationMin} onChange={e=>setDurationMin(parseInt(e.target.value))}>
              <option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
            </select>
          </label>
          <label className="text-sm col-span-2">Notas
            <textarea className="w-full border rounded-lg p-2" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="sb-btn-primary px-3 py-2" onClick={handleCreate}>Crear</button>
        </div>
      </div>
    </div>
  );
}
