// src/app/(app)/production/execution/page.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import { toast } from "sonner";
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom } from '@/domain/ssot.v7';
import { planProduction } from "@/server/actions/production.actions";
import { ProductionSidebar } from "@/features/production/execution/components/ProductionSidebar";
import { ActiveOrderPanel } from "@/features/production/execution/components/ActiveOrderPanel";
import { EmptyState, SBCard } from "@/components/ui/ui-primitives";
import { MousePointerClick } from "lucide-react";
import { picksToRealLines } from "@/features/production/execution/helpers";

// --- Definición de Tipos para el Estado del Formulario ---
type FormOutput = {
    itemId: string;
    sku?: string;
    qty: number;
    uom: Uom | "uds";
    toLocationId: string;
    lotNumber?: string;
};

type FormConsumptionLine = {
    itemId: string;
    itemName: string;
    lotNumber: string;
    theoreticalQty: number;
    realQty: number;
    uom: Uom;
    fromLocationId: string;
};

type ActiveFormState = {
    order: ProductionOrder | null;
    planningBom: RecipeBom | null;
    finalOutput: FormOutput;
    realConsumption: FormConsumptionLine[];
    stockOk: boolean;
    shortages: any[];
    requiredLots: any[];
    responsibleId?: string;
    protocolChecks?: boolean[];
    incidentText?: string;
    incidentSeverity?: 'LOW' | 'MEDIUM' | 'HIGH';
    journal?: any[];
    plannedDate?: string; // ✅ Campo separado para fecha de planificación
};


// --- Componente Skeleton para el Estado de Carga ---
function ProductionExecutionSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
            <div className="lg:col-span-3 space-y-4">
                <SBCard className="h-64"><div className="sb-skeleton h-full w-full"></div></SBCard>
                <SBCard className="h-48"><div className="sb-skeleton h-full w-full"></div></SBCard>
            </div>
            <div className="lg:col-span-9">
                <SBCard className="h-96"><div className="sb-skeleton h-full w-full"></div></SBCard>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';

export default function ProductionExecutionPage() {
  const router = useRouter();
  const { data } = useData();
  const items = data?.items ?? [];
  const onHand = data?.onHand ?? [];
  const recipes = (data?.billOfMaterials ?? []) as RecipeBom[];
  const ordersRaw = (data?.productionOrders ?? []) as ProductionOrder[];

  const itemsMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const [activeForm, setActiveForm] = useState<ActiveFormState | null>(null);

  const openPlanningFromBom = useCallback((bom: RecipeBom) => {
    const outputItem = itemsMap.get(bom.outputItemId);
    setActiveForm({
        order: null,
        planningBom: bom,
        finalOutput: {
            itemId: bom.outputItemId,
            sku: outputItem?.sku,
            qty: 1,
            uom: (bom.stage === "ENVASADO" ? "unit" : "L"),
            toLocationId: 'FG/MAIN',
            lotNumber: ''
        },
        realConsumption: [],
        stockOk: false,
        shortages: [],
        requiredLots: [],
        responsibleId: '',
        protocolChecks: [false, false, false, false],
        incidentText: '',
        incidentSeverity: 'LOW',
        journal: [],
        plannedDate: new Date().toISOString().slice(0, 10) // ✅ Fecha por defecto
    });
  }, [itemsMap]);

  const openExecution = useCallback((order: ProductionOrder) => {
    const outputItem = itemsMap.get(order.outputItemId);
    const existingOutput = (order.finalOutputs?.[0] as FormOutput);
    setActiveForm({
        order: order,
        planningBom: null,
        finalOutput: existingOutput ?? {
            itemId: order.outputItemId,
            sku: outputItem?.sku,
            qty: order.targetQuantity,
            uom: order.baseUnit as Uom,
            toLocationId: 'FG/MAIN',
            lotNumber: ''
        },
        realConsumption: picksToRealLines(order.reservations || [], itemsMap),
        stockOk: true,
        shortages: order.shortages ?? [],
        requiredLots: order.reservations ?? [],
        responsibleId: (order as any).responsibleId ?? '',
        protocolChecks: (order as any).protocolChecks ?? [false, false, false, false],
        incidentText: '',
        incidentSeverity: 'LOW',
        journal: (order as any).journal ?? []
    });
  }, [itemsMap]);

  const handleProgram = async () => {
    if (!activeForm?.planningBom) return;
    const planQty = activeForm.finalOutput.qty ?? 1;
    if (planQty <= 0) { toast.error("La cantidad debe ser mayor que cero."); return; }

    const res = await planProduction({
      bomId: activeForm.planningBom.id,
      qty: planQty,
      plannedDate: activeForm.plannedDate,
      reservations: activeForm.requiredLots,
      idempotencyKey: crypto.randomUUID()
    });

    if (res.ok) {
      toast.success("Orden planificada exitosamente");
      setActiveForm(null);
      // ✅ Sin refresh - el usuario puede seleccionar la nueva orden de la sidebar
    } else {
      toast.error(res.message ?? "No se pudo planificar");
    }
  };
  
  // Añadido estado de carga con skeleton
  if (!data) {
      return <ProductionExecutionSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-3">
        <ProductionSidebar
          recipes={recipes}
          orders={ordersRaw}
          onSelectBom={openPlanningFromBom}
          onSelectOrder={openExecution}
        />
      </div>

      <div className="lg:col-span-9">
        {!activeForm ? (
            <EmptyState
              icon={MousePointerClick}
              title="Nada seleccionado"
              description="Selecciona una receta para planificar o una orden activa para ejecutar."
            />
        ) : (
            <ActiveOrderPanel
              activeForm={activeForm}
              setActiveForm={setActiveForm}
              onProgram={handleProgram}
              items={items}
              onHand={onHand}
              recipes={recipes}
            />
        )}
      </div>
    </div>
  );
}
