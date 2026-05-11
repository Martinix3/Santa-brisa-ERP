/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/production/bom/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Plus, Trash2, Factory, Sparkles, TrendingDown, DollarSign } from "lucide-react";
import { SBButton, Input, Select, EmptyState } from "@/components/ui/ui-primitives";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial as RecipeBom, Uom, Item } from "@/domain/ssot";
import { canonicalUomForItem } from "@/domain/uom";
import { toast } from "sonner";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";
import { useBomForm } from "@/features/bom/useBomForm";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { getBOMsWithKPIs, upsertBOM, archiveBOM, upsertMinimalProduct } from "@/server/actions/bom.actions";
import { analyzeBOM } from "@/server/actions/ai-insights";
import type { BomAnalysis } from "@/server/gemini/analyzers/bom-analyzer";
import { FormStatusBar } from "@/components/ui/FormStatusBar";
import { BomContent } from "@/components/bom/BomContent";
import type { BomWithKPIs, BomKPIs } from "@/types/bom";

/** Tipos */
type BomStage = "PRODUCCION" | "ENVASADO";
type BomWithStage = RecipeBom & { stage?: BomStage };
type QuickCreatePayload = { name: string; sku?: string; category: "intermediate" | "fg"; packSizeMl?: number };

const normalizeDateValue = (value: any) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }
    if (typeof value.seconds === "number") {
      const millis = value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
      return new Date(millis).toISOString();
    }
  }
  return value;
};

/** Helpers */
function remapArrayFieldErrors(errs: Record<string, string> | undefined, base: string, removedIndex: number) {
  if (!errs) return errs;
  const out: Record<string, string> = {};
  const prefix = base + ".";
  for (const [k, v] of Object.entries(errs)) {
    if (!k.startsWith(prefix)) { out[k] = v; continue; }
    const rest = k.slice(prefix.length);
    const [idxStr, ...tail] = rest.split(".");
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) { out[k] = v; continue; }
    if (idx === removedIndex) continue;
    if (idx > removedIndex) out[`${base}.${idx - 1}.${tail.join(".")}`] = v;
    else out[k] = v;
  }
  return out;
}

function SectionCard({ title, hint, badge, children }: { title: string; hint?: string; badge?: string; children: React.ReactNode; }) {
  return (
    <div className="sb-card-glass-light hover-raise p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {badge && (
          <span className="sb-kpi-badge text-xs px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** ===== Formulario ===== */
interface RecipeFormProps {
  initialValues: BomWithStage;
  onSave: (values: BomWithStage) => Promise<any>;
  onCancel: () => void;
  allItems: Item[];
  isNew: boolean;
  onQuickCreateItem: (p: QuickCreatePayload) => Promise<{ id: string; sku: string }>;
}

function RecipeForm({ initialValues, onSave, onCancel, allItems, isNew, onQuickCreateItem }: RecipeFormProps) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();
  const isProd = fm.values.stage === "PRODUCCION";

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPackSize, setNewPackSize] = useState<string>("");
  const createNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fm.values.stage === "PRODUCCION" && !fm.values.baseUnit) {
      fm.set("baseUnit", "L" as Uom);
    } else if (fm.values.stage === "ENVASADO" && !fm.values.baseUnit) {
      fm.set("baseUnit", "unit" as Uom);
    }
    if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
  }, [fm.values.stage, fm.values.baseUnit, fm.values.batchSize, fm.set]);

  const itemsRaw = useMemo(() => allItems.filter(it => it.category === "raw"), [allItems]);
  const itemsPack = useMemo(() => allItems.filter(it => it.category === "pack"), [allItems]);
  const itemsIntermediate = useMemo(() => allItems.filter(it => it.category === "intermediate" || it.category === "raw"), [allItems]);
  const itemsFG = useMemo(() => allItems.filter(it => it.category === "fg"), [allItems]);

  const addLine = (role: "FORMULA" | "PACKAGING") => {
    const newItems = [...(fm.values.items || []), { sku: "", qty: 0, uom: "uds" as Uom, role }];
    fm.set("items", newItems);
  };

  const removeLine = (idxOrig: number) => {
    const newItems = (fm.values.items || []).filter((_, idx: number) => idx !== idxOrig);
    fm.set("items", newItems);
    fm.setFieldErrors(e => remapArrayFieldErrors(e, "items", idxOrig));
  };

  function validateClient(values: BomWithStage) {
    const errs: Record<string, string> = {};
    if (!values.items?.length) errs["items"] = "Añade al menos una línea de componentes.";
    values.items?.forEach((it, idx: number) => {
      if (!it.itemId) errs[`items.${idx}.itemId`] = "Material requerido";
      if (!(it.qty > 0)) errs[`items.${idx}.qty`] = "Cantidad > 0";
    });
    if (!values.outputItemId) errs["outputItemId"] = "Producto de salida requerido";
    if (!values.name) errs["name"] = "Nombre requerido";
    return errs;
  }

  const handleSave = useCallback(async () => {
    fm.setSaving(true);
    fm.setLastError(undefined);
    fm.setFieldErrors(undefined);

    const clientErrs = validateClient(fm.values as BomWithStage);
    if (Object.keys(clientErrs).length) {
      fm.setSaving(false);
      fm.setFieldErrors(clientErrs);
      setTimeout(() => focusFirstError(clientErrs), 0);
      return;
    }

    const normalized = {
      ...fm.values,
      items: (fm.values.items || []).map((it: any) => ({
        ...it,
        uom: canonicalUomForItem((it.sku || it.itemId), santaData?.onHand || [], allItems),
      })),
    };

    const res = await onSave(normalized as BomWithStage);
    fm.setSaving(false);

    if (res.ok) {
      toast.success("Receta guardada con éxito");
    } else {
      fm.setLastError(res.message);
      fm.setFieldErrors(res.fieldErrors);
      toast.error(res.message);
      setTimeout(() => focusFirstError(res.fieldErrors), 0);
    }
  }, [fm, onSave, santaData?.onHand, allItems]);

  const onSafeCancel = () => {
    if (isNew || !fm.dirty) return onCancel();
    if (window.confirm("Hay cambios sin guardar. ¿Descartar?")) onCancel();
  };
  
  const handleOutputChange = (val: string) => {
    if (val === "__new__") {
      setNewName(""); setNewSku(""); setCreateOpen(true); return;
    }
    fm.set("outputItemId", val);
  };

  const createOutputNow = async () => {
    if (!newName.trim()) return;
    const category: "intermediate" | "fg" = fm.values.stage === "PRODUCCION" ? "intermediate" : "fg";
    const created = await onQuickCreateItem({
      name: newName.trim(),
      sku: newSku.trim() || undefined,
      category,
      packSizeMl: category === "fg" ? 700 : undefined,
    });
    fm.set("outputItemId", created.id);
    setCreateOpen(false);
  };
  
  const formulaLines = useMemo(() => (fm.values.items || []).map((l: any, idx: number) => ({ l, idx })).filter(({ l }: any) => (l.role ?? "FORMULA") === "FORMULA"), [fm.values.items]);
  const packagingLines = useMemo(() => (fm.values.items || []).map((l: any, idx: number) => ({ l, idx })).filter(({ l }: any) => l.role === "PACKAGING"), [fm.values.items]);

  const balanceWarning = useMemo(() => {
    if (!isProd) return null;
    const totalL = formulaLines.reduce((sum, { l }: any) => {
      if (!l.itemId || !l.qty) return sum;
      const uom = canonicalUomForItem((l.sku || l.itemId), santaData?.onHand || [], allItems);
      if (uom === 'L') return sum + l.qty;
      return sum;
    }, 0);
    const baseUnit = fm.values.batchSize || 1;
    const diff = Math.abs(totalL - baseUnit);
    const tolerance = baseUnit * 0.05;
    if (diff > tolerance && totalL > 0) {
      const percentage = ((diff / baseUnit) * 100).toFixed(1);
      return {
        message: `⚠️ La suma de componentes líquidos (${totalL.toFixed(3)}L) difiere de la unidad base (${baseUnit}L) en un ${percentage}%`,
        severity: diff > baseUnit * 0.15 ? 'error' : 'warning'
      };
    }
    return null;
  }, [formulaLines, fm.values.batchSize, isProd, santaData?.onHand, allItems]);

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="sb-card-glass-light hover-raise overflow-hidden">
          <div className="border-b border-border/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 grid place-items-center rounded-xl bg-secondary text-muted-foreground" aria-hidden="true">
                  <Factory size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{isNew ? "Nueva receta" : `Editando: ${initialValues.name}`}</h2>
                  <p className="text-xs text-muted-foreground">{isProd ? "Producción: materias primas → PI (por 1 L)" : "Envasado: PI + packaging → FG (por 1 botella)"}</p>
                </div>
              </div>
              <div className="inline-flex rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-1">
                {(["PRODUCCION","ENVASADO"] as BomStage[]).map(st => (
                  <SBButton
                    key={st}
                    type="button"
                    variant="ghost"
                    data-active={fm.values.stage === st}
                    onClick={() => fm.set("stage", st)}
                    className="h-9 px-4 text-sm data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-lg"
                    title={st === "PRODUCCION" ? "Producción" : "Envasado"}
                  >
                    {st === "PRODUCCION" ? "Producción" : "Envasado"}
                  </SBButton>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={isProd ? "Producto Intermedio (Output)" : "Producto Final (Output)"} name="outputItemId" required error={fm.fieldErrors?.outputItemId}>
                <Select value={fm.values.outputItemId} onChange={(e) => handleOutputChange(e.target.value)}>
                  <option value="">Selecciona producto</option>
                  {isProd ? itemsIntermediate.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)
                         : itemsFG.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                  <option value="__new__">➕ Crear nuevo…</option>
                </Select>
              </Field>
              <Field label="Nombre Receta" name="name" required error={fm.fieldErrors?.name}>
                <Input value={fm.values.name} onChange={(e) => fm.set("name", e.target.value)} />
              </Field>
              <Field label="Unidad base" name="baseUnit" required error={fm.fieldErrors?.baseUnit}>
                <Select value={fm.values.baseUnit} onChange={(e) => fm.set("baseUnit", e.target.value as Uom)}>
                  <optgroup label="Volumen">
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                  </optgroup>
                  <optgroup label="Masa">
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                  </optgroup>
                  <optgroup label="Unidades">
                    <option value="unit">Unidades (unit)</option>
                    <option value="bottle">Botellas</option>
                    <option value="case">Cajas</option>
                  </optgroup>
                </Select>
              </Field>
            </div>
          </div>
          <div className="p-5 space-y-5">
            {fm.lastError && <Banner kind="err" text={fm.lastError} />}
            {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}
            {balanceWarning && <Banner kind={balanceWarning.severity === 'error' ? 'err' : 'warn'} text={balanceWarning.message} />}
            <SectionCard title={isProd ? "Componentes (raw o intermediate)" : "Componentes (intermediate o pack)"} hint={isProd ? "Cantidades para 1 L de PI" : "Cantidades por 1 botella de FG"}>
              {(isProd ? formulaLines : packagingLines).map(({ l, idx }: any) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_100px_auto] gap-2 items-end">
                  <Field label="Material" name={`items[${idx}].itemId`} required error={fm.fieldErrors?.[`items.${idx}.itemId`]}>
                    <Select value={l.itemId} onChange={(e) => fm.set(`items.${idx}.itemId`, e.target.value)}>
                      <option value="">Selecciona material</option>
                      {(isProd ? itemsIntermediate : [...itemsIntermediate, ...itemsPack]).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                    </Select>
                  </Field>
                  <Field label="Cantidad" name={`items[${idx}].qty`} required error={fm.fieldErrors?.[`items.${idx}.qty`]} >
                    <Input type="number" step="0.0001" value={l.qty} onChange={(e) => fm.set(`items.${idx}.qty`, Number(e.target.value))} />
                  </Field>
                  <div className="flex flex-col">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">UoM</label>
                    <div className="h-10 px-3 flex items-center justify-center rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm font-semibold text-sm">
                      {l.itemId ? canonicalUomForItem((l.sku || l.itemId), santaData?.onHand || [], allItems) : "—"}
                    </div>
                  </div>
                  <div className="pb-2">
                    <SBButton type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeLine(idx)} aria-label={`Eliminar línea ${idx + 1}`} title="Eliminar línea">
                      <Trash2 size={16} />
                    </SBButton>
                  </div>
                </div>
              ))}
              <SBButton type="button" variant="outline" size="sm" onClick={() => addLine(isProd ? "FORMULA" : "PACKAGING")} className="mt-2">
                <Plus size={14} className="inline mr-1" /> Añadir material
              </SBButton>
            </SectionCard>
          </div>
          <div className="border-t border-border/40 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FormStatusBar dirty={fm.dirty} saving={fm.saving} />
            <div className="flex gap-2">
              <SBButton type="button" variant="ghost" onClick={onSafeCancel}>Cancelar</SBButton>
              <SpinnerButton type="submit" loading={fm.saving} disabled={!fm.dirty || fm.saving}>Guardar</SpinnerButton>
            </div>
          </div>
        </div>
      </form>

      <SBDialog open={createOpen} onOpenChange={setCreateOpen}>
        <SBDialogContent 
          title="Crear producto"
          description="Crea un producto rápido para usarlo como Output."
          primaryAction={{ label: "Crear", onClick: createOutputNow, disabled: !newName.trim() }}
          secondaryAction={{ label: "Cancelar", onClick: () => setCreateOpen(false) }}
        >
          <Field label="Nombre" name="new_product_name">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </Field>
          <Field label="SKU (opcional)" name="new_product_sku">
            <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} />
          </Field>
        </SBDialogContent>
      </SBDialog>
    </>
  );
}

/** ===== Página Principal ===== */
export default function BomPage() {
  const { data: santaData, saveAllCollections } = useData();
  
  // Estado para BOMs con KPIs
  const [boms, setBoms] = useState<BomWithKPIs[]>([]);
  const [kpis, setKpis] = useState<BomKPIs>({
    total: 0,
    produccion: 0,
    envasado: 0,
    avgComplexity: 0,
    totalRecipes: 0,
    recentlyUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  // Estado para formulario
  const [openRecipe, setOpenRecipe] = useState<BomWithStage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [archiving, setArchiving] = useState<{ id: string; name: string } | null>(null);

  // Estado para AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<BomAnalysis | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const allItems = useMemo(() => santaData?.items || [], [santaData]);

  // Fetch BOMs with KPIs
  useEffect(() => {
    const fetchBoms = async () => {
      setLoading(true);
      const result = await getBOMsWithKPIs();
      if (result.ok) {
        setBoms(result.data.boms);
        setKpis(result.data.kpis);
      }
      setLoading(false);
    };
    fetchBoms();
  }, []);

  const createNew = useCallback(() => {
    const now = new Date().toISOString();
    setOpenRecipe({ 
      id: `bom_${Date.now()}`, 
      outputItemId: "", 
      name: "", 
      batchSize: 1, 
      baseUnit: "L", 
      stage: "PRODUCCION", 
      items: [],
      createdAt: now,
      updatedAt: now
    } as BomWithStage);
    setIsNew(true);
  }, []);

  const handleSelectBom = useCallback((bom: BomWithKPIs) => {
    setOpenRecipe(bom as BomWithStage);
    setIsNew(false);
  }, []);

  const handleSave = useCallback(async (values: BomWithStage) => {
    const result = await upsertBOM(values);
    if (result.ok && santaData) {
      const updated = [...santaData.billOfMaterials];
      const idx = updated.findIndex(b => b.id === values.id);
      if (idx > -1) updated[idx] = values as RecipeBom;
      else updated.unshift(values as RecipeBom);
      saveAllCollections({ billOfMaterials: updated });
      
      // Refetch BOMs with updated KPIs
      const bomsResult = await getBOMsWithKPIs();
      if (bomsResult.ok) {
        setBoms(bomsResult.data.boms);
        setKpis(bomsResult.data.kpis);
      }
      
      setOpenRecipe(null);
      setIsNew(false);
    }
    return result;
  }, [santaData, saveAllCollections]);

  const onArchive = useCallback(async () => {
    if (!archiving) return;
    const { id } = archiving;
    setArchiving(null);
    const res = await archiveBOM({ bomId: id });
    if (res.ok && santaData) {
      const updated = santaData.billOfMaterials.map((b: any) => b.id === id ? { ...b, isActive: false } : b);
      saveAllCollections({ billOfMaterials: updated });
      
      // Refetch BOMs
      const bomsResult = await getBOMsWithKPIs();
      if (bomsResult.ok) {
        setBoms(bomsResult.data.boms);
        setKpis(bomsResult.data.kpis);
      }
      
      setOpenRecipe(cur => (cur?.id === id ? null : cur));
      setIsNew(false);
      toast.success("Receta archivada.");
    } else {
      const message = (res as { message?: string }).message || "No se pudo archivar.";
      toast.error(message);
    }
  }, [archiving, santaData, saveAllCollections]);

  const onQuickCreateItem = useCallback(async (payload: QuickCreatePayload): Promise<{ id: string; sku: string }> => {
    const result = await upsertMinimalProduct({
      sku: payload.sku,
      name: payload.name,
      packSizeMl: payload.packSizeMl ?? (payload.category === "fg" ? 700 : undefined),
      category: payload.category,
    });
    if (!result.ok) {
      const errorMessage = (result as { message?: string }).message || "Error al crear el producto.";
      throw new Error(errorMessage);
    }
    const { id, sku } = result.data;
    const nowIso = new Date().toISOString();
    const defaultUom = payload.category === "intermediate" ? 'L' : 'unit';
    const newItem: Item = {
      id,
      sku,
      name: payload.name,
      category: payload.category,
      uom: defaultUom,
      active: true,
      isActive: true,
      bottleMl: payload.category === "fg" ? payload.packSizeMl ?? 0 : undefined,
      createdAt: nowIso as any,
      updatedAt: nowIso as any,
    } as Item;

    const nextItemsRaw = [...(santaData?.items || []), newItem];
    const nextItems = nextItemsRaw.map((item: any) => {
      const createdAt = normalizeDateValue(item.createdAt) ?? nowIso;
      const updatedAt = normalizeDateValue(item.updatedAt) ?? createdAt;
      return {
        ...item,
        createdAt,
        updatedAt,
      };
    });

    await saveAllCollections({ items: nextItems as any });
    return { id, sku };
  }, [santaData, saveAllCollections]);

  // Handler para análisis BOM con IA
  const handleAnalyzeBOM = useCallback(async () => {
    setLoadingAI(true);
    try {
      const result = await analyzeBOM();
      if (result.success && result.analysis) {
        setAiAnalysis(result.analysis);
        toast.success("Análisis completado");
      } else {
        toast.error(result.error || "Error al analizar BOMs");
      }
    } catch (error) {
      console.error('Error analyzing BOMs:', error);
      toast.error("Error al analizar BOMs");
    } finally {
      setLoadingAI(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="sb-page flex items-center justify-center p-6">
        <div className="sb-card-glass-light px-6 py-8 text-sm text-muted-foreground">
          Cargando recetas…
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Total recetas", value: kpis.total, icon: <Factory className="h-4 w-4" /> },
    { label: "Producción (PI)", value: kpis.produccion, icon: <Factory className="h-4 w-4 text-blue-500" /> },
    { label: "Envasado (FG)", value: kpis.envasado, icon: <Factory className="h-4 w-4 text-purple-500" /> },
    { label: "Usadas últimos 30d", value: kpis.recentlyUsed, icon: <TrendingDown className="h-4 w-4 text-success" /> },
    { label: "Complejidad media", value: kpis.avgComplexity.toFixed(1), icon: <DollarSign className="h-4 w-4 text-warning" /> },
  ];

  const aiPanel = aiAnalysis ? (
    <div className="sb-card-glass-light hover-raise h-full p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/15 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Insights de IA</h3>
            <p className="text-xs text-muted-foreground">
              Actualizado {new Date(aiAnalysis.createdAt).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Costo promedio por BOM</p>
            <p className="text-lg font-semibold">
              {aiAnalysis.metrics.avgCostPerBom.toFixed(2)} €
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Oportunidades detectadas</p>
            <p className="text-lg font-semibold">{aiAnalysis.optimizations.length}</p>
          </div>
        </div>
        {aiAnalysis.optimizations.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
              Optimización prioritaria
            </p>
            <ul className="space-y-2">
              {aiAnalysis.optimizations.slice(0, 2).map((opt, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-border/50 bg-secondary/40 p-3"
                >
                  <p className="text-sm font-medium text-foreground">{opt.bomName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                  {opt.potentialSavings && (
                    <p className="text-xs text-success font-semibold mt-2">
                      Ahorro estimado: {opt.potentialSavings.toFixed(2)} €
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {aiAnalysis.recommendations.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs uppercase font-semibold text-primary mb-2">
              Próxima acción sugerida
            </p>
            <p className="text-sm text-foreground">
              {aiAnalysis.recommendations[0].reason}
            </p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="sb-card-glass-light hover-raise h-full px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          Optimiza tus recetas con IA
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Identifica ahorros, alternativas de ingredientes y puntos de mejora en producción con un click.
        </p>
      </div>
      <SBButton
        className="mt-6"
        variant="primary"
        onClick={handleAnalyzeBOM}
        disabled={loadingAI}
      >
        {loadingAI ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Analizando…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Optimizar BOMs
          </>
        )}
      </SBButton>
    </div>
  );

  return (
    <div className="sb-page p-4 md:p-6 space-y-5">
      <div className="sb-header-glass p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Recetas (BOM)</h1>
          <p className="text-sm text-muted-foreground">Gestiona las fórmulas de producción y envasado con datos unificados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SBButton
            variant="secondary"
            onClick={handleAnalyzeBOM}
            disabled={loadingAI}
          >
            {loadingAI ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Analizando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {aiAnalysis ? "Reanalizar" : "Optimizar con IA"}
              </>
            )}
          </SBButton>
          <SBButton variant="primary" onClick={createNew}>
            <Plus className="h-4 w-4" />
            Nueva receta
          </SBButton>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <BomContent
          boms={boms}
          onSelectBom={handleSelectBom}
          selectedBomId={openRecipe?.id}
          renderForm={() =>
            !openRecipe ? (
              <EmptyState
                icon={Factory}
                title="Selecciona una receta"
                description="Elige una receta para ver el detalle o crea una nueva para empezar."
              />
            ) : (
              <RecipeForm
                initialValues={openRecipe}
                onSave={handleSave}
                onCancel={() => {
                  setOpenRecipe(null);
                  setIsNew(false);
                }}
                allItems={allItems}
                isNew={isNew}
                onQuickCreateItem={onQuickCreateItem}
              />
            )
          }
        />
        {aiPanel}
      </section>

      <SBDialog 
        open={!!archiving} 
        onOpenChange={(isOpen: boolean) => !isOpen && setArchiving(null)}
      >
        <SBDialogContent title="Confirmar archivado">
          <p className="text-muted-foreground">
            ¿Estás seguro de que quieres archivar la receta{" "}
            <strong>{archiving?.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="sb-dialog__footer">
            <SBButton type="button" variant="ghost" onClick={() => setArchiving(null)}>
              Cancelar
            </SBButton>
            <SBButton type="button" variant="destructive" onClick={onArchive} disabled={!archiving}>
              Archivar
            </SBButton>
          </div>
        </SBDialogContent>
      </SBDialog>
    </div>
  );
}
