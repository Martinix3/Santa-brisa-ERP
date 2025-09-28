
// src/app/(app)/warehouse/inventory/components/NewOnHandDialog.tsx
"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { Input, Select } from '@/components/ui/ui-primitives';
import { Item, ItemCategory, Uom } from '@/domain/ssot';

type FormState = {
  itemId: string;
  lotNumber: string;
  qty: number | "";
  uom: string;
  locationId: string;
  occurredAt: string;
  note?: string;
  supplier?: string;
  invoiceRef?: string;
  amount?: number | "";
  currency?: string;
  category?: ItemCategory;
  sendToQc: boolean;
};

const FieldRow: React.FC<React.PropsWithChildren<{ label: string; error?: string; htmlFor?: string }>> = ({ children, label, error, htmlFor }) => (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
        <label className="text-xs text-zinc-600 font-medium" htmlFor={htmlFor}>{label}</label>
        <div className="flex-1">{children}</div>
        {error && <div className="col-start-2 text-xs text-red-500 -mt-2">{error}</div>}
    </div>
);

export function NewOnHandDialog({
  open, onClose, onCreate, items, locations, defaultLocation
}: {
  open: boolean; onClose: () => void; onCreate: (p: any) => Promise<void>;
  items: Item[]; locations: string[]; defaultLocation?: string;
}) {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormState>({
    defaultValues: {
      qty: "",
      uom: "unit",
      locationId: defaultLocation || "",
      occurredAt: new Date().toISOString().slice(0, 16),
      currency: "EUR",
      sendToQc: false,
    }
  });

  const selectedItemId = watch('itemId');

  React.useEffect(() => {
    if (selectedItemId) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        setValue('uom', item.uom);
        setValue('category', item.category);
      }
    }
  }, [selectedItemId, items, setValue]);

  const onSubmit = async (data: FormState) => {
    await onCreate(data);
    reset();
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent title="Añadir Stock Manual" maxWidth="36rem">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FieldRow label="Producto" error={errors.itemId?.message} htmlFor="itemId">
            <Select id="itemId" {...register("itemId", { required: "Selecciona un producto" })}>
              <option value="">-- Selecciona --</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="Lote (auto si vacío)" htmlFor="lotNumber">
            <Input id="lotNumber" {...register("lotNumber")} placeholder="SKU-YYMM-XX" />
          </FieldRow>
          <FieldRow label="Cantidad" error={errors.qty?.message}>
            <div className="flex gap-2">
              <Input
                type="number"
                {...register("qty", { required: "Cantidad > 0", valueAsNumber: true, min: { value: 0.01, message: "Debe ser > 0" } })}
              />
              <Select {...register("uom")}>
                {['unit', 'kg', 'L', 'case'].map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
          </FieldRow>
          <FieldRow label="Ubicación" error={errors.locationId?.message} htmlFor="locationId">
            <Select id="locationId" {...register("locationId", { required: "Ubicación requerida" })}>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="Fecha/hora" htmlFor="occurredAt">
            <Input id="occurredAt" type="datetime-local" {...register("occurredAt")} />
          </FieldRow>
          <FieldRow label="Notas" htmlFor="note">
            <Input id="note" {...register("note")} placeholder="Ajuste anual, promo, etc." />
          </FieldRow>
          <div className="border-t pt-4 space-y-3">
            <FieldRow label="Categoría" error={errors.category?.message} htmlFor="category">
                <Select id="category" {...register("category", { required: "Categoría obligatoria" })}>
                    <option value="">— Selecciona —</option>
                    <option value="fg">Producto Terminado</option>
                    <option value="raw">Materia Prima</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="pack">Packaging</option>
                    <option value="label">Etiqueta</option>
                    <option value="merch">Merchandising</option>
                    <option value="consumable">Consumible</option>
                </Select>
            </FieldRow>
            <div className="flex items-center gap-2 pl-[132px]">
              <input type="checkbox" id="sendToQc" {...register("sendToQc")} />
              <label htmlFor="sendToQc" className="text-sm">Enviar a cuarentena (QC)</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => { onClose(); reset(); }} className="px-3 py-1.5 border rounded-lg bg-white">Cancelar</button>
            <button type="submit" className="px-3 py-2 text-sm rounded-lg bg-yellow-400 text-black">Guardar</button>
          </div>
        </form>
      </SBDialogContent>
    </SBDialog>
  );
}

    