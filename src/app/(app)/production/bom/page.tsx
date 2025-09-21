
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Plus, Search, X, Droplets, Package2, Coins, Info } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SB_COLORS } from "@/domain/ssot";
import {
  listRecipes as fetchRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  listMaterials,
  listFinishedSkus,
} from "@/features/production/ssot-bridge";
import type { Material, BillOfMaterial as RecipeBom, Uom, Currency } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";


// =============================================================
// SB Producción — BOM (Recetas) · v2
// - Modelo alineado a SSOT con roles de línea y métricas de yield/mermas.
// - Tabs: Formulación, Packaging, Costeo, Metadatos/Versiones.
// - Validación Zod + estados disabled/dirty.
// =============================================================

// ---------- Extensiones de dominio (compatibles con SSOT) ----------
type BomLineRole = "FORMULA" | "PACKAGING";

// Usamos directamente el tipo del SSOT para los items de la BOM.
type BomLine = RecipeBom['items'][0]; 

type FinishedSku = { sku: string; name: string; packSizeMl: number; bottlesPerCase?: number };

// ---------- Validación ----------
const bomSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1, "El SKU del producto terminado es obligatorio"),
  name: z.string().min(1, "Nombre de receta obligatorio"),
  batchSize: z.number().positive(),
  baseUnit: z.enum(["kg", "g", "L", "mL", "uds"]),
  items: z.array(
    z.object({
      materialId: z.string().min(1),
      quantity: z.number().nonnegative(),
      unit: z.string().optional(),
      role: z.enum(["FORMULA", "PACKAGING"]).optional(),
    })
  ),
  stdLaborCostPerBatch: z.number().nonnegative().optional(),
  stdOverheadPerBatch: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  yieldPct: z.number().min(0).max(100).optional(),
  wastePctProduction: z.number().min(0).max(100).optional(),
  wastePctPackaging: z.number().min(0).max(100).optional(),
  version: z.number().int().positive().optional(),
  status: z.enum(["ACTIVA", "BORRADOR", "ARCHIVADA"]).optional(),
});

// ---------- Unidades y conversiones ----------
const UOM: Uom[] = ["kg", "g", "L", "mL", "uds"];
const round2 = (n: number) => Math.round(n * 100) / 100;

function convertQty(qty: number, from: Uom, to: Uom) {
  if (from === to) return qty;
  // masa
  if (from === "kg" && to === "g") return qty * 1000;
  if (from === "g" && to === "kg") return qty / 1000;
  // volumen
  if (from === "L" && to === "mL") return qty * 1000;
  if (from === "mL" && to === "L") return qty / 1000;
  // uds no se convierte contra masa/volumen (se devuelve qty sin cambio)
  return qty;
}

// ---------- Costeo ----------
type CostBreakdown = {
  formulaEUR: number;
  packagingEUR: number;
  laborEUR: number;
  overheadEUR: number;
  totalBatchEUR: number;
  bottles: number;
  costPerBottleEUR: number;
  notes?: string[];
};

function computeRecipeCosts(
  r: RecipeBom,
  materialsList: Material[],
  finished: FinishedSku | null
): CostBreakdown {
  const notes: string[] = [];
  if (!r || !materialsList) {
    return {
      formulaEUR: 0, packagingEUR: 0, laborEUR: 0, overheadEUR: 0,
      totalBatchEUR: 0, bottles: 0, costPerBottleEUR: 0, notes
    };
  }

  const materialsMap = new Map(materialsList.map(m => [m.id, m]));
  const labor = r.stdLaborCostPerBatch || 0;
  const overhead = r.stdOverheadPerBatch || 0;
  const yieldPct = r.yieldPct ?? 98; // por defecto 98%
  const wasteProd = r.wastePctProduction ?? 0;
  const wastePack = r.wastePctPackaging ?? 0;

  const matCost = (line: RecipeBom['items'][0]) => {
    const mat = materialsMap.get(line.materialId);
    const unitCost = mat?.standardCost || 0;
    const matUom = mat?.uom;
    if (!matUom) return 0;

    // Convertimos la cantidad de la línea a la UOM del coste estándar del material
    const qtyInMatUom = convertQty(line.quantity, (line.unit || 'uds') as Uom, matUom);
    return qtyInMatUom * unitCost;
  };

  const formulaEUR = round2(
    (r.items || [])
      .filter(l => (l.role || 'FORMULA') === "FORMULA")
      .map(matCost)
      .reduce((a, b) => a + b, 0)
  );

  const packagingEUR = round2(
    (r.items || [])
      .filter(l => l.role === "PACKAGING")
      .map(matCost)
      .reduce((a, b) => a + b, 0)
  );

  // Volumen de lote en L (si batchSize está en mL, lo convertimos)
  let batchVolL =
    r.baseUnit === "L"
      ? r.batchSize
      : r.baseUnit === "mL"
      ? convertQty(r.batchSize, "mL", "L")
      : 0;

  if (batchVolL === 0) notes.push("El tamaño de lote no está en volumen; el cálculo de botellas usará 0.");

  // Aplicamos mermas previas
  batchVolL = batchVolL * (1 - wasteProd / 100);

  // Aplicamos rendimiento global (por ejemplo 98%)
  const effectiveVolL = batchVolL * (yieldPct / 100);

  const packSizeMl = finished?.packSizeMl ?? 700; // fallback razonable
  const bottleVolL = convertQty(packSizeMl, "mL", "L");
  // Mermas propias del envasado → reduce botellas útiles
  const bottles = bottleVolL > 0
    ? Math.floor((effectiveVolL * (1 - wastePack / 100)) / bottleVolL)
    : 0;

  const totalBatchEUR = round2(formulaEUR + packagingEUR + labor + overhead);
  const costPerBottleEUR = bottles > 0 ? round2(totalBatchEUR / bottles) : 0;

  if (!finished) notes.push("SKU terminado no seleccionado; se usa 700 mL por defecto.");
  return { formulaEUR, packagingEUR, laborEUR: labor, overheadEUR: overhead, totalBatchEUR, bottles, costPerBottleEUR, notes };
}

// ---------- UI helpers ----------
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
      {children}
    </span>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-xs text-zinc-400">{children}</span>;
}

function useOutsideCloser<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return ref;
}

// ---------- Autocomplete Material ----------
function MaterialSearch({
  query,
  onQueryChange,
  onSelect,
  materials,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (mat: Material) => void;
  materials: Material[];
}) {
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return materials
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.sku || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, materials]);

  const boxRef = useOutsideCloser<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query || ""}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="px-2 py-1.5 w-full rounded-lg border border-zinc-300"
        placeholder="Buscar material..."
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((mat) => (
            <button
              type="button"
              key={mat.id}
              onClick={() => {
                onSelect(mat);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50"
            >
              <p className="font-medium text-sm">{mat.name}</p>
              <p className="text-xs text-zinc-500">{mat.sku}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Autocomplete SKU terminado ----------
function FinishedSkuSearch({
  value,
  options,
  onPick,
}: {
  value: string;
  options: FinishedSku[];
  onPick: (sku: FinishedSku) => void;
}) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useOutsideCloser<HTMLDivElement>(() => setOpen(false));

  const sugs = useMemo(() => {
    if (!q.trim()) return [];
    const Q = q.trim().toLowerCase();
    return options
      .filter(
        (s) =>
          s.sku.toLowerCase().includes(Q) ||
          s.name.toLowerCase().includes(Q)
      )
      .slice(0, 12);
  }, [q, options]);

  return (
    <div ref={ref} className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="px-2 py-1.5 w-full rounded-lg border border-zinc-300"
        placeholder="SKU terminado…"
      />
      {open && sugs.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden">
          {sugs.map((s) => (
            <button
              type="button"
              key={s.sku}
              onClick={() => {
                setQ(`${s.sku}`);
                onPick(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono">{s.sku}</span>
                <Badge>{s.packSizeMl} mL</Badge>
              </div>
              <div className="text-xs text-zinc-500">{s.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Fila de línea ----------
function LineRow({
  idx,
  line,
  onChange,
  onRemove,
  materials,
}: {
  idx: number;
  line: BomLine;
  onChange: (l: BomLine) => void;
  onRemove: () => void;
  materials: Material[];
}) {
    const lineMaterialName = useMemo(() => {
        return materials.find(m => m.id === line.materialId)?.name || '';
    }, [line.materialId, materials]);
    const [searchQuery, setSearchQuery] = useState(lineMaterialName);

  const handleSelectMaterial = (mat: Material) => {
    onChange({
      ...line,
      materialId: mat.id,
      // La UOM de la línea la decide el formulador; coste se calcula con UOM del material
    });
    setSearchQuery(mat.name);
  };

  return (
    <tr className="border-t border-zinc-200">
      <td className="px-3 py-2">{idx + 1}</td>
      <td className="px-3 py-2" colSpan={2}>
        <MaterialSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onSelect={handleSelectMaterial}
          materials={materials}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={0.001}
          value={line.quantity}
          onChange={(e) =>
            onChange({ ...line, quantity: parseFloat(e.target.value || "0") })
          }
          className="px-2 py-1.5 w-28 rounded-lg border border-zinc-300"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={line.unit}
          onChange={(e) => onChange({ ...line, unit: e.target.value as Uom })}
          className="px-2 py-1.5 rounded-lg border border-zinc-300"
        >
          {UOM.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={line.role || 'FORMULA'}
          onChange={(e) =>
            onChange({ ...line, role: e.target.value as BomLineRole })
          }
          className="px-2 py-1.5 rounded-lg border border-zinc-300"
        >
          <option value="FORMULA">Fórmula</option>
          <option value="PACKAGING">Packaging</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={onRemove}
          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
        >
          Quitar
        </button>
      </td>
    </tr>
  );
}

// ---------- Form principal con pestañas ----------
type Tab = "FORMULA" | "PACKAGING" | "COSTEO" | "META";

function Tabs({
  tab,
  onTab,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  const base =
    "px-3 py-1.5 rounded-lg border text-sm transition-colors";
  const active = "bg-zinc-900 text-white border-zinc-900";
  const normal = "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50";
  return (
    <div className="flex gap-2">
      <button className={`${base} ${tab === "FORMULA" ? active : normal}`} onClick={() => onTab("FORMULA")}>
        <Droplets className="inline h-4 w-4 mr-1" /> Fórmula
      </button>
      <button className={`${base} ${tab === "PACKAGING" ? active : normal}`} onClick={() => onTab("PACKAGING")}>
        <Package2 className="inline h-4 w-4 mr-1" /> Packaging
      </button>
      <button className={`${base} ${tab === "COSTEO" ? active : normal}`} onClick={() => onTab("COSTEO")}>
        <Coins className="inline h-4 w-4 mr-1" /> Costeo
      </button>
      <button className={`${base} ${tab === "META" ? active : normal}`} onClick={() => onTab("META")}>
        <Info className="inline h-4 w-4 mr-1" /> Metadatos
      </button>
    </div>
  );
}

function RecipeForm({
  value,
  onChange,
  onSave,
  onCancel,
  materials,
  finishedSkus,
}: {
  value: RecipeBom;
  onChange: (r: RecipeBom) => void;
  onSave: () => void;
  onCancel: () => void;
  materials: Material[];
  finishedSkus: FinishedSku[];
}) {
  const [tab, setTab] = useState<Tab>("FORMULA");
  const finished = useMemo(
    () => finishedSkus.find((s) => s.sku === value.sku) || null,
    [finishedSkus, value.sku]
  );
  const costs = useMemo(
    () => computeRecipeCosts(value, materials, finished),
    [value, materials, finished]
  );

  const addLine = (role: BomLineRole) => {
    const nl = {
      materialId: "",
      quantity: 0,
      unit: "uds",
      role,
    };
    onChange({ ...value, items: [...(value.items || []), nl] });
  };

  const removeLine = (i: number) =>
    onChange({ ...value, items: (value.items || []).filter((_, idx) => idx !== i) });

  const setLine = (i: number, l: BomLine) =>
    onChange({
      ...value,
      items: (value.items || []).map((x, idx) => (idx === i ? l : x)),
    });

  const itemsFormula = (value.items || []).filter((l) => (l.role || 'FORMULA') === "FORMULA");
  const itemsPackaging = (value.items || []).filter((l) => l.role === "PACKAGING");

  const trySave = () => {
    const parsed = bomSchema.safeParse(value);
    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }
    onSave();
  };

  return (
    <SBCard
      title={value.id ? `Editando: ${value.name}` : "Nueva Receta"}
      accent={SB_COLORS.primary.teal}
    >
      <div className="p-4 space-y-4">
        {/* Encabezado */}
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-zinc-500 mb-1">Nombre Receta</span>
            <input
              value={value.name || ""}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-zinc-500 mb-1">SKU Producto Terminado</span>
            <FinishedSkuSearch
              value={value.sku || ""}
              options={finishedSkus}
              onPick={(s) => onChange({ ...value, sku: s.sku })}
            />
            <Help>
              Usamos el <b>packSizeMl</b> del SKU para calcular botellas/lote.
            </Help>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="block text-xs text-zinc-500 mb-1">Tamaño de Lote</span>
              <input
                type="number"
                min={1}
                step={0.001}
                value={value.batchSize || 0}
                onChange={(e) =>
                  onChange({ ...value, batchSize: parseFloat(e.target.value || "0") })
                }
                className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-zinc-500 mb-1">UOM del Lote</span>
              <select
                value={value.baseUnit}
                onChange={(e) =>
                  onChange({ ...value, baseUnit: e.target.value as Uom })
                }
                className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
              >
                {UOM.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tab={tab} onTab={setTab} />

        {/* Tabla Fórmula */}
        {tab === "FORMULA" && (
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 text-sm text-zinc-600">
              Ingredientes — <b>Fórmula</b>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left" colSpan={2}>
                    Material
                  </th>
                  <th className="px-3 py-2 text-left">Cant. por lote</th>
                  <th className="px-3 py-2 text-left">UOM</th>
                  <th className="px-3 py-2 text-left">Rol</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {itemsFormula.map((l, idx) => {
                  const i = (value.items || []).indexOf(l);
                  return (
                    <LineRow
                      key={`F-${i}`}
                      idx={idx}
                      line={l}
                      onChange={(nl) => setLine(i, nl)}
                      onRemove={() => removeLine(i)}
                      materials={materials}
                    />
                  );
                })}
              </tbody>
            </table>
            <div className="p-3">
              <button
                onClick={() => addLine("FORMULA")}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-sm"
              >
                Añadir ingrediente (Fórmula)
              </button>
            </div>
          </div>
        )}

        {/* Tabla Packaging */}
        {tab === "PACKAGING" && (
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 text-sm text-zinc-600">
              Materiales — <b>Packaging</b> <Help>botella, tapón, etiqueta, retráctil, caja…</Help>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left" colSpan={2}>
                    Material
                  </th>
                  <th className="px-3 py-2 text-left">Cant. por lote</th>
                  <th className="px-3 py-2 text-left">UOM</th>
                  <th className="px-3 py-2 text-left">Rol</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {itemsPackaging.map((l, idx) => {
                  const i = (value.items || []).indexOf(l);
                  return (
                    <LineRow
                      key={`P-${i}`}
                      idx={idx}
                      line={l}
                      onChange={(nl) => setLine(i, nl)}
                      onRemove={() => removeLine(i)}
                      materials={materials}
                    />
                  );
                })}
              </tbody>
            </table>
            <div className="p-3">
              <button
                onClick={() => addLine("PACKAGING")}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-sm"
              >
                Añadir material (Packaging)
              </button>
            </div>
          </div>
        )}

        {/* Costeo */}
        {tab === "COSTEO" && (
          <div className="rounded-xl border border-zinc-200 p-3 text-sm bg-white space-y-3">
            <div className="grid md:grid-cols-5 gap-3">
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">
                  Mano de obra por lote (€)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={value.stdLaborCostPerBatch || 0}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stdLaborCostPerBatch: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">
                  Indirectos por lote (€)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={value.stdOverheadPerBatch || 0}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stdOverheadPerBatch: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Rendimiento (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={value.yieldPct ?? 98}
                  onChange={(e) =>
                    onChange({ ...value, yieldPct: parseFloat(e.target.value || "0") })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Merma producción (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={value.wastePctProduction ?? 0}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      wastePctProduction: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Merma envasado (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={value.wastePctPackaging ?? 0}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      wastePctPackaging: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-5 gap-3">
              <div>Fórmula: <b>{costs.formulaEUR.toFixed(2)} €</b></div>
              <div>Packaging: <b>{costs.packagingEUR.toFixed(2)} €</b></div>
              <div>Mano de obra: <b>{costs.laborEUR.toFixed(2)} €</b></div>
              <div>Indirectos: <b>{costs.overheadEUR.toFixed(2)} €</b></div>
              <div>Total lote: <b>{costs.totalBatchEUR.toFixed(2)} €</b></div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                Botellas/lote: <b>{costs.bottles}</b>{" "}
                <Help>
                  pack {finished?.packSizeMl ?? 700} mL
                </Help>
              </div>
              <div>
                Coste/botella:{" "}
                <b>{costs.costPerBottleEUR ? costs.costPerBottleEUR.toFixed(3) : "N/A"} €</b>
              </div>
              <div className="text-zinc-500">
                {costs.notes?.length ? (
                  <ul className="list-disc ml-5">
                    {costs.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Metadatos / Versiones */}
        {tab === "META" && (
          <div className="rounded-xl border border-zinc-200 p-3 text-sm bg-white space-y-3">
            <div className="grid md:grid-cols-4 gap-3">
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Moneda</span>
                <select
                  value={value.currency || "EUR"}
                  onChange={(e) => onChange({ ...value, currency: e.target.value as Currency })}
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Versión</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={value.version ?? 1}
                  onChange={(e) =>
                    onChange({ ...value, version: parseInt(e.target.value || "1", 10) })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-zinc-500 mb-1">Estado</span>
                <select
                  value={value.status || "BORRADOR"}
                  onChange={(e) =>
                    onChange({ ...value, status: e.target.value as RecipeBom["status"] })
                  }
                  className="px-2 py-1.5 rounded-lg border border-zinc-300 w-full"
                >
                  <option value="BORRADOR">BORRADOR</option>
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="ARCHIVADA">ARCHIVADA</option>
                </select>
              </label>
              <div className="text-xs text-zinc-500 flex items-end">
                <p>
                  Cambia a <b>ACTIVA</b> para usar esta receta en órdenes de producción.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-zinc-300">
          Cerrar
        </button>
        <button
          onClick={trySave}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
        >
          Guardar
        </button>
      </div>
    </SBCard>
  );
}

// ---------- Página ----------
export default function BomPage() {
    const { data: santaData } = useData();
  const [openRecipe, setOpenRecipe] = useState<RecipeBom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const recipes = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
  const materials = useMemo(() => santaData?.materials || [], [santaData]);
  const finishedSkus = useMemo(() => listFinishedSkus(santaData?.products || []), [santaData]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (santaData) {
        setLoading(false);
    }
  }, [santaData]);


  const select = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) {
      // Defaults sensatos
      setOpenRecipe({
        currency: "EUR",
        yieldPct: 98,
        wastePctProduction: 0,
        wastePctPackaging: 0,
        version: 1,
        status: "BORRADOR",
        ...recipe,
        items: (recipe.items || []).map(l => ({
          role: "FORMULA", // backcompat
          unit: "uds",
          ...l,
        })),
      });
    }
  };

  const createNew = () => {
    const id = `bom_${Date.now()}`;
    const empty: RecipeBom = {
      id,
      sku: "",
      name: "",
      batchSize: 100,
      baseUnit: "L",
      items: [],
      currency: "EUR",
      yieldPct: 98,
      wastePctProduction: 0,
      wastePctPackaging: 0,
      stdLaborCostPerBatch: 0,
      stdOverheadPerBatch: 0,
      version: 1,
      status: "BORRADOR",
    };
    setOpenRecipe(empty);
  };

  const save = async () => {
    if (!openRecipe) return;
    const parsed = bomSchema.safeParse(openRecipe);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }
    const exists = recipes.some((r) => r.id === openRecipe.id);
    try {
      if (exists) {
        await updateRecipe(openRecipe.id!, openRecipe);
      } else {
        await createRecipe(openRecipe);
      }
      setNotification("Receta guardada con éxito");
      setOpenRecipe(null);
      // Data will be re-fetched by the provider, no need for loadAllData
    } catch (e: any) {
      setError("Error al guardar: " + e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar la receta?")) return;
    try {
      await deleteRecipe(id);
      setNotification("Receta eliminada");
      if (openRecipe?.id === id) setOpenRecipe(null);
    } catch (e: any) {
      setError("Error al eliminar: " + e.message);
    }
  };

  const handleFormChange = (recipe: RecipeBom) => setOpenRecipe(recipe);

  if (loading) return <div className="p-6">Cargando BOMs y Materiales…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;

  return (
    <div className="p-6 flex flex-col gap-6">
      {notification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg bg-green-500 text-white">
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
          <p className="text-sm text-zinc-500">Fórmula, packaging, costes y versionado</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                    placeholder="Buscar receta por SKU o nombre..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
                />
            </div>
          <button
            onClick={createNew}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2"
          >
            <Plus size={16} /> Nueva receta
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SBCard title="Recetas" accent={SB_COLORS.primary.teal}>
            <div className="p-2 space-y-1">
              {recipes.map((r) => {
                if (!r.id) return null;
                const c = computeRecipeCosts(r, materials, null);
                const isSelected = openRecipe?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`rounded-lg p-3 border transition-colors ${
                      isSelected
                        ? "bg-yellow-50 border-yellow-200"
                        : "border-transparent hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-zinc-800">{r.name || "—"}</p>
                        <p className="text-xs text-zinc-500 font-mono">{r.sku || "—"}</p>
                      </div>
                      <p className="text-sm font-bold text-zinc-800">
                        {c.costPerBottleEUR ? `${c.costPerBottleEUR.toFixed(3)} €` : "—"}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => select(r.id!)}
                        className="px-3 py-1 text-xs rounded-lg border border-zinc-300 hover:bg-zinc-100"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => remove(r.id!)}
                        className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SBCard>
        </div>

        <div className="lg:col-span-2">
          {!openRecipe ? (
            <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border-2 border-dashed">
              Selecciona una receta o crea una nueva.
            </div>
          ) : (
            <RecipeForm
              value={openRecipe}
              onChange={handleFormChange}
              onSave={save}
              onCancel={() => setOpenRecipe(null)}
              materials={materials}
              finishedSkus={finishedSkus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
