
// src/features/warehouse/components/QuickGoodsReceiptDialog.tsx
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/ui-primitives"; 
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/ui-primitives"; 
import { useData } from "@/lib/dataprovider";
import type { Party, Item, Uom, ItemCategory, PartyRole } from "@/domain/ssot";
import { createGoodsReceipt, createSupplier, createItem } from "@/app/(app)/warehouse/goods-receipt/actions";
import { Plus, Trash2, Truck, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ============================================================================
// NUEVO COMPONENTE REUTILIZABLE: SearchableCombobox
// ============================================================================
type ComboboxOption = { value: string; label: string; };

function SearchableCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (inputValue: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentLabel = options.find((opt) => opt.value === value)?.label || "";

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SBButton variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? currentLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </SBButton>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar..." onValueChange={setInputValue} />
          <CommandList>
            <CommandEmpty>
              {onCreate && inputValue ? (
                <button
                  className="w-full text-left p-2 text-sm hover:bg-zinc-100"
                  onMouseDown={() => {
                    onCreate(inputValue);
                    setOpen(false);
                  }}
                >
                  <Plus className="inline h-4 w-4 mr-2" /> Crear "{inputValue}"
                </button>
              ) : "No se encontraron resultados."}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === option.value ? "opacity-100" : "opacity-0"}`} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


// --- Tipos para el Formulario (ACTUALIZADOS) ---
type LineFormData = {
  itemId: string;
  newItemName?: string; // Para creación on-the-fly
  newItemCategory?: ItemCategory; // Para creación on-the-fly
  supplierLot: string;
  qty: number;
  unitCost: number;
  uom: Uom;
  autoLot: boolean;
  expiryAt?: string | null;
};
type FormValues = {
  supplierId: string;
  deliveryNote: string;
  date: string;
  notes?: string;
  lines: LineFormData[];
};

function nowIsoDate() { return new Date().toISOString().slice(0,10) };
function generateLotNumber(item?: Item) { 
  const dt = new Date();
  const y = String(dt.getUTCFullYear()).slice(2);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const base = item?.id?.split("_").pop()?.toUpperCase().slice(0, 3) ?? "ITM";
  const prefix = item?.category?.startsWith("raw") ? "L" + base : "FG-" + base;
  const rand = Math.floor(Math.random() * 89) + 10;
  return `${prefix}-${y}${m}${d}-${rand}`;
 };


// ============================================================================
// COMPONENTE PRINCIPAL REFACTORIZADO
// ============================================================================
export function QuickGoodsReceiptDialog({ open, onOpenChange, onSuccess, onError }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (info: { receiptId: string; receiptNumber: string }) => void;
  onError?: (message: string) => void;
}) {
  const { data, setData } = useData();
  const router = useRouter(); 

  const { suppliers, items } = useMemo(() => {
    if (!data) return { suppliers: [], items: [] };
    const supplierIds = new Set((data.partyRoles || []).filter((r: PartyRole) => r.role === 'SUPPLIER').map((r: PartyRole) => r.partyId));
    const supplierList = (data.parties || []).filter((p: Party) => supplierIds.has(p.id));
    return { suppliers: supplierList, items: data.items || [] };
  }, [data]);

  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
    watch, setValue, getValues
  } = useForm<FormValues>({
    defaultValues: {
      date: nowIsoDate(),
      supplierId: "",
      deliveryNote: "",
      lines: [{ itemId: "", supplierLot: "", qty: 0, uom: "unit", unitCost: 0, autoLot: true, expiryAt: null, newItemCategory: 'raw' }],
    },
  });

  useEffect(() => { if (open) reset({ date: nowIsoDate(), lines: [{ itemId: "", supplierLot: "", qty: 0, uom: "unit", unitCost: 0, autoLot: true, expiryAt: null, newItemCategory: 'raw' }] }); }, [open, reset]);
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const supplierOptions = useMemo(() => suppliers.map((s: Party) => ({ value: s.id, label: s.name })), [suppliers]);
  const itemOptions = useMemo(() => items.map((i: Item) => ({ value: i.id, label: i.name })), [items]);
  
  const onSubmit = async (formData: FormValues) => {
    try {
        const payloadLines = formData.lines.map((l) => {
          const it = items.find(i => i.id === l.itemId);
          return {
            itemId: l.itemId,
            newItemName: l.newItemName,
            newItemCategory: l.newItemCategory,
            supplierLot: l.supplierLot?.trim() || (l.autoLot ? generateLotNumber(it) : ""),
            qty: Number(l.qty),
            uom: l.uom,
            unitCost: l.unitCost,
            expiryAt: l.expiryAt,
          };
        });

        const res = await createGoodsReceipt({
            supplierId: formData.supplierId,
            deliveryNote: formData.deliveryNote.trim(),
            receiptDate: formData.date,
            notes: formData.notes,
            lines: payloadLines as any,
        });

        onSuccess?.(res);
        onOpenChange(false);
        router.refresh();
        toast.success(`Recepción #${res.receiptNumber} creada con éxito.`);
    } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Error al guardar recepción.");
    }
  };

  const addLine = () => {
    const lastLine = getValues("lines")[fields.length - 1];
    append({
      itemId: "",
      supplierLot: "",
      qty: 0,
      uom: lastLine?.uom || "unit",
      unitCost: 0,
      autoLot: true,
      expiryAt: null,
      newItemCategory: lastLine?.newItemCategory || 'raw'
    });
  };
  
  return (
    <>
      <SBDialog open={open} onOpenChange={onOpenChange}>
        <SBDialogContent
          title={<div className="flex items-center gap-2"><Truck className="h-5 w-5" /> Nueva Recepción de Mercancía</div>}
          maxWidth="70rem"
          onSubmit={handleSubmit(onSubmit)}
          primaryAction={{ label: isSubmitting ? "Guardando…" : "Guardar Recepción", type: "submit", disabled: isSubmitting }}
          secondaryAction={{ label: "Cancelar", onClick: () => onOpenChange(false) }}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Proveedor</span>
                <Controller
                  name="supplierId"
                  control={control}
                  rules={{ required: "El proveedor es obligatorio" }}
                  render={({ field }) => (
                    <SearchableCombobox
                      placeholder="Buscar o crear proveedor..."
                      options={supplierOptions}
                      value={field.value}
                      onChange={field.onChange}
                      onCreate={async (name) => {
                        const newParty = await createSupplier({ name });
                        setData(d => d ? ({ ...d, parties: [...(d.parties || []), newParty], partyRoles: [...(d.partyRoles || []), {id:`role_${Date.now()}`, partyId: newParty.id, role:'SUPPLIER'} as PartyRole]}) : d);
                        setValue("supplierId", newParty.id, { shouldValidate: true });
                      }}
                    />
                  )}
                />
                {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}
              </label>
              <label className="grid gap-1.5"><span className="text-sm font-medium">Albarán</span><Input {...register("deliveryNote", { required: "El albarán es obligatorio" })}/></label>
              <label className="grid gap-1.5"><span className="text-sm font-medium">Fecha</span><Input type="date" {...register("date", { required: true })}/></label>
            </div>

            <div className="mt-4">
              <label htmlFor="receipt-notes" className="text-sm font-medium">Notas (opcional)</label>
              <textarea
                id="receipt-notes"
                {...register("notes")}
                rows={2}
                className="mt-1 w-full border rounded-md p-2 text-sm"
                placeholder="Ej: El palet llegó dañado, el conductor tuvo que esperar, etc."
              />
            </div>
            
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium">Líneas de la Recepción</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="p-2 w-2/5">Producto</th>
                      <th className="p-2">Lote Proveedor</th>
                      <th className="p-2">Cantidad</th>
                      <th className="p-2">UdM</th>
                      <th className="p-2">Coste/Ud</th>
                      <th className="p-2">Caducidad</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((field, i) => {
                      const currentLine = watch(`lines.${i}`);
                      return (
                      <tr key={field.id}>
                        <td className="p-2 align-top">
                          <Controller name={`lines.${i}.itemId`} control={control} rules={{ required: !watch(`lines.${i}.newItemName`) }}
                            render={({ field: controllerField }) => (
                              <SearchableCombobox placeholder="Buscar o crear SKU..." options={itemOptions} value={controllerField.value}
                                onChange={(itemId) => {
                                    const itSel = items.find((it: Item) => it.id === itemId);
                                    controllerField.onChange(itemId);
                                    setValue(`lines.${i}.uom`, itSel?.uom ?? 'unit');
                                    setValue(`lines.${i}.unitCost`, itSel?.stdCost ?? 0);
                                    setValue(`lines.${i}.newItemName`, undefined); // Limpiar si se selecciona
                                }}
                                onCreate={async (name) => {
                                    setValue(`lines.${i}.itemId`, '');
                                    setValue(`lines.${i}.newItemName`, name);
                                }}
                              />
                            )}
                          />
                          {watch(`lines.${i}.newItemName`) && (
                                <div className="mt-2">
                                    <Select {...register(`lines.${i}.newItemCategory`)}>
                                        <option value="raw">Materia Prima</option>
                                        <option value="pack">Packaging</option>
                                        <option value="label">Etiqueta</option>
                                        <option value="consumable">Consumible</option>
                                        <option value="fg">Producto Terminado</option>
                                    </Select>
                                </div>
                          )}
                        </td>
                        <td className="p-2 align-top"><Input placeholder="Lote del proveedor" {...register(`lines.${i}.supplierLot`)} /></td>
                        <td className="p-2 align-top"><Input type="number" step="any" {...register(`lines.${i}.qty`, { valueAsNumber: true, required: true, min: 0.001 })} /></td>
                        <td className="p-2 align-top"><Select {...register(`lines.${i}.uom`)}><option value="unit">unit</option><option value="kg">kg</option><option value="L">L</option></Select></td>
                        <td className="p-2 align-top"><Input type="number" step="any" {...register(`lines.${i}.unitCost`, { valueAsNumber: true })} /></td>
                        <td className="p-2 align-top"><Input type="date" {...register(`lines.${i}.expiryAt`)} /></td>
                        <td className="p-2 align-top"><button type="button" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-red-500" /></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
              <SBButton type="button" variant="secondary" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" /> Añadir línea</SBButton>
            </div>
        </SBDialogContent>
      </SBDialog>
    </>
  );
}
