// /features/agenda/components/OutcomeDialog.tsx
import React, { useMemo, useState } from 'react';
import type { Interaction } from '@/domain/ssot';

// ----------------------------- Dialog genérico -----------------------------
function Dialog({ title, onClose, children }:{ title:string; onClose:()=>void; children:React.ReactNode }){
  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-4 bottom-6 bg-white rounded-xl border border-[#e5e7eb] shadow-md p-3">
        <div className="text-[16px] font-semibold mb-2">{title}</div>
        <div className="text-[14px] text-[#374151] space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ----------------------------- OutcomeDialog (main) -----------------------------
export function OutcomeDialog({
  taskId,
  tasks,
  onClose,
  onConfirm,
}:{
  taskId: string|null;
  tasks: Interaction[];
  onClose: ()=>void;
  onConfirm: (task: Interaction, payload: Record<string,any>)=>void;
}) {
  const task = useMemo(()=> tasks.find(t=>t.id===taskId), [tasks, taskId]);
  const [payload, setPayload] = useState<Record<string,any>>({});

  if (!taskId || !task) return null;

  const commonContent = (
    <div className="text-sm text-[hsl(var(--sb-neutral-500))]">
      <p className="font-semibold text-black mb-2">{task.note}</p>
      ¿Marcar esta tarea como completada?
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Cerrar" />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-2xl p-3 pb-4">
        <div className="h-1 w-10 bg-[hsl(var(--sb-neutral-300))] rounded-full mx-auto mb-2" />
        <div className="font-medium mb-2">Confirmar Tarea</div>
        {commonContent}
        <div className="mt-3 flex justify-end gap-2">
          <button className="px-3 py-1.5 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-1.5 rounded-lg border bg-[hsl(var(--sb-sun-weak))]" onClick={()=>onConfirm(task, payload)}>Completar</button>
        </div>
      </div>
    </div>
  );
}
