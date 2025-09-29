// src/features/pos/KpisDynamicForm.tsx
"use client";
import React, { useState, useEffect } from "react";
import type { PosCatalogItem } from '@/domain/ssot';

type KpisTemplate = NonNullable<PosCatalogItem['defaultKpisTemplate']>;

type Props = {
  title: string;
  template?: KpisTemplate | null;
  onSubmit: (data: { kpis: Record<string, number | string>, realCost?: number, photos?: string[] }) => Promise<void>;
};

export function KpisDynamicForm({ title, template, onSubmit }: Props) {
  const [kpis, setKpis] = useState<Record<string, number | string>>({});
  const [realCost, setRealCost] = useState<number | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => { setKpis({}); setRealCost(undefined); setPhotos([]); }, [template]);

  const setKpi = (key: string, value: string | number) => {
    setKpis(k => ({ ...k, [key]: value }));
  };

  const fields = template?.extraFields || [];
  const askForCost = !template || fields.some(f => f.key === "cost");

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-zinc-800">{title}</h4>
      
      {template?.askAttendees && (
        <div>
          <label className="text-xs text-zinc-600">Asistentes</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            value={kpis.attendees ?? ''} onChange={e=>setKpi('attendees', Number(e.target.value)||0)}/>
        </div>
      )}
      {template?.askSamples && (
        <div>
          <label className="text-xs text-zinc-600">Muestras entregadas</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            value={kpis.samples ?? ''} onChange={e=>setKpi('samples', Number(e.target.value)||0)}/>
        </div>
      )}
      {template?.askUpliftPct && (
        <div>
          <label className="text-xs text-zinc-600">Uplift ventas (%)</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            value={kpis.upliftPct ?? ''} onChange={e=>setKpi('upliftPct', Number(e.target.value)||0)}/>
        </div>
      )}

      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs text-zinc-600">{f.label}</label>
          <input type={f.type} className="w-full border rounded px-2 py-1"
            value={kpis[f.key] ?? ''} onChange={e=>setKpi(f.key, f.type==='number'?Number(e.target.value):e.target.value)}/>
        </div>
      ))}
      
      {askForCost && (
         <div>
          <label className="text-xs text-zinc-600">Coste Real Total (€)</label>
          <input type="number" min={0} className="w-full border rounded px-2 py-1"
            value={realCost ?? ''} onChange={e=>setRealCost(Number(e.target.value))}/>
        </div>
      )}

      {template?.askPhotos && (
        <div>
          <label className="text-xs text-zinc-600">Fotos</label>
          <input type="text" placeholder="URL de foto (demo)" className="w-full border rounded px-2 py-1"
            onKeyDown={(e:any)=>{ if(e.key==='Enter' && e.currentTarget.value){ setPhotos(p=>[...p, e.currentTarget.value]); e.currentTarget.value=''; }}}/>
          {!!photos.length && <ul className="text-xs text-zinc-600 mt-1">{photos.map((p,i)=><li key={i}>{p}</li>)}</ul>}
        </div>
      )}

      <div className="flex justify-end">
        <button className="border rounded px-3 py-1 bg-black text-white"
          onClick={()=>onSubmit({ kpis, realCost, photos })}>
          Guardar
        </button>
      </div>
    </div>
  );
}
