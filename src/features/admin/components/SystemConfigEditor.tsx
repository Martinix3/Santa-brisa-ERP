"use client";

import { useState } from "react";
import { SBButton, Input } from "@/components/ui/ui-primitives";
import { updateSystemConfig, resetSystemConfig } from "../actions";
import { useData } from "@/lib/dataprovider";
import { Save, RotateCcw, AlertTriangle, Package, Factory, DollarSign, Target } from "lucide-react";
import type { SystemConfig } from "@/domain/ssot";

interface SystemConfigEditorProps {
  initialConfig: SystemConfig["businessRules"];
}

export function SystemConfigEditor({ initialConfig }: SystemConfigEditorProps) {
  const { currentUser } = useData();
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!currentUser?.id) {
      alert("Usuario no autenticado");
      return;
    }

    setLoading(true);
    setSaved(false);

    try {
      const result = await updateSystemConfig(config, currentUser.id);

      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(result.error || "Error guardando configuración");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error guardando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!currentUser?.id) return;

    const confirmed = confirm("¿Resetear toda la configuración a valores por defecto?");
    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await resetSystemConfig(currentUser.id);

      if (result.ok) {
        window.location.reload();
      } else {
        alert(result.error || "Error reseteando configuración");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error reseteando configuración");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex gap-2 justify-end">
        <SBButton
          data-variant="ghost"
          onClick={handleReset}
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Resetear
        </SBButton>
        <SBButton
          data-variant="primary"
          onClick={handleSave}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Guardando..." : saved ? "✓ Guardado" : "Guardar Cambios"}
        </SBButton>
      </div>

      {/* Alertas y Umbrales */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div className="sb-card__title">Alertas y Umbrales de Cuentas</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="sb-label">Días sin contacto (alerta)</label>
              <Input
                type="number"
                value={config.alerts.daysWithoutContact}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: { ...config.alerts, daysWithoutContact: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alerta cuando una cuenta no tiene contacto en X días
              </p>
            </div>

            <div>
              <label className="sb-label">Días sin pedido (alerta)</label>
              <Input
                type="number"
                value={config.alerts.daysWithoutOrder}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: { ...config.alerts, daysWithoutOrder: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alerta cuando una cuenta no hace pedido en X días
              </p>
            </div>

            <div>
              <label className="sb-label">Días sin visita (alerta)</label>
              <Input
                type="number"
                value={config.alerts.daysWithoutVisit}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: { ...config.alerts, daysWithoutVisit: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alerta cuando una cuenta no recibe visita en X días
              </p>
            </div>

            <div>
              <label className="sb-label">Días sin pedido (crítico)</label>
              <Input
                type="number"
                value={config.alerts.daysSinPedidoCritical}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: { ...config.alerts, daysSinPedidoCritical: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alerta crítica de cuenta inactiva (días sin pedido)
              </p>
            </div>

            <div>
              <label className="sb-label">Días en stage sin acción</label>
              <Input
                type="number"
                value={config.alerts.daysInStageNoAction}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: { ...config.alerts, daysInStageNoAction: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alerta cuando una cuenta está en un stage sin acción
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inventario */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            <div className="sb-card__title">Thresholds de Inventario</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="sb-label">Stock bajo (unidades)</label>
              <Input
                type="number"
                value={config.inventory.lowStockThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    inventory: { ...config.inventory, lowStockThreshold: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Días cerca de vencimiento</label>
              <Input
                type="number"
                value={config.inventory.nearExpiryDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    inventory: { ...config.inventory, nearExpiryDays: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Multiplicador de stock de seguridad</label>
              <Input
                type="number"
                step="0.1"
                value={config.inventory.safetyStockMultiplier}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    inventory: {
                      ...config.inventory,
                      safetyStockMultiplier: parseFloat(e.target.value),
                    },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Días objetivo de cobertura</label>
              <Input
                type="number"
                value={config.inventory.targetDaysOfCover}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    inventory: { ...config.inventory, targetDaysOfCover: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Producción */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-green-500" />
            <div className="sb-card__title">Thresholds de Producción</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="sb-label">KPI: Días históricos</label>
              <Input
                type="number"
                value={config.production.kpiDaysBack}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    production: { ...config.production, kpiDaysBack: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Materia prima crítica (unidades)</label>
              <Input
                type="number"
                value={config.production.criticalRawThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    production: {
                      ...config.production,
                      criticalRawThreshold: parseInt(e.target.value),
                    },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Días vencida (crítico)</label>
              <Input
                type="number"
                value={config.production.overdueDaysThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    production: {
                      ...config.production,
                      overdueDaysThreshold: parseInt(e.target.value),
                    },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Días vencida (advertencia)</label>
              <Input
                type="number"
                value={config.production.warningDaysThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    production: {
                      ...config.production,
                      warningDaysThreshold: parseInt(e.target.value),
                    },
                  })
                }
                className="sb-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs por Defecto */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <div className="sb-card__title">KPIs por Defecto</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="sb-label">Unidades vendidas</label>
              <Input
                type="number"
                value={config.kpiDefaults.unitsSold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    kpiDefaults: { ...config.kpiDefaults, unitsSold: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Revenue (€)</label>
              <Input
                type="number"
                value={config.kpiDefaults.revenue}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    kpiDefaults: { ...config.kpiDefaults, revenue: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Visitas</label>
              <Input
                type="number"
                value={config.kpiDefaults.visits}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    kpiDefaults: { ...config.kpiDefaults, visits: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tipos de Tarea */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            <div className="sb-card__title">Tipos de Tarea Configurables</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <p className="text-sm text-muted-foreground">
            Gestiona los tipos de tareas disponibles y sus validaciones. Los tipos configurados aquí determinarán qué campos son obligatorios al crear cada tipo de tarea.
          </p>
          <div className="space-y-3">
            {config.taskTypes.map((taskType) => (
              <div
                key={taskType.id}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{
                  borderColor: taskType.color + '40',
                  backgroundColor: taskType.color + '08',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{taskType.icon}</span>
                  <div>
                    <div className="font-medium">{taskType.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {taskType.validations?.requiresAccount && '✓ Requiere cuenta'}
                      {taskType.validations?.requiresOrder && ' • ✓ Requiere pedido'}
                      {taskType.validations?.requiresEvent && ' • ✓ Requiere evento'}
                      {!taskType.validations && 'Sin validaciones especiales'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      taskType.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {taskType.enabled ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded-lg">
            💡 <strong>Próximamente:</strong> Podrás crear tipos personalizados y editar validaciones desde aquí
          </div>
        </div>
      </section>

      {/* Finanzas */}
      <section className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            <div className="sb-card__title">Configuración Financiera</div>
          </div>
        </div>
        <div className="sb-card__content space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="sb-label">Día liquidación IVA</label>
              <Input
                type="number"
                value={config.finance.vatSettlementDay}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    finance: { ...config.finance, vatSettlementDay: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Fee payout online (%)</label>
              <Input
                type="number"
                step="0.1"
                value={config.finance.payoutFeePctOnline}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    finance: { ...config.finance, payoutFeePctOnline: parseFloat(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Threshold fuzzy search</label>
              <Input
                type="number"
                step="0.01"
                value={config.finance.fuzzySearchThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    finance: {
                      ...config.finance,
                      fuzzySearchThreshold: parseFloat(e.target.value),
                    },
                  })
                }
                className="sb-input"
              />
            </div>

            <div>
              <label className="sb-label">Días pago vencido</label>
              <Input
                type="number"
                value={config.finance.overduePaymentDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    finance: { ...config.finance, overduePaymentDays: parseInt(e.target.value) },
                  })
                }
                className="sb-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex gap-2 justify-end">
        <SBButton
          data-variant="ghost"
          onClick={handleReset}
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Resetear
        </SBButton>
        <SBButton
          data-variant="primary"
          onClick={handleSave}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Guardando..." : saved ? "✓ Guardado" : "Guardar Cambios"}
        </SBButton>
      </div>
    </div>
  );
}
