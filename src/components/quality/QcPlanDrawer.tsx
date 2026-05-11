/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/quality/QcPlanDrawer.tsx
"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Settings2,
  Clock,
  Users,
  Package,
  Zap,
} from "lucide-react";
import type { QcPlan } from "@/domain/ssot";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { SBButton } from "@/components/ui/ui-primitives";
import { toast } from "sonner";
import {
  activateQcPlan,
  deactivateQcPlan,
} from "@/server/actions/quality-plans";

type Props = {
  plan: QcPlan;
  onClose: () => void;
  onUpdated?: () => void;
};

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: "Crítico", className: "sb-badge sb-badge--destructive" },
  MAJOR: { label: "Mayor", className: "sb-badge sb-badge--warning" },
  MINOR: { label: "Menor", className: "sb-badge sb-badge--default" },
};

export function QcPlanDrawer({ plan, onClose, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [localPlan, setLocalPlan] = useState(plan);

  const handleToggleActive = (active: boolean) => {
    startTransition(async () => {
      try {
        const action = active ? activateQcPlan : deactivateQcPlan;
        const result = await action(localPlan.id, "current-user-id");
        if (!result.success) {
          toast.error(result.error ?? "No se pudo actualizar el plan");
          return;
        }
        setLocalPlan(result.data);
        toast.success(active ? "Plan activado" : "Plan desactivado");
        onUpdated?.();
      } catch (error) {
        console.error("[QcPlanDrawer] toggle active error", error);
        toast.error("Error al actualizar el plan");
      }
    });
  };

  const parameters = localPlan.parameters ?? [];

  return (
    <BaseDrawer
      open
      onClose={onClose}
      title={localPlan.name}
      subtitle={localPlan.code ?? "Plan de control de calidad"}
      actions={
        <div className="flex gap-2">
          <SBButton
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(!localPlan.active)}
            disabled={isPending}
          >
            {localPlan.active ? "Desactivar" : "Activar"}
          </SBButton>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} />
            Configuración
          </div>
          <DetailRow
            label="Estado"
            value={
              <span className={`sb-badge ${localPlan.active ? "sb-badge--success" : "sb-badge--default"}`}>
                {localPlan.active ? "Activo" : "Inactivo"}
              </span>
            }
          />
          <DetailRow label="Descripción" value={localPlan.description} />
          <DetailRow label="Versión" value={localPlan.version} />
          <DetailRow label="Departamento" value={localPlan.department ?? "CALIDAD"} />
          <DetailRow
            label="Disparo"
            value={
              localPlan.triggerOn === "RECEIPT"
                ? "Recepción"
                : localPlan.triggerOn === "PRODUCTION"
                ? "Producción"
                : localPlan.triggerOn === "BOTH"
                ? "Recepción y Producción"
                : "Sin definir"
            }
          />
          <DetailRow
            label="Requerido para liberar"
            value={localPlan.requiredForRelease ? "Sí" : "Opcional"}
          />
          {localPlan.samplingPlan?.type && (
            <DetailRow
              label="Muestreo"
              value={
                localPlan.samplingPlan.type === "FULL"
                  ? "100% de lotes"
                  : localPlan.samplingPlan.type === "SAMPLING"
                  ? `Muestreo (${localPlan.samplingPlan.sampleSize ?? "N/A"})`
                  : "Skip"
              }
            />
          )}
          {localPlan.samplingPlan?.acceptanceLevel !== undefined && (
            <DetailRow
              label="Nivel de aceptación"
              value={`${localPlan.samplingPlan.acceptanceLevel}%`}
            />
          )}
          <DetailRow
            label="Auto-aprobación"
            value={localPlan.autoApproveRules?.enabled ? "Activa" : "Deshabilitada"}
          />
          <DetailRow
            label="Vigente desde"
            value={
              localPlan.effectiveFrom
                ? new Date(localPlan.effectiveFrom).toLocaleDateString("es-ES")
                : undefined
            }
          />
        </section>

        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="flex items-center gap-2 text-sm font-semibold">
            <Layers size={16} />
            Cobertura
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 border border-border/40 rounded-lg bg-background/70">
              <p className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                <Package size={12} />
                SKUs
              </p>
              <p className="font-semibold mt-1">
                {localPlan.appliesToItems?.length ?? 0}
                <span className="text-xs text-muted-foreground ml-1">asignados</span>
              </p>
            </div>
            <div className="p-3 border border-border/40 rounded-lg bg-background/70">
              <p className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                <Users size={12} />
                Categorías
              </p>
              <p className="font-semibold mt-1">
                {localPlan.appliesToCategories?.length ?? 0}
                <span className="text-xs text-muted-foreground ml-1">categorías</span>
              </p>
            </div>
          </div>
          {(localPlan.appliesToItems?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">SKUs cubiertos</p>
              <div className="flex flex-wrap gap-2">
                {localPlan.appliesToItems!.map(sku => (
                  <span key={sku} className="sb-badge sb-badge--default">
                    {sku}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(localPlan.appliesToCategories?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Categorías cubiertas</p>
              <div className="flex flex-wrap gap-2">
                {localPlan.appliesToCategories!.map(category => (
                  <span key={category} className="sb-badge sb-badge--default">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-4">
          <header className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 size={16} />
            Parámetros de control
            <span className="ml-auto text-xs text-muted-foreground">{parameters.length} parámetros</span>
          </header>
          <div className="space-y-3">
            {parameters.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle size={16} />
                No hay parámetros configurados en este plan.
              </div>
            ) : (
              parameters.map((parameter, index) => {
                const priorityMeta =
                  (parameter.priority && PRIORITY_META[parameter.priority]) ??
                  { label: "Sin prioridad", className: "sb-badge sb-badge--default" };
                return (
                  <div
                    key={`${parameter.parameterId ?? parameter.id ?? index}-${index}`}
                    className="p-3 rounded-lg border border-border/40 bg-background/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {parameter.parameterName ?? parameter.name ?? parameter.parameterId ?? "Parámetro"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {parameter.required ? "Obligatorio" : "Opcional"}
                        </p>
                      </div>
                      <span className={priorityMeta.className}>{priorityMeta.label}</span>
                    </div>
                    {(parameter.unit ||
                      parameter.target !== undefined ||
                      parameter.min !== undefined ||
                      parameter.max !== undefined ||
                      parameter.tolerance !== undefined) && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        {parameter.unit && (
                          <div>
                            <span className="block text-[10px] uppercase">Unidad</span>
                            <span className="font-medium text-foreground">{parameter.unit}</span>
                          </div>
                        )}
                        {parameter.target !== undefined && (
                          <div>
                            <span className="block text-[10px] uppercase">Objetivo</span>
                            <span className="font-medium text-foreground">{parameter.target}</span>
                          </div>
                        )}
                        {parameter.min !== undefined && (
                          <div>
                            <span className="block text-[10px] uppercase">Mínimo</span>
                            <span className="font-medium text-foreground">{parameter.min}</span>
                          </div>
                        )}
                        {parameter.max !== undefined && (
                          <div>
                            <span className="block text-[10px] uppercase">Máximo</span>
                            <span className="font-medium text-foreground">{parameter.max}</span>
                          </div>
                        )}
                        {parameter.tolerance !== undefined && (
                          <div>
                            <span className="block text-[10px] uppercase">Tolerancia</span>
                            <span className="font-medium text-foreground">{parameter.tolerance}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {parameter.method && (
                      <p className="mt-2 text-xs text-muted-foreground">Método: {parameter.method}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {localPlan.autoApproveRules?.enabled && (
          <section className="sb-glass rounded-xl border border-border/40 p-4 space-y-3">
            <header className="flex items-center gap-2 text-sm font-semibold">
              <Zap size={16} />
              Auto-aprobación
            </header>
            <p className="text-sm text-muted-foreground">
              Este plan tiene reglas de auto-aprobación cuando todos los parámetros críticos cumplen
              las especificaciones.
            </p>
            {localPlan.autoApproveRules?.conditions && (
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between gap-2">
                  <span>Todos los tests pasan</span>
                  <span className="font-semibold text-foreground">
                    {localPlan.autoApproveRules.conditions.allTestsPass === false ? "No" : "Sí"}
                  </span>
                </div>
                {Array.isArray(localPlan.autoApproveRules.conditions.trustedSuppliers) && (
                  <div>
                    <p className="mb-1">Proveedores confiables</p>
                    <div className="flex flex-wrap gap-2">
                      {(localPlan.autoApproveRules.conditions.trustedSuppliers as string[]).map((supplier: string) => (
                        <span key={supplier} className="sb-badge sb-badge--info">
                          {supplier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {localPlan.autoApproveRules.conditions.maxLotSize && (
                  <div className="flex justify-between gap-2">
                    <span>Lote máximo</span>
                    <span className="font-semibold text-foreground">
                      {localPlan.autoApproveRules.conditions.maxLotSize}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sb-glass rounded-xl border border-border/40 p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock size={12} />
              Creado el
            </p>
            <p className="text-sm font-semibold mt-1">
              {localPlan.createdAt
                ? new Date(localPlan.createdAt).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
          </div>
          <div className="sb-glass rounded-xl border border-border/40 p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock size={12} />
              Última actualización
            </p>
            <p className="text-sm font-semibold mt-1">
              {localPlan.updatedAt
                ? new Date(localPlan.updatedAt).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
          </div>
        </section>
      </div>
    </BaseDrawer>
  );
}
