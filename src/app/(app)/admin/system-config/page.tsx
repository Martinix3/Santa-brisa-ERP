'use client';

import React, { useState } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/shared/PageShell';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import type { Department, SystemConfig } from '@/domain/ssot';

type TabKey = 'colors' | 'metadata' | 'rules';

export default function SystemConfigPage() {
  const { config, loading, error, updateConfig, reload } = useSystemConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('colors');
  const [isSaving, setIsSaving] = useState(false);
  const [editedConfig, setEditedConfig] = useState<SystemConfig | null>(null);

  // Inicializar editedConfig cuando config carga
  React.useEffect(() => {
    if (config && !editedConfig) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config, editedConfig]);

  // Calcular si hay cambios
  const hasChanges = JSON.stringify(config) !== JSON.stringify(editedConfig);

  // Prevenir pérdida de cambios no guardados
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleSave = async () => {
    if (!editedConfig) return;
    
    setIsSaving(true);
    try {
      const result = await updateConfig(editedConfig);
      if (result?.success) {
        toast.success('Configuración guardada correctamente');
        await reload();
      } else {
        toast.error(`Error al guardar: ${result?.error || 'Error desconocido'}`);
      }
    } catch (err) {
      toast.error('Error al guardar la configuración');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
      toast.info('Cambios descartados');
    }
  };

  const updateThemeColor = (section: 'brand' | 'state' | 'accent', key: string, value: string) => {
    if (!editedConfig) return;
    setEditedConfig({
      ...editedConfig,
      theme: {
        ...editedConfig.theme,
        [section]: {
          ...editedConfig.theme[section],
          [key]: value,
        },
      },
    });
  };

  const updateDeptColor = (dept: Department, field: 'color' | 'textColor', value: string) => {
    if (!editedConfig) return;
    setEditedConfig({
      ...editedConfig,
      theme: {
        ...editedConfig.theme,
        departments: {
          ...editedConfig.theme.departments,
          [dept]: {
            ...editedConfig.theme.departments[dept],
            [field]: value,
          },
        },
      },
    });
  };

  const updateBusinessRule = <
    C extends keyof SystemConfig['businessRules'],
    K extends keyof SystemConfig['businessRules'][C]
  >(
    category: C,
    key: K,
    value: SystemConfig['businessRules'][C][K]
  ) => {
    if (!editedConfig) return;
    setEditedConfig({
      ...editedConfig,
      businessRules: {
        ...editedConfig.businessRules,
        [category]: {
          ...editedConfig.businessRules[category],
          [key]: value,
        },
      },
    });
  };

  if (loading) {
    return (
      <PageShell title="Configuración del Sistema" module="admin">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !editedConfig) {
    return (
      <PageShell title="Configuración del Sistema" module="admin">
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>Error: {error || 'No se pudo cargar la configuración'}</span>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Configuración del Sistema"
      module="admin"
      headerContent={
        <div className="flex items-center gap-3">
          {hasChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span>Cambios sin guardar</span>
            </div>
          )}
          
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="sb-btn"
            data-variant="ghost"
            data-size="sm"
          >
            <RefreshCw className="w-4 h-4" />
            Descartar
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="sb-btn"
            data-variant="primary"
            data-size="sm"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="sb-tablist mb-6">
        <button
          onClick={() => setActiveTab('colors')}
          className="sb-tab"
          aria-selected={activeTab === 'colors'}
        >
          🎨 Colores
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className="sb-tab"
          aria-selected={activeTab === 'metadata'}
        >
          📋 Metadata
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className="sb-tab"
          aria-selected={activeTab === 'rules'}
        >
          ⚙️ Reglas de Negocio
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'colors' && (
          <ColorsTab
            config={editedConfig}
            onUpdateThemeColor={updateThemeColor}
            onUpdateDeptColor={updateDeptColor}
          />
        )}

        {activeTab === 'metadata' && (
          <MetadataTab config={editedConfig} />
        )}

        {activeTab === 'rules' && (
          <RulesTab
            config={editedConfig}
            onUpdateRule={updateBusinessRule}
          />
        )}
      </div>

      {/* Footer con info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">ℹ️ Información</p>
            <p>
              Los cambios se guardan en Firestore y se aplican inmediatamente en toda la aplicación.
              Los valores por defecto se mantienen en el código como fallback.
            </p>
            <p className="mt-2 text-xs text-blue-700">
              Última actualización: {new Date(editedConfig.updatedAt).toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ============================================================================
// COLORS TAB
// ============================================================================

function ColorsTab({
  config,
  onUpdateThemeColor,
  onUpdateDeptColor,
}: {
  config: SystemConfig;
  onUpdateThemeColor: (section: 'brand' | 'state' | 'accent', key: string, value: string) => void;
  onUpdateDeptColor: (dept: Department, field: 'color' | 'textColor', value: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Colores de Marca */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Colores de Marca</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(config.theme.brand).map(([key, value]) => (
              <ColorInput
                key={key}
                label={key}
                value={value}
                onChange={(newValue) => onUpdateThemeColor('brand', key, newValue)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Colores de Estado */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Colores de Estado</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(config.theme.state).map(([key, value]) => (
              <ColorInput
                key={key}
                label={key}
                value={value}
                onChange={(newValue) => onUpdateThemeColor('state', key, newValue)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Colores de Acento */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Colores de Acento</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(config.theme.accent).map(([key, value]) => (
              <ColorInput
                key={key}
                label={key}
                value={value}
                onChange={(newValue) => onUpdateThemeColor('accent', key, newValue)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Colores de Departamentos */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Colores de Departamentos</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(config.theme.departments) as [Department, { color: string; textColor: string }][]).map(
              ([dept, { color, textColor }]) => (
                <div key={dept} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">{config.metadata.departments[dept].label}</h4>
                  <div className="space-y-3">
                    <ColorInput
                      label="Color de fondo"
                      value={color}
                      onChange={(newValue) => onUpdateDeptColor(dept, 'color', newValue)}
                    />
                    <ColorInput
                      label="Color de texto"
                      value={textColor}
                      onChange={(newValue) => onUpdateDeptColor(dept, 'textColor', newValue)}
                    />
                    {/* Preview */}
                    <div
                      className="mt-2 p-3 rounded-md text-center font-medium"
                      style={{ backgroundColor: color, color: textColor }}
                    >
                      Preview
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// METADATA TAB
// ============================================================================

function MetadataTab({ config }: { config: SystemConfig }) {
  return (
    <div className="space-y-6">
      <div className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Metadata de Labels</h3>
        </div>
        <div className="sb-card__content">
          <p className="text-sm text-muted-foreground mb-4">
            Los labels son de solo lectura por ahora. Se pueden editar directamente en Firestore si es necesario.
          </p>
          
          <div className="space-y-6">
            {/* Departamentos */}
            <div>
              <h4 className="font-medium mb-2">Departamentos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(config.metadata.departments).map(([key, { label }]) => (
                  <div key={key} className="p-2 bg-secondary rounded text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{key}:</span> {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Estados de Pedidos */}
            <div>
              <h4 className="font-medium mb-2">Estados de Pedidos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(config.metadata.orderStatuses).map(([key, { label }]) => (
                  <div key={key} className="p-2 bg-secondary rounded text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{key}:</span> {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos de Cuenta */}
            <div>
              <h4 className="font-medium mb-2">Tipos de Cuenta</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(config.metadata.accountTypes).map(([key, { label }]) => (
                  <div key={key} className="p-2 bg-secondary rounded text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{key}:</span> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RULES TAB
// ============================================================================

function RulesTab({
  config,
  onUpdateRule,
}: {
  config: SystemConfig;
  onUpdateRule: <
    C extends keyof SystemConfig['businessRules'],
    K extends keyof SystemConfig['businessRules'][C]
  >(category: C, key: K, value: SystemConfig['businessRules'][C][K]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Alertas y Thresholds */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">⚠️ Alertas y Thresholds</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label="Días sin contacto"
              value={config.businessRules.alerts.daysWithoutContact}
              onChange={(v) => onUpdateRule('alerts', 'daysWithoutContact', v)}
              helpText="Alerta cuando una cuenta no tiene contacto en X días"
            />
            <NumberInput
              label="Días sin pedido"
              value={config.businessRules.alerts.daysWithoutOrder}
              onChange={(v) => onUpdateRule('alerts', 'daysWithoutOrder', v)}
              helpText="Alerta cuando una cuenta no realiza pedido en X días"
            />
            <NumberInput
              label="Días sin visita"
              value={config.businessRules.alerts.daysWithoutVisit}
              onChange={(v) => onUpdateRule('alerts', 'daysWithoutVisit', v)}
              helpText="Alerta cuando una cuenta no tiene visita en X días"
            />
            <NumberInput
              label="Días sin pedido (crítico)"
              value={config.businessRules.alerts.daysSinPedidoCritical}
              onChange={(v) => onUpdateRule('alerts', 'daysSinPedidoCritical', v)}
              helpText="Umbral crítico de días sin pedido para sell-out"
            />
            <NumberInput
              label="Días en stage sin acción"
              value={config.businessRules.alerts.daysInStageNoAction}
              onChange={(v) => onUpdateRule('alerts', 'daysInStageNoAction', v)}
              helpText="Alerta cuando una cuenta está en un stage sin cambios"
            />
          </div>
        </div>
      </section>

      {/* KPI Defaults */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">📊 KPIs por Defecto</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Cajas vendidas (objetivo)"
              value={config.businessRules.kpiDefaults.unitsSold}
              onChange={(v) => onUpdateRule('kpiDefaults', 'unitsSold', v)}
              helpText="Objetivo por defecto si el usuario no tiene uno configurado"
            />
            <NumberInput
              label="Revenue (objetivo)"
              value={config.businessRules.kpiDefaults.revenue}
              onChange={(v) => onUpdateRule('kpiDefaults', 'revenue', v)}
              helpText="Revenue por defecto en €"
            />
            <NumberInput
              label="Visitas (objetivo)"
              value={config.businessRules.kpiDefaults.visits}
              onChange={(v) => onUpdateRule('kpiDefaults', 'visits', v)}
              helpText="Número de visitas objetivo"
            />
          </div>
        </div>
      </section>

      {/* Time Ranges */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">📅 Rangos de Tiempo</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Días en una semana"
              value={config.businessRules.timeRanges.weekDays}
              onChange={(v) => onUpdateRule('timeRanges', 'weekDays', v)}
              helpText="Generalmente 7"
            />
            <NumberInput
              label="Días en un mes"
              value={config.businessRules.timeRanges.monthDays}
              onChange={(v) => onUpdateRule('timeRanges', 'monthDays', v)}
              helpText="Generalmente 30 (promedio)"
            />
            <NumberInput
              label="Días en un año"
              value={config.businessRules.timeRanges.yearDays}
              onChange={(v) => onUpdateRule('timeRanges', 'yearDays', v)}
              helpText="Generalmente 365"
            />
          </div>
        </div>
      </section>

      {/* Finance */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">💰 Configuración Financiera</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Día liquidación IVA"
              value={config.businessRules.finance.vatSettlementDay}
              onChange={(v) => onUpdateRule('finance', 'vatSettlementDay', v)}
              helpText="Día del mes para liquidar IVA"
            />
            <NumberInput
              label="Fee payout online (%)"
              value={config.businessRules.finance.payoutFeePctOnline * 100}
              onChange={(v) => onUpdateRule('finance', 'payoutFeePctOnline', v / 100)}
              helpText="Fee en % (ej: 2 = 2%)"
              step={0.1}
            />
            <NumberInput
              label="Threshold búsqueda fuzzy"
              value={config.businessRules.finance.fuzzySearchThreshold}
              onChange={(v) => onUpdateRule('finance', 'fuzzySearchThreshold', v)}
              helpText="0 = exacto, 1 = cualquiera"
              step={0.1}
              min={0}
              max={1}
            />
          </div>
        </div>
      </section>

      {/* Inventory */}
      <section className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">📦 Configuración de Inventario</h3>
        </div>
        <div className="sb-card__content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Días cerca de caducar"
              value={config.businessRules.inventory.nearExpiryDays}
              onChange={(v) => onUpdateRule('inventory', 'nearExpiryDays', v)}
              helpText="Considerar 'próximo a caducar' cuando quedan X días"
            />
            <NumberInput
              label="Multiplicador de stock de seguridad"
              value={config.businessRules.inventory.safetyStockMultiplier}
              onChange={(v) => onUpdateRule('inventory', 'safetyStockMultiplier', v)}
              helpText="Días de demanda diaria para stock de seguridad"
            />
            <NumberInput
              label="Días de cobertura objetivo"
              value={config.businessRules.inventory.targetDaysOfCover}
              onChange={(v) => onUpdateRule('inventory', 'targetDaysOfCover', v)}
              helpText="Objetivo de días de cobertura de inventario"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium capitalize">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border rounded-md font-mono"
          placeholder="#000000"
        />
      </div>
      {/* Preview */}
      <div
        className="h-8 rounded-md border"
        style={{ backgroundColor: value }}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  helpText,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [inputValue, setInputValue] = React.useState(String(value));
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setInputValue(String(value));
    setHasError(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strValue = e.target.value;
    setInputValue(strValue);
    
    // Validar que es un número
    const numValue = parseFloat(strValue);
    if (strValue === '' || isNaN(numValue)) {
      setHasError(true);
      return;
    }

    // Validar min/max si están definidos
    if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
      setHasError(true);
      return;
    }

    setHasError(false);
    onChange(numValue);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        className={`w-full px-3 py-2 text-sm border rounded-md ${
          hasError ? 'border-red-500 focus:ring-red-500' : ''
        }`}
      />
      {hasError && (
        <p className="text-xs text-red-600">
          {min !== undefined && max !== undefined
            ? `Debe ser un número entre ${min} y ${max}`
            : 'Debe ser un número válido'}
        </p>
      )}
      {helpText && !hasError && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
