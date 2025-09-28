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

// --- Componentes UI Locales ---

function Card({ title, icon: Icon, children, subtitle }: { title?: string; icon?: React.ReactNode; children?: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      {(title || subtitle) && (
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
              {Icon && <span className="text-sky-700">{Icon}</span>}
              {title && <h3 className="text-sm font-semibold">{title}</h3>}
          </div>
        </div>
      )}
      <div className="p-4">
        {subtitle && <p className="text-sm text-zinc-600 mb-3">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function Section(props: React.PropsWithChildren<{ title: string; subtitle?: string; icon?: React.ReactNode }>) {
  return <Card title={props.title} subtitle={props.subtitle} icon={props.icon}>{props.children}</Card>;
}

// --- Página Principal ---

export default function QualityParametersPage() {
  const router = useRouter();
  const { data: globalData } = useData();
  const items = globalData?.items || [];
  const [isPending, startTransition] = useTransition();

  const [sku, setSku] = useState<string>("");
  const [params, setParams] = useState<ParameterBySku[]>([]);
  const [plans, setPlans] = useState<QcPlan[]>([]);
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  
  const [newParam, setNewParam] = useState<Partial<ParameterBySku>>({ name: "", unit: "", method: "LAB" });

  // ==== Carga de Datos Centralizada ====
  const loadDataForSku = useCallback(async (currentSku: string) => {
    if (!currentSku) return;
    startTransition(async () => {
      const [paramsRes, plansRes] = await Promise.all([
        listParametersBySku(currentSku),
        listPlans(currentSku),
      ]);
      if (paramsRes.ok) setParams(paramsRes.data);
      if (plansRes.ok) setPlans(plansRes.data);
    });
  }, []);

  const loadGlobalData = useCallback(async () => {
    startTransition(async () => {
      const protocolsRes = await listProtocols();
      if (protocolsRes.ok) setProtocols(protocolsRes.data);
    });
  }, []);
  
  // Inicializa el SKU y carga los datos
  useEffect(() => {
    if (!sku && items.length > 0) {
      setSku(items[0].id);
    }
    if (protocols.length === 0) {
        loadGlobalData();
    }
  }, [items, sku, protocols.length, loadGlobalData]);

  // Recarga datos específicos del SKU solo cuando el SKU cambia
  useEffect(() => {
    loadDataForSku(sku);
  }, [sku, loadDataForSku]);

  // --- Handlers de Mutación ---

  const handleAddParam = async () => {
    if (!sku || !newParam.name) {
      toast.error("El nombre del parámetro es obligatorio.");
      return;
    }
    startTransition(async () => {
      const id = `param_${sku}_${(newParam.code || newParam.name!.toLowerCase().replace(/\s/g, '_')).slice(0, 20)}`;
      const res = await upsertParameterBySku({
        id,
        sku,
        code: newParam.code || newParam.name!.toLowerCase().replace(/\s/g, '_'),
        name: newParam.name!,
        unit: newParam.unit,
        method: (newParam.method as string) ?? "LAB",
      } as ParameterBySku);
      if (res.ok) {
        toast.success("Parámetro añadido.");
        setNewParam({ name: "", unit: "", method: "LAB" });
        await loadDataForSku(sku);
      } else {
        toast.error(`Error: ${res.message}`);
      }
    });
  };

  const handleDeleteParam = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este parámetro?")) return;
    startTransition(async () => {
      const res = await deleteParameterBySku(id);
      if (res.ok) {
        toast.success("Parámetro eliminado.");
        await loadDataForSku(sku);
      } else {
        toast.error(`Error al eliminar: ${res.message}`);
      }
    });
  };

  const handleSavePlan = async (plan: QcPlan) => {
    startTransition(async () => {
      const res = await upsertPlan(plan);
      if (res.ok) {
        toast.success(`Plan "${plan.name}" guardado.`);
        await loadDataForSku(sku);
      } else {
        toast.error(`Error al guardar: ${res.message}`);
      }
    });
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este plan de calidad?")) return;
    startTransition(async () => {
      const res = await deletePlan(id);
      if (res.ok) {
        toast.success("Plan eliminado.");
        await loadDataForSku(sku);
      } else {
        toast.error(`Error: ${res.message}`);
      }
    });
  };

  const handleSaveProtocol = async (proto: SafetyProtocol) => {
    startTransition(async () => {
        const res = await upsertProtocol(proto);
        if (res.ok) {
            toast.success(`Protocolo "${proto.title}" guardado.`);
            await loadGlobalData();
        } else {
            toast.error(`Error al guardar protocolo: ${res.message}`);
        }
    });
  };

  const handleDeleteProtocol = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este protocolo?")) return;
    startTransition(async () => {
        const res = await deleteProtocol(id);
        if (res.ok) {
            toast.success("Protocolo eliminado.");
            await loadGlobalData();
        } else {
            toast.error(`Error al eliminar protocolo: ${res.message}`);
        }
    });
  };

  const addSpecToPlan = (planId: string) => {
    setPlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        const newSpec: QcSpec = { id: `spec_${Date.now()}`, parameterId: params[0]?.id || "", point: "RECEPCION" };
        return { ...p, specs: [...p.specs, newSpec] };
    }));
  };

  const updateSpecInPlan = (planId: string, specIndex: number, field: keyof QcSpec, value: string) => {
    setPlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        const newSpecs = [...p.specs];
        (newSpecs[specIndex] as any)[field] = value;
        return { ...p, specs: newSpecs };
    }));
  };

  const removeSpecFromPlan = (planId: string, specIndex: number) => {
    setPlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        return { ...p, specs: p.specs.filter((_, i) => i !== specIndex) };
    }));
  };


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Section title="Parámetros analíticos por SKU" subtitle="Define variables específicas de cada producto" icon={<FlaskConical size={18}/>}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <label className="grid gap-1.5 md:col-span-2"><span className="text-sm font-medium">SKU</span>
            <Select value={sku} onChange={(e) => setSku(e.target.value)}>
              {(items ?? []).map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </Select>
          </label>
          <label className="grid gap-1.5 md:col-span-2"><span className="text-sm font-medium">Nombre Nuevo Parámetro</span>
            <Input value={newParam.name ?? ""} onChange={(e) => setNewParam(s => ({ ...s, name: e.target.value }))}/>
          </label>
          <label className="grid gap-1.5"><span className="text-sm font-medium">Unidad</span>
            <Input value={newParam.unit ?? ""} onChange={(e) => setNewParam(s => ({ ...s, unit: e.target.value }))}/>
          </label>
          <SBButton onClick={handleAddParam} disabled={isPending}><Plus size={16}/> Añadir</SBButton>
        </div>

        <table className="min-w-full text-sm mt-3">
          <thead className="text-left"><tr className="text-zinc-600"><th>Nombre</th><th>Unidad</th><th>Método</th><th>Acciones</th></tr></thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.unit ?? "-"}</td>
                <td className="py-2">{p.method ?? "-"}</td>
                <td className="py-2">
                  <SBButton variant="ghost" size="sm" onClick={() => handleDeleteParam(p.id)} disabled={isPending}><Trash2 size={14} className="text-red-500" /></SBButton>
                </td>
              </tr>
            ))}
            {params.length === 0 && <tr><td colSpan={4} className="py-3 text-zinc-500">Sin parámetros definidos para este SKU.</td></tr>}
          </tbody>
        </table>
      </Section>

      <Section title="Planes de Calidad (Protocolos de Análisis)" icon={<Wrench size={18}/>}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-zinc-600">Define qué parámetros se miden para el SKU: <b>{items.find(i=>i.id===sku)?.name}</b></p>
          <SBButton onClick={() => setPlans(p => [{ id: `plan_${sku}_${Date.now()}`, name: "Nuevo Plan de Calidad", sku, specs: [] }, ...p])} disabled={!sku}>
            <Plus size={16}/> Nuevo Plan
          </SBButton>
        </div>
        
        {plans.map((plan, planIndex) => (
          <div key={plan.id} className="rounded-xl border p-4 mb-3 bg-zinc-50">
            <div className="flex justify-between items-center mb-3">
              <Input value={plan.name} onChange={(e) => setPlans(prev => prev.map((p, i) => i === planIndex ? { ...p, name: e.target.value } : p))} className="font-semibold text-lg"/>
              <div className="flex gap-2">
                <SBButton onClick={() => handleSavePlan(plan)} disabled={isPending}><Save size={14}/> Guardar Plan</SBButton>
                <SBButton variant="destructive" onClick={() => handleDeletePlan(plan.id)} disabled={isPending}><Trash2 size={14}/></SBButton>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Especificaciones:</h4>
              {plan.specs.map((spec, specIndex) => (
                <div key={spec.id || specIndex} className="grid grid-cols-[2fr_1fr_auto] gap-2 p-2 border rounded-md bg-white">
                  <Select value={spec.parameterId} onChange={e => updateSpecInPlan(plan.id, specIndex, 'parameterId', e.target.value)}>
                    <option value="">-- Parámetro --</option>
                    {params.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Select value={spec.point} onChange={e => updateSpecInPlan(plan.id, specIndex, 'point', e.target.value)}>
                     <option value="RECEPCION">Recepción</option><option value="PROCESO">Proceso</option><option value="ENVASADO">Envasado</option>
                  </Select>
                  <SBButton variant="ghost" size="sm" onClick={() => removeSpecFromPlan(plan.id, specIndex)}><Trash2 className="h-4 w-4 text-red-500" /></SBButton>
                </div>
              ))}
              <button onClick={() => addSpecToPlan(plan.id)} className="text-sm text-sky-600 hover:underline"><Plus size={14} className="inline-block mr-1"/> Añadir análisis</button>
            </div>
          </div>
        ))}
      </Section>
      
      <Section title="Protocolos APPCC" subtitle="Planes globales de seguridad alimentaria" icon={<ShieldCheck size={18} />}>
        {protocols.map((proto, index) => (
            <div key={proto.id} className="p-3 mb-2 rounded-lg border bg-zinc-50">
                 <div className="flex justify-between items-center mb-2">
                    <Input value={proto.title} onChange={e => setProtocols(p => p.map((pr, i) => i === index ? {...pr, title: e.target.value} : pr))} className="font-semibold" />
                    <div className="flex gap-2">
                        <SBButton onClick={() => handleSaveProtocol(proto)} disabled={isPending}><Save size={14} /> Guardar</SBButton>
                        <SBButton variant="destructive" onClick={() => handleDeleteProtocol(proto.id)} disabled={isPending}><Trash2 size={14} /></SBButton>
                    </div>
                </div>
                <ul className="text-sm list-disc pl-5">
                    {proto.checklist.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </div>
        ))}
        <SBButton onClick={() => setProtocols(p => [{ id: `proto_${Date.now()}`, title: 'Nuevo Protocolo', checklist: [] }, ...p])}>
            <Plus size={16}/> Nuevo Protocolo
        </SBButton>
      </Section>
    </div>
  );
}
