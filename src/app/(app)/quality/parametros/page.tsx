// src/app/(app)/quality/parametros/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listParametersBySku,
  upsertParameterBySku,
  deleteParameterBySku,
  listPlans,
  upsertPlan,
  deletePlan,
  listProtocols,
  upsertProtocol,
  deleteProtocol,
} from "./actions";

import type { ParameterBySku, QcPlanBySku as QcPlan, QcSpec, Protocol as SafetyProtocol } from './schemas';

import { Plus, Trash2, Save, Wrench, FlaskConical, ShieldCheck, Settings, Search } from "lucide-react";
import { useData as useDataMaybe } from "@/lib/dataprovider";

// ==========================
// Card local con acento Calidad
// ==========================
function Card({ title, icon: Icon, children, subtitle }: { title?: string; icon?: React.ReactNode; children?: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <span className="text-sky-700">{Icon}</span>}
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
        </div>
      </div>
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

function Field({ label, children, className = "" }: React.PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-zinc-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

// ==========================
// Página
// ==========================
export default function QualityParametersPage() {
  let useData: typeof useDataMaybe | undefined;
  try { useData = useDataMaybe; } catch {}
  const items = useData?.().data?.items as Array<{ id: string; sku?: string; name: string }> | undefined;

  // SKU seleccionado
  const [sku, setSku] = useState<string>("");
  useEffect(() => { if (!sku && items?.length) setSku(items[0].id); }, [items, sku]);

  // ==========================
  // Parámetros por SKU
  // ==========================
  const [params, setParams] = useState<ParameterBySku[]>([]);
  async function refreshParams() {
    if (!sku) return;
    const res = await listParametersBySku(sku);
    if(res.ok) setParams(res.data);
  }
  useEffect(() => { refreshParams(); }, [sku]);

  const [newParam, setNewParam] = useState<Partial<ParameterBySku>>({ name: "", unit: "", method: "LAB" });

  async function handleAddParam(): Promise<void> {
    if (!sku || !newParam.name) return;
    const id = `param_${sku}_${newParam.code || newParam.name.toLowerCase().replace(/\s/g, '_')}`;
    await upsertParameterBySku({
      id,
      sku,
      code: newParam.code || newParam.name.toLowerCase().replace(/\s/g, '_'),
      name: newParam.name!,
      unit: newParam.unit,
      method: (newParam.method as string) ?? "LAB",
      target: newParam.target as number | undefined,
      tolerance: newParam.tolerance as number | undefined,
    } as ParameterBySku);
    setNewParam({ name: "", unit: "", method: "LAB" });
    await refreshParams();
  }

  async function handleDeleteParam(id: string): Promise<void> {
    await deleteParameterBySku(id);
    await refreshParams();
  }

  // ==========================
  // Qc Plans por SKU
  // ==========================
  const [plans, setPlans] = useState<QcPlan[]>([]);
  async function refreshPlans() { 
      if(sku) {
        const res = await listPlans(sku);
        if(res.ok) setPlans(res.data);
      }
  }
  useEffect(() => { refreshPlans(); }, [sku]);

  function addPlan() {
    if (!sku) return;
    const plan: QcPlan = { id: `plan_${Date.now()}`, name: "Nuevo plan", sku: sku, specs: [] };
    setPlans((p) => [plan, ...p]);
  }
  async function savePlan(plan: QcPlan) { await upsertPlan(plan); await refreshPlans(); }
  async function removePlan(id: string) { await deletePlan(id); await refreshPlans(); }
  
  function addSpec(planId: string): void {
    setPlans((prev) =>
      prev.map((p): QcPlan =>
        p.id === planId
          ? {
              ...p,
              specs: [
                ...p.specs,
                {
                  id: `spec_${Date.now()}`,
                  parameterId: params[0]?.id ?? "",
                  point: "ENVASADO",
                } as QcSpec,
              ],
            }
          : p
      )
    );
  }
  function removeSpec(planId: string, specId: string) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, specs: p.specs.filter((s:any) => s.id !== specId) } : p)));
  }

  // ==========================
  // Protocolos APPCC
  // ==========================
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  async function refreshProtocols() {
    const res = await listProtocols();
    if(res.ok) setProtocols(res.data);
  }
  useEffect(() => { refreshProtocols(); }, []);
  async function saveProtocol(proto: SafetyProtocol) { await upsertProtocol(proto); await refreshProtocols(); }
  async function removeProtocol(id: string) { await deleteProtocol(id); await refreshProtocols(); }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--sb-accent-calidad))]">Calidad — Configuración</h1>
        <div className="sb-badge sb-badge--calidad">Admin Calidad</div>
      </div>

      {/* ================= Parámetros analíticos ================= */}
      <Section title="Parámetros analíticos por SKU" subtitle="Define variables específicas de cada producto" icon={<FlaskConical size={18}/>}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <Field label="SKU">
            <select className="w-full rounded-lg border px-3 py-2" value={sku} onChange={(e) => setSku(e.target.value)}>
              {(items ?? [{ id:"sb_fg_70", name:"Santa Brisa FG 70cl" }]).map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nombre" className="md:col-span-2">
            <input className="w-full rounded-lg border px-3 py-2" value={newParam.name ?? ""} onChange={(e) => setNewParam(s => ({ ...s, name: e.target.value }))}/>
          </Field>
          <Field label="Unidad">
            <input className="w-full rounded-lg border px-3 py-2" value={newParam.unit ?? ""} onChange={(e) => setNewParam(s => ({ ...s, unit: e.target.value }))}/>
          </Field>
          <Field label="Método">
            <select className="w-full rounded-lg border px-3 py-2" value={(newParam.method as string) ?? "LAB"} onChange={(e) => setNewParam(s => ({ ...s, method: e.target.value }))}>
              <option value="LAB">LAB</option>
              <option value="SENSORIAL">Sensorial</option>
              <option value="INSTRUMENTAL">Instrumental</option>
            </select>
          </Field>
          <button onClick={handleAddParam} className="sb-btn-calidad h-[38px] inline-flex items-center justify-center gap-2 px-3">
            <Plus size={16}/> Añadir
          </button>
        </div>

        {/* Tabla de parámetros */}
        <table className="min-w-full text-sm mt-3">
          <thead><tr className="text-left text-zinc-600"><th>Nombre</th><th>Unidad</th><th>Método</th><th>Acciones</th></tr></thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.unit ?? "-"}</td>
                <td className="py-2">{p.method ?? "-"}</td>
                <td className="py-2">
                  <button onClick={() => handleDeleteParam(p.id)} className="text-red-600 hover:underline inline-flex items-center gap-1"><Trash2 size={14}/> borrar</button>
                </td>
              </tr>
            ))}
            {params.length === 0 && <tr><td colSpan={4} className="py-3 text-zinc-500">Sin parámetros definidos.</td></tr>}
          </tbody>
        </table>
      </Section>

      {/* ================= Planes QC ================= */}
      <Section title="Planes de QC" subtitle="Control por SKU en cada punto crítico" icon={<Wrench size={18}/>}>
        <button onClick={addPlan} className="sb-btn-calidad inline-flex items-center gap-2 px-3 py-1.5 mb-3"><Plus size={16}/> Nuevo plan</button>
        {plans.filter(p => !sku || p.sku === sku).map((plan) => (
          <div key={plan.id} className="rounded-xl border p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <input className="rounded-lg border px-2 py-1 font-medium" value={plan.name} onChange={(e) => setPlans(prev => prev.map(p => p.id===plan.id?{...p,name:e.target.value}:p))}/>
              <div className="flex gap-2">
                <button onClick={() => savePlan(plan)} className="sb-btn-calidad px-2 py-1 flex items-center gap-1"><Save size={14}/> Guardar</button>
                <button onClick={() => removePlan(plan.id)} className="text-red-600 flex items-center gap-1"><Trash2 size={14}/> Eliminar</button>
              </div>
            </div>
            <button onClick={() => addSpec(plan.id)} className="text-[hsl(var(--sb-accent-calidad))] flex items-center gap-1"><Plus size={14}/> añadir especificación</button>
            <ul className="mt-2 space-y-1">
              {(plan.specs as any[]).map((sp: QcSpec, i: number) => (
                <li key={(sp as any).id || i} className="flex justify-between text-sm border-t py-1">
                  <span>{sp.parameterId}</span>
                  <button onClick={() => removeSpec(plan.id, (sp as any).id)} className="text-red-600 flex items-center gap-1"><Trash2 size={12}/> quitar</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      {/* ================= Protocolos APPCC ================= */}
      <Section title="Protocolos APPCC" subtitle="Planes obligatorios de seguridad alimentaria" icon={<ShieldCheck size={18}/>}>
        {protocols.map((pr: SafetyProtocol) => (
          <div key={pr.id} className="rounded-xl border p-3 mb-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{pr.title}</span>
              <button onClick={() => saveProtocol(pr)} className="sb-btn-calidad px-2 py-1 flex items-center gap-1"><Save size={14}/> Guardar</button>
            </div>
            <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
              {pr.checklist.map((c: string, i: number) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        ))}
      </Section>
    </div>
  );
}
