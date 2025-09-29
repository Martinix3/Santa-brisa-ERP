// src/features/agenda/components/SalesOutcomeDialog.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import type { Interaction } from "@/domain/ssot";
import { placeOrder } from "@/app/(app)/orders/actions";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { PosCompleteDialog } from "@/features/pos/PosCompleteDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { finalizeTaskWithOutcome } from "@/features/agenda/server/finalize-actions";

type Props = { open:boolean; onOpenChange:(v:boolean)=>void; task: Interaction|null };

export function SalesOutcomeDialog({ open, onOpenChange, task }: Props) {
  const { data, currentUser } = useData();
  const router = useRouter();
  const [mode, setMode] = useState<"PEDIDO"|"INTERACCION"|"POS"|"">("");
  const [lines, setLines] = useState<{sku:string;qty:number;unitPriceReported?:number}[]>([]);
  const [openNewEvent, setOpenNewEvent] = useState(false);
  const [openPosComplete, setOpenPosComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  const skuOptions = useMemo(() =>
    (data?.items || []).filter(i => (i as any).active && (i as any).category === 'fg').map(i => ({ value:i.sku, label:i.name })), [data?.items]
  );

  useEffect(() => {
    if (!open) {
      setMode("");
      setLines([]);
      setOpenNewEvent(false);
      setOpenPosComplete(false);
    }
  }, [open]);

  if (!open || !task) return null;
  const close = ()=> { onOpenChange(false); };

  const onConfirm = async () => {
    try {
      setSaving(true);
      if (mode==="PEDIDO") {
        if (!task.accountId) throw new Error("La tarea no tiene cuenta asociada");
        if (!lines.length || lines.some(l => !l.sku || l.qty <= 0)) throw new Error("Añade al menos una línea válida");
        const created = await placeOrder({ accountId: task.accountId, lines, createdById: currentUser?.id! });
        await finalizeTaskWithOutcome({ taskId: task.id, outcome: { type:"ORDER", orderId: created.id } });
        toast.success("Pedido colocado y tarea cerrada");
        close(); router.push(`/orders/${created.id}`);
      } else if (mode==="INTERACCION") {
        setOpenNewEvent(true); // se cierra cuando el NewEventDialog guarde
      } else if (mode==="POS") {
        if (task.linkedEntity?.type === 'POS_TACTIC') {
          setOpenPosComplete(true);
        } else {
          // Si no está linkeada, quizá quieras crearla primero, pero por ahora cerramos la tarea.
          await finalizeTaskWithOutcome({ taskId: task.id, outcome: { type:"POS" } });
          toast.info("Tarea marcada como POS. Completa los detalles en el módulo de marketing.");
          close();
        }
      } else {
        toast.error("Selecciona un resultado");
      }
    } catch(e:any) {
      toast.error(e.message||"Error al guardar resultado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
          <h3 className="font-semibold mb-2">Resultado de la tarea</h3>
          <p className="text-sm text-zinc-600 mb-3">¿En qué terminó la visita/llamada programada?</p>

          <div className="flex gap-2 mb-3">
            {["PEDIDO","INTERACCION","POS"].map(m => (
              <button key={m}
                className={`text-sm px-3 py-1 rounded border ${mode===m?'bg-black text-white':''}`}
                onClick={()=>setMode(m as any)}
              >
                {m==="PEDIDO"?"Pedido":m==="INTERACCION"?"Otra interacción":"Táctica POS"}
              </button>
            ))}
          </div>

          {mode==="PEDIDO" && (
            <div className="space-y-2 border rounded-lg p-3 mb-3">
              {lines.map((l,idx)=>(
                <div key={idx} className="flex gap-2">
                  <select className="border rounded px-2 py-1 flex-1"
                          value={l.sku} onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,sku:e.target.value}:x))}>
                    <option value="">-- SKU --</option>
                    {skuOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={1} className="border rounded px-2 py-1 w-24" value={l.qty}
                         onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,qty:Math.max(1, Number(e.target.value)||1)}:x))}/>
                  <button className="text-xs border rounded px-2" onClick={()=>setLines(s=>s.filter((_,i)=>i!==idx))}>Quitar</button>
                </div>
              ))}
              <button className="text-xs border rounded px-3 py-1" onClick={()=>setLines(s=>[...s,{sku:"",qty:1}])}>Añadir línea</button>
            </div>
          )}

          {mode==="INTERACCION" && (
            <div className="mb-3 text-sm text-zinc-600">
              Crearemos una interacción de seguimiento (abre diálogo).
            </div>
          )}

          {mode==="POS" && (
            <div className="mb-3 text-sm text-zinc-600">
              Cierra la tarea como POS. A continuación se abrirá el diálogo de KPIs del evento/POS si la tarea está linkeada.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button className="border rounded px-3 py-1" onClick={close}>Cancelar</button>
            <button className="border rounded px-3 py-1 bg-black text-white" disabled={saving || !mode} onClick={onConfirm}>
              {saving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>

      {openNewEvent && (
        <NewEventDialog
          open={openNewEvent}
          onOpenChange={(o)=>{ if(!o){ setOpenNewEvent(false); close(); } }}
          onSuccess={async ()=>{ 
            await finalizeTaskWithOutcome({ taskId: task!.id, outcome:{ type:"INTERACTION" }});
            toast.success("Interacción creada y tarea cerrada"); 
            setOpenNewEvent(false); close();
          }}
          onError={(m) => toast.error(m)}
          accentColor=""
          initialEventData={{ accountId: task.accountId, dept:'VENTAS' } as any}
        />
      )}
      {openPosComplete && task.linkedEntity?.type === 'POS_TACTIC' && (
        <PosCompleteDialog
          open={openPosComplete}
          onOpenChange={o => { if(!o) { setOpenPosComplete(false); close(); } }}
          tacticId={task.linkedEntity.id}
        />
      )}
    </>
  );
}
