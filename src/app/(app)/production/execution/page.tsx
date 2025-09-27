"use client";

import React, { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import { Factory as FactoryIcon, Plus, ListFilter } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { SB_COLORS, type Item } from "@/domain/ssot";
import { toast } from "sonner";
import {
  planProduction,
} from "../actions";

// ---- Aliases para evitar choques de tipos SSOT
type Uom = "L" | "kg" | "unit";
type ProductionOrderUI = any;
type BillOfMaterialUI = any;


// ===== Helpers compactos (no tocan estética global) =====
function EmptyCenter({ onPickBom }: { onPickBom: () => void }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-100 text-zinc-700 grid place-items-center">
          <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-80"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-800">Nada abierto</h3>
        <p className="text-sm text-zinc-500 mt-1">Selecciona una orden a la izquierda o crea una nueva desde un BOM.</p>
      </div>
    </div>
  );
}


// ===== Página principal con organización tipo "playground" =====
export default function ExecutionPage() {
  const { data, loadInitialData } = useData();
  const accent = (SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal;

  const allItems = useMemo(() => (data?.items || []) as Item[], [data]);

  const boms: BillOfMaterialUI[] = useMemo(() => {
      const raw = (data?.billOfMaterials ?? []) as BillOfMaterialUI[];
      return raw.map((b: any) => ({
        id: b.id,
        name: b.name ?? b.id,
        stage: (b.stage) ?? (b.output?.isFinal ? "ENVASADO" : "PRODUCCION"),
        baseUnit: (b.baseUnit ?? b.uom ?? "L") as Uom,
        ...b,
      }));
    }, [data]);
  const orders: ProductionOrderUI[] = useMemo(() => (data?.productionOrders ?? []) as ProductionOrderUI[], [data]);

  // Helpers de estado compatibles con SSOT
  const isActiveStatus = (s: string) => ['IN_PROGRESS','PAUSED','QC_HOLD','PACKAGING', 'wip'].includes(s);
  const isScheduledStatus = (s: string) => s === 'PLANNED' || s === 'planned';

  // Agrupación "playground": izquierda (source), centro (workstation), derecha (inspectores)
  const active: ProductionOrderUI[] = useMemo(() => orders.filter((o) => isActiveStatus(o.status)), [orders]);
  const scheduled: ProductionOrderUI[] = useMemo(() => orders.filter((o) => isScheduledStatus(o.status)), [orders]);

  // Estado de selección (uno u otro)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [openBomId, setOpenBomId] = useState<string | null>(null);

  const openOrder: ProductionOrderUI | null = useMemo(() => orders.find((o) => o.id === openOrderId) ?? null, [orders, openOrderId]);
  const openBom: BillOfMaterialUI | null = useMemo(() => boms.find((b) => b.id === openBomId) ?? null, [boms, openBomId]);

  const pickBom = useCallback(() => {
    if (!boms?.length) return;
    setOpenOrderId(null);
    setOpenBomId(boms[0].id);
  }, [boms]);

  const selectOrder = useCallback((id: string) => {
    setOpenBomId(null);
    setOpenOrderId(id);
  }, []);

  // ===== Layout =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
      {/* Izquierda: "Fuentes" → Órdenes y Nuevo desde BOM */}
      <aside className="lg:col-span-3 space-y-4">
        <SBCard
          title="Órdenes"
          accent={accent}
        >
          <div className="p-3 flex items-center justify-between">
            <div className="text-sm text-zinc-600">Activas ({active.length}) · Planificadas ({scheduled.length})</div>
            <div className="flex items-center gap-2">
              <details className="relative group">
                <summary className="cursor-pointer list-none sb-btn-secondary px-2 py-1 rounded-md border text-xs flex items-center gap-1">
                  <Plus size={14} /> Nuevo
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-10 max-h-72 overflow-auto">
                  {boms.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setOpenOrderId(null); setOpenBomId(b.id); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      {b.name} {b.stage === 'PRODUCCION' ? '• OUT: intermediate' : '• OUT: fg'}
                    </button>
                  ))}
                  {!boms?.length && (
                    <div className="px-3 py-2 text-sm text-zinc-500">No hay BOMs.</div>
                  )}
                </div>
              </details>
              <button className="px-2 py-1 rounded-md border text-xs" title="Filtrar"><ListFilter size={14} /></button>
            </div>
          </div>

          <div className="px-2 pb-2 space-y-1 max-h-[55vh] overflow-y-auto">
            {[...active, ...scheduled].map((o) => (
              <button
                key={o.id}
                onClick={() => selectOrder(o.id)}
                className={`w-full text-left rounded-md p-2 hover:bg-zinc-50 transition-colors ${openOrderId === o.id ? 'ring-1 ring-[hsl(var(--sb-accent-produc))]/30 bg-[hsl(var(--sb-accent-produc)/0.05)]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{o.name || o.id}</p>
                    <p className="text-xs text-zinc-500 truncate">{o.targetQuantity} {o.baseUnit} {o.stage ? `• ${o.stage}` : ''}</p>
                  </div>
                  <div className="shrink-0">
                    {o.status === 'IN_PROGRESS' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">En curso</span>}
                    {o.status === 'PAUSED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">Pausada</span>}
                    {o.status === 'PLANNED' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border">Planificada</span>}
                    {o.status === 'QC_HOLD' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">QC Hold</span>}
                    {o.status === 'PACKAGING' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Envasado</span>}
                  </div>
                </div>
              </button>
            ))}

            {!active.length && !scheduled.length && (
              <div className="text-sm text-zinc-500 px-2 py-6 text-center">Sin órdenes. Crea una desde BOM.</div>
            )}
          </div>
        </SBCard>
      </aside>

      {/* Centro: Workstation */}
      <main className="lg:col-span-6 min-h-[70vh]">
        <SBCard
            title={"Workstation"}
            accent={accent}
        >
            <div className="p-4 min-h-[60vh]">
                <EmptyCenter onPickBom={pickBom} />
            </div>
        </SBCard>
      </main>

      {/* Derecha: Inspectores contextuales (como el panel derecho del playground) */}
      <aside className="lg:col-span-3 space-y-4">
        {/* Próximamente: <ShortagesPanel/>, <QCPanel/>, etc. */}
      </aside>
    </div>
  );
}
