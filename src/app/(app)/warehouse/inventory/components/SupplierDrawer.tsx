/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/SupplierDrawer.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { Input, SBButton } from "@/components/ui/ui-primitives";
import { createSupplier } from "@/server/actions/goods-receipt.actions";
import { toast } from "sonner";

type FormData = {
  name: string;
  taxId?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (supplier: { id: string; name: string }) => void;
}

export function SupplierDrawer({ open, onClose, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const formId = React.useId();

  const defaults = React.useMemo<FormData>(
    () => ({
      name: "",
      taxId: "",
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
    const name = data.name.trim();
    if (!name) {
      toast.error("El nombre del proveedor es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      const newSupplier = await createSupplier({
        name,
        taxId: data.taxId?.trim() || undefined,
      });

      toast.success(`Proveedor "${newSupplier.name}" creado correctamente`);
      onSuccess(newSupplier);
      onClose();
    } catch (error: any) {
      const message = error?.message || "Error al crear el proveedor";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Nuevo proveedor"
      subtitle="Registra un nuevo proveedor en el sistema."
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
            {isSaving ? "Creando…" : "Crear proveedor"}
          </SBButton>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del proveedor */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Información del proveedor
          </p>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="name"
            >
              Nombre del proveedor *
            </label>
            <Input
              id="name"
              placeholder="Ej: Proveedor S.L."
              autoFocus
              {...register("name", {
                required: "El nombre es obligatorio",
              })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
                }
              }}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="taxId"
            >
              CIF/NIF (opcional)
            </label>
            <Input
              id="taxId"
              placeholder="Ej: B12345678"
              {...register("taxId")}
            />
            <p className="text-xs text-muted-foreground">
              Número de identificación fiscal
            </p>
          </div>
        </section>

        {/* Información */}
        <div className="rounded-lg bg-info/10 border border-info/20 p-3">
          <p className="text-xs text-info font-medium">
            ℹ️ El proveedor se creará como una cuenta con rol SUPPLIER en el
            sistema SSOT.
          </p>
        </div>
      </form>
    </BaseDrawer>
  );
}
