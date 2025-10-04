// /features/agenda-notes/components/OutcomeDialog.tsx
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
  
  const renderContent = () => {
    // Note: The logic for different kinds of tasks has been simplified
    // as per the new design. The dialog now focuses on confirming completion.
    // The parser logic for creating new entities is moved to where the note is created.
    return commonContent;
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
        <div className="bg-background w-full rounded-t-lg border-t border-border shadow-xl" onClick={e => e.stopPropagation()}>
           <div className="animate-slide-up-fade">
              <div className="w-8 h-1 bg-border rounded-full mx-auto mt-2"></div>
              <div className="p-4">{renderContent()}</div>
              <div className="p-4 border-t border-border">
                  <ul className="space-y-1">
                      <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">📷 Adjuntar</button></li>
                      <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">✨ Enriquecer</button></li>
                      <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">ℹ️ Ver detalle</button></li>
                      <li className='!mt-3'>
                          <button onClick={()=> onConfirm(task, payload)} className="w-full p-3 rounded-lg bg-accent text-text-primary font-semibold text-center">Completar Tarea</button>
                      </li>
                  </ul>
              </div>
           </div>
        </div>
    </div>
  );
}
