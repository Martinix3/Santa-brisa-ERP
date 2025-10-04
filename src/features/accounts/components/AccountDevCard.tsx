
// src/features/accounts/components/AccountDevCard.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useData } from "@/lib/dataprovider";
import type { Interaction } from "@/domain/ssot";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { TaskCompletionDialog } from "@/features/dashboard-ventas/components/TaskCompletionDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AccountDevCard({ accountId }:{ accountId:string }) {
  const { data } = useData();
  const router = useRouter();
  const [openNew, setOpenNew] = useState(false);
  const [complete, setComplete] = useState<Interaction|null>(null);

  const inters = useMemo(()=> (data?.interactions||[]).filter(i=>i.accountId===accountId).slice(0,5), [data?.interactions, accountId]);

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Desarrollo comercial</h3>
        <button className="text-xs border rounded px-3 py-1" onClick={()=>setOpenNew(true)}>Nueva visita</button>
      </div>
      <ul className="space-y-2">
        {inters.map(i=>(
          <li key={i.id} className="text-sm flex items-center justify-between">
            <span>{i.note || i.kind || 'Interacción'}</span>
            <div className="flex gap-2">
              <span className="text-xs text-zinc-500">{i.status}</span>
              <button className="text-xs border rounded px-2" onClick={()=>setComplete(i)}>Completar</button>
            </div>
          </li>
        ))}
        {!inters.length && <li className="text-sm text-zinc-500">Sin visitas aún.</li>}
      </ul>

      {openNew && (
        <NewEventDialog
          open={openNew}
          onOpenChange={setOpenNew}
          onSuccess={()=>{ toast.success("Visita creada"); router.refresh(); setOpenNew(false); }}
          initialEventData={{ accountId, dept:'VENTAS' } as any}
          dept={'VENTAS'}
        />
      )}
      {complete && (
        <TaskCompletionDialog
          task={complete}
          open={!!complete}
          onClose={()=>setComplete(null)}
          onSuccess={()=>{ toast.success("Visita completada"); router.refresh(); setComplete(null); }}
          onError={(m)=>toast.error(m)}
        />
      )}
    </div>
  );
}
