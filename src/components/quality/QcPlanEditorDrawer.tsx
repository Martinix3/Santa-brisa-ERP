/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/quality/QcPlanEditorDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Item, ItemCategory } from "@/domain/ssot";
import type { QcPlanFormData } from "@/types/quality";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { SBButton, Input, Select, Textarea } from "@/components/ui/ui-primitives";
import { createQcPlan } from "@/server/actions/quality-plans";

type ParameterForm = QcPlanFormData["parameters"][number];

type Props = {
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  items: Item[];
  categoryOptions: ItemCategory[];
};

const PRIORITY_OPTIONS: Array<ParameterForm["priority"]> = ["CRITICAL", "MAJOR", "MINOR"];
const TRIGGER_OPTIONS: Array<QcPlanFormData["triggerOn"]> = ["RECEIPT", "PRODUCTION", "BOTH"];
type SamplingType = NonNullable<QcPlanFormData["samplingPlan"]>["type"];

const SAMPLING_OPTIONS: Array<SamplingType> = [
  "FULL",
  "SAMPLING",
  "SKIP",
];

const INITIAL_FORM: QcPlanFormData = {
  name: "",
  description: "",
  appliesToItems: [],
  appliesToCategories: [],
  triggerOn: "RECEIPT",
  requiredForRelease: true,
  parameters: [
    { parameterId: "", required: true, autoApproveIfInSpec: true, priority: "CRITICAL" },
  ],
  autoApproveRules: {
    enabled: false,
    conditions: {
      allTestsPass: true,
    },
  },
  samplingPlan: {
    type: "FULL",
  },
  active: true,
};

export function QcPlanEditorDrawer({
  open,
  onClose,
  onCompleted,
  items,
  categoryOptions,
}: Props) {
  const [form, setForm] = useState<QcPlanFormData>(INITIAL_FORM);
  const [itemPicker, setItemPicker] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const skuOptions = useMemo(() => {
    return items
      .filter(item => item.sku || item.id)
      .map(item => ({
        value: item.sku ?? item.id ?? "",
        label: `${item.sku ?? item.id} — ${item.name ?? "Sin nombre"}`,
      }));
  }, [items]);

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setItemPicker("");
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const updateParameter = (index: number, patch: Partial<ParameterForm>) => {
    setForm(prev => {
      const updated = [...prev.parameters];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, parameters: updated };
    });
  };

  const addParameter = () => {
    setForm(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { parameterId: "", required: true, autoApproveIfInSpec: true, priority: "MAJOR" },
      ],
    }));
  };

  const removeParameter = (index: number) => {
    setForm(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
  };

  const handleToggleCategory = (category: ItemCategory) => {
    setForm(prev => {
      const current = new Set(prev.appliesToCategories ?? []);
      if (current.has(category)) {
        current.delete(category);
      } else {
        current.add(category);
      }
      return { ...prev, appliesToCategories: Array.from(current) };
    });
  };

  const handleAddSku = (sku: string) => {
    if (!sku) return;
    setForm(prev => {
      const list = new Set(prev.appliesToItems ?? []);
      list.add(sku);
      return { ...prev, appliesToItems: Array.from(list) };
    });
    setItemPicker("");
  };

  const handleRemoveSku = (sku: string) => {
    setForm(prev => ({
      ...prev,
      appliesToItems: (prev.appliesToItems ?? []).filter(itemSku => itemSku !== sku),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const sanitizedParameters = form.parameters
        .map(param => ({
          ...param,
          parameterId: param.parameterId.trim(),
        }))
        .filter(param => param.parameterId.length > 0);

      if (sanitizedParameters.length === 0) {
        setErrorMessage("Debes definir al menos un parámetro con identificador.");
        setIsSubmitting(false);
        return;
      }

      const payload: QcPlanFormData = {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        appliesToItems: (form.appliesToItems ?? []).filter(Boolean),
        appliesToCategories: (form.appliesToCategories ?? []).filter(Boolean),
        parameters: sanitizedParameters,
        autoApproveRules: form.autoApproveRules?.enabled
          ? {
              enabled: true,
              conditions: {
                allTestsPass: form.autoApproveRules?.conditions?.allTestsPass ?? true,
                trustedSuppliers: form.autoApproveRules?.conditions?.trustedSuppliers?.filter(Boolean),
                maxLotSize: form.autoApproveRules?.conditions?.maxLotSize,
              },
            }
          : undefined,
        samplingPlan:
          form.samplingPlan?.type === "SAMPLING"
            ? {
                type: "SAMPLING",
                sampleSize: form.samplingPlan.sampleSize,
                acceptanceLevel: form.samplingPlan.acceptanceLevel,
              }
            : {
                type: form.samplingPlan?.type ?? "FULL",
              },
      };

      if (!payload.name) {
        setErrorMessage("El nombre del plan es obligatorio.");
        setIsSubmitting(false);
        return;
      }

      if ((payload.appliesToItems?.length ?? 0) === 0 && (payload.appliesToCategories?.length ?? 0) === 0) {
        setErrorMessage("El plan debe aplicar al menos a un SKU o una categoría.");
        setIsSubmitting(false);
        return;
      }

      const result = await createQcPlan(payload, "current-user-id");
      if (!result.success) {
        setErrorMessage(result.error ?? "No se pudo crear el plan.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Plan QC creado correctamente");
      handleReset();
      onCompleted?.();
    } catch (error) {
      console.error("[QcPlanEditorDrawer] create error", error);
      setErrorMessage("Error inesperado al crear el plan.");
      setIsSubmitting(false);
    }
  };

  const selectedCategories = new Set(form.appliesToCategories ?? []);

  return (
    <BaseDrawer
      open={open}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Nuevo plan de calidad"
      subtitle="Define cobertura, parámetros y reglas de auto-aprobación"
      footer={
        <div className="flex justify-between items-center w-full">
          {errorMessage && (
            <p className="text-xs text-destructive font-medium truncate pr-4">{errorMessage}</p>
          )}
          <div className="flex gap-2 ml-auto">
            <SBButton
              variant="ghost"
              size="sm"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </SBButton>
            <SBButton variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
              Guardar plan
            </SBButton>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="text-sm font-semibold text-foreground">Datos generales</header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nombre del plan
              </label>
              <Input
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                placeholder="Ej. Control Recepción Materias Primas"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Estado
              </label>
              <Select
                value={form.active ? "ACTIVE" : "INACTIVE"}
                onChange={event =>
                  setForm(prev => ({ ...prev, active: event.target.value === "ACTIVE" }))
                }
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Descripción
            </label>
            <Textarea
              value={form.description ?? ""}
              onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Describe el alcance y el objetivo del plan..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Disparador
              </label>
              <Select
                value={form.triggerOn}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    triggerOn: event.target.value as QcPlanFormData["triggerOn"],
                  }))
                }
              >
                {TRIGGER_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === "RECEIPT"
                      ? "Recepción"
                      : opt === "PRODUCTION"
                      ? "Producción"
                      : "Recepción y Producción"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Obligatorio para liberar
              </label>
              <Select
                value={form.requiredForRelease ? "YES" : "NO"}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    requiredForRelease: event.target.value === "YES",
                  }))
                }
              >
                <option value="YES">Sí</option>
                <option value="NO">Opcional</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tipo de muestreo
              </label>
              <Select
                value={form.samplingPlan?.type ?? "FULL"}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                      samplingPlan: {
                        ...prev.samplingPlan,
                        type: event.target.value as SamplingType,
                      },
                  }))
                }
              >
                {SAMPLING_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option === "FULL"
                      ? "100% lotes"
                      : option === "SAMPLING"
                      ? "Muestreo"
                      : "Sin muestreo"}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {form.samplingPlan?.type === "SAMPLING" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tamaño de muestra
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.samplingPlan.sampleSize ?? ""}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      samplingPlan: {
                        ...prev.samplingPlan,
                        type: "SAMPLING",
                        sampleSize: event.target.value ? Number(event.target.value) : undefined,
                      },
                    }))
                  }
                  placeholder="Ej. 5 lotes"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Nivel de aceptación (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.samplingPlan.acceptanceLevel ?? ""}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      samplingPlan: {
                        ...prev.samplingPlan,
                        type: "SAMPLING",
                        acceptanceLevel: event.target.value ? Number(event.target.value) : undefined,
                      },
                    }))
                  }
                  placeholder="Ej. 95"
                />
              </div>
            </div>
          )}
        </section>

        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="text-sm font-semibold text-foreground">Cobertura</header>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Añadir SKU
              </label>
              <Select
                value={itemPicker}
                onChange={event => {
                  const value = event.target.value;
                  setItemPicker(value);
                  if (value) {
                    handleAddSku(value);
                  }
                }}
              >
                <option value="">Selecciona SKU...</option>
                {skuOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {(form.appliesToItems?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.appliesToItems!.map(sku => (
                    <span key={sku} className="sb-badge sb-badge--info group flex items-center gap-2">
                      {sku}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive transition"
                        onClick={() => handleRemoveSku(sku)}
                        aria-label={`Eliminar ${sku}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Categorías
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryOptions.map(category => {
                  const isSelected = selectedCategories.has(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleToggleCategory(category)}
                      className={`sb-badge ${isSelected ? "sb-badge--success" : "sb-badge--default"} transition`}
                    >
                      {category}
                    </button>
                  );
                })}
                {categoryOptions.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No se detectaron categorías en el catálogo.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Parámetros</p>
            <SBButton variant="secondary" size="sm" onClick={addParameter}>
              <Plus size={16} />
              Añadir parámetro
            </SBButton>
          </header>
          <p className="text-xs text-muted-foreground">
            Define las pruebas necesarias para liberar el lote. Marca cuáles son obligatorias y su prioridad.
          </p>
      <div className="space-y-3">
        {form.parameters.map((parameter, index) => (
          <div
            key={`parameter-${index}`}
            className="rounded-xl border border-border/40 bg-background/60 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Identificador
                  </label>
                  <Input
                    value={parameter.parameterId}
                    onChange={event =>
                      updateParameter(index, { parameterId: event.target.value })
                    }
                    placeholder="Ej. ANALISIS_FISICO"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Prioridad
                    </label>
                    <Select
                      value={parameter.priority}
                      onChange={event =>
                        updateParameter(index, {
                          priority: event.target.value as ParameterForm["priority"],
                        })
                      }
                    >
                      {PRIORITY_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option === "CRITICAL"
                            ? "Crítica"
                            : option === "MAJOR"
                            ? "Mayor"
                            : "Menor"}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Obligatorio
                    </label>
                    <Select
                      value={parameter.required ? "YES" : "NO"}
                      onChange={event =>
                        updateParameter(index, { required: event.target.value === "YES" })
                      }
                    >
                      <option value="YES">Sí</option>
                      <option value="NO">Opcional</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Auto-aprueba si está en spec
                    </label>
                    <Select
                      value={parameter.autoApproveIfInSpec ? "YES" : "NO"}
                      onChange={event =>
                        updateParameter(index, {
                          autoApproveIfInSpec: event.target.value === "YES",
                        })
                      }
                    >
                      <option value="YES">Sí</option>
                      <option value="NO">No</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Unidad
                    </label>
                    <Input
                      value={parameter.unit ?? ""}
                      onChange={event =>
                        updateParameter(index, { unit: event.target.value || undefined })
                      }
                      placeholder="Ej. pH, °Bx"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Objetivo
                    </label>
                    <Input
                      type="number"
                      value={parameter.target ?? ""}
                      onChange={event =>
                        updateParameter(index, {
                          target: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      placeholder="Ej. 7"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Mínimo
                    </label>
                    <Input
                      type="number"
                      value={parameter.min ?? ""}
                      onChange={event =>
                        updateParameter(index, {
                          min: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      placeholder="Ej. 6.8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Máximo
                    </label>
                    <Input
                      type="number"
                      value={parameter.max ?? ""}
                      onChange={event =>
                        updateParameter(index, {
                          max: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      placeholder="Ej. 7.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Tolerancia
                    </label>
                    <Input
                      type="number"
                      value={parameter.tolerance ?? ""}
                      onChange={event =>
                        updateParameter(index, {
                          tolerance: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                      placeholder="±0.2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Método / Observaciones
                  </label>
                  <Input
                    value={parameter.method ?? ""}
                    onChange={event =>
                      updateParameter(index, { method: event.target.value || undefined })
                    }
                    placeholder="Ej. Potenciómetro calibrado cada turno"
                  />
                </div>
              </div>
              {form.parameters.length > 1 && (
                <SBButton
                  variant="ghost"
                  size="sm"
                      className="text-destructive"
                      onClick={() => removeParameter(index)}
                    >
                      <Trash2 size={16} />
                    </SBButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="text-sm font-semibold text-foreground">Auto-aprobación</header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Auto-aprobar lotes
              </label>
              <Select
                value={form.autoApproveRules?.enabled ? "YES" : "NO"}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    autoApproveRules: {
                      enabled: event.target.value === "YES",
                      conditions: prev.autoApproveRules?.conditions ?? { allTestsPass: true },
                    },
                  }) as QcPlanFormData)
                }
              >
                <option value="NO">Deshabilitado</option>
                <option value="YES">Habilitado</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Todos los tests pasan
              </label>
              <Select
                value={form.autoApproveRules?.conditions?.allTestsPass === false ? "NO" : "YES"}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    autoApproveRules: {
                      enabled: prev.autoApproveRules?.enabled ?? false,
                      conditions: {
                        ...prev.autoApproveRules?.conditions,
                        allTestsPass: event.target.value === "YES",
                      },
                    },
                  }) as QcPlanFormData)
                }
                disabled={!form.autoApproveRules?.enabled}
              >
                <option value="YES">Sí</option>
                <option value="NO">Permitir fallos</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tamaño máximo de lote
              </label>
              <Input
                type="number"
                min={0}
                value={form.autoApproveRules?.conditions?.maxLotSize ?? ""}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    autoApproveRules: {
                      enabled: prev.autoApproveRules?.enabled ?? false,
                      conditions: {
                        ...prev.autoApproveRules?.conditions,
                        maxLotSize: event.target.value ? Number(event.target.value) : undefined,
                      },
                    },
                  }) as QcPlanFormData)
                }
                disabled={!form.autoApproveRules?.enabled}
                placeholder="Ej. 500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Proveedores de confianza
            </label>
            <Textarea
              value={(form.autoApproveRules?.conditions?.trustedSuppliers ?? []).join("\n")}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  autoApproveRules: {
                    enabled: prev.autoApproveRules?.enabled ?? false,
                    conditions: {
                      ...prev.autoApproveRules?.conditions,
                      trustedSuppliers: event.target.value
                        .split("\n")
                        .map(val => val.trim())
                        .filter(Boolean),
                    },
                  },
                }) as QcPlanFormData)
              }
              placeholder="Introduce un proveedor por línea"
              rows={3}
              disabled={!form.autoApproveRules?.enabled}
            />
          </div>
        </section>
      </div>
    </BaseDrawer>
  );
}
