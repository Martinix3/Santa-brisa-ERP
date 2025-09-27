"use client";

/* ============================================================================
 * /quality/parametros — Configuración de Calidad (versión autosuficiente)
 * - Evita dependencias frágiles: no usa SBCard; monta <Card> local.
 * - Tipos locales mínimos para no depender del SSOT en build.
 * - Stubs de persistencia (reemplazar por server actions reales).
 * - UI con 3 bloques: Parámetros, Planes de QC, Protocolos de Seguridad.
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { Plus, Trash2, Save, Wrench, FlaskConical, ShieldCheck, Settings } from "lucide-react";
// Si tu hook existe, úsalo; si no, no rompe.
import { useData as useDataMaybe } from "@/lib/dataprovider";

// ==========================
// Tipos locales mínimos (opcionales)
// ==========================
type Unit = string; // p.ej. "°C" | "g/L" | "pH"
type Range = { min?: number; max?: number; inclusiveMin?: boolean; inclusiveMax?: boolean; };
type QcMethod = "SENSORIAL" | "LAB" | "INSTRUMENTAL" | string;
type QcPoint = "RECEPCION" | "PROCESO" | "ENVASADO" | "ALMACEN" | "PRE-ENVIO" | string;

type ParameterCatalog = {
  id: string;
  name: string;
  code?: string;
  unit?: Unit;
  method?: QcMethod;
  target?: number;
  tolerance?: number;
  range?: Range;
  notes?: string;
  createdAt?: string; updatedAt?: string;
};

type QcTestSpec = {
  id: string;
  parameterId: string;
  point: QcPoint;
  method?: QcMethod;
  unit?: Unit;
  target?: number;
  tolerance?: number;
  range?: Range;
};

type QcPlan = {
  id: string;
  name: string;
  itemCategory?: "raw" | "intermediate" | "fg" | "pack" | string;
  specs: QcTestSpec[];
  createdAt?: string; updatedAt?: string;
};

type SafetyProtocol = {
  id: string;
  title: string;
  code?: string;
  checklist: string[];
  active?: boolean;
  createdAt?: string; updatedAt?: string;
};

// ==========================
// Card local (estética SB)
// ==========================
function Card({ title, icon, children, subtitle }: { title?: string; icon?: React.ReactNode; children?: React.ReactNode; subtitle?: string }) {
    return (
      <div className="sb-card rounded-2xl border bg-white shadow-sm">
          <div className="sb-card__header px-4 py-3 border-b flex items-center justify-between">
              <div>
                  {title && <div className="sb-card__title text-base font-semibold">{title}</div>}
                  {subtitle && <div className="text-xs text-zinc-600 mt-0.5">{subtitle}</div>}
              </div>
              {icon && <span className="sb-icon text-zinc-500">{icon}</span>}
          </div>
          <div className="sb-card__content p-4">{children}</div>
      </div>
    );
  }

function Section({ title, subtitle, icon, children }: React.PropsWithChildren<{ title: string; subtitle?: string; icon?: React.ReactNode }>) {
  return (
    <Card title={title} subtitle={subtitle} icon={icon}>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({ label, children, className = "" }: React.PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-zinc-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function TinyBadge({ children }: React.PropsWithChildren) {
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">{children}</span>;
}

// ==========================
// Stubs de persistencia (reemplaza por server actions reales)
// ==========================
async function createParameter(p: Omit<ParameterCatalog, "id" | "createdAt" | "updatedAt"> & Partial<Pick<ParameterCatalog, "notes">>) {
  const id = `param_${Date.now()}`;
  return { ok: true, data: { ...p, id } as ParameterCatalog };
}
async function deleteParameter(id: string) {
  return { ok: true, id };
}
async function upsertPlan(plan: QcPlan) {
  return { ok: true, data: { ...plan, updatedAt: new Date().toISOString() } as QcPlan };
}
async function upsertProtocol(proto: SafetyProtocol) {
  return { ok: true, data: { ...proto, updatedAt: new Date().toISOString() } as SafetyProtocol };
}

// ==========================
// Página
// ==========================
export default function QualityParametersPage() {
  // Hook de datos (opcional). Si no está disponible, usa arrays vacíos.
  let useData: typeof useDataMaybe | undefined;
  try {
    useData = useDataMaybe;
  } catch {
    // noop
  }
  const data = useData ? useData().data : undefined;

  // Estado local (seeding mínimo si no hay data real)
  const [parameters, setParameters] = useState<ParameterCatalog[]>(
    data?.qcParameters ?? [
      { id: "pH", name: "pH", unit: "pH", method: "LAB", target: 3.4, tolerance: 0.2 },
      { id: "vol_alcohol", name: "% Vol. Alcohol", unit: "% vol", method: "LAB", target: 12.5, tolerance: 0.3 },
    ]
  );
  const [plans, setPlans] = useState<QcPlan[]>(
    data?.qc_plans ?? [
      {
        id: "plan_fg_std",
        name: "Plan FG Estándar",
        itemCategory: "fg",
        specs: [
          { id: "sp1", parameterId: "pH", point: "ENVASADO", method: "LAB", unit: "pH", target: 3.4, tolerance: 0.2 },
          { id: "sp2", parameterId: "vol_alcohol", point: "ENVASADO", method: "LAB", unit: "% vol", target: 12.5, tolerance: 0.3 },
        ],
      },
    ]
  );
  const [protocols, setProtocols] = useState<SafetyProtocol[]>(
    data?.safety_protocols ?? [
      { id: "prot_limpieza", title: "Limpieza de tanques", code: "SEC-001", checklist: ["Desinfectar", "Enjuagar", "Verificar"], active: true },
      { id: "prot_epi", title: "EPI obligatorio", code: "SEC-002", checklist: ["Guantes", "Gafas", "Botas"], active: true },
    ]
  );

  // ==========================
  // Handlers — Parámetros
  // ==========================
  const [newParam, setNewParam] = useState<Partial<ParameterCatalog>>({ name: "", unit: "", method: "LAB", target: undefined, tolerance: undefined });
  async function handleAddParameter() {
    if (!newParam.name) return;
    const res = await createParameter({
      name: newParam.name!,
      unit: newParam.unit,
      method: (newParam.method as QcMethod) ?? "LAB",
      target: (newParam.target as number) ?? undefined,
      tolerance: (newParam.tolerance as number) ?? undefined,
      code: newParam.code,
      notes: newParam.notes,
    });
    if (res.ok && res.data) {
      setParameters((prev) => [...prev, res.data!]);
      setNewParam({ name: "", unit: "", method: "LAB", target: undefined, tolerance: undefined });
    }
  }
  async function handleDeleteParameter(id: string) {
    const res = await deleteParameter(id);
    if (res.ok) setParameters((prev) => prev.filter((p) => p.id !== id));
  }

  // ==========================
  // Handlers — Planes QC
  // ==========================
  function addEmptyPlan() {
    const p: QcPlan = { id: `plan_${Date.now()}`, name: "Nuevo plan", itemCategory: "fg", specs: [] };
    setPlans((prev) => [p, ...prev]);
  }
  async function savePlan(plan: QcPlan) {
    const res = await upsertPlan(plan);
    if (res.ok && res.data) {
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? res.data! : p)));
    }
  }
  function addSpec(planId: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              specs: [
                ...p.specs,
                { id: `spec_${Date.now()}`, parameterId: parameters[0]?.id ?? "pH", point: "ENVASADO", method: "LAB", unit: parameters[0]?.unit ?? "pH" },
              ],
            }
          : p
      )
    );
  }
  function removeSpec(planId: string, specId: string) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, specs: p.specs.filter((s) => s.id !== specId) } : p)));
  }

  // ==========================
  // Handlers — Protocolos
  // ==========================
  function addProtocol() {
    const pr: SafetyProtocol = { id: `prot_${Date.now()}`, title: "Nuevo protocolo", code: "SEC-XXX", checklist: [], active: true };
    setProtocols((prev) => [pr, ...prev]);
  }
  async function saveProtocol(proto: SafetyProtocol) {
    const res = await upsertProtocol(proto);
    if (res.ok && res.data) {
      setProtocols((prev) => prev.map((p) => (p.id === proto.id ? res.data! : p)));
    }
  }

  // ==========================
  // UI
  // ==========================
  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Parámetros de Calidad
          <span className="ml-2 align-middle text-sm font-normal text-zinc-600">— Configuración</span>
        </h1>
        <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
          <TinyBadge><span className="sb-icon"><Settings size={14} /></span> Admin Calidad</TinyBadge>
          <TinyBadge>v1 (no persistente)</TinyBadge>
        </div>
      </div>

      {/* Parámetros */}
      <Section
        title="Catálogo de parámetros"
        subtitle="Definición base de cada variable a controlar"
        icon={<FlaskConical size={18} />}
      >
        {/* Form alta rápida */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <Field label="Nombre" className="md:col-span-2">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={newParam.name ?? ""}
              onChange={(e) => setNewParam((s) => ({ ...s, name: e.target.value }))}
              placeholder="pH, Alcohol, °Brix…"
            />
          </Field>
          <Field label="Unidad">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={newParam.unit ?? ""}
              onChange={(e) => setNewParam((s) => ({ ...s, unit: e.target.value }))}
              placeholder="pH, % vol, g/L…"
            />
          </Field>
          <Field label="Método">
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={(newParam.method as string) ?? "LAB"}
              onChange={(e) => setNewParam((s) => ({ ...s, method: e.target.value as QcMethod }))}
            >
              <option value="LAB">LAB</option>
              <option value="SENSORIAL">Sensorial</option>
              <option value="INSTRUMENTAL">Instrumental</option>
            </select>
          </Field>
          <Field label="Target">
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              value={newParam.target ?? ""}
              onChange={(e) => setNewParam((s) => ({ ...s, target: e.target.value === "" ? undefined : Number(e.target.value) }))}
              placeholder="3.4"
            />
          </Field>
          <Field label="Tolerancia">
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              value={newParam.tolerance ?? ""}
              onChange={(e) => setNewParam((s) => ({ ...s, tolerance: e.target.value === "" ? undefined : Number(e.target.value) }))}
              placeholder="0.2"
            />
          </Field>
          <button
            onClick={handleAddParameter}
            className="sb-btn-primary h-[38px] inline-flex items-center justify-center gap-2 px-3"
            title="Añadir parámetro"
          >
            <Plus size={16} /> Añadir
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Unidad</th>
                <th className="py-2 pr-4">Método</th>
                <th className="py-2 pr-4">Target ± Tol</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.unit ?? "-"}</td>
                  <td className="py-2 pr-4">{p.method ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {p.target != null ? `${p.target}` : "-"}
                    {p.tolerance != null ? ` ± ${p.tolerance}` : ""}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleDeleteParameter(p.id)}
                      className="inline-flex items-center gap-1 text-red-600 hover:underline"
                    >
                      <Trash2 size={14} /> borrar
                    </button>
                  </td>
                </tr>
              ))}
              {parameters.length === 0 && (
                <tr><td className="py-3 text-zinc-500" colSpan={5}>Sin parámetros aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Planes de QC */}
      <Section
        title="Planes de QC"
        subtitle="Qué parámetros se controlan, dónde (punto de control) y con qué método"
        icon={<Wrench size={18} />}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600">Define especificaciones por categoría de ítem (raw/intermediate/fg/pack).</div>
          <button onClick={addEmptyPlan} className="sb-btn-primary inline-flex items-center gap-2 px-3 py-1.5">
            <Plus size={16} /> Nuevo plan
          </button>
        </div>

        <div className="grid gap-4 mt-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    className="rounded-lg border px-2 py-1 font-medium"
                    value={plan.name}
                    onChange={(e) => setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, name: e.target.value } : p)))}
                  />
                  <select
                    className="rounded-lg border px-2 py-1"
                    value={plan.itemCategory ?? ""}
                    onChange={(e) => setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, itemCategory: e.target.value as any } : p)))}
                    title="Categoría"
                  >
                    <option value="raw">raw</option>
                    <option value="intermediate">intermediate</option>
                    <option value="fg">fg</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
                <button onClick={() => savePlan(plan)} className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                  <Save size={16} /> guardar
                </button>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-600">
                      <th className="py-2 pr-3">Parámetro</th>
                      <th className="py-2 pr-3">Punto</th>
                      <th className="py-2 pr-3">Método</th>
                      <th className="py-2 pr-3">Unidad</th>
                      <th className="py-2 pr-3">Target ± Tol</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.specs.map((sp) => (
                      <tr key={sp.id} className="border-t">
                        <td className="py-2 pr-3">
                          <select
                            className="rounded-lg border px-2 py-1"
                            value={sp.parameterId}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((p) =>
                                  p.id === plan.id
                                    ? {
                                        ...p,
                                        specs: p.specs.map((s) => (s.id === sp.id ? { ...s, parameterId: e.target.value } : s)),
                                      }
                                    : p
                                )
                              )
                            }
                          >
                            {parameters.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            className="rounded-lg border px-2 py-1"
                            value={sp.point}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((p) =>
                                  p.id === plan.id
                                    ? {
                                        ...p,
                                        specs: p.specs.map((s) => (s.id === sp.id ? { ...s, point: e.target.value as QcPoint } : s)),
                                      }
                                    : p
                                )
                              )
                            }
                          >
                            <option value="RECEPCION">Recepción</option>
                            <option value="PROCESO">Proceso</option>
                            <option value="ENVASADO">Envasado</option>
                            <option value="ALMACEN">Almacén</option>
                            <option value="PRE-ENVIO">Pre-envío</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            className="rounded-lg border px-2 py-1"
                            value={sp.method ?? "LAB"}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((p) =>
                                  p.id === plan.id
                                    ? {
                                        ...p,
                                        specs: p.specs.map((s) => (s.id === sp.id ? { ...s, method: e.target.value as QcMethod } : s)),
                                      }
                                    : p
                                )
                              )
                            }
                          >
                            <option value="LAB">LAB</option>
                            <option value="SENSORIAL">Sensorial</option>
                            <option value="INSTRUMENTAL">Instrumental</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-24 rounded-lg border px-2 py-1"
                            value={sp.unit ?? ""}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((p) =>
                                  p.id === plan.id
                                    ? {
                                        ...p,
                                        specs: p.specs.map((s) => (s.id === sp.id ? { ...s, unit: e.target.value } : s)),
                                      }
                                    : p
                                )
                              )
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="w-20 rounded-lg border px-2 py-1"
                              placeholder="target"
                              value={sp.target ?? ""}
                              onChange={(e) =>
                                setPlans((prev) =>
                                  prev.map((p) =>
                                    p.id === plan.id
                                      ? {
                                          ...p,
                                          specs: p.specs.map((s) => (s.id === sp.id ? { ...s, target: e.target.value === "" ? undefined : Number(e.target.value) } : s)),
                                        }
                                      : p
                                  )
                                )
                              }
                            />
                            <span className="text-zinc-500">±</span>
                            <input
                              type="number"
                              className="w-16 rounded-lg border px-2 py-1"
                              placeholder="tol"
                              value={sp.tolerance ?? ""}
                              onChange={(e) =>
                                setPlans((prev) =>
                                  prev.map((p) =>
                                    p.id === plan.id
                                      ? {
                                          ...p,
                                          specs: p.specs.map((s) => (s.id === sp.id ? { ...s, tolerance: e.target.value === "" ? undefined : Number(e.target.value) } : s)),
                                        }
                                      : p
                                  )
                                )
                              }
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <button onClick={() => removeSpec(plan.id, sp.id)} className="inline-flex items-center gap-1 text-red-600 hover:underline">
                            <Trash2 size={14} /> quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {plan.specs.length === 0 && (
                      <tr><td className="py-3 text-zinc-500" colSpan={6}>Sin especificaciones. Añade la primera abajo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2">
                <button onClick={() => addSpec(plan.id)} className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                  <Plus size={16} /> añadir especificación
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <div className="text-sm text-zinc-500">No hay planes definidos.</div>}
        </div>
      </Section>

      {/* Protocolos de seguridad */}
      <Section
        title="Protocolos de seguridad"
        subtitle="Checklist de seguridad y cumplimiento por proceso"
        icon={<ShieldCheck size={18} />}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600">Crea protocolos y marca si están activos.</div>
          <button onClick={addProtocol} className="sb-btn-primary inline-flex items-center gap-2 px-3 py-1.5">
            <Plus size={16} /> Nuevo protocolo
          </button>
        </div>

        <div className="grid gap-3 mt-3">
          {protocols.map((pr) => (
            <div key={pr.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    className="rounded-lg border px-2 py-1 font-medium"
                    value={pr.title}
                    onChange={(e) => setProtocols((prev) => prev.map((p) => (p.id === pr.id ? { ...p, title: e.target.value } : p)))}
                  />
                  <input
                    className="w-28 rounded-lg border px-2 py-1"
                    placeholder="Código"
                    value={pr.code ?? ""}
                    onChange={(e) => setProtocols((prev) => prev.map((p) => (p.id === pr.id ? { ...p, code: e.target.value } : p)))}
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!pr.active}
                      onChange={(e) => setProtocols((prev) => prev.map((p) => (p.id === pr.id ? { ...p, active: e.target.checked } : p)))}
                    />
                    Activo
                  </label>
                </div>
                <button onClick={() => saveProtocol(pr)} className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                  <Save size={16} /> guardar
                </button>
              </div>

              {/* Checklist */}
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600">Checklist</span>
                  <button
                    className="inline-flex items-center gap-1 text-zinc-700 hover:underline"
                    onClick={() =>
                      setProtocols((prev) =>
                        prev.map((p) =>
                          p.id === pr.id ? { ...p, checklist: [...p.checklist, `Nuevo paso ${p.checklist.length + 1}`] } : p
                        )
                      )
                    }
                  >
                    <Plus size={14} /> añadir punto
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {pr.checklist.map((step, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-lg border px-2 py-1"
                        value={step}
                        onChange={(e) =>
                          setProtocols((prev) =>
                            prev.map((p) =>
                              p.id === pr.id
                                ? {
                                    ...p,
                                    checklist: p.checklist.map((s, i) => (i === idx ? e.target.value : s)),
                                  }
                                : p
                            )
                          )
                        }
                      />
                      <button
                        className="inline-flex items-center gap-1 text-red-600 hover:underline"
                        onClick={() =>
                          setProtocols((prev) =>
                            prev.map((p) =>
                              p.id === pr.id
                                ? { ...p, checklist: p.checklist.filter((_, i) => i !== idx) }
                                : p
                            )
                          )
                        }
                      >
                        <Trash2 size={14} /> quitar
                      </button>
                    </li>
                  ))}
                  {pr.checklist.length === 0 && <li className="text-sm text-zinc-500">Checklist vacío.</li>}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pie de página context info */}
      <div className="text-xs text-zinc-500">
        <span className="sb-icon" data-muted="true"><Settings size={12} /></span> Tip:
        cuando conectes persistencia, mueve los stubs a server actions en `src/app/(app)/quality/parametros/actions.ts`.
      </div>
    </div>
  );
}
