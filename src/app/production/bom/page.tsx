

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { listRecipes as fetchRecipes, createRecipe, updateRecipe, deleteRecipe, listMaterials } from "@/features/production/ssot-bridge";
import type { Material, BillOfMaterial as RecipeBom } from '@/domain/ssot';
import { Plus, Search, X } from "lucide-react";
import { SBCard, SB_COLORS } from "@/components/ui/ui-primitives";

// =============================================================
// SB Producción — BOM (Recetas)
// - Conectado al ssot-bridge para usar datos de la aplicación.
// - Autocompletado de materiales desde el inventario.
// =============================================================

// ---------- Tipos (local a este componente) ----------
type Uom = "kg" | "g" | "L" | "mL" | "ud";
type BomLine = { materialId: string; name: string; quantity: number; uom: Uom; costPerUom: number };

// ---------- Cálculo costes ----------
const round2 = (n:number)=> Math.round(n*100)/100;
const sum = (arr:number[]) => arr.reduce((a,b)=>a+b,0);

function computeRecipeCosts(r: RecipeBom & { stdLaborCostPerBatch?: number; stdOverheadPerBatch?: number }, materialsList: Material[]) {
  if (!r || !r.items) return { materialsEUR: 0, totalBatchEUR: 0, costPerBottleEUR: 0, bottles: 0, laborEUR: 0, overheadEUR: 0 };

  const materialsMap = new Map(materialsList.map(m => [m.id, m]));
  
  const materials = sum((r.items || []).map(l => {
    const materialDetails = materialsMap.get(l.materialId);
    const materialCost = materialDetails?.standardCost || 0;
    // Si la UoM del coste es por kg y el item está en g, o L y mL, ajustamos.
    if (materialDetails?.unit === 'kg' && (l as any).uom === 'g') return (l.quantity / 1000) * materialCost;
    if (materialDetails?.unit === 'L' && (l as any).uom === 'mL') return (l.quantity / 1000) * materialCost;
    return l.quantity * materialCost;
  }));
  
  const labor = r.stdLaborCostPerBatch || 0;
  const overhead = r.stdOverheadPerBatch || 0;
  const totalBatch = materials + labor + overhead;
  
  // Heurística para calcular botellas: si el SKU contiene 700, asumimos 700ml, si no 750ml.
  const is700ml = r.sku.includes('700');
  const bottleVolumeL = is700ml ? 0.7 : 0.75;
  const batchVolumeL = r.baseUnit === 'L' ? r.batchSize : r.batchSize / 1000; // Asumir mL si no es L

  // Se asume un rendimiento del 98% para el embotellado.
  const bottles = Math.floor((batchVolumeL * 0.98) / bottleVolumeL);
  
  const costPerBottle = bottles > 0 ? totalBatch / bottles : 0;

  return { 
      materialsEUR: round2(materials), 
      laborEUR: round2(labor),
      overheadEUR: round2(overhead),
      totalBatchEUR: round2(totalBatch), 
      costPerBottleEUR: costPerBottle > 0 ? round2(costPerBottle) : 0, 
      bottles: bottles 
  };
}


// ---------- UI helpers ----------
function Help({children}:{children:React.ReactNode}){ return <span className="ml-1 text-xs text-zinc-400">{children}</span>; }
function Badge({children}:{children:React.ReactNode}){ return <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200">{children}</span>; }

function MaterialSearch({ query, onQueryChange, onSelect, materials }: { query: string, onQueryChange: (q: string) => void, onSelect: (mat: Material) => void, materials: Material[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const results = useMemo(() => {
        if (!query) return [];
        const qLower = query.toLowerCase();
        return materials.filter(m => m.name.toLowerCase().includes(qLower) || (m.sku || "").toLowerCase().includes(qLower));
    }, [query, materials]);

    return (
        <div className="relative">
            <input 
                value={query || ''} 
                onChange={e => { onQueryChange(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                className="px-2 py-1.5 w-full rounded-lg border border-zinc-300" 
                placeholder="Buscar material..."
            />
            {isOpen && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {results.map(mat => (
                        <div 
                            key={mat.id} 
                            onClick={() => { onSelect(mat); setIsOpen(false); }}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                        >
                            <p className="font-medium text-sm">{mat.name}</p>
                            <p className="text-xs text-zinc-500">{mat.sku}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function LineRow({ idx, line, onChange, onRemove, materials }: { idx:number; line: BomLine; onChange: (l: BomLine)=>void; onRemove: ()=>void; materials: Material[] }) {
    const [searchQuery, setSearchQuery] = useState(line.name);
    
    const handleSelectMaterial = (mat: Material) => {
        onChange({ ...line, materialId: mat.id, name: mat.name, costPerUom: mat.standardCost || 0 });
        setSearchQuery(mat.name);
    }
  
    return (
    <tr className="border-t border-zinc-200">
      <td className="px-3 py-2">{idx+1}</td>
      <td className="px-3 py-2" colSpan={2}>
        <MaterialSearch 
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSelect={handleSelectMaterial}
            materials={materials}
        />
      </td>
      <td className="px-3 py-2"><input type="number" min={0} step={0.01} value={line.quantity} onChange={e=>onChange({ ...line, quantity: parseFloat(e.target.value||"0") })} className="px-2 py-1.5 w-28 rounded-lg border border-zinc-300"/></td>
      <td className="px-3 py-2">
        <select value={line.uom} onChange={e=>onChange({ ...line, uom: e.target.value as Uom })} className="px-2 py-1.5 rounded-lg border border-zinc-300">
          {(["kg","g","L","mL","ud"] as Uom[]).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input type="number" min={0} step={0.001} value={line.costPerUom} onChange={e=>onChange({ ...line, costPerUom: parseFloat(e.target.value||"0") })} className="px-2 py-1.5 w-28 rounded-lg border border-zinc-300"/></td>
      <td className="px-3 py-2 text-right"><button onClick={onRemove} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50">Quitar</button></td>
    </tr>
  );
}

function RecipeForm({ value, onChange, onSave, onCancel, materials }: { 
    value: RecipeBom; 
    onChange: (r: RecipeBom)=>void; 
    onSave: ()=>void;
    onCancel: ()=>void;
    materials: Material[] 
}) {
  const r = value; 
  const costs = useMemo(()=>computeRecipeCosts(r, materials), [r, materials]);
  
  const handleNameChange = (newName: string) => {
    onChange({ ...r, name: newName });
  };
  
  const handleSkuChange = (newSku: string) => {
    onChange({ ...r, sku: newSku });
  };
  
  const addLine = () => {
    const newLine: BomLine = { materialId: "", name: "", quantity: 0, uom: "ud", costPerUom: 0 };
    onChange({ ...r, items: [...(r.items || []), newLine] });
  };
  
  const removeLine=(i:number)=> onChange({ ...r, items:(r.items || []).filter((_,idx)=>idx!==i) });
  const setLine=(i:number,l:any)=> onChange({ ...r, items:(r.items || []).map((x,idx)=>idx===i?l:x) });

  return (
    <SBCard title={value.id ? `Editando: ${value.name}` : 'Nueva Receta'} accent={SB_COLORS.production}>
        <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Nombre Receta</span>
                <input value={r.name || ''} onChange={e=>handleNameChange(e.target.value)} className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"/>
                </label>
                <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">SKU Producto Terminado</span>
                <input value={r.sku || ''} onChange={e=>handleSkuChange(e.target.value)} className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"/>
                </label>
                <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                    <span className="block text-xs text-zinc-500 mb-1">Tamaño de Lote</span>
                    <input type="number" min={1} step={1} value={r.batchSize || 0} onChange={e=>onChange({ ...r, batchSize: parseFloat(e.target.value||"0") })} className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"/>
                </label>
                <label className="text-sm">
                    <span className="block text-xs text-zinc-500 mb-1">UOM del Lote</span>
                    <select value={r.baseUnit} onChange={e=>onChange({ ...r, baseUnit: e.target.value })} className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full">
                    {(["kg","g","L","mL","ud"] as const).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </label>
                </div>
            </div>

            <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 text-sm text-zinc-600">Ingredientes (BOM)</div>
                <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left" colSpan={2}>Material</th>
                    <th className="px-3 py-2 text-left">Cant. por lote</th>
                    <th className="px-3 py-2 text-left">UOM</th>
                    <th className="px-3 py-2 text-left">Coste/uom (€)</th>
                    <th className="px-3 py-2 text-right"> </th>
                    </tr>
                </thead>
                <tbody>
                    {(r.items || []).map((l, idx) => (
                    <LineRow key={idx} idx={idx} line={l as any} onChange={(nl)=>setLine(idx, nl)} onRemove={()=>removeLine(idx)} materials={materials} />
                    ))}
                </tbody>
                </table>
                <div className="p-3">
                <button onClick={addLine} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-sm">Añadir ingrediente</button>
                </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-3 grid md:grid-cols-5 gap-3 text-sm bg-white">
                <div>Materiales: <b>{costs.materialsEUR.toFixed(2)} €</b></div>
                <div>Mano de obra: <b>{costs.laborEUR.toFixed(2)} €</b></div>
                <div>Indirectos: <b>{costs.overheadEUR.toFixed(2)} €</b></div>
                <div>Total lote: <b>{costs.totalBatchEUR.toFixed(2)} €</b></div>
                <div>Coste/botella: <b>{costs.costPerBottleEUR.toFixed(3)} €</b> <span className="text-zinc-400">({costs.bottles} botellas)</span></div>
            </div>

        </div>
        <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-zinc-300">Cerrar</button>
            <button onClick={onSave} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800">Guardar</button>
        </div>
    </SBCard>
  );
}


// ---------- Barra + Autocompletar ----------
function useSuggestions(recipes: RecipeBom[], q: string){
  if (!recipes) return [];
  return useMemo(()=>{
    const query=q.trim().toLowerCase(); if(!query) return [] as {id:string;label:string;aux:string;kind:'SKU'|'Nombre'|'Presentación'}[];
    const out: {id:string;label:string;aux:string;kind:'SKU'|'Nombre'|'Presentación'}[] = [];
    for(const r of recipes){
      if(!r.id) continue;
      if(r.sku.toLowerCase().includes(query)) out.push({ id:r.id, label:r.sku, aux:r.name, kind:'SKU' });
      if(r.name.toLowerCase().includes(query)) out.push({ id:r.id, label:r.name, aux:r.sku, kind:'Nombre' });
    }
    const seen=new Set<string>();
    return out.filter(s=>{ const k=s.id+"|"+s.label+"|"+s.kind; if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,8);
  },[recipes,q]);
}

function SearchBar({ recipes, onPick }:{ recipes:RecipeBom[]; onPick:(id:string)=>void }){
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const wrapRef=useRef<HTMLDivElement>(null);
  const sugs=useSuggestions(recipes,q);

  useEffect(()=>{ const onDoc=(e:MouseEvent)=>{ if(!wrapRef.current) return; if(!wrapRef.current.contains(e.target as any)) setOpen(false); }; document.addEventListener('mousedown',onDoc); return ()=>document.removeEventListener('mousedown',onDoc); },[]);

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
       <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input value={q} onChange={e=>{ setQ(e.target.value); setOpen(true); }} placeholder="Buscar por SKU o nombre…"
                 className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-zinc-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"/>
          {q && <button onClick={()=>{ setQ(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"><X size={16} /></button>}
      </div>
      {open && sugs.length>0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden">
          {sugs.map(s=> (
            <button key={s.id+"|"+s.label} onClick={()=>{ onPick(s.id); setOpen(false); setQ(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between">
              <span>{s.label} <span className="text-zinc-400">· {s.aux}</span></span>
              <span className="ml-2"><Badge>{s.kind}</Badge></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Página ----------
export default function BomPage(){
  const [recipes,setRecipes]=useState<RecipeBom[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [openRecipe,setOpenRecipe]=useState<RecipeBom|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recipeData, materialData] = await Promise.all([
          fetchRecipes(),
          listMaterials(),
        ]);
        setRecipes(recipeData.filter(r => r.id && r.sku));
        setMaterials(materialData);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
  }

  useEffect(()=>{
    loadAllData();
  },[]);

  const select = (id:string)=> {
    const recipe = recipes.find(r=>r.id===id);
    if(recipe) setOpenRecipe(recipe);
  };
  
  const createNew = ()=>{ 
    const id=`bom_${Date.now()}`; 
    const empty:RecipeBom={ id, sku:"", name:"", batchSize:100, baseUnit:"L", items:[] }; 
    setOpenRecipe(empty); 
  };
  
  const save = async ()=>{
      if(!openRecipe) return;
      const exists = recipes.some(r=>r.id===openRecipe.id);
      try {
        if(exists){
          await updateRecipe(openRecipe.id!, openRecipe);
        } else {
          await createRecipe(openRecipe);
        }
        setNotification('Receta guardada con éxito');
        setOpenRecipe(null);
        await loadAllData();
      } catch (e: any) {
        setError('Error al guardar: ' + e.message);
      }
  };
  
  const remove = async (id:string)=>{
      if(!confirm('¿Eliminar la receta?')) return;
      try {
        await deleteRecipe(id);
        setNotification('Receta eliminada');
        setRecipes(prev => prev.filter(r => r.id !== id));
        if (openRecipe?.id === id) setOpenRecipe(null);
      } catch(e: any) {
        setError('Error al eliminar: ' + e.message);
      }
  };
  
  const handleFormChange = (recipe: RecipeBom) => {
    setOpenRecipe(recipe);
  }

  if (loading) return <div className="p-6">Cargando BOMs y Materiales…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;

  return (
    <div className="p-6 flex flex-col gap-6">
       {notification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg bg-green-500 text-white animate-pulse">
          {notification}
        </div>
      )}
      {error && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg bg-red-500 text-white">
          {error}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Recetas (BOM)</h1>
          <p className="text-sm text-zinc-500">Ingredientes, protocolos y costes estándar</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar recipes={recipes} onPick={select}/>
          <button onClick={createNew} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2"><Plus size={16}/> Nueva receta</button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <SBCard title="Recetas" accent={SB_COLORS.production}>
                <div className="p-2 space-y-1">
                {recipes.map(r=>{ 
                    if(!r.id) return null;
                    const c=computeRecipeCosts(r, materials); 
                    const isSelected = openRecipe?.id === r.id;
                    return (
                    <div key={r.id} className={`rounded-lg p-3 transition-colors ${isSelected ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-zinc-50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-zinc-800">{r.name||'—'}</p>
                                <p className="text-xs text-zinc-500 font-mono">{r.sku||'—'}</p>
                            </div>
                            <p className="text-sm font-bold text-zinc-800">{c.costPerBottleEUR ? `${c.costPerBottleEUR.toFixed(3)} €` : 'N/A'}</p>
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                            <button onClick={()=>select(r.id!)} className="px-3 py-1 text-xs rounded-lg border border-zinc-300 hover:bg-zinc-100">Abrir</button>
                            <button onClick={()=>remove(r.id!)} className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50">Eliminar</button>
                        </div>
                    </div>
                ); })}
                </div>
            </SBCard>
        </div>

        <div className="lg:col-span-2">
          {!openRecipe ? (
            <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border-2 border-dashed">Selecciona una receta o crea una nueva.</div>
          ) : (
            <RecipeForm 
              value={openRecipe} 
              onChange={handleFormChange}
              onSave={save}
              onCancel={()=>setOpenRecipe(null)}
              materials={materials} 
            />
          )}
        </div>
      </div>
    </div>
  );
}






