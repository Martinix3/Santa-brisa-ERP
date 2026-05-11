/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/NewItemDrawer.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { Input, Select, SBButton } from "@/components/ui/ui-primitives";
import { normalizeUom } from "@/domain/uom";
import { createItem } from "@/server/actions/goods-receipt.actions";
import { toast } from "sonner";
import type { Item } from "@/domain/ssot";

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

const CATEGORY_OPTIONS = [
  { value: "fg", label: "Producto Terminado" },
  { value: "raw", label: "Materia Prima" },
  { value: "intermediate", label: "Intermedio" },
  { value: "pack", label: "Packaging" },
  { value: "label", label: "Etiqueta" },
  { value: "merch", label: "Merchandising" },
  { value: "consumable", label: "Consumible" },
];

const PACKAGING_TYPES = [
  { value: "bottle", label: "Botella" },
  { value: "case", label: "Caja" },
  { value: "pallet", label: "Pallet" },
  { value: "bag", label: "Bolsa" },
  { value: "bulk", label: "A granel" },
  { value: "other", label: "Otro" },
];

type FormData = {
  name: string;
  sku?: string;
  category: string;
  uom: string;
  stdCost?: number;
  eanCode?: string;
  packagingType?: string;
  priceBase?: number;
  unitsPerCase?: number;
  casesPerPallet?: number;
  weightPerUnit?: number;
  volumePerUnit?: number;
  bottleMl?: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (item: Item) => void;
}

export function NewItemDrawer({ open, onClose, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const formId = React.useId();

  const defaults = React.useMemo<FormData>(
    () => ({
      name: "",
      sku: "",
      category: "raw",
      uom: "unit",
      stdCost: 0,
      eanCode: "",
      packagingType: "bottle",
      priceBase: 0,
      unitsPerCase: 0,
      casesPerPallet: 0,
      weightPerUnit: 0,
      volumePerUnit: 0,
      bottleMl: 0,
    }),
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ defaultValues: defaults });

  // Reset form on open
  useEffect(() => {
    if (open) {
      reset(defaults);
    }
  }, [open, defaults, reset]);

  const onSubmit = async (data: FormData) => {
    if (!data.name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      return;
    }

    if (!data.category) {
      toast.error("Selecciona la categoría del producto");
      return;
    }

    setIsSaving(true);
    try {
      const newItem = await createItem({
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        uom: normalizeUom(data.uom),
        category: data.category,
        stdCost: data.stdCost ? Number(data.stdCost) : undefined,
        eanCode: data.eanCode?.trim() || undefined,
        packagingType: data.packagingType || undefined,
        priceBase: data.priceBase ? Number(data.priceBase) : undefined,
        logistics: {
          unitsPerCase: data.unitsPerCase || 0,
          casesPerPallet: data.casesPerPallet || 0,
          weightPerUnit: data.weightPerUnit || 0,
          volumePerUnit: data.volumePerUnit || 0,
          bottleMl: data.bottleMl || 0,
        },
      });

      toast.success(`Producto "${newItem.name}" creado correctamente`);
      onSuccess(newItem);
      onClose();
    } catch (error: any) {
      const message = error?.message || "Error al crear el producto";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Nuevo producto"
      subtitle="Crea un nuevo producto siguiendo el modelo SSOT."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <SBButton
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </SBButton>
          <SBButton form={formId} type="submit" disabled={isSaving}>
            {isSaving ? "Creando…" : "Crear producto"}
          </SBButton>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Información básica
          </p>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="name"
            >
              Nombre del producto *
            </label>
            <Input
              id="name"
              placeholder="Nombre comercial"
              {...register("name", {
                required: "El nombre es obligatorio",
              })}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="sku"
            >
              SKU (opcional)
            </label>
            <Input
              id="sku"
              placeholder="SKU interno (se generará automáticamente si no se especifica)"
              {...register("sku")}
            />
            <p className="text-xs text-muted-foreground">
              Si no se especifica, se generará automáticamente basándose en el
              nombre y categoría.
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="category"
            >
              Categoría SSOT *
            </label>
            <Select
              id="category"
              {...register("category", {
                required: "Categoría obligatoria",
              })}
            >
              <option value="">— Selecciona —</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category.message}</p>
            )}
          </div>
        </section>

        {/* Identificación */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identificación
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="eanCode">
                Código EAN/Barcode
              </label>
              <Input
                id="eanCode"
                placeholder="8412345678901"
                {...register("eanCode")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="packagingType">
                Tipo de Empaque
              </label>
              <Select id="packagingType" {...register("packagingType")}>
                {PACKAGING_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        {/* Unidades y costos */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Unidades y costos
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="uom">
                Unidad de medida *
              </label>
              <Select id="uom" {...register("uom")}>
                {UOM_OPTIONS.map((opt) => (
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

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="priceBase">
                Precio base (€)
              </label>
              <Input
                id="priceBase"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("priceBase", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Precio de venta estándar</p>
            </div>
          </div>
        </section>

        {/* Datos logísticos */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Datos logísticos (opcional)
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="unitsPerCase">
                Unidades por Caja
              </label>
              <Input
                id="unitsPerCase"
                type="number"
                min="0"
                placeholder="6"
                {...register("unitsPerCase", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="casesPerPallet">
                Cajas por Pallet
              </label>
              <Input
                id="casesPerPallet"
                type="number"
                min="0"
                placeholder="80"
                {...register("casesPerPallet", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="weightPerUnit">
                Peso por Unidad (kg)
              </label>
              <Input
                id="weightPerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.75"
                {...register("weightPerUnit", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="volumePerUnit">
                Volumen por Unidad (L)
              </label>
              <Input
                id="volumePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.75"
                {...register("volumePerUnit", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="bottleMl">
                Contenido (mL)
              </label>
              <Input
                id="bottleMl"
                type="number"
                min="0"
                placeholder="750"
                {...register("bottleMl", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Para productos líquidos</p>
            </div>
          </div>
        </section>

        {/* Información */}
        <div className="rounded-lg bg-info/10 border border-info/20 p-3">
          <p className="text-xs text-info font-medium">
            ℹ️ Los productos nuevos se crearán según el estándar SSOT V2 con
            todos los campos canónicos requeridos.
          </p>
        </div>
      </form>
    </BaseDrawer>
  );
}
