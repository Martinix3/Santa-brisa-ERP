// src/app/(app)/production/execution/page.tsx
"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Hourglass, X, Thermometer, FlaskConical, Beaker, TestTube2, Paperclip, Upload, Trash2, ChevronRight, ChevronDown, Save, Bug, Edit } from "lucide-react";
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import type { ProductionOrder as ProdOrder, Uom, Item, ExecCheck, BillOfMaterial as RecipeBom, OnHandView, ReservationView, StockMove, SantaData } from '@/domain/ssot';
import { availableForItem, fifoReserveLots, buildConsumptionMoves } from '@/domain/inventory.helpers';
import { makeLot, makeProdOrderCode } from '@/lib/codes';
import { SB_COLORS } from "@/domain/ssot";
import { useToaster } from "@/components/ui/Toaster";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { canonicalUomForItem, canonicalUomForFinished } from "@/domain/uom";


// ---------------------- Utilidades de cálculo ----------------------
function scaleQty(qtyPerBatch: number, base: number, target: number) { return (qtyPerBatch * target) / base; }

function planFromRecipe(
  recipe: RecipeBom,
  targetBatchSize: number,
  items: Item[],
  inventory?: OnHandView[],
): { lines: ProdOrder['actuals'], plannedBottles: number, finishedUom: Uom } {
  if (!recipe || !recipe.items) {
    return { lines: [], plannedBottles: 0, finishedUom: "unit" as Uom };
  }
  const itemMap = new Map(items.map(m => [m.id, m]));
  const lines: ProdOrder['actuals'] = (recipe.items || []).map((l) => {
    const theoreticalQty = scaleQty(l.qty, recipe.batchSize, targetBatchSize);
    const item = itemMap.get(l.itemId);
    const uom = canonicalUomForItem(l.itemId, inventory || [], items);
    return {
        itemId: l.itemId,
        name: item?.name || 'Unknown',
        lotNumber: undefined, // Se determinará al iniciar
        theoreticalQty,
        actualQty: theoreticalQty, // Por defecto, lo real es lo teórico
        uom, // 👈 manda inventario/item
        costPerUom: item?.stdCost || 0
    };
  });
  const outputItem = items.find(i => i.id === recipe.outputItemId);
  const bottlesPerLiter = outputItem?.sku.includes('700') ? 1.42 : 1.33;
  const plannedBottles = Math.floor(bottlesPerLiter * targetBatchSize);
  const finishedUom = canonicalUomForFinished(recipe.outputItemId, inventory || []);
  return { lines, plannedBottles, finishedUom };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round1(n: number) { return Math.round(n * 10) / 10; }

function computeCosting(recipe: RecipeBom, po: ProdOrder) {
    if (!po.execution) return undefined;
    const { durationHours = 0, goodUnits = 0 } = po.execution;
    
    let allItems: Item[] = [];
    if (po.actuals && po.actuals.length > 0) {
    }
    
    const { plannedBottles } = planFromRecipe(recipe, po.targetQuantity, allItems);

    let materials = 0;
    
    if(po.actuals && po.actuals.length > 0) {
        for(const act of po.actuals) {
            materials += (act.actualQty || 0) * (act.costPerUom || 0);
        }
    } else {
        const plan = planFromRecipe(recipe, po.targetQuantity, allItems);
        for (const l of plan.lines || []) {
            materials += l.theoreticalQty * (l.costPerUom || 0);
        }
    }
    
    const stdLaborCostPerHour = 25;
    const stdOverheadPerBatch = 50;

    const labor = stdLaborCostPerHour * (durationHours || 0);
    const overhead = stdOverheadPerBatch;
    const total = materials + labor + overhead;
    const costPerBottle = goodUnits > 0 ? total / goodUnits : 0;
    const yieldPct = plannedBottles > 0 ? (goodUnits / plannedBottles) * 100 : 0;
    const scrapBottles = po.execution.scrapUnits ?? Math.max(0, plannedBottles - goodUnits);
    const scrapPct = plannedBottles > 0 ? (scrapBottles / plannedBottles) * 100 : 0;
    
    return {
        materialsEUR: round2(materials), laborEUR: round2(labor), overheadEUR: round2(overhead),
        totalEUR: round2(total), costPerBottleEUR: round2(costPerBottle), yieldPct: round1(yieldPct), scrapPct: round1(scrapPct)
    };
}


// ---------------------- UI auxiliares ----------------------
function Pill({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc"|"green"|"red"|"blue"|"amber"|"slate" }) {
  const map: any = {
    zinc: "bg-zinc-100 text-zinc-800 border border-zinc-200",
    green:"bg-green-100 text-green-800 border border-green-200",
    red:  "bg-red-100 text-red-800 border border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    amber:"bg-amber-100 text-amber-800 border border-amber-200",
    slate:"bg-slate-200 text-slate-800 border border-slate-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[tone]}`}>{children}</span>;
}

// ---------------------- Página /produccion ----------------------
export default function ProduccionPage() {
    const { data: santaData, saveAllCollections } = useData();
    const [recipes, setRecipes] = useState<RecipeBom[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);
    const [busyOp, setBusyOp] = useState<null | "create" | "start" | "update" | "finish" | "delete">(null);
    const { push } = useToaster();
    const [editingOrder, setEditingOrder] = useState<ProdOrder | null>(null);

    const orders = useMemo(() => santaData?.productionOrders || [], [santaData]);
    
    const onHand = useMemo(()=> (santaData?.onHand || []), [santaData?.onHand])
    const allItems = useMemo(() => santaData?.items || [], [santaData]);


    useEffect(() => {
        if (!santaData) return;
        setLoading(true);
        setRecipes(santaData.billOfMaterials as RecipeBom[] || []);
        setLoading(false);
  }, [santaData]);
  
  const createOrder = useCallback(async (args: {
    recipe: RecipeBom; targetBatchSize: number; whenISO: string; responsibleId?: string
  }) => {
    if (!santaData) return;
    setBusyOp("create");
    setLastError(null);
    const { recipe, targetBatchSize, whenISO, responsibleId } = args;
    const { lines: actuals, finishedUom } = planFromRecipe(recipe, targetBatchSize, allItems, onHand);
  
    const shortages: { itemId: string; required: number; available: number; uom: Uom }[] = [];
    const reservations: ReservationView[] = [];
  
    for (const line of actuals || []) {
        const avail = availableForItem(line.itemId, onHand);
        if (avail < line.theoreticalQty) {
          shortages.push({
            itemId: line.itemId,
            required: line.theoreticalQty,
            available: avail,
            uom: line.uom,
          });
        } else {
            const locationPrefix = allItems.find(m => m.id === line.itemId)?.category === 'raw' ? 'RM/MAIN' : 'PKG/MAIN';
            const picks = fifoReserveLots(line.itemId, line.theoreticalQty, onHand, locationPrefix);
            picks.forEach(p => reservations.push({ id: `${p.fromLotNumber}-${args.recipe.id}`, itemId: line.itemId, lotNumber: p.fromLotNumber, qty: p.reservedQty, uom: p.uom, ref: { kind: 'PROD', id: ''}, createdAt: new Date().toISOString() }));
        }
    }
  
    const id = makeProdOrderCode((santaData.productionOrders || []).map(o => o.orderNumber || ''), new Date());
    const now = new Date().toISOString();
  
    const newOrder: ProdOrder = {
      id: `po_${Date.now()}`,
      orderNumber: id,
      bomId: recipe.id,
      outputItemId: recipe.outputItemId,
      targetQuantity: targetBatchSize,
      status: "planned",
      createdAt: now,
      scheduledFor: whenISO,
      responsibleId,
      checks: ((recipe as any).protocolChecklist || []).map((p: any) => ({ id: p.id, done: false })),
      reservations: reservations.length ? reservations : undefined,
      actuals,
    };
  
    try {
        await saveAllCollections({
            productionOrders: [newOrder, ...((santaData.productionOrders) || [])]
        });
      if (shortages.length) {
        push({ kind: "info", text: `Orden creada con faltantes: ${shortages.map(s => allItems.find(m => m.id === s.itemId)?.name).join(", ")}.` });
      } else {
        push({ kind: "ok", text: "Orden creada con stock reservado." });
      }
    } catch (e: any) {
      const msg = e?.message ?? "No se pudo crear la orden.";
      setLastError(msg);
      push({ kind: "err", text: msg });
    } finally {
      setBusyOp(null);
    }
  }, [onHand, saveAllCollections, allItems, santaData, push]);
  

  const updateOrder = useCallback(async (id: string, patch: Partial<ProdOrder>) => {
    if (!santaData) return;
    setBusyOp("update");
    setLastError(null);
    try {
        const updatedOrders = (santaData.productionOrders || []).map((o: ProdOrder) => {
          if (o.id === id) {
              const updatedOrder = { ...o, ...patch } as ProdOrder;
              if (patch.execution && !patch.costing) {
                  const recipe = recipes.find(r => r.id === updatedOrder.bomId);
                  if (recipe) {
                    const c = computeCosting(recipe, updatedOrder);
                    updatedOrder.costing = c as any;
                  }
              }
              return updatedOrder;
          }
          return o;
        });
        await saveAllCollections({ productionOrders: updatedOrders });

      if (patch.status) push({ kind: "ok", text: `Orden ${id} → ${patch.status.toUpperCase()}` });
    } catch (e: any) {
      const msg = e?.message ?? "No se pudo actualizar la orden.";
      setLastError(msg);
      push({ kind: "err", text: msg });
    } finally {
      setBusyOp(null);
    }
  }, [saveAllCollections, recipes, santaData, push]);
  
    const deleteOrder = useCallback(async (id: string) => {
        setBusyOp("delete");
        setLastError(null);
        if (santaData) {
            try {
                const updatedOrders = santaData.productionOrders.filter(o => o.id !== id);
                await saveAllCollections({ productionOrders: updatedOrders });
                push({kind: "ok", text: `Orden ${id} eliminada.`});
            } catch(e: any) {
                const msg = e?.message ?? "No se pudo eliminar la orden.";
                setLastError(msg);
                push({ kind: "err", text: msg });
            } finally {
                setBusyOp(null);
            }
        }
    }, [santaData, saveAllCollections, push]);

    const startOrder = useCallback(async (orderId: string) => {
        if(!santaData) return;
        setBusyOp("start");
        setLastError(null);
        const order = santaData.productionOrders.find(o => o.id === orderId);
        if (!order) return;
    
        if (!order.reservations?.length) {
            push({ kind: "err", text: "No hay reservas. No se puede consumir." });
            setBusyOp(null);
            return;
        }
    
        const moves = buildConsumptionMoves({
        orderId: order.id,
        reservations: order.reservations as any,
        fromLocationId: "RM/MAIN",
        });
    
        const updatedOnHand = onHand; // This should be updated by a worker, not on client.

        try {
            const updatedOrders = (santaData.productionOrders || []).map(o =>
                o.id === orderId
                ? { ...o, status: "wip", execution: { ...(o.execution || {}), startedAt: new Date().toISOString() } } as ProdOrder
                : o
            );
            await saveAllCollections({
                stockMoves: [ ...(santaData.stockMoves || []), ...moves ],
                productionOrders: updatedOrders,
            });
            push({ kind: "ok", text: "Orden iniciada y materias primas descontadas." });
        } catch (e: any) {
        const msg = e?.message ?? "No se pudo iniciar la orden.";
        setLastError(msg);
        push({ kind: "err", text: msg });
        } finally {
        setBusyOp(null);
        }
    }, [santaData, saveAllCollections, onHand, push]);
  

    const finishOrder = useCallback(async (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'unit') => {
        if (!santaData) return;
        setBusyOp("finish");
        setLastError(null);
        const recipe = recipes.find(r => r.id === o.bomId);
        if (!recipe || !o.execution?.startedAt) return;
    
        const finishedAt = new Date().toISOString();
        const durationMs = new Date(finishedAt).getTime() - new Date(o.execution.startedAt).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
    
        const outputItem = allItems.find(i => i.id === recipe.outputItemId);
        const bottlesPerLiter = outputItem?.sku.includes('700') ? 1.42 : 1.33;
        const goodUnits = yieldUom === 'unit' ? finalYield : Math.floor(finalYield * bottlesPerLiter);
    
        const finalExecution = {
            ...(o.execution),
            finalYield,
            yieldUom,
            goodUnits,
            finishedAt,
            durationHours: round2(durationHours),
        };
        
        const newLotNumber = makeLot({
            date: new Date(),
            sku: outputItem!.sku,
            seq: 1 // This should be calculated based on existing lots
        });
    
        const newLotCosting = computeCosting(recipe!, { ...o, execution: finalExecution });

        const newOnHandItem: OnHandView = {
            id: `onhand_${newLotNumber}`,
            itemId: recipe.outputItemId,
            lotNumber: newLotNumber,
            qty: finalExecution.goodUnits || 0,
            uom: "unit",
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            locationId: "FG/QA",
        };
        
        try {
            const updatedOrders = (santaData.productionOrders || []).map((po: any) =>
                po.id === o.id
                ? { ...po, status: "done" as const, execution: finalExecution, batchCode: newLotNumber, costing: newLotCosting }
                : po
            );
            await saveAllCollections({ 
                onHand: [ ...(santaData.onHand || []), newOnHandItem ],
                productionOrders: updatedOrders 
            });
            push({ kind: "ok", text: `Orden ${o.id} completada. Lote ${newLotNumber} creado.` });
        } catch (e: any) {
            const msg = e?.message ?? "No se pudo finalizar la orden.";
            setLastError(msg);
            push({ kind: "err", text: msg });
        } finally {
            setBusyOp(null);
        }
    }, [recipes, santaData, saveAllCollections, push, allItems]);


  if (loading || !santaData) return <div className="p-6">Cargando producción…</div>;
  if (!recipes.length) return <div className="p-6">No hay recetas disponibles.</div>;

  return (
    <div className="p-6 flex flex-col gap-6" style={{ ['--line' as any]: '#E6E4DD' }}>
      {lastError && (
        <Banner kind="err" text={lastError} />
      )}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Producción</h1>
            <p className="text-sm text-zinc-500">Órdenes, faltantes y programaciones</p>
          </div>
          <CreateOrderCard recipes={recipes} onCreate={createOrder} onEdit={updateOrder} editingOrder={editingOrder} onCloseEdit={() => setEditingOrder(null)} busy={busyOp === "create"}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tarjeta de faltantes globales */}
          <MissingMaterialsCard orders={orders} allItems={allItems} />
          {/* Próximas producciones programadas */}
          <UpcomingScheduleCard orders={orders} recipes={recipes} allItems={allItems} />
          {/* Puedes dejar un hueco para KPIs o un mini-ratio stock/consumo */}
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="text-xs text-zinc-500 mb-2">Resumen rápido</div>
            <div className="text-sm grid grid-cols-2 gap-2">
              <div>Órdenes abiertas: <b>{orders.filter(o => o.status!=='done' && o.status!=='cancelled').length}</b></div>
              <div>Con faltantes: <b className={orders.some(o=>o.shortages?.length)?'text-red-600':'text-zinc-800'}>
                {orders.filter(o => o.shortages?.length).length}
              </b></div>
            </div>
          </div>
        </div>
      </header>

      <OrdersList orders={orders} recipes={recipes} onStart={startOrder} onFinish={finishOrder} onUpdate={updateOrder} onDelete={deleteOrder} onEdit={setEditingOrder} inventory={onHand} allItems={allItems} busyOp={busyOp} />
    </div>
  );
}

// ---------------------- UI: creación de orden ----------------------
function CreateOrderCard({ recipes, onCreate, onEdit, editingOrder, onCloseEdit, busy }: { 
    recipes: RecipeBom[]; 
    onCreate: (p: { recipe: RecipeBom; targetBatchSize: number; whenISO: string; responsibleId?: string }) => Promise<void>;
    onEdit: (id: string, patch: Partial<ProdOrder>) => Promise<void>;
    editingOrder: ProdOrder | null;
    onCloseEdit: () => void;
    busy: boolean;
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const { data: santaData } = useData();
  const allItems = useMemo(() => santaData?.items || [], [santaData]);
  const allOnHand = useMemo(() => santaData?.onHand || [], [santaData]);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedRecipeId), [recipes, selectedRecipeId]);

  const [target, setTarget] = useState<number>(100);
  const [when, setWhen] = useState<string>(() => new Date().toISOString().slice(0,16));
  const [resp, setResp] = useState<string>("");
  
  useEffect(() => {
    if (editingOrder) {
      setSelectedRecipeId(editingOrder.bomId);
      setTarget(editingOrder.targetQuantity);
      setWhen(editingOrder.scheduledFor ? new Date(editingOrder.scheduledFor).toISOString().slice(0, 16) : '');
      setResp(editingOrder.responsibleId || '');
    } else {
        setSelectedRecipeId(recipes[0]?.id || "");
        setTarget(recipes[0]?.batchSize || 100);
        setWhen(new Date().toISOString().slice(0,16));
        setResp("");
    }
  }, [editingOrder, recipes]);

  const plan = useMemo(() => selectedRecipe ? planFromRecipe(selectedRecipe, target, allItems, allOnHand) : null, [selectedRecipe, target, allItems, allOnHand]);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedRecipe && !editingOrder) {
        setTarget(selectedRecipe.batchSize);
    }
  }, [selectedRecipe, editingOrder]);
  
  if (!selectedRecipe && !editingOrder) return null;
  const recipeToUse = editingOrder ? recipes.find(r => r.id === editingOrder.bomId) : selectedRecipe;
  if (!recipeToUse) return null;

  const { plannedBottles } = plan || { plannedBottles: 0 };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
        if (editingOrder) {
            await onEdit(editingOrder.id, {
                targetQuantity: target,
                scheduledFor: new Date(when).toISOString(),
                responsibleId: resp || undefined
            });
        } else {
            await onCreate({ recipe: recipeToUse, targetBatchSize: target, whenISO: new Date(when).toISOString(), responsibleId: resp||undefined });
        }
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 w-full max-w-xl">
      <div className="flex justify-between items-start mb-2">
          <label className="text-sm">
            <span className="block text-zinc-500 text-xs mb-1">Receta (BOM)</span>
            <select 
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              disabled={!!editingOrder}
              className="font-medium px-2 py-1.5 w-full rounded-lg border border-zinc-300 bg-white"
            >
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
           {editingOrder && <SBButton variant="secondary" size="sm" onClick={onCloseEdit}>Cerrar Edición</SBButton>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block text-zinc-500 text-xs mb-1">
            Tamaño de lote ({(recipeToUse as any).baseUnit ?? 'L'})
          </span>
          <input type="number" min={10} step={10} value={target} onChange={e=>setTarget(parseFloat(e.target.value||"0"))} className="px-2 py-1.5 w-full rounded-lg border border-zinc-300" />
        </label>
        <label className="text-sm">
          <span className="block text-zinc-500 text-xs mb-1">Programar para</span>
          <input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} className="px-2 py-1.5 w-full rounded-lg border border-zinc-300" />
        </label>
        <label className="text-sm col-span-2">
          <span className="block text-zinc-500 text-xs mb-1">Responsable (opcional)</span>
          <input value={resp} onChange={e=>setResp(e.target.value)} placeholder="userId / email" className="px-2 py-1.5 w-full rounded-lg border border-zinc-300" />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-zinc-600">Botellas planificadas: <b>{plannedBottles}</b></div>
        <SpinnerButton
          loading={isSaving || busy}
          onClick={handleSave}
          className="bg-zinc-900 text-white"
          disabled={isSaving || busy}
        >
          {editingOrder ? 'Actualizar orden' : (isSaving ? 'Creando…':'Crear orden')}
        </SpinnerButton>
      </div>
    </div>
  );
}

function ConfirmDeleteButton({ onClick, orderId, isBusy }: { onClick: (id: string) => void; orderId: string, isBusy: boolean }) {
    const [confirming, setConfirming] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = () => {
        if (isBusy) return;
        if (confirming) {
            if (timerRef.current) clearTimeout(timerRef.current);
            onClick(orderId);
            setConfirming(false);
        } else {
            setConfirming(true);
            timerRef.current = setTimeout(() => setConfirming(false), 3000);
        }
    };
    
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <button
            onClick={handleClick}
            onBlur={() => { if (timerRef.current) clearTimeout(timerRef.current); setConfirming(false); }}
            className={`p-2 rounded-lg border text-zinc-600 transition-colors ${
                confirming
                    ? 'bg-red-500 text-white border-red-600'
                    : 'border-zinc-300 hover:bg-red-50 hover:text-red-700'
            }`}
            title={confirming ? `Confirmar borrado de ${orderId}`: `Eliminar ${orderId}`}
            disabled={isBusy}
        >
            {confirming ? <Check size={14} /> : <Trash2 size={14} />}
        </button>
    );
}

function OrdersList({ orders, recipes, onStart, onFinish, onUpdate, onDelete, onEdit, inventory, allItems, busyOp }: { 
    orders: ProdOrder[]; 
    recipes: RecipeBom[]; 
    onStart: (id: string)=>void; 
    onFinish: (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'unit')=>void; 
    onUpdate: (id:string, patch: Partial<ProdOrder>)=>Promise<void>; 
    onDelete: (id: string) => Promise<void>;
    onEdit: (order: ProdOrder) => void;
    inventory: OnHandView[], allItems: Item[], busyOp: string | null 
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openOrder = orders.find(o => o.id === openId) || null;
  const openRecipe = openOrder ? recipes.find(r => r.id === openOrder.bomId) : null;
  
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left">Orden</th>
            <th className="px-3 py-2 text-left">Estado</th>
            <th className="px-3 py-2 text-left">Programada</th>
            <th className="px-3 py-2 text-left">Resp.</th>
            <th className="px-3 py-2 text-left">Plan botellas</th>
            <th className="px-3 py-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const recipe = recipes.find(r => r.id === o.bomId);
            const { plannedBottles: plan } = recipe ? planFromRecipe(recipe, o.targetQuantity, allItems) : { plannedBottles: 0 };
            return (
            <tr key={o.id} className="border-t border-[var(--line)]">
              <td className="px-3 py-2 font-medium">{o.orderNumber || o.id}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    {o.status === 'planned' && <Pill tone="amber">PROGRAMADA</Pill>}
                    {o.status === 'released' && <Pill tone="blue">LIBERADA</Pill>}
                    {o.status === 'wip' && <Pill tone="blue">EN PROCESO</Pill>}
                    {o.status === 'done' && <Pill tone="green">COMPLETADA</Pill>}
                    {o.status === 'cancelled' && <Pill tone="slate">CANCELADA</Pill>}
                </div>
              </td>
              <td className="px-3 py-2">{o.scheduledFor ? new Date(o.scheduledFor).toLocaleString() : '—'}</td>
              <td className="px-3 py-2">{o.responsibleId || '—'}</td>
              <td className="px-3 py-2">{plan}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex gap-1 justify-end">
                    <button onClick={()=>setOpenId(o.id)} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50">Abrir</button>
                    {o.status === 'planned' && (
                        <>
                            <button onClick={() => onEdit(o)} className="p-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-blue-50 hover:text-blue-700" title="Editar"><Edit size={14} /></button>
                            <ConfirmDeleteButton onClick={onDelete} orderId={o.id} isBusy={busyOp === 'delete'}/>
                        </>
                    )}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {openOrder && openRecipe && (
        <div className="border-t border-[var(--line)] p-4 bg-zinc-50/60">
          <OrderDetail order={openOrder} recipe={openRecipe} onClose={()=>setOpenId(null)} onStart={startOrder} onFinish={onFinish} onUpdate={onUpdate} inventory={inventory} allItems={allItems} busyOp={busyOp} />
        </div>
      )}
    </div>
  );
}

function OrderDetail({ order, recipe, onClose, onStart, onFinish, onUpdate, inventory, allItems, busyOp }: { 
    order: ProdOrder; 
    recipe: RecipeBom; 
    onClose: ()=>void; 
    onStart: (id: string)=>void; 
    onFinish: (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'unit')=>void; 
    onUpdate: (id:string, patch: Partial<ProdOrder>)=>Promise<void>; 
    inventory: OnHandView[], allItems: Item[], busyOp: string | null 
}) {
  const defaultYieldUom = useMemo(
    () => canonicalUomForFinished(recipe.outputItemId, inventory),
    [recipe.outputItemId, inventory]
  ) as 'L'|'unit';
  const [finalYield, setFinalYield] = useState<number | ''>('');
  const [yieldUom, setYieldUom] = useState<'L' | 'unit'>(defaultYieldUom === 'L' ? 'L' : 'unit');
  const [incidentNote, setIncidentNote] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const protocolsOk = (order.checks || []).every(c => c.done);
  const { plannedBottles } = planFromRecipe(recipe, order.targetQuantity, allItems);

  const handleFinish = () => {
    if (finalYield === '') return;
    onFinish(order, finalYield, yieldUom);
  };
  
  const handleActualsChange = (index: number, newQty: number) => {
    const updatedActuals = [...(order.actuals || [])];
    updatedActuals[index].actualQty = newQty;
    onUpdate(order.id, { actuals: updatedActuals });
  };

  const Summary = useMemo(() => {
      if (!order.costing) return null;
      const { execution, costing } = order;
      if (!execution) return null;
      
      const plannedYield = (recipe.baseUnit === 'L' ? order.targetQuantity : plannedBottles);
      const plannedUom = recipe.baseUnit === 'L' ? 'L' : 'unit';
      const actualYield = execution.finalYield ?? 0;
      const merma = plannedYield > 0 ? plannedYield - actualYield : 0;
      const mermaPct = plannedYield > 0 ? (merma / plannedYield) * 100 : 0;
      
      let durationStr = '0m';
      if (execution.durationHours) {
          const hours = Math.floor(execution.durationHours);
          const minutes = Math.round((execution.durationHours - hours) * 60);
          durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
      }
      
      return (
        <div className="md:col-span-2 rounded-xl border border-[var(--line)] bg-white">
            <div className="px-4 py-3 border-b border-[var(--line)] text-sm text-zinc-500">Resumen de Producción</div>
            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>Total lote: <b>{(costing as any).totalEUR.toFixed(2)} €</b></div>
              <div>Coste/botella: <b>{(costing as any).costPerBottleEUR.toFixed(3)} €</b></div>
              <div>Duración: <b>{durationStr}</b></div>
              <div>Rendimiento: <b>{(costing as any).yieldPct.toFixed(1)}%</b></div>
              <div>Merma: <b>{merma.toFixed(2)} {plannedUom} ({mermaPct.toFixed(1)}%)</b></div>
              <div className="col-span-full mt-2">
                <p className="font-bold">Incidencias Registradas:</p>
                {order.incidents?.length ? (
                    <ul className="list-disc list-inside text-xs">
                        {order.incidents.map((i: any) => <li key={i.id}>{i.text}</li>)}
                    </ul>
                ) : <p className="text-xs text-zinc-500">Ninguna.</p>}
              </div>
            </div>
             <div className="p-3 border-t flex justify-end">
                <SBButton onClick={() => onUpdate(order.id, { costing: order.costing })}><Save size={16} className="sb-icon"/> Guardar Resultados</SBButton>
             </div>
        </div>
      );
  }, [order, recipe, plannedBottles, onUpdate]);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium flex items-center gap-2">
          Orden {order.orderNumber || order.id}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm flex items-center gap-2 hover:bg-zinc-100">
              <Bug size={14} className="sb-icon"/> Diagnóstico
          </button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-zinc-300">Cerrar</button>
        </div>
      </div>

      <AnimatePresence>
        {showDiagnostics && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
            >
                <div className="mb-4 p-3 border-2 border-dashed border-red-300 bg-red-50 rounded-lg text-xs">
                    <h4 className="font-bold text-red-800 mb-2">PANEL DE DIAGNÓSTICO</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h5 className="font-semibold">Orden Abierta</h5>
                            <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded max-h-60 overflow-auto">{JSON.stringify(order, null, 2)}</pre>
                        </div>
                        <div>
                            <h5 className="font-semibold">Receta (BOM)</h5>
                            <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded max-h-60 overflow-auto">{JSON.stringify(recipe, null, 2)}</pre>
                        </div>
                        <div>
                            <h5 className="font-semibold">Inventario Completo (Almacén)</h5>
                            <div className="bg-white p-2 rounded max-h-60 overflow-auto">
                                <table className="w-full text-[10px]">
                                    <thead className="sticky top-0 bg-zinc-100">
                                        <tr className="text-left">
                                            <th>ID Lote</th>
                                            <th>ItemID</th>
                                            <th>Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventory.map((item: any) => (
                                            <tr key={item.id} className="border-t">
                                                <td className="py-1 font-mono">{item.lotNumber?.substring(0, 12) || item.id.substring(0,12)}...</td>
                                                <td>{item.itemId}</td>
                                                <td className="text-right font-bold">{item.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-2 gap-4">
        <ProtocolsBlock order={order} recipe={recipe} onToggle={async (id)=>{
          const next = (order.checks || []).map((c: ExecCheck) => c.id===id ? { ...c, done: !c.done, checkedAt: new Date().toISOString() } : c);
          await onUpdate(order.id, { checks: next });
        }} />
        
        <ActualsBlock actuals={order.actuals || []} onChange={handleActualsChange} />
        
        <div className="md:col-span-2">
            {order.status === "planned" && (
                <div className="flex justify-end gap-2 p-3 bg-zinc-50 rounded-lg">
                    <SBButton disabled={!!order.shortages?.length || busyOp !== null} onClick={() => onUpdate(order.id, { status: "released" } )}>
                        Liberar para Producción <ChevronRight size={16} className="sb-icon"/>
                    </SBButton>
                </div>
            )}

            {order.status === "released" && (
                <div className="flex justify-end gap-2 p-3 bg-zinc-50 rounded-lg">
                    <div className="text-sm text-zinc-600 mr-auto">Protocolos: {protocolsOk ? <b className="text-green-600">OK</b> : <b className="text-red-600">Faltan ✓</b>}</div>
                    <SBButton disabled={!protocolsOk || busyOp !== null} onClick={() => onStart(order.id)}>Iniciar Producción <ChevronRight size={16} className="sb-icon"/></SBButton>
                </div>
            )}

             {order.status === "wip" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <h3 className="font-semibold text-blue-800">Finalizar Producción</h3>
                     <div className="grid grid-cols-2 gap-3 text-sm">
                         <label>
                          <div className="text-xs text-zinc-500">Resultado Final</div>
                          <div className="flex">
                            <input type="number" min={0} value={finalYield} onChange={e=>setFinalYield(e.target.value===''? '' : parseFloat(e.target.value))} className="px-2 py-1.5 w-full rounded-l-lg border border-zinc-300"/>
                            <select value={yieldUom} onChange={e => setYieldUom(e.target.value as any)} className="px-2 py-1.5 rounded-r-lg border-t border-b border-r border-zinc-300 bg-zinc-100">
                                <option value="unit">botellas</option>
                                <option value="L">Litros</option>
                            </select>
                          </div>
                        </label>
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Incidencias</div>
                          <div className="flex gap-2">
                            <input value={incidentNote} onChange={e=>setIncidentNote(e.target.value)} placeholder="Describe la incidencia" className="flex-1 px-2 py-1.5 rounded-lg border border-zinc-300"/>
                            <SBButton variant="secondary" onClick={async ()=>{
                              if (!incidentNote.trim()) return;
                              const incidents = [ ...(order.incidents||[]), { id: Math.random().toString(36).slice(2,8), when: new Date().toISOString(), severity: 'MEDIA', text: incidentNote.trim() } ];
                              await onUpdate(order.id, { incidents: incidents as any });
                              setIncidentNote("");
                            }}>Añadir</SBButton>
                          </div>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <SpinnerButton loading={busyOp === "finish"} onClick={handleFinish} disabled={finalYield === '' || busyOp !== null}>
                           Finalizar Producción
                        </SpinnerButton>
                     </div>
                </div>
             )}

            {order.status === 'done' && Summary}
        </div>
      </div>
    </div>
  );
}

function ProtocolsBlock({ order, recipe, onToggle }: { order: ProdOrder; recipe: RecipeBom; onToggle: (id: string)=>void }) {
  return (
    <div className="rounded-xl border border-[var(--line)]">
      <div className="px-4 py-3 border-b border-[var(--line)] text-sm text-zinc-500">Protocolos previos</div>
      <ul className="p-3 divide-y divide-[var(--line)]">
        {(order.checks || []).map((c: any) => (
          <li key={c.id} className="py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <button onClick={()=>onToggle(c.id)} className={`w-5 h-5 rounded border flex items-center justify-center ${c.done ? 'bg-green-500 border-green-600 text-white' : 'border-zinc-300'}`}>{c.done ? '✓' : ''}</button>
              <span>{((recipe as any).protocolChecklist || []).find((pc: any) => pc.id === c.id)?.text || c.id}</span>
            </div>
            <div className="text-xs text-zinc-500">{c.checkedAt ? new Date(c.checkedAt).toLocaleString() : '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActualsBlock({ actuals, onChange }: { actuals: ProdOrder['actuals'], onChange: (index: number, newQty: number) => void }) {
    return (
        <div className="rounded-xl border border-[var(--line)]">
            <div className="px-4 py-3 border-b border-[var(--line)] text-sm text-zinc-500">Consumos Reales</div>
            <div className="p-3 space-y-2">
                {(actuals || []).map((item, index) => (
                    <div key={item.itemId + index} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 text-sm">
                        <div className="font-medium text-zinc-800">{item.name} <span className="text-xs text-zinc-500 font-mono">({item.itemId})</span></div>
                        <div className="text-center">{(item.theoreticalQty || 0).toFixed(2)} {item.uom} <span className="text-xs text-zinc-500">(Teórico)</span></div>
                        <input
                            type="number"
                            value={item.actualQty}
                            onChange={e => onChange(index, parseFloat(e.target.value || '0'))}
                            className="w-full px-2 py-1 rounded-md border border-zinc-300 bg-white"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MissingMaterialsCard({ orders, allItems }: { orders: ProdOrder[]; allItems: Item[] }) {
  const shortagesMap = useMemo(() => {
    const m = new Map<string, { required: number; available: number; uom: Uom }>();
    orders
      .filter(o => (o.status === 'planned' || o.status === 'released') && o.shortages?.length)
      .forEach(o => o.shortages!.forEach((s: any) => {
        const cur = m.get(s.itemId);
        if (!cur) m.set(s.itemId, { required: s.required, available: s.available, uom: s.uom });
        else m.set(s.itemId, { required: cur.required + s.required, available: s.available, uom: s.uom });
      }));
    return m;
  }, [orders]);

  const items = [...shortagesMap.entries()]
    .map(([itemId, v]) => ({ itemId, missing: Math.max(0, v.required - v.available), uom: v.uom }))
    .filter(x => x.missing > 0)
    .sort((a,b)=> b.missing - a.missing)
    .slice(0, 8);

  const hasShortages = items.length > 0;

  return (
    <div className={`rounded-2xl border p-4 ${hasShortages ? 'border-red-300 bg-red-50' : 'border-[var(--line)] bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm ${hasShortages ? 'text-red-800' : 'text-zinc-500'}`}>
          {hasShortages ? 'Materiales faltantes' : 'Sin faltantes'}
        </div>
        {hasShortages && <Pill tone="red">ALERTA</Pill>}
      </div>
      {hasShortages ? (
        <ul className="space-y-1 text-sm">
          {items.map(it => (
            <li key={it.itemId} className="flex justify-between">
              <span className="truncate">{allItems.find(m => m.id === it.itemId)?.name || it.itemId}</span>
              <span className="font-mono">-{it.missing.toFixed(2)} {it.uom}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">Todo listo para producir.</p>
      )}
    </div>
  );
}

function UpcomingScheduleCard({ orders, recipes, allItems }: { orders: ProdOrder[]; recipes: RecipeBom[]; allItems: Item[] }) {
  const upcoming = useMemo(() => {
    return orders
      .filter(o => o.status === 'planned' || o.status === 'released')
      .filter(o => o.scheduledFor)
      .sort((a,b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
      .slice(0, 3)
      .map(o => {
        const recipe = recipes.find(r => r.id === o.bomId);
        const outputItem = allItems.find(i => i.id === recipe?.outputItemId);
        const { plannedBottles } = recipe ? planFromRecipe(recipe, o.targetQuantity, allItems) : { plannedBottles: 0 };
        return { id: o.id, when: o.scheduledFor!, status: o.status, plannedBottles, sku: outputItem?.sku, name: recipe?.name };
      });
  }, [orders, recipes, allItems]);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="text-xs text-zinc-500 mb-2">Próximas producciones</div>
      {upcoming.length ? (
        <ul className="text-sm space-y-2">
          {upcoming.map(u => (
            <li key={u.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.name || u.sku || u.id}</div>
                <div className="text-xs text-zinc-500">{new Date(u.when).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={u.status === 'released' ? 'blue' : 'amber'}>{u.status === 'released' ? 'LIBERADA' : 'PROGRAMADA'}</Pill>
                <span className="text-xs text-zinc-600">Plan: <b>{u.plannedBottles}</b></span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">No hay órdenes próximas.</p>
      )}
    </div>
  );
}
