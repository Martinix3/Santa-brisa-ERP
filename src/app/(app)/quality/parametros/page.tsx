// src/app/(app)/quality/parametros/page.tsx
"use client";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { listParametersBySku, upsertParameterBySku, deleteParameterBySku } from "./actions";
import type { ParameterBySku } from './schemas';
import { Plus, Trash2, Save, FlaskConical, Edit, X } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { SBCard, SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { toast } from "sonner";

// ==========================
// Fila de Parámetro (Editable)
// ==========================
function ParameterRow({ parameter, onSave, onDelete, isPending }: {
  parameter: ParameterBySku;
  onSave: (p: ParameterBySku) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState(parameter);

  const handleSave = () => {
    onSave(editState);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(parameter.id);
  }

  // Vista de Edición
  if (isEditing) {
    return (
      <tr className="border-t bg-yellow-50/50">
        <td className="p-2"><Input value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} placeholder="Nombre"/></td>
        <td className="p-2"><Input value={editState.unit || ''} onChange={e => setEditState(s => ({ ...s, unit: e.target.value }))} placeholder="Unidad"/></td>
        <td className="p-2"><Input value={editState.range?.min?.toString() ?? ''} type="number" onChange={e => setEditState(s => ({ ...s, range: { ...s.range, min: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Mín."/></td>
        <td className="p-2"><Input value={editState.range?.max?.toString() ?? ''} type="number" onChange={e => setEditState(s => ({ ...s, range: { ...s.range, max: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Máx."/></td>
        <td className="p-2"><Input value={editState.method || ''} onChange={e => setEditState(s => ({ ...s, method: e.target.value }))} placeholder="Método"/></td>
        <td className="p-2 flex gap-2">
          <SBButton onClick={handleSave} disabled={isPending || !editState.name} size="sm"><Save size={14}/> Guardar</SBButton>
          <SBButton variant="secondary" onClick={() => setIsEditing(false)} size="sm"><X size={14}/> Cancelar</SBButton>
        </td>
      </tr>
    );
  }

  // Vista Normal
  return (
    <tr className="border-t hover:bg-zinc-50">
      <td className="p-2 font-medium">{parameter.name}</td>
      <td className="p-2">{parameter.unit || 'N/A'}</td>
      <td className="p-2 font-mono">{parameter.range?.min ?? 'N/A'}</td>
      <td className="p-2 font-mono">{parameter.range?.max ?? 'N/A'}</td>
      <td className="p-2">{parameter.method || 'N/A'}</td>
      <td className="p-2 flex gap-4">
        <button onClick={() => setIsEditing(true)} className="text-sm text-[hsl(var(--sb-accent-calidad))] hover:underline flex items-center gap-1"><Edit size={12}/> Editar</button>
        <button onClick={handleDelete} className="text-sm text-red-600 hover:underline flex items-center gap-1"><Trash2 size={12}/> Eliminar</button>
      </td>
    </tr>
  );
}

// ==========================
// Página Principal
// ==========================
export default function QualityParametersPage() {
  const router = useRouter();
  const { data: globalData } = useData();
  const items = globalData?.items || [];
  const [isPending, startTransition] = useTransition();

  const [sku, setSku] = useState<string>("");
  const [params, setParams] = useState<ParameterBySku[]>([]);
  const [newParam, setNewParam] = useState<Partial<ParameterBySku>>({});

  // Carga los parámetros cuando cambia el SKU
  const loadParamsForSku = useCallback((currentSku: string) => {
    if (currentSku) {
      startTransition(async () => {
        const res = await listParametersBySku(currentSku);
        if (res.ok) setParams(res.data);
      });
    } else {
      setParams([]);
    }
  }, []);
  
  useEffect(() => {
    if (!sku && items.length > 0) setSku(items[0].id);
  }, [items, sku]);

  useEffect(() => {
    loadParamsForSku(sku);
  }, [sku, loadParamsForSku]);

  const handleAddParameter = () => {
    if (!sku || !newParam.name) {
      toast.error("El nombre del análisis es obligatorio.");
      return;
    }
    const id = `param_${sku}_${newParam.name.toLowerCase().replace(/\s+/g, '_').slice(0, 15)}`;
    handleSaveParameter({
      ...newParam,
      id,
      sku,
      code: newParam.name.toLowerCase().replace(/\s+/g, '_').slice(0, 15),
      name: newParam.name,
    } as ParameterBySku);
    setNewParam({}); // Limpia el formulario de nuevo parámetro
  };

  const handleSaveParameter = (parameter: ParameterBySku) => {
    startTransition(async () => {
      const res = await upsertParameterBySku(parameter);
      if (res.ok) {
        toast.success(`Parámetro "${parameter.name}" guardado.`);
        loadParamsForSku(sku); // Vuelve a cargar los datos para reflejar el cambio
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDeleteParameter = (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este parámetro?")) return;
    startTransition(async () => {
      const res = await deleteParameterBySku(id);
      if (res.ok) {
        toast.success("Parámetro eliminado.");
        loadParamsForSku(sku); // Vuelve a cargar los datos
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--sb-accent-calidad))] flex items-center gap-3">
          <FlaskConical />
          Parámetros de Calidad
        </h1>
        <div className="flex items-center gap-3">
          <label htmlFor="sku-select" className="font-medium text-sm">Producto:</label>
          <Select id="sku-select" value={sku} onChange={(e) => setSku(e.target.value)}>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </div>
      </div>

      <SBCard title="Añadir Nuevo Análisis para el Producto Seleccionado">
        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <Input className="md:col-span-2" value={newParam.name || ''} onChange={e => setNewParam(s => ({ ...s, name: e.target.value }))} placeholder="Nombre del Análisis (Ej: Grado Alcohólico)"/>
            <Input value={newParam.unit || ''} onChange={e => setNewParam(s => ({ ...s, unit: e.target.value }))} placeholder="Unidad (Ej: % vol.)"/>
            <Input value={newParam.range?.min?.toString() || ''} type="number" onChange={e => setNewParam(s => ({ ...s, range: { ...s.range, min: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Rango Mín."/>
            <Input value={newParam.range?.max?.toString() || ''} type="number" onChange={e => setNewParam(s => ({ ...s, range: { ...s.range, max: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Rango Máx."/>
            <SBButton onClick={handleAddParameter} disabled={!sku || isPending} style={{ backgroundColor: 'hsl(var(--sb-accent-calidad))' }}>
              <Plus size={16} className="mr-2" /> Añadir a la lista
            </SBButton>
        </div>
      </SBCard>

      <SBCard title="Análisis Definidos">
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-zinc-50">
                <tr className="text-left text-zinc-600">
                    <th className="p-2 w-1/3">Nombre del Análisis</th>
                    <th className="p-2">Unidad</th>
                    <th className="p-2">Rango Mín.</th>
                    <th className="p-2">Rango Máx.</th>
                    <th className="p-2">Método</th>
                    <th className="p-2">Acciones</th>
                </tr>
                </thead>
                <tbody>
                {params.map((p) => (
                    <ParameterRow
                    key={p.id}
                    parameter={p}
                    onSave={handleSaveParameter}
                    onDelete={handleDeleteParameter}
                    isPending={isPending}
                    />
                ))}
                {params.length === 0 && !isPending && (
                    <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No hay parámetros definidos para este producto.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
      </SBCard>
    </div>
  );
}