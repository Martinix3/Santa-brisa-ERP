

"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// =============================================================
// SB Producción — SSOT/Firestore (orden + stock + costes)
// Se eliminó la lógica de adaptadores para conectar directamente
// con los datos de prueba en memoria.
// =============================================================

import { AlertCircle, Check, Hourglass, X, Thermometer, FlaskConical, Beaker, TestTube2, Paperclip, Upload, Trash2, ChevronRight, ChevronDown, Save, Bug } from "lucide-react";
import { SBCard, SBButton, SB_COLORS } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import type { ProductionOrder as ProdOrder, Uom, Material, Shortage, ActualConsumption, InventoryItem, Product, SantaData } from "@/domain/ssot";
import type { RecipeBomExec as RecipeBom, ExecCheck } from '@/domain';
import { availableForMaterial, fifoReserveLots, buildConsumptionMoves, consumeForOrder } from '@/domain/inventory.helpers';
import { generateNextLot } from "@/lib/codes";


// ---------------------- Utilidades de cálculo ----------------------
function scaleQty(qtyPerBatch: number, base: number, target: number) { return (qtyPerBatch * target) / base; }

function planFromRecipe(recipe: RecipeBom, targetBatchSize: number, materials: Material[]): { lines: ActualConsumption[], plannedBottles: number } {
  if (!recipe || !recipe.lines) {
    return { lines: [], plannedBottles: 0 };
  }
  const materialMap = new Map(materials.map(m => [m.id, m]));
  const lines: ActualConsumption[] = recipe.lines.map(l => {
    const theoreticalQty = scaleQty(l.qtyPerBatch, recipe.baseBatchSize, targetBatchSize);
    const material = materialMap.get(l.materialId);
    return {
        materialId: l.materialId,
        name: material?.name || l.name || 'Unknown',
        fromLot: undefined, // Se determinará al iniciar
        theoreticalQty,
        actualQty: theoreticalQty, // Por defecto, lo real es lo teórico
        uom: l.uom,
        costPerUom: material?.standardCost || l.stdCostPerUom || 0
    };
  });
  const plannedBottles = Math.floor((recipe.bottlesPerLitre || 1.4) * targetBatchSize); // Fallback to 1.4 bottles/L (700ml)
  return { lines, plannedBottles };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round1(n: number) { return Math.round(n * 10) / 10; }

function computeCosting(recipe: RecipeBom, po: ProdOrder) {
    if (!po.execution) return undefined;
    const { durationHours = 0, goodBottles = 0 } = po.execution;
    
    let allMaterials: Material[] = []; // This will be populated from context
    if (po.actuals && po.actuals.length > 0) {
        // A bit of a hack, we should get allMaterials from context.
        // For now, this is a placeholder.
    }
    
    const { plannedBottles } = planFromRecipe(recipe, po.targetQuantity, allMaterials);

    let materials = 0;
    
    if(po.actuals && po.actuals.length > 0) {
        for(const act of po.actuals) {
            materials += act.actualQty * act.costPerUom;
        }
    } else {
        const plan = planFromRecipe(recipe, po.targetQuantity, allMaterials);
        for (const l of plan.lines) {
            materials += l.theoreticalQty * l.costPerUom;
        }
    }

    const labor = (recipe.stdLaborCostPerHour || 0) * (durationHours || 0);
    const overhead = recipe.stdOverheadPerBatch || 0;
    const total = materials + labor + overhead;
    const costPerBottle = goodBottles > 0 ? total / goodBottles : 0;
    const yieldPct = plannedBottles > 0 ? (goodBottles / plannedBottles) * 100 : 0;
    const scrapBottles = po.execution.scrapBottles ?? Math.max(0, plannedBottles - goodBottles);
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
    blue: "bg-blue-100 text-blue-800 border border-blue-200",
    amber:"bg-amber-100 text-amber-800 border border-amber-200",
    slate:"bg-slate-200 text-slate-800 border border-slate-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[tone]}`}>{children}</span>;
}

// ---------------------- Página /produccion ----------------------
export default function ProduccionPage() {
    const { data: santaData, setData } = useData();
    const [recipes, setRecipes] = useState<RecipeBom[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const orders = useMemo(() => santaData?.productionOrders || [], [santaData]);
    
    const warehouseInventory = useMemo(()=> (santaData?.inventory || []) as InventoryItem[], [santaData?.inventory])
    const products = useMemo(()=> (santaData?.products || []) as Product[], [santaData?.products])
    const allMaterials = useMemo(() => santaData?.materials || [], [santaData]);


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);
    
    useEffect(() => {
        if (!santaData) return;
        setLoading(true);
        const recipeData = (santaData.billOfMaterials || []).map((b: any) => ({
            id: b.id || `bom_${b.sku}`,
            name: b.name,
            finishedSku: b.sku,
            finishedName: b.name,
            baseBatchSize: b.batchSize,
            baseUnit: (b.baseUnit || 'L') as Uom,
            commercialSku: b.sku,
            bottlesPerLitre: b.sku.includes('700') ? 1.42 : 1.33,
            lines: b.items.map((i: any) => {
                const mat = allMaterials.find(m => m.id === i.materialId);
                return {
                    materialId: i.materialId,
                    name: mat?.name || 'Unknown',
                    qtyPerBatch: i.quantity,
                    uom: (i.unit || mat?.unit || 'ud') as Uom,
                    stdCostPerUom: mat?.standardCost || 0,
                }
            }),
            protocolChecklist: [{id:'check1', text:'Verificar limpieza'}],
            stdLaborCostPerHour: 25,
            stdLaborHoursPerBatch: 2,
            stdOverheadPerBatch: 50,
        }));
        setRecipes(recipeData);
        setLoading(false);
  }, [santaData, allMaterials]);
  
  const showNotification = (message: string) => {
    setNotification(message);
  };

  const createOrder = useCallback(async (args: {
    recipe: RecipeBom; targetBatchSize: number; whenISO: string; responsibleId?: string
  }) => {
    if (!santaData) return;
  
    const { recipe, targetBatchSize, whenISO, responsibleId } = args;
  
    const { lines: actuals } = planFromRecipe(recipe, targetBatchSize, allMaterials);
  
    const shortages: Shortage[] = [];
    const reservations: { materialId: string; fromLot: string; reservedQty: number; uom: Uom }[] = [];
  
    for (const line of actuals) {
      const avail = availableForMaterial(line.materialId, warehouseInventory, allMaterials, "RM/");
      if (avail < line.theoreticalQty) {
        shortages.push({
          materialId: line.materialId,
          name: line.name,
          required: line.theoreticalQty,
          available: avail,
          uom: line.uom
        });
      } else {
        const picks = fifoReserveLots(line.materialId, line.theoreticalQty, warehouseInventory, allMaterials, "RM/");
        picks.forEach(p => reservations.push({ materialId: line.materialId, ...p }));
      }
    }
  
    const id = `po_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
  
    const newOrder: ProdOrder = {
      id,
      bomId: recipe.id,
      sku: recipe.finishedSku,
      targetQuantity: targetBatchSize,
      status: "pending",
      createdAt: now,
      scheduledFor: whenISO,
      responsibleId,
      checks: recipe.protocolChecklist.map(p => ({ id: p.id, done: false })),
      shortages: shortages.length ? shortages : undefined,
      reservations: reservations.length ? reservations : undefined,
      actuals,
    };
  
    setData({ ...santaData, productionOrders: [newOrder, ...santaData.productionOrders] });
  
    if (shortages.length) {
      showNotification(`Orden creada con faltantes: ${shortages.map(s => s.name).join(", ")}.`);
    } else {
      showNotification("Orden creada con stock reservado.");
    }
  }, [warehouseInventory, santaData, setData, allMaterials]);
  

  const updateOrder = useCallback(async (id: string, patch: Partial<ProdOrder>) => {
    if (!santaData) return;
    
    setData((prevData: SantaData | null) => {
        if (!prevData) return prevData;
        const updatedOrders = prevData.productionOrders.map(o => {
            if (o.id === id) {
                const updatedOrder = { ...o, ...patch } as ProdOrder;
                if (patch.execution && !patch.costing) {
                    const recipe = recipes.find(r => r.id === updatedOrder.bomId);
                    if (recipe) {
                      const c = computeCosting(recipe, updatedOrder);
                      updatedOrder.costing = c;
                    }
                }
                return updatedOrder;
            }
            return o;
        });
        return { ...prevData, productionOrders: updatedOrders };
    });
  }, [setData, recipes, santaData]);

  const startOrder = useCallback((orderId: string) => {
    if(!santaData) return;
    const order = santaData.productionOrders.find(o => o.id === orderId);
    if (!order) return;
  
    if (!order.reservations?.length) {
      showNotification("No hay reservas. No se puede consumir.");
      return;
    }
  
    const moves = buildConsumptionMoves({
      orderId: order.id,
      reservations: order.reservations as any,
      materials: allMaterials,
      fromLocation: "RM/MAIN",
    });
  
    const updatedInventory = consumeForOrder(warehouseInventory, products, moves);
  
    setData({
      ...santaData,
      inventory: updatedInventory,
      stockMoves: [...(santaData.stockMoves || []), ...moves],
      productionOrders: santaData.productionOrders.map(o =>
        o.id === orderId ? { ...o, status: "wip", execution: { ...(o.execution || {}), startedAt: new Date().toISOString() } } : o
      ),
    });
  
    showNotification("Orden iniciada y materias primas descontadas.");
  }, [santaData, setData, warehouseInventory, products, allMaterials]);
  

  const finishOrder = useCallback(async (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'ud') => {
    if (!santaData) return;
    const recipe = recipes.find(r => r.id === o.bomId);
    if (!recipe || !o.execution?.startedAt) return;

    const finishedAt = new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(o.execution.startedAt).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const goodBottles = yieldUom === 'ud' ? finalYield : Math.floor(finalYield * (recipe.bottlesPerLitre || 1.33));

    const finalExecution = {
        ...(o.execution),
        finalYield,
        yieldUom,
        goodBottles,
        finishedAt,
        durationHours: round2(durationHours),
    };
    
    const newLotId = generateNextLot(
        (santaData.lots || []).map(l => l.id),
        new Date(),
        recipe.finishedSku
    );

    const newLotCosting = computeCosting(recipe!, { ...o, execution: finalExecution });

    const newLot = {
        id: newLotId,
        sku: recipe.finishedSku,
        quantity: finalExecution.goodBottles || 0,
        createdAt: new Date().toISOString(),
        orderId: o.id,
        quality: { qcStatus: 'hold', results: {} },
    };
    
    setData((prevData: SantaData | null) => {
        if (!prevData) return prevData;
        const newLots = [...(prevData.lots || []), newLot];
        const updatedOrders = prevData.productionOrders.map((po: any) => 
            po.id === o.id ? { ...po, status: "done" as const, execution: finalExecution, lotId: newLotId, costing: newLotCosting } : po
        );
        return { ...prevData, lots: newLots as any, productionOrders: updatedOrders };
    });
    
    showNotification(`Orden ${o.id} completada. Lote ${newLotId} creado y en estado 'hold'.`);
  }, [recipes, santaData, setData]);


  if (loading || !santaData) return <div className="p-6">Cargando producción…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;
  if (!recipes.length) return <div className="p-6">No hay recetas disponibles.</div>;

  return (
    <div className="p-6 flex flex-col gap-6" style={{ ['--line' as any]: '#E6E4DD' }}>
       {notification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg bg-yellow-400 text-zinc-900 border border-yellow-500">
          <p className="font-semibold">Notificación</p>
          <p className="whitespace-pre-wrap">{notification}</p>
        </div>
      )}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Producción</h1>
          <p className="text-sm text-zinc-500">Órdenes desde receta (BOM), stock, ejecución y costes</p>
        </div>
        <CreateOrderCard recipes={recipes} onCreate={createOrder} />
      </header>

      <OrdersList orders={orders} recipes={recipes} onStart={startOrder} onFinish={finishOrder} onUpdate={updateOrder} inventory={warehouseInventory} allMaterials={allMaterials} />
    </div>
  );
}

// ---------------------- UI: creación de orden ----------------------
function CreateOrderCard({ recipes, onCreate }: { recipes: RecipeBom[]; onCreate: (p: { recipe: RecipeBom; targetBatchSize: number; whenISO: string; responsibleId?: string }) => Promise<void> }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || "");
  const { data: santaData } = useData();
  const allMaterials = useMemo(() => santaData?.materials || [], [santaData]);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedRecipeId), [recipes, selectedRecipeId]);

  const [target, setTarget] = useState<number>(selectedRecipe?.baseBatchSize || 100);
  const [when, setWhen] = useState<string>(() => new Date().toISOString().slice(0,16));
  const [resp, setResp] = useState<string>("");
  
  const plan = useMemo(() => selectedRecipe ? planFromRecipe(selectedRecipe, target, allMaterials) : null, [selectedRecipe, target, allMaterials]);
  
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selectedRecipe) {
        setTarget(selectedRecipe.baseBatchSize);
    }
  }, [selectedRecipe]);
  
  if (!selectedRecipe || !plan) return null;
  const { plannedBottles } = plan;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 w-full max-w-xl">
      <div className="mb-2">
        <label className="text-sm">
          <span className="block text-zinc-500 text-xs mb-1">Receta (BOM)</span>
          <select 
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="font-medium px-2 py-1.5 w-full rounded-lg border border-zinc-300 bg-white"
          >
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name || r.finishedName}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block text-zinc-500 text-xs mb-1">Tamaño de lote ({selectedRecipe.baseUnit})</span>
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
        <button disabled={busy} onClick={async ()=>{ setBusy(true); try{ await onCreate({ recipe: selectedRecipe, targetBatchSize: target, whenISO: new Date(when).toISOString(), responsibleId: resp||undefined }); } finally { setBusy(false);} }} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800">
          {busy? 'Creando…':'Crear orden'}
        </button>
      </div>
    </div>
  );
}

// ---------------------- UI: listado + detalle ----------------------
function OrdersList({ orders, recipes, onStart, onFinish, onUpdate, inventory, allMaterials }: { orders: ProdOrder[]; recipes: RecipeBom[]; onStart: (id: string)=>void; onFinish: (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'ud')=>void; onUpdate: (id:string, patch: Partial<ProdOrder>)=>Promise<void>; inventory: any[], allMaterials: Material[] }) {
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
            const { plannedBottles: plan } = recipe ? planFromRecipe(recipe, o.targetQuantity, allMaterials) : { plannedBottles: 0 };
            return (
            <tr key={o.id} className="border-t border-[var(--line)]">
              <td className="px-3 py-2 font-medium">{o.id}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    {o.status === 'pending' && <Pill tone="amber">PROGRAMADA</Pill>}
                    {o.status === 'wip' && <Pill tone="blue">EN PROCESO</Pill>}
                    {o.status === 'done' && <Pill tone="green">COMPLETADA</Pill>}
                    {o.status === 'cancelled' && <Pill tone="slate">CANCELADA</Pill>}
                    {o.shortages && o.shortages.length > 0 && o.status === 'pending' && (
                        <div className="relative group">
                            <AlertCircle className="h-4 w-4 text-red-500 cursor-pointer"/>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-zinc-800 text-white text-xs rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <p className="font-bold mb-1">Falta de stock:</p>
                                <ul className="list-disc list-inside">
                                    {o.shortages.map(s => <li key={s.materialId}>{s.name}: falta {(s.required - s.available).toFixed(2)} {s.uom}</li>)}
                                </ul>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-zinc-800 rotate-45"/>
                            </div>
                        </div>
                    )}
                </div>
              </td>
              <td className="px-3 py-2">{o.scheduledFor ? new Date(o.scheduledFor).toLocaleString() : '—'}</td>
              <td className="px-3 py-2">{o.responsibleId || '—'}</td>
              <td className="px-3 py-2">{plan}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={()=>setOpenId(o.id)} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50">Abrir</button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {openOrder && openRecipe && (
        <div className="border-t border-[var(--line)] p-4 bg-zinc-50/60">
          <OrderDetail order={openOrder} recipe={openRecipe} onClose={()=>setOpenId(null)} onStart={onStart} onFinish={onFinish} onUpdate={onUpdate} inventory={inventory} allMaterials={allMaterials}/>
        </div>
      )}
    </div>
  );
}

function OrderDetail({ order, recipe, onClose, onStart, onFinish, onUpdate, inventory, allMaterials }: { order: ProdOrder; recipe: RecipeBom; onClose: ()=>void; onStart: (id: string)=>void; onFinish: (o: ProdOrder, finalYield: number, yieldUom: 'L' | 'ud')=>void; onUpdate: (id:string, patch: Partial<ProdOrder>)=>Promise<void>; inventory: any[], allMaterials: Material[] }) {
  
  const [finalYield, setFinalYield] = useState<number | ''>('');
  const [yieldUom, setYieldUom] = useState<'L' | 'ud'>('ud');
  const [incidentNote, setIncidentNote] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const protocolsOk = (order.checks || []).every(c => c.done);
  const { plannedBottles } = planFromRecipe(recipe, order.targetQuantity, allMaterials);

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
      
      const plannedYield = recipe.baseUnit === 'L' ? order.targetQuantity : plannedBottles;
      const plannedUom = recipe.baseUnit === 'L' ? 'L' : 'ud';
      const actualYield = execution.finalYield ?? 0;
      const merma = plannedYield - actualYield;
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
              <div>Total lote: <b>{costing.totalEUR.toFixed(2)} €</b></div>
              <div>Coste/botella: <b>{costing.costPerBottleEUR.toFixed(3)} €</b></div>
              <div>Duración: <b>{durationStr}</b></div>
              <div>Rendimiento: <b>{costing.yieldPct.toFixed(1)}%</b></div>
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
                <SBButton onClick={() => onUpdate(order.id, { costing: order.costing })}><Save size={16}/> Guardar Resultados</SBButton>
             </div>
        </div>
      );
  }, [order, recipe, plannedBottles, onUpdate]);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium flex items-center gap-2">
          Orden {order.id}
          {order.shortages && order.shortages.length > 0 && order.status === 'pending' && (
              <div className="relative group">
                  <AlertCircle className="h-5 w-5 text-red-500 cursor-pointer"/>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-zinc-800 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <p className="font-bold mb-1 border-b border-zinc-600 pb-1">⚠️ Alerta de falta de stock</p>
                      <ul className="mt-1 space-y-1">
                          {order.shortages.map((s: any) => (
                            <li key={s.materialId} className="flex justify-between">
                              <span>{s.name}:</span>
                              <span className="font-mono">Req: {s.required.toFixed(2)} / Disp: {s.available.toFixed(2)} {s.uom}</span>
                            </li>
                          ))}
                      </ul>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-zinc-800 rotate-45"/>
                  </div>
              </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm flex items-center gap-2 hover:bg-zinc-100">
              <Bug size={14}/> Diagnóstico
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
                                            <th>SKU</th>
                                            <th>Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventory.map((item: any) => (
                                            <tr key={item.id} className="border-t">
                                                <td className="py-1 font-mono">{item.lotNumber?.substring(0, 12) || item.id.substring(0,12)}...</td>
                                                <td>{item.sku}</td>
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
          const next = (order.checks || []).map(c => c.id===id ? { ...c, done: !c.done, checkedAt: new Date().toISOString() } : c);
          await onUpdate(order.id, { checks: next });
        }} />
        
        <ActualsBlock actuals={order.actuals || []} onChange={handleActualsChange} />
        
        <div className="md:col-span-2">
            {order.status === "pending" && (
                <div className="flex justify-end gap-2 p-3 bg-zinc-50 rounded-lg">
                    <div className="text-sm text-zinc-600 mr-auto">Protocolos: {protocolsOk ? <b className="text-green-600">OK</b> : <b className="text-red-600">Faltan ✓</b>}</div>
                    <SBButton disabled={!protocolsOk} onClick={() => onStart(order.id)}>Iniciar Producción <ChevronRight size={16}/></SBButton>
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
                                <option value="ud">botellas</option>
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
                              await onUpdate(order.id, { incidents });
                              setIncidentNote("");
                            }}>Añadir</SBButton>
                          </div>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <SBButton onClick={handleFinish} disabled={finalYield === ''}>Finalizar Producción</SBButton>
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
              <span>{recipe.protocolChecklist.find(pc => pc.id === c.id)?.text || c.id}</span>
            </div>
            <div className="text-xs text-zinc-500">{c.checkedAt ? new Date(c.checkedAt).toLocaleString() : '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActualsBlock({ actuals, onChange }: { actuals: ActualConsumption[], onChange: (index: number, newQty: number) => void }) {
    return (
        <div className="rounded-xl border border-[var(--line)]">
            <div className="px-4 py-3 border-b border-[var(--line)] text-sm text-zinc-500">Consumos Reales</div>
            <div className="p-3 space-y-2">
                {actuals.map((item, index) => (
                    <div key={item.materialId + index} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 text-sm">
                        <div className="font-medium text-zinc-800">{item.name} <span className="text-xs text-zinc-500 font-mono">({item.materialId})</span></div>
                        <div className="text-center">{item.theoreticalQty.toFixed(2)} {item.uom} <span className="text-xs text-zinc-500">(Teórico)</span></div>
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

  
