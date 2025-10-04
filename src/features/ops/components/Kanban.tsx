// FILE: src/features/ops/components/Kanban.tsx
'use client';
import React, { useState } from 'react';
import type { Department, Stage } from '@/domain/ssot';
import { SBButton, Badge } from '@/components/ui';

export type PipelineItem = {
  accountId: string;
  accountName: string;
  stage: Stage;
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
  onProgram: (p:{accountId:string;accountName:string;dept:Department;title:string})=>void;
}) {
  const cols: Array<{key:Stage; title:string}> = [
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
          <section key={col.key} className="bg-secondary rounded-lg">
            <header className="p-3">
                <h3 className="font-semibold text-sm">{col.title} <span className="text-muted-foreground font-normal">({list.length})</span></h3>
            </header>
            <div className="p-2 space-y-2">
              {list.map(it=>{
                const isExp = expanded===it.accountId;
                return (
                <article key={it.accountId}
                  className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow cursor-pointer"
                  draggable
                  onDragStart={(e)=>{
                    e.dataTransfer.setData('application/json', JSON.stringify({ accountId: it.accountId, accountName: it.accountName, title: 'Visita', dept:'VENTAS' }));
                    e.dataTransfer.effectAllowed='copyMove';
                  }}
                  onClick={()=> setExpanded(isExp?null:it.accountId)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="truncate">{it.accountName}</strong>
                    {it.marketing.hasPLVInstalled && <Badge>PLV</Badge>}
                  </div>
                  {!isExp && (
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>€{it.sales.revenue} &middot; {it.sales.ordersCount}</span>
                      <SBButton variant="ghost" size="sm" className="ml-auto" onClick={(ev)=>{ ev.stopPropagation(); onProgram({accountId:it.accountId,accountName:it.accountName,dept:'VENTAS',title:'Visita'}); }}>Programar</SBButton>
                    </div>
                  )}
                  {isExp && (
                    <div className="space-y-2 text-sm mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><div className="text-muted-foreground text-xs">Ventas</div><div className="font-medium">€{it.sales.revenue}</div></div>
                        <div><div className="text-muted-foreground text-xs">Pedidos</div><div className="font-medium">{it.sales.ordersCount}</div></div>
                      </div>
                      {it.tasks?.length ? <ul className="list-disc pl-5 text-muted-foreground text-xs">{it.tasks.map(t=><li key={t.id}>{t.title} ({t.kind})</li>)}</ul> : null}
                      <div className="flex gap-2 pt-2 border-t">
                        <SBButton variant="primary" size="sm">Visita</SBButton>
                        <SBButton variant="secondary" size="sm">Ficha</SBButton>
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
