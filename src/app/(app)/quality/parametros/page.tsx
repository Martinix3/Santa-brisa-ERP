
// src/app/(app)/quality/parametros/page.tsx
"use client";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { listParametersBySku, upsertParameterBySku, deleteParameterBySku, listPlans, upsertPlan, deletePlan, listProtocols, upsertProtocol, deleteProtocol } from "./actions";
import type { ParameterBySku, QcPlanBySku as QcPlan, QcSpec, Protocol as SafetyProtocol } from './schemas';
import { Plus, Trash2, Save, FlaskConical, ShieldCheck, Wrench } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { SBCard, SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { toast } from "sonner";

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <SBCard title={<div className="flex items-center gap-2">{icon}{title}</div>}>
            <div className="p-4 space-y-4">
                {children}
            </div>
        </SBCard>
    );
}

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
  const [plans, setPlans] = useState<QcPlan[]>([]);
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);

  // ==== Carga de Datos Centralizada ====
  const loadDataForSku = useCallback(async (currentSku: string) => {
    startTransition(async () => {
      const [paramsRes, plansRes, protocolsRes] = await Promise.all([
        currentSku ? listParametersBySku(currentSku) : Promise.resolve(ok([])),
        currentSku ? listPlans(currentSku) : Promise.resolve(ok([])),
        listProtocols(),
      ]);
      if (paramsRes.ok) setParams(paramsRes.data);
      if (plansRes.ok) setPlans(plansRes.data);
      if (protocolsRes.ok) setProtocols(protocolsRes.data);
    });
  }, []);
  
  // Inicializa el SKU y carga los datos una sola vez
  useEffect(() => {
    if (!sku && items.length > 0) {
      setSku(items[0].id);
    }
  }, [items, sku]);

  // Recarga TODOS los datos solo cuando el SKU cambia
  useEffect(() => {
    loadDataForSku(sku);
  }, [sku, loadDataForSku]);
  
  // --- Handlers de Parámetros ---
  const [newParam, setNewParam] = useState<Partial<ParameterBySku>>({});
  const handleAddParameter = () => {
    if (!sku || !newParam.name) {
      toast.error("El nombre del análisis es obligatorio.");
      return;
    }
    const id = `param_${sku}_${newParam.name.toLowerCase().replace(/\s+/g, '_').slice(0, 15)}`;
    handleSaveParameter({ ...newParam, id, sku, code: newParam.name.toLowerCase().replace(/\s+/g, '_').slice(0, 15) } as ParameterBySku);
    setNewParam({});
  };
  const handleSaveParameter = (parameter: ParameterBySku) => {
    startTransition(async () => {
      const res = await upsertParameterBySku(parameter);
      if (res.ok) {
        toast.success(`Parámetro "${parameter.name}" guardado.`);
        loadDataForSku(sku);
      } else {
        toast.error(`Error al guardar: ${res.message}`);
      }
    });
  };
  const handleDeleteParameter = (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este parámetro?")) return;
    startTransition(async () => {
      const res = await deleteParameterBySku(id);
      if (res.ok) {
        toast.success("Parámetro eliminado.");
        loadDataForSku(sku);
      } else {
        toast.error(`Error al eliminar: ${res.message}`);
      }
    });
  };

  // --- Handlers de Planes ---
  const handleSavePlan = (plan: QcPlan) => {
    startTransition(async () => {
      const res = await upsertPlan(plan);
      if (res.ok) {
        toast.success(`Plan "${plan.name}" guardado.`);
        loadDataForSku(sku);
      } else {
        toast.error(`Error al guardar: ${res.message}`);
      }
    });
  };
  const handleDeletePlan = (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este plan de calidad?")) return;
    startTransition(async () => {
      const res = await deletePlan(id);
      if (res.ok) {
        toast.success("Plan eliminado.");
        loadDataForSku(sku);
      } else {
        toast.error(`Error al eliminar: ${res.message}`);
      }
    });
  };

  // --- Handlers de Protocolos ---
  const handleSaveProtocol = (protocol: SafetyProtocol) => {
    startTransition(async () => {
      const res = await upsertProtocol(protocol);
      if (res.ok) {
        toast.success(`Protocolo "${protocol.title}" guardado.`);
        loadDataForSku(sku);
      } else {
        toast.error(`Error: ${res.message}`);
      }
    });
  };
  const handleDeleteProtocol = (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este protocolo?")) return;
    startTransition(async () => {
      const res = await deleteProtocol(id);
      if (res.ok) {
        toast.success("Protocolo eliminado.");
        loadDataForSku(sku);
      } else {
        toast.error(`Error al eliminar: ${res.message}`);
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

      <Section title="Parámetros analíticos por SKU" icon={<FlaskConical size={18}/>}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <Input className="md:col-span-2" value={newParam.name || ''} onChange={e => setNewParam(s => ({ ...s, name: e.target.value }))} placeholder="Nombre del Análisis (Ej: Grado Alcohólico)"/>
            <Input value={newParam.unit || ''} onChange={e => setNewParam(s => ({ ...s, unit: e.target.value }))} placeholder="Unidad (Ej: % vol.)"/>
            <Input value={newParam.range?.min?.toString() || ''} type="number" onChange={e => setNewParam(s => ({ ...s, range: { ...s.range, min: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Rango Mín."/>
            <Input value={newParam.range?.max?.toString() || ''} type="number" onChange={e => setNewParam(s => ({ ...s, range: { ...s.range, max: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="Rango Máx."/>
            <SBButton onClick={handleAddParameter} disabled={!sku || isPending} style={{ backgroundColor: 'hsl(var(--sb-accent-calidad))' }}>
              <Plus size={16} className="mr-2" /> Añadir
            </SBButton>
          </div>
          <table className="min-w-full text-sm mt-4">
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
                </tbody>
            </table>
      </Section>

      <Section title="Planes de Calidad (Protocolos de Análisis)" icon={<Wrench size={18}/>}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-zinc-600">Define qué parámetros se miden en cada punto para el SKU: <b>{items.find(i=>i.id===sku)?.name}</b></p>
          <SBButton onClick={() => setPlans(p => [{ id: `plan_${sku}_${Date.now()}`, name: "Nuevo Plan de Calidad", sku, specs: [] } as QcPlan, ...p])} disabled={!sku}>
            <Plus size={16}/> Nuevo Plan
          </SBButton>
        </div>
        
        {plans.map((plan, planIndex) => (
          <div key={plan.id} className="rounded-xl border p-4 mb-3 bg-zinc-50">
            <div className="flex justify-between items-center mb-3">
              <Input value={plan.name} onChange={(e) => setPlans(p => p.map((pl, i) => i === planIndex ? { ...pl, name: e.target.value } : pl))} className="font-semibold text-lg" />
              <div className="flex gap-2">
                <SBButton onClick={() => handleSavePlan(plan)} disabled={isPending}><Save size={14}/> Guardar Plan</SBButton>
                <SBButton variant="destructive" onClick={() => handleDeletePlan(plan.id)} disabled={isPending}><Trash2 size={14}/> Eliminar</SBButton>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Especificaciones (Análisis a realizar):</h4>
              {plan.specs.map((spec, specIndex) => (
                <div key={spec.id} className="grid grid-cols-[2fr_1fr_auto] gap-2 p-2 border rounded-md bg-white">
                  <Select value={spec.parameterId} onChange={e => { const newPlans = [...plans]; newPlans[planIndex].specs[specIndex].parameterId = e.target.value; setPlans(newPlans); }}>
                    <option value="">-- Selecciona parámetro --</option>
                    {params.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Select value={spec.point} onChange={e => { const newPlans = [...plans]; newPlans[planIndex].specs[specIndex].point = e.target.value as any; setPlans(newPlans); }}>
                     <option value="RECEPCION">Recepción</option>
                     <option value="PROCESO">Proceso</option>
                     <option value="ENVASADO">Envasado</option>
                  </Select>
                  <SBButton variant="ghost" size="sm" onClick={() => { const newPlans = [...plans]; newPlans[planIndex].specs.splice(specIndex, 1); setPlans(newPlans); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </SBButton>
                </div>
              ))}
              <button onClick={() => { const newPlans = [...plans]; newPlans[planIndex].specs.push({ id: `spec_${Date.now()}`, parameterId: '', point: 'PROCESO', required: true, targetRange: {} }); setPlans(newPlans); }} className="text-sm text-sky-600 hover:underline">
                <Plus size={14} className="inline-block mr-1"/> Añadir análisis
              </button>
            </div>
          </div>
        ))}
      </Section>
      
      <Section title="Protocolos APPCC (Globales)" icon={<ShieldCheck size={18}/>}>
        <div className="text-right mb-2">
            <SBButton onClick={() => setProtocols(p => [{ id: `proto_${Date.now()}`, title: 'Nuevo Protocolo', priority: 'PRP', active: true, checklist: [] }, ...p])}>
                <Plus size={16}/> Nuevo Protocolo
            </SBButton>
        </div>
        {protocols.map((protocol, i) => (
            <div key={protocol.id} className="rounded-xl border p-4 mb-3 bg-zinc-50">
                <div className="flex justify-between items-center mb-3">
                    <Input value={protocol.title} onChange={e => setProtocols(p => p.map((pr, idx) => idx === i ? { ...pr, title: e.target.value } : pr))} className="font-semibold text-lg" />
                     <div className="flex gap-2">
                        <SBButton onClick={() => handleSaveProtocol(protocol)} disabled={isPending}><Save size={14}/> Guardar</SBButton>
                        <SBButton variant="destructive" onClick={() => handleDeleteProtocol(protocol.id)} disabled={isPending}><Trash2 size={14}/></SBButton>
                    </div>
                </div>
            </div>
        ))}
      </Section>
    </div>
  );
}
