"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { Party, Item, Uom, ItemCategory, PartyRole } from "@/domain/ssot";
import { createGoodsReceipt, createSupplier, createItem, reportIncident } from "@/app/(app)/warehouse/goods-receipt/actions";
import { Plus, Trash2, Truck, AlertTriangle, Factory, PackagePlus, UserPlus } from "lucide-react";
import { toast } from "sonner";

// --- Tipos para el Formulario ---

type LineFormData = {
  itemId: string;
  supplierLot: string;
  qty: number;
  unitCost: number;
  uom: Uom;
  locationId: string;
  autoLot: boolean;
  expiryAt?: string | null;
};

type FormValues = {
  supplierId: string;
  deliveryNote: string;
  date: string;
  lines: LineFormData[];
  incident: {
    hasIncident: boolean;
    kind: "DAMAGED" | "MISSING" | "DOCUMENT" | "OTHER";
    severity: "LOW" | "MEDIUM" | "HIGH";
    notes: string;
  };
};

// --- Funciones Helper ---

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateLotNumber(item: Item | undefined) {
  const dt = new Date();
  const y = String(dt.getUTCFullYear()).slice(2);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const base = item?.id?.split("_").pop()?.toUpperCase().slice(0, 3) ?? "ITM";
  const prefix = item?.category?.startsWith("raw") ? "L" + base : "FG-" + base;
  const rand = Math.floor(Math.random() * 89) + 10;
  return `${prefix}-${y}${m}${d}-${rand}`;
}

// --- Componente Placeholder (Sustituir por uno real con búsqueda) ---
const ItemCombobox = ({ value, onChange, options }: { value: string; onChange: (id: string) => void; options: Item[] }) => (
  <Select value={value} onChange={e => onChange(e.target.value)} className="w-full">
    <option value="">Selecciona un ítem…</option>
    {options.map((it) => (<option key={it.id} value={it.id}>{it.name}</option>))}
  </Select>
);

// --- Componente Principal ---

export function QuickGoodsReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (info: { receiptId: string; receiptNumber: string }) => void;
}) {
  const { data, setData } = useData();
  const { parties, partyRoles, items: itemsAll } = (data || {}) as any;

  const suppliers = useMemo(() => {
    if (!parties || !partyRoles) return [];
    const supplierIds = new Set(partyRoles.filter((r: PartyRole) => r.role === "SUPPLIER").map((r: PartyRole) => r.partyId));
    return parties.filter((p: Party) => supplierIds.has(p.id));
  }, [parties, partyRoles]);

  const items = useMemo(() => itemsAll ?? [], [itemsAll]);

  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState<null | number>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      date: nowIsoDate(),
      supplierId: "",
      deliveryNote: "",
      lines: [{ itemId: "", supplierLot: "", qty: 0, uom: "unit", unitCost: 0, autoLot: true, locationId: "RM/MAIN" }],
      incident: { hasIncident: false, kind: "OTHER", severity: "LOW", notes: "" },
    },
  });

  useEffect(() => {
    if(open) {
        reset();
    }
  }, [open, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchLines = watch("lines");
  const watchIncident = watch("incident.hasIncident");
  
  const selectedItem = (id?: string) => items.find((it: Item) => it.id === id);
  
  const suggestLocationForItem = (it?: Item) => {
    if (!it) return "RM/MAIN";
    const catCode = (it.category || '').toUpperCase();
    if (catCode.startsWith("RAW")) return "RM/MAIN";
    if (catCode.startsWith("FG")) return "FG/MAIN";
    if (catCode.startsWith("PACK")) return "PKG/MAIN";
    return "RM/MAIN";
  };
  
  const onSubmit = async (formData: FormValues) => {
    try {
      const payloadLines = formData.lines.map((l) => {
        const it = selectedItem(l.itemId);
        return {
          itemId: l.itemId,
          supplierLot: l.supplierLot?.trim() || (l.autoLot ? generateLotNumber(it) : ""),
          qty: Number(l.qty),
          uom: l.uom,
          unitCost: l.unitCost,
          locationId: l.locationId,
          expiryAt: l.expiryAt,
        };
      });

      const res = await createGoodsReceipt({
        supplierId: formData.supplierId,
        deliveryNote: formData.deliveryNote.trim(),
        receiptDate: formData.date,
        lines: payloadLines,
      });

      if (formData.incident.hasIncident) {
        await reportIncident({
            scope: "GOODS_RECEIPT",
            refId: res.receiptId,
            kind: formData.incident.kind,
            severity: formData.incident.severity,
            notes: formData.incident.notes?.trim(),
        });
      }

      toast.success("Recepción creada correctamente.");
      onSuccess?.(res);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al guardar recepción.");
    }
  };

  const addLine = () => {
    append({ itemId: "", supplierLot: "", qty: 0, uom: "unit", unitCost: 0, autoLot: true, locationId: "RM/MAIN" });
  };
  
  return (
    <>
      <SBDialog open={open} onOpenChange={onOpenChange}>
        <SBDialogContent title={<><Truck className="h-5 w-5" /> Nueva Recepción de Mercancía</>} maxWidth="60rem">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Cabecera */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Proveedor</span>
                <div className="flex gap-2">
                  <Select {...register("supplierId", { required: "El proveedor es obligatorio" })} aria-invalid={!!errors.supplierId}>
                    <option value="">Selecciona proveedor…</option>
                    {suppliers.map((s: Party) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <button type="button" className="sb-btn text-[color:var(--sb-accent-logistica)] border border-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)/0.08]" onClick={() => setNewSupplierOpen(true)} title="Crear proveedor"><UserPlus className="h-4 w-4" /></button>
                </div>
                 {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}
              </label>
              
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Albarán</span>
                <Input {...register("deliveryNote", { required: "El albarán es obligatorio" })} placeholder="Ej: 2025/ABC-001" aria-invalid={!!errors.deliveryNote} />
                 {errors.deliveryNote && <p className="text-xs text-red-500">{errors.deliveryNote.message}</p>}
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Fecha</span>
                <Input type="date" {...register("date", { required: true })} />
              </label>
            </div>
            
            {/* Líneas */}
            <div className="space-y-4 rounded-md border p-3">
              <div className="text-sm font-medium">Líneas</div>
              {fields.map((field, i) => {
                const line = watchLines[i];
                const item = selectedItem(line.itemId);
                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-2 items-start">
                    <div className="flex w-full gap-2">
                      <Controller
                        name={`lines.${i}.itemId`}
                        control={control}
                        rules={{ required: true }}
                        render={({ field: { onChange, value } }) => (
                           <ItemCombobox
                            options={items}
                            value={value}
                            onChange={(itemId) => {
                              const itSel = selectedItem(itemId);
                              onChange(itemId);
                              setValue(`lines.${i}.uom`, itSel?.uom ?? 'unit');
                              setValue(`lines.${i}.unitCost`, itSel?.stdCost ?? 0);
                              setValue(`lines.${i}.locationId`, suggestLocationForItem(itSel));
                            }}
                          />
                        )}
                      />
                       <button type="button" className="sb-btn border text-[color:var(--sb-accent-logistica)] border-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)/0.08]" onClick={() => setNewItemOpen(i)} title="Crear SKU"><PackagePlus className="h-4 w-4" /></button>
                    </div>

                    <div className="grid gap-1">
                      <Input
                        placeholder={line.autoLot ? "Se generará automáticamente" : "Lote del proveedor"}
                        {...register(`lines.${i}.supplierLot`)}
                        disabled={line.autoLot}
                        onChange={(e) => {
                            setValue(`lines.${i}.supplierLot`, e.target.value);
                            if (e.target.value) setValue(`lines.${i}.autoLot`, false);
                        }}
                      />
                    </div>
                    
                    <Input type="number" placeholder="Cantidad" step="any" {...register(`lines.${i}.qty`, { valueAsNumber: true, required: true, min: { value: 0.001, message: ">0" } })} aria-invalid={!!errors.lines?.[i]?.qty} />
                    <Select {...register(`lines.${i}.uom`)}>
                      <option value="unit">unit</option><option value="kg">kg</option><option value="L">L</option><option value="g">g</option><option value="mL">mL</option>
                    </Select>
                    
                    <Input type="number" placeholder="Coste" step="any" {...register(`lines.${i}.unitCost`, { valueAsNumber: true })} />
                    <Input placeholder="Ubicación" {...register(`lines.${i}.locationId`)} />

                    <div className="flex h-full items-center justify-self-end">
                      <button type="button" className="p-2 hover:bg-zinc-100 rounded" onClick={() => remove(i)} title="Eliminar línea"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                );
              })}
              <SBButton type="button" variant="secondary" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" /> Añadir línea</SBButton>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-500">
                Los lotes de material crítico (raw, pack, fg) se pondrán en estado 'PENDING' para QC.
                </div>
                <SBButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar Recepción"}</SBButton>
            </div>
          </form>
        </SBDialogContent>
      </SBDialog>

      {newSupplierOpen && (
        <CreateSupplierDialog
          open={newSupplierOpen}
          onOpenChange={setNewSupplierOpen}
          onCreated={(party) => {
            toast.success("Proveedor creado.");
            setData(d => d ? ({ ...d, parties: [...(d.parties || []), party], partyRoles: [...(d.partyRoles || []), {id: `role_${Date.now()}`, partyId: party.id, role: 'SUPPLIER'}] as PartyRole[]}) : d);
            setValue("supplierId", party.id, { shouldValidate: true });
          }}
        />
      )}

      {newItemOpen != null && (
        <CreateItemDialog
          open={newItemOpen != null}
          onOpenChange={() => setNewItemOpen(null)}
          onCreated={(it) => {
            toast.success("SKU creado.");
            const lineIndex = newItemOpen;
            setData(d => d ? ({ ...d, items: [...(d.items || []), it] }) : d);
            setValue(`lines.${lineIndex}.itemId`, it.id, { shouldValidate: true });
            setValue(`lines.${lineIndex}.uom`, it.uom);
            setValue(`lines.${lineIndex}.unitCost`, it.stdCost ?? 0);
            setValue(`lines.${lineIndex}.locationId`, suggestLocationForItem(it));
          }}
        />
      )}
    </>
  );
}


/* -------------------------------------------------------------
 * Dialogs de Alta Rápida
 * ----------------------------------------------------------- */

function CreateSupplierDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (party: Party) => void; }) {
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ name: string; taxId: string }>();

  const onSubmit = async (data: { name: string; taxId: string }) => {
    try {
      const party = await createSupplier({ name: data.name.trim(), taxId: data.taxId.trim() || undefined });
      onCreated(party);
      onOpenChange(false);
      reset();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo crear el proveedor.");
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title={<><UserPlus className="h-5 w-5" /> Nuevo proveedor</>} maxWidth="28rem">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="grid gap-1.5">
            <span className="text-sm">Nombre</span>
            <Input {...register("name", { required: "El nombre es obligatorio" })} placeholder="Ej: Productos del Valle, S.L." aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">CIF/NIF (opcional)</span>
            <Input {...register("taxId")} placeholder="Ej: B12345678" />
          </label>
          <div className="flex justify-end pt-2">
            <SBButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando…" : "Crear Proveedor"}</SBButton>
          </div>
        </form>
      </SBDialogContent>
    </SBDialog>
  );
}

function CreateItemDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (item: Item) => void; }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<
    { name: string; sku: string; uom: Uom; category: ItemCategory; stdCost: number }
  >({
    defaultValues: { uom: "unit", stdCost: 0, category: "raw" }
  });

  const onSubmit = async (data: { name: string; sku: string; uom: Uom; category: ItemCategory; stdCost: number }) => {
    try {
      const item = await createItem({
        name: data.name.trim(),
        sku: data.sku.trim() || undefined,
        uom: data.uom,
        category: data.category,
        stdCost: data.stdCost,
      });
      onCreated(item);
      onOpenChange(false);
      reset();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo crear el SKU.");
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title={<><Factory className="h-5 w-5" /> Nuevo SKU</>} maxWidth="34rem">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-sm">Nombre</span>
              <Input {...register("name", { required: "El nombre es obligatorio" })} placeholder="Ej: Tequila Blanco 20L" aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm">SKU (opcional)</span>
              <Input {...register("sku")} placeholder="Ej: ITEM-TEQ-20L" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm">UdM</span>
              <Select {...register("uom")}>
                <option value="unit">unit</option><option value="kg">kg</option><option value="L">L</option><option value="g">g</option><option value="mL">mL</option>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm">Categoría</span>
              <Select {...register("category")}>
                <option value="raw">Materia Prima</option>
                <option value="pack">Packaging</option>
                <option value="intermediate">Intermedio</option>
                <option value="fg">Producto Terminado</option>
                <option value="consumable">Consumible</option>
                <option value="merch">Merchandising</option>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm">Coste estándar</span>
              <Input type="number" min={0} step="any" {...register("stdCost", { valueAsNumber: true })} />
            </label>
          </div>
          <div className="flex justify-end pt-4">
            <SBButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando…" : "Crear SKU"}</SBButton>
          </div>
        </form>
      </SBDialogContent>
    </SBDialog>
  );
}
