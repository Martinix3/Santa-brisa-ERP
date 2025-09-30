// /features/agenda/components/OutcomeDialog.tsx
"use client";
import React, { useState, useMemo } from "react";
import { parseNoteToAction, type ParsedNoteAction } from '../parser/parser';

// ======================= Dialog Components (Stubs) =======================
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

function VisitOutcome({ onCancel, onSave }: { onCancel: () => void; onSave: (choice: 'PEDIDO' | 'INTERACCION' | 'POS_PLV') => void }) {
  const [choice, setChoice] = useState<'PEDIDO' | 'INTERACCION' | 'POS_PLV' | ''>('');
  return (
    <div>
      <div className="flex gap-2">
        {(['PEDIDO', 'POS_PLV', 'INTERACCION'] as const).map(opt => (
          <button key={opt}
            className={`text-sm px-3 py-1 rounded border ${choice === opt ? 'bg-[#111827] text-white' : 'text-[#374151]'}`}
            onClick={() => setChoice(opt)}>
            {opt === 'PEDIDO' ? 'Pedido' : opt === 'POS_PLV' ? 'POS · PLV' : 'Otra interacción'}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-1 border rounded text-sm text-[#374151]" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 border rounded text-sm bg-[#F4C542]" disabled={!choice} onClick={() => onSave(choice as any)}>Guardar</button>
      </div>
    </div>
  );
}

function GenericConfirmDialog({ text, onCancel, onComplete }: { text: string, onCancel: () => void; onComplete: () => void; }) {
    return (
        <div>
            <div className="text-[14px]">{text}</div>
            <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-1 border rounded text-sm text-[#374151]" onClick={onCancel}>Cancelar</button>
                <button className="px-3 py-1 border rounded text-sm bg-[#F4C542]" onClick={onComplete}>Guardar</button>
            </div>
        </div>
    );
}

// ======================= Main Dialog Component =======================
export function OutcomeDialog({ text, onCancel, onComplete }: { text: string; onCancel: () => void; onComplete: () => void }) {
  const parsed = useMemo(() => parseNoteToAction(text), [text]);

  if (parsed.kind === 'PEDIDO') {
    return (
        <Dialog title="Confirmar Pedido" onClose={onCancel}>
            <GenericConfirmDialog text="Se registrará un pedido para la cuenta vinculada." onCancel={onCancel} onComplete={onComplete} />
        </Dialog>
    );
  }

  if (parsed.kind === 'VISITA') {
    return (
        <Dialog title="Resultado de Visita" onClose={onCancel}>
             <VisitOutcome
                onCancel={onCancel}
                onSave={(choice) => {
                    // Aquí iría la lógica para manejar la elección del usuario
                    console.log("Outcome selected:", choice);
                    onComplete();
                }}
            />
        </Dialog>
    );
  }

  // POS_PLV, POS_EVT, POS_MKT and NOTA fall through to a simple confirmation
  return (
    <Dialog title="Confirmar Tarea" onClose={onCancel}>
         <GenericConfirmDialog text={`Se marcará la nota como completada. ¿Continuar?`} onCancel={onCancel} onComplete={onComplete} />
    </Dialog>
  );
}
