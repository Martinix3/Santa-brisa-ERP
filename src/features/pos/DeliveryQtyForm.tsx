// src/features/pos/DeliveryQtyForm.tsx
"use client";
import React, { useState } from "react";

export function DeliveryQtyForm({
  defaultPlanned,
  onSubmit
}: {
  defaultPlanned?: number;
  onSubmit: (data: { qty: number; photos?: string[] }) => Promise<void>;
}) {
  const [qty, setQty] = useState<number>(defaultPlanned ?? 1);
  const [photos, setPhotos] = useState<string[]>([]); // usa tu uploader y guarda URLs

  return (
    <div className="space-y-3">
      {typeof defaultPlanned === "number" && (
        <p className="text-sm text-zinc-600">Planificado: <b>{defaultPlanned}</b> uds</p>
      )}

      <div>
        <label className="text-xs text-zinc-600">Unidades entregadas</label>
        <input type="number" min={0} className="w-full border rounded px-2 py-1"
          value={qty} onChange={e=>setQty(Math.max(0, Number(e.target.value)||0))}/>
      </div>

      {/* Reemplaza por tu uploader */}
      <div>
        <label className="text-xs text-zinc-600">Fotos (opcional)</label>
        <input type="text" placeholder="URL de foto (demo)" className="w-full border rounded px-2 py-1"
          onKeyDown={(e:any)=>{ if(e.key==='Enter' && e.currentTarget.value){ setPhotos(p=>[...p, e.currentTarget.value]); e.currentTarget.value=''; }}}/>
        {!!photos.length && (
          <ul className="text-xs text-zinc-600 mt-1">{photos.map((p,i)=><li key={i}>{p}</li>)}</ul>
        )}
      </div>

      <div className="flex justify-end">
        <button className="border rounded px-3 py-1 bg-black text-white"
          onClick={()=>onSubmit({ qty, photos })}>
          Guardar
        </button>
      </div>
    </div>
  );
}
