// src/features/pos/KpisDynamicForm.tsx
"use client";
import React, { useMemo, useState } from "react";

type Template = {
  askAttendees?: boolean;
  askSamples?: boolean;
  askUpliftPct?: boolean;
  askPhotos?: boolean;
  extraFields?: { key:string; label:string; type:'number'|'text' }[];
};

export function KpisDynamicForm({
  title, template, onSubmit
}:{
  title?: string;
  template?: Template | null;
  onSubmit: (data: { kpis: Record<string, string|number|undefined>; photos?: string[]; realCost?: number }) => Promise<void>;
}) {
  // fallback genérico si no hay plantilla
  const tpl: Template = useMemo(() => template || {
    askPhotos: true,
    extraFields: [{ key:'notes', label:'Notas', type:'text' }]
  }, [template]);

  const [vals, setVals] = useState<Record<string, string|number|undefined>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [realCost, setRealCost] = useState<number|''>('');

  const setNum = (key:string, v:any) => setVals(s => ({ ...s, [key]: v===''?undefined:Number(v) }));
  const setTxt = (key:string, v:any) => setVals(s => ({ ...s, [key]: v }));

  return (
    <div className="space-y-3">
      {title && <p className="text-sm text-zinc-800 font-medium">{title}</p>}
      {tpl.askAttendees && (
        <div>
          <label className="text-xs text-zinc-600">Asistentes</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            onChange={(e)=>setNum('attendees', e.target.value)}/>
        </div>
      )}
      {tpl.askSamples && (
        <div>
          <label className="text-xs text-zinc-600">Muestras entregadas</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            onChange={(e)=>setNum('samples', e.target.value)}/>
        </div>
      )}
      {tpl.askUpliftPct && (
        <div>
          <label className="text-xs text-zinc-600">% Uplift estimado</label>
          <input type="number" step="0.1" className="w-full border rounded px-2 py-1"
            onChange={(e)=>setNum('upliftPct', e.target.value)}/>
        </div>
      )}
      {tpl.extraFields?.map(f => (
        <div key={f.key}>
          <label className="text-xs text-zinc-600">{f.label}</label>
          {f.type === 'number'
            ? <input type="number" className="w-full border rounded px-2 py-1" onChange={(e)=>setNum(f.key, e.target.value)} />
            : <input type="text" className="w-full border rounded px-2 py-1" onChange={(e)=>setTxt(f.key, e.target.value)} />
          }
        </div>
      ))}

      {tpl.askPhotos && (
        <div>
          <label className="text-xs text-zinc-600">Fotos (opcional)</label>
          <input type="text" placeholder="URL de foto (demo)" className="w-full border rounded px-2 py-1"
            onKeyDown={(e:any)=>{ if(e.key==='Enter' && e.currentTarget.value){ setPhotos(p=>[...p, e.currentTarget.value]); e.currentTarget.value=''; }}}/>
          {!!photos.length && <ul className="text-xs text-zinc-600 mt-1">{photos.map((p,i)=><li key={i}>{p}</li>)}</ul>}
        </div>
      )}

      <div className="pt-1">
        <label className="text-xs text-zinc-600">Coste real (€) (opcional)</label>
        <input type="number" step="0.01" className="w-full border rounded px-2 py-1"
          value={realCost} onChange={(e)=>setRealCost(e.target.value===''?'':Number(e.target.value))}/>
      </div>

      <div className="flex justify-end">
        <button className="border rounded px-3 py-1 bg-black text-white"
          onClick={()=>onSubmit({ kpis: vals, photos, realCost: realCost===''?undefined:Number(realCost) })}>
          Guardar
        </button>
      </div>
    </div>
  );
}
