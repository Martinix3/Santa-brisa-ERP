// /features/agenda/components/OutcomeDialog.tsx
import React, { useMemo, useState } from 'react';
import type { Task as AgendaTask } from '@/features/agenda/storage/adapter';
import type { Task } from '@/domain/ssot';

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

// ----------------------------- Sub-diálogos reutilizados -----------------------------
function VisitOutcome({ defaults, onCancel, onSave }:{ defaults:{ suggestPedido:boolean; defaultNextISO?: string }; onCancel:()=>void; onSave:(choice:'PEDIDO'|'INTERACCION'|'POS_PLV')=>void }){
  const [choice, setChoice] = useState<'PEDIDO'|'INTERACCION'|'POS_PLV'|''>(defaults.suggestPedido? 'PEDIDO' : '');
  const [nextISO, setNextISO] = useState<string>(defaults.defaultNextISO||'');
  return (
    <div>
      <div className="flex gap-2">
        {(['PEDIDO','POS_PLV','INTERACCION'] as const).map(opt=> (
          <button key={opt}
            className={`text-sm px-3 py-1 rounded border ${choice===opt? 'bg-[#111827] text-white':'text-[#374151]'}`}
            onClick={()=>setChoice(opt)}
          >{opt==='PEDIDO'?'Pedido':opt==='POS_PLV'?'POS · PLV':'Otra interacción'}</button>
        ))}
      </div>
      {!defaults.defaultNextISO ? null : (
        <div className="pt-2 text-xs text-[#6b7280]">
          Sin fecha en la nota. Propuesto: <input type="datetime-local" className="ml-2 border border-[#e5e7eb] rounded px-1 py-0.5" value={nextISO} onChange={e=>setNextISO(e.target.value)} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-1 border rounded text-sm text-[#374151]" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 border rounded text-sm bg-[#F4C542]" disabled={!choice} onClick={()=>onSave(choice as any)}>Guardar</button>
      </div>
    </div>
  );
}

function PlvDialog({ defaults, onCancel, onSave }:{ defaults:{ delivered:boolean; qty?:number; sku?:string }, onCancel:()=>void, onSave:(data:{delivered:boolean; qty:number; sku:string; note?:string; photo?:File|null})=>void }){
  const [delivered, setDelivered] = useState<boolean>(!!defaults.delivered);
  const [qty, setQty] = useState<number>(defaults.qty||1);
  const [sku, setSku] = useState<string>(defaults.sku||'');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File|null>(null);

  return (
    <div className="space-y-2">
      <label className="text-xs flex items-center gap-2">
        <input type="checkbox" checked={delivered} onChange={e=>setDelivered(e.target.checked)} /> ¿PLV entregado/instalado? <span className="text-[#991b1b]">(obligatorio)</span>
      </label>
      <div className="flex gap-2 items-center">
        <label className="text-xs">SKU
          <input className="ml-2 border border-[#e5e7eb] rounded px-2 py-1 text-sm" placeholder="SKU" value={sku} onChange={e=>setSku(e.target.value)} />
        </label>
        <label className="text-xs">Cantidad
          <input type="number" className="ml-2 w-20 border border-[#e5e7eb] rounded px-2 py-1 text-sm" value={qty} onChange={e=>setQty(Number(e.target.value)||1)} />
        </label>
      </div>
      <label className="text-xs block">Nota (opcional)
        <input className="mt-1 w-full border border-[#e5e7eb] rounded px-2 py-1 text-sm" value={note} onChange={e=>setNote(e.target.value)} />
      </label>
      <label className="text-xs block">Foto (opcional)
        <input type="file" accept="image/*" className="mt-1 w-full text-sm" onChange={e=>setPhoto(e.target.files?.[0]||null)} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-1 border rounded text-sm text-[#374151]" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 border rounded text-sm bg-[#F4C542]" disabled={!delivered} onClick={()=>onSave({delivered, qty, sku, note, photo})}>Guardar</button>
      </div>
    </div>
  );
}

function PosKpis({ kind, defaults, onCancel, onSave }:{ kind:'EVT'|'MKT'; defaults:{ asistentes?:number; material?:string; impacto?:string }; onCancel:()=>void; onSave:(kpis:any)=>void }){
  const [kpis, setKpis] = useState<any>({
    asistentes: defaults.asistentes ?? '',
    material: defaults.material ?? '',
    impacto: defaults.impacto ?? ''
  });
  return (
    <div>
      <div className="grid grid-cols-1 gap-2">
        <label className="text-xs">
          <span className="block text-[#6b7280]">Asistentes (aprox.)</span>
          <input className="mt-1 w-full border border-[#e5e7eb] rounded px-2 py-1 text-sm" value={kpis.asistentes} onChange={e=>setKpis({...kpis, asistentes:e.target.value})} />
        </label>
        <label className="text-xs">
          <span className="block text-[#6b7280]">Material utilizado</span>
          <input className="mt-1 w-full border border-[#e5e7eb] rounded px-2 py-1 text-sm" value={kpis.material} onChange={e=>setKpis({...kpis, material:e.target.value})} />
        </label>
        <label className="text-xs">
          <span className="block text-[#6b7280]">Impacto / Observaciones</span>
          <textarea className="mt-1 w-full border border-[#e5e7eb] rounded px-2 py-1 text-sm" rows={3} value={kpis.impacto} onChange={e=>setKpis({...kpis, impacto:e.target.value})} />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-1 border rounded text-sm text-[#374151]" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 border rounded text-sm bg-[#F4C542]" onClick={()=>onSave(kpis)}>Guardar</button>
      </div>
    </div>
  );
}

// ----------------------------- OutcomeDialog (main) -----------------------------
export function OutcomeDialog({
  taskId,
  onClose,
  onConfirm,
}:{
  taskId: string|null;
  onClose: ()=>void;
  onConfirm: (task: AgendaTask, payload: Record<string,any>)=>void;
}) {
  const {data} = useData();
  const tasks = data?.interactions || [];
  const task = useMemo(()=> tasks.find(t=>t.id===taskId), [tasks, taskId]);
  const [payload, setPayload] = useState<Record<string,any>>({});

  if (!taskId || !task) return null;

  const common = (
    <>
      <div className="text-sm text-[hsl(var(--sb-neutral-600))] mb-2">{task.note}</div>
      {task.kind==='PEDIDO' && (
        <div className="grid gap-2">
          <label className="text-sm">Cajas
            <input type="number" min={1} defaultValue={(task.meta as any)?.qtyCases ?? 6}
                   className="w-full border rounded px-2 py-1"
                   onChange={(e)=>setPayload(p=>({...p, qtyCases:+e.target.value}))}/>
          </label>
        </div>
      )}
      {task.kind==='VISITA' && (
        <div className="grid gap-2">
          <label className="text-sm">Resultado
            <input type="text" placeholder="Ej: bien, pedido 3 cajas, dejar vasos"
                   className="w-full border rounded px-2 py-1"
                   onChange={(e)=>setPayload(p=>({...p, summary:e.target.value}))}/>
          </label>
        </div>
      )}
      {task.kind==='POS_PLV' && (
        <div className="grid gap-2">
          <label className="text-sm">SKU
            <input className="w-full border rounded px-2 py-1" onChange={(e)=>setPayload(p=>({...p, sku:e.target.value}))}/>
          </label>
          <label className="text-sm">Cantidad
            <input type="number" min={1} className="w-full border rounded px-2 py-1" onChange={(e)=>setPayload(p=>({...p, qty:+e.target.value}))}/>
          </label>
          <label className="text-sm">Nota
            <input className="w-full border rounded px-2 py-1" onChange={(e)=>setPayload(p=>({...p, note:e.target.value}))}/>
          </label>
        </div>
      )}
      {task.kind==='POS_EVT' && (
        <div className="grid gap-2">
          <label className="text-sm">Asistentes
            <input type="number" min={0} className="w-full border rounded px-2 py-1" onChange={(e)=>setPayload(p=>({...p, attendees:+e.target.value}))}/>
          </label>
          <label className="text-sm">Gasto (€)
            <input type="number" min={0} className="w-full border rounded px-2 py-1" onChange={(e)=>setPayload(p=>({...p, cost:+e.target.value}))}/>
          </label>
        </div>
      )}
      {task.kind==='NOTA' && (
        <div className="text-sm text-[hsl(var(--sb-neutral-500))]">¿Marcar como completada?</div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Cerrar" />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-2xl p-3 pb-4">
        <div className="h-1 w-10 bg-[hsl(var(--sb-neutral-300))] rounded-full mx-auto mb-2" />
        <div className="font-medium mb-2">Confirmar {task.kind}</div>
        {common}
        <div className="mt-3 flex justify-end gap-2">
          <button className="px-3 py-1.5 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-1.5 rounded-lg border bg-[hsl(var(--sb-sun-weak))]" onClick={()=>onConfirm(task as AgendaTask, payload)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
