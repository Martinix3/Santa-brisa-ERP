/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/NewOnHandDialog.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { Input, Select, SBButton } from "@/components/ui/ui-primitives";
import type { Item } from "@/domain/ssot";
import { normalizeUom } from "@/domain/uom";
import { createManualOnHand } from "@/server/actions/inventory.actions";
import { createItem } from "@/server/actions/goods-receipt.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Upload, X as XIcon } from "lucide-react";
import { uploadMultipleFiles } from "@/lib/firebase-storage";

const UOM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "unit", label: "Unidad" },
  { value: "kg", label: "Kg" },
  { value: "g", label: "Gramos" },
  { value: "L", label: "Litros" },
  { value: "mL", label: "mL" },
  { value: "case", label: "Caja" },
  { value: "bottle", label: "Botella" },
  { value: "pallet", label: "Palé" },
];

type FormState = {
  itemId: string;               // SSOT V2: Use canonical itemId instead of sku
  qty: number;
  uom: string;
  locationId: string;
  occurredAt: string;
  note?: string;
  category?: string;
  currency?: string;
  amount?: number;
  supplier?: string;
  invoiceRef?: string;
  newItemName?: string;
  newItemSku?: string;
  stdCost?: number;
};

type PhotoFile = {
  id: string;
  file: File;
  preview: string;
};

const CATEGORY_OPTIONS = [
  { value: "fg", label: "Producto Terminado" },
  { value: "raw", label: "Materia Prima" },
  { value: "intermediate", label: "Intermedio" },
  { value: "pack", label: "Packaging" },
  { value: "label", label: "Etiqueta" },
  { value: "merch", label: "Merchandising" },
  { value: "consumable", label: "Consumible" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { stockMoveId: string; lotNumber: string }) => void;
  onError?: (message: string) => void;
  items: Item[];
  locations: string[];
  suppliers?: string[];
  defaultLocation?: string;
}

const MODE_OPTIONS = [
  { id: "existing", label: "Producto existente" },
  { id: "new", label: "Crear nuevo producto" },
];

export function NewOnHandDialog({
  open,
  onClose,
  onSuccess,
  onError,
  items,
  locations,
  suppliers = [],
  defaultLocation,
}: Props) {
  const [mode, setMode] = React.useState<"existing" | "new">("existing");
  const [isSaving, setIsSaving] = React.useState(false);
  const [photos, setPhotos] = React.useState<PhotoFile[]>([]);
  const [showNewSupplierDialog, setShowNewSupplierDialog] = React.useState(false);
  const [newSupplierName, setNewSupplierName] = React.useState("");
  const [localSuppliers, setLocalSuppliers] = React.useState<string[]>([]);
  const formId = React.useId();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const suppliersInitialized = React.useRef(false);

  // Initialize localSuppliers only once when dialog opens
  React.useEffect(() => {
    if (open && !suppliersInitialized.current) {
      setLocalSuppliers(suppliers);
      suppliersInitialized.current = true;
    }
    if (!open) {
      suppliersInitialized.current = false;
    }
  }, [open]);

  const defaults = React.useMemo<FormState>(
    () => ({
      itemId: "",
      qty: 0,
      uom: "unit",
      locationId: defaultLocation || locations[0] || "ALMACEN_PRINCIPAL",
      occurredAt: new Date().toISOString().slice(0, 16),
      note: "",
      category: "",
      currency: "EUR",
    }),
    [defaultLocation, locations]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<FormState>({
    defaultValues: defaults,
  });

  const selectedItemId = watch("itemId");
  const selectedItem = React.useMemo(
    () => items.find(i => i.id === selectedItemId),
    [items, selectedItemId]
  );

  const handleDrawerClose = React.useCallback(() => {
    reset(defaults);
    setMode("existing");
    onClose();
  }, [defaults, onClose, reset]);

  React.useEffect(() => {
    if (open) {
      reset(defaults);
      setMode("existing");
    }
  }, [open, defaults, reset]);

  React.useEffect(() => {
    if (mode === "existing") {
      setValue("newItemName", "");
      setValue("newItemSku", "");
      setValue("stdCost", undefined);
    } else {
      setValue("itemId", "");
      setValue("category", "");
    }
  }, [mode, setValue]);

  React.useEffect(() => {
    if (selectedItem && mode === "existing") {
      setValue("uom", selectedItem.uom);
      setValue("category", selectedItem.category ?? "");
    }
  }, [selectedItem, mode, setValue]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoFile[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleCreateSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      toast.error("El nombre del proveedor es obligatorio");
      return;
    }

    try {
      // Create supplier as a Contact with SUPPLIER role
      const supplierId = `sup_${Date.now()}`;
      const newSupplier = {
        id: supplierId,
        kind: "ORG" as const,
        roles: ["SUPPLIER" as const],
        displayName: name,
        legalName: name,
        supplier: { categories: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // This would need a proper server action - for now just add locally
      setLocalSuppliers(prev => [...prev, name]);
      setValue("supplier", name);
      setShowNewSupplierDialog(false);
      setNewSupplierName("");
      toast.success(`Proveedor "${name}" añadido`);
    } catch (error: any) {
      toast.error(error.message || "Error al crear proveedor");
    }
  };

  const onSubmit = async (data: FormState) => {
    setIsSaving(true);
    try {
      // Upload photos if any
      let uploadedPhotoUrls: string[] = [];
      if (photos.length > 0) {
        toast.loading("Subiendo archivos...");
        const files = photos.map(p => p.file);
        const storagePath = `receipts/${Date.now()}`;
        const { urls, errors } = await uploadMultipleFiles(files, storagePath);
        
        if (errors.length > 0) {
          console.warn("Errores al subir archivos:", errors);
        }
        
        uploadedPhotoUrls = urls;
        toast.dismiss();
      }

      let effectiveItemId = data.itemId;

      if (mode === "new") {
        const newName = (data.newItemName || "").trim();
        if (!newName) {
          throw new Error("El nombre del nuevo producto es obligatorio.");
        }
        if (!data.category) {
          throw new Error("Selecciona la categoría del nuevo producto.");
        }

        const created = await createItem({
          name: newName,
          sku: data.newItemSku?.trim() || undefined,
          uom: normalizeUom(data.uom),
          category: data.category,
          stdCost: data.stdCost ? Number(data.stdCost) : undefined,
        });

        effectiveItemId = created.id;
      } else if (!effectiveItemId) {
        throw new Error("Selecciona un producto existente.");
      }

      const noteWithPhotos = [
        data.note?.trim(),
        uploadedPhotoUrls.length > 0 ? `Documentos: ${uploadedPhotoUrls.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      // Get userId from auth (simplified - should come from session/context in real app)
      const userId = "system"; // TODO: Get from auth context

      const result = await createManualOnHand({
        itemId: effectiveItemId,
        qty: Number(data.qty),
        uom: normalizeUom(data.uom),
        locationId: data.locationId,
        occurredAt: data.occurredAt ? new Date(data.occurredAt).toISOString() : undefined,
        note: noteWithPhotos || undefined,
        supplier: data.supplier?.trim() || undefined,
        invoiceRef: data.invoiceRef?.trim() || undefined,
        amount: data.amount ? Number(data.amount) : undefined,
        currency: data.currency || "EUR",
        sendToQc: true, // Always send to QC
      }, userId);

      if (!result.ok) {
        throw new Error(result.error || "No se pudo crear el ajuste manual.");
      }

      // Clean up photo previews
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);

      toast.success("Ajuste creado correctamente");
      onSuccess({
        stockMoveId: result.value.stockMoveId,
        lotNumber: result.value.lotCode
      });
      handleDrawerClose();
    } catch (error: any) {
      const message = error?.message || "Error al crear la entrada de stock.";
      toast.error(message);
      onError?.(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseDrawer
      open={open}
      onClose={handleDrawerClose}
      title="Ajuste manual de inventario"
      subtitle="Registra entradas puntuales manteniendo el modelo SSOT."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <SBButton
            variant="ghost"
            type="button"
            onClick={handleDrawerClose}
            disabled={isSaving}
          >
            Cancelar
          </SBButton>
          <SBButton
            form={formId}
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar ajuste"}
          </SBButton>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Producto
          </p>
          <div className="inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1 text-xs font-semibold">
            {MODE_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id as "existing" | "new")}
                className={cn(
                  "rounded-md px-3 py-2 transition-colors",
                  mode === option.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="itemId">
                Selecciona un producto
              </label>
              <Select
                id="itemId"
                {...register("itemId", {
                  validate: value =>
                    mode === "existing"
                      ? value
                        ? true
                        : "Selecciona un producto"
                      : true,
                })}
              >
                <option value="">— Selecciona —</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </Select>
              {errors.itemId && <p className="text-xs text-red-500">{errors.itemId.message}</p>}
              {selectedItem?.category && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Categoría SSOT: <strong>{selectedItem.category}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="newItemName">
                  Nombre del nuevo producto
                </label>
                <Input
                  id="newItemName"
                  placeholder="Nombre comercial"
                  {...register("newItemName", {
                    validate: value =>
                      mode === "new"
                        ? (value || "").trim().length > 0 || "El nombre es obligatorio"
                        : true,
                  })}
                />
                {errors.newItemName && (
                  <p className="text-xs text-red-500">{errors.newItemName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="newItemSku">
                  SKU (opcional)
                </label>
                <Input
                  id="newItemSku"
                  placeholder="SKU interno"
                  {...register("newItemSku")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="category">
                  Categoría SSOT
                </label>
                <Select
                  id="category"
                  {...register("category", {
                    validate: value =>
                      mode === "new" || !selectedItem?.category
                        ? value
                          ? true
                          : "Categoría obligatoria"
                        : true,
                  })}
                >
                  <option value="">— Selecciona —</option>
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                {errors.category && (
                  <p className="text-xs text-red-500">{errors.category.message}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="uom">
                    Unidad
                  </label>
                  <Select id="uom" {...register("uom")}>
                    {UOM_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="stdCost">
                    Coste estándar (€)
                  </label>
                  <Input
                    id="stdCost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...register("stdCost", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ajuste
          </p>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="occurredAt">
              Fecha y hora
            </label>
            <Input id="occurredAt" type="datetime-local" {...register("occurredAt")} />
          </div>
          <div className="rounded-lg bg-info/10 border border-info/20 p-3">
            <p className="text-xs text-info font-medium">
              ℹ️ El código de lote se generará automáticamente siguiendo el formato SSOT V2 (YYJJJ-PL-SEQ)
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="qty">
                Cantidad
              </label>
              <Input
                id="qty"
                type="number"
                step="0.01"
                min="0.01"
                {...register("qty", {
                  valueAsNumber: true,
                  validate: value => (value && value > 0) || "La cantidad debe ser mayor que 0",
                })}
              />
              {errors.qty && <p className="text-xs text-red-500">{errors.qty.message}</p>}
            </div>
            {mode === "existing" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Unidad</label>
                <Select
                  disabled={!!selectedItem?.uom}
                  {...register("uom")}
                >
                  {UOM_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="locationId">
              Ubicación
            </label>
            <Select
              id="locationId"
              {...register("locationId", {
                required: "La ubicación es obligatoria",
              })}
            >
              {locations.length === 0 && (
                <option value="">Sin ubicaciones disponibles</option>
              )}
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
            {errors.locationId && (
              <p className="text-xs text-red-500">{errors.locationId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Proveedor (opcional)
            </label>
            <div className="flex gap-2">
              <Select className="flex-1" {...register("supplier")}>
                <option value="">— Sin proveedor —</option>
                {localSuppliers.map(sup => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setShowNewSupplierDialog(true)}
                className="px-3 rounded-lg border border-dashed border-primary text-primary hover:bg-primary/10 transition-colors"
                title="Nuevo proveedor"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Si es una recepción de proveedor
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="invoiceRef">
                Albarán/Factura (opcional)
              </label>
              <Input
                id="invoiceRef"
                placeholder="Nº albarán o factura"
                {...register("invoiceRef")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="amount">
                Valor del ajuste (€)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="note">
              Notas (opcional)
            </label>
            <Input
              id="note"
              placeholder="Motivo del ajuste, observaciones…"
              {...register("note")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Documentos/Fotos (opcional)
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Upload size={24} />
                <span className="text-sm">Click para subir archivos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon size={14} />
                      </button>
                      <p className="text-xs text-center truncate mt-1">
                        {photo.file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-info/10 border border-info/20 p-3">
            <p className="text-xs text-info font-medium">
              ℹ️ Todos los productos nuevos se envían automáticamente a Control de Calidad (QC) para revisión.
            </p>
          </div>
        </section>
      </form>

      {/* New Supplier Dialog */}
      {showNewSupplierDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Nuevo Proveedor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Proveedor *
                </label>
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Ej: Proveedor S.L."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateSupplier();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <SBButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowNewSupplierDialog(false);
                    setNewSupplierName("");
                  }}
                >
                  Cancelar
                </SBButton>
                <SBButton
                  type="button"
                  onClick={handleCreateSupplier}
                  disabled={!newSupplierName.trim()}
                >
                  Crear
                </SBButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseDrawer>
  );
}
