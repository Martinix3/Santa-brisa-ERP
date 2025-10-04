'use client';
import React, { useState } from 'react';
import type { Dept } from '@/domain/ops.types';

export type PipelineItem = {
  accountId: string;
  accountName: string;
  stage: 'POTENCIAL'|'SEGUIMIENTO'|'ACTIVA'|'FALLIDA';
  sales: { revenue: number; ordersCount: number; lastOrderAt?: string };
  marketing: { hasPLVInstalled: boolean; activeActivations: number; ordersWithPromoInPeriod: number };
  lastVisitAt?: string;
  tasks?: Array<{ id: string; title: string; kind: string }>;
};

export function Kanban({
  items,
  onProgram,
}: {
  items: PipelineItem[];
  onProgram: (p:{accountId:string;accountName:string;dept:Dept;title:string})=>void;
}) {
  const cols: Array<{key:PipelineItem['stage']; title:string}> = [
    { key:'POTENCIAL', title:'Potencial' },
    { key:'SEGUIMIENTO', title:'Seguimiento' },
    { key:'ACTIVA', title:'Activa' },
    { key:'FALLIDA', title:'Fallida' },
  ];

  const [expanded, setExpanded] = useState<string|null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cols.map(col=>{
        const list = items.filter(it=>it.stage===col.key);
        return (
          <section key={col.key} className="sb-card">
            <header className="sb-card__header"><h3 className="sb-card__title">{col.title}</h3><div className="ml-auto text-sm text-[color:oklch(var(--sb-neutral-700))]">{list.length} cuentas</div></header>
            <div className="sb-card__content space-y-3">
              {list.map(it=>{
                const isExp = expanded===it.accountId;
                return (
                <article key={it.accountId}
                  className="border rounded-xl p-3 bg-white hover:shadow-sm transition"
                  draggable
                  onDragStart={(e)=>{
                    e.dataTransfer.setData('application/sb-pipeline', JSON.stringify({ accountId: it.accountId, accountName: it.accountName, title: 'Visita', dept:'VENTAS' }));
                    e.dataTransfer.effectAllowed='copyMove';
                  }}
                  onClick={()=> setExpanded(isExp?null:it.accountId)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="truncate">{it.accountName}</strong>
                    {it.marketing.hasPLVInstalled && <span className="sb-badge sb-badge--marketing">PLV</span>}
                    {it.marketing.activeActivations>0 && <span className="sb-badge sb-badge--ventas">Activación</span>}
                  </div>
                  {!isExp && (
                    <div className="text-xs text-neutral-600 flex items-center gap-3">
                      <span>€{it.sales.revenue} · {it.sales.ordersCount} pedidos</span>
                      <button className="ml-auto underline" onClick={(ev)=>{ ev.stopPropagation(); onProgram({accountId:it.accountId,accountName:it.accountName,dept:'VENTAS',title:'Visita'}); }}>Programar</button>
                    </div>
                  )}
                  {isExp && (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><div className="text-neutral-600">Ventas</div><div className="font-medium">€{it.sales.revenue}</div></div>
                        <div><div className="text-neutral-600">Pedidos</div><div className="font-medium">{it.sales.ordersCount}</div></div>
                      </div>
                      {it.tasks?.length ? <ul className="list-disc pl-5 text-neutral-700">{it.tasks.map(t=><li key={t.id}>{t.title} ({t.kind})</li>)}</ul> : null}
                      <div className="flex gap-2">
                        <button className="sb-btn-primary px-2 py-1 text-xs">Visita</button>
                        <button className="sb-btn-primary px-2 py-1 text-xs" data-variant="subtle">Pedido</button>
                        <button className="px-2 py-1 text-xs border rounded-lg">Ficha</button>
                        <button className="px-2 py-1 text-xs border rounded-lg" onClick={(ev)=>{ ev.stopPropagation(); onProgram({accountId:it.accountId,accountName:it.accountName,dept:'MARKETING',title:'Tarea MKT'}); }}>Programar (MKT)</button>
                      </div>
                    </div>
                  )}
                </article>
              )})}
            </div>
          </section>
        )})}
    </div>
  );
}
