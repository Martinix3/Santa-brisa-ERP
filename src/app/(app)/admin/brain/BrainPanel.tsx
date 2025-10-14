'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { BrainConfig, BrainRule, SimulationResult } from '@/domain/brain';
import type { Campaign } from '@/domain/campaigns';
import type { DashboardConfigData } from '@/server/actions/dashboard-config.actions';
import { 
  updateBrainConfig, 
  toggleBrainRule, 
  evaluateRules 
} from '@/server/actions/brain.actions';
import { 
  updateDashboardConfig, 
  resetDashboardConfig 
} from '@/server/actions/dashboard-config.actions';
import { getCampaigns } from '@/server/actions/campaigns.actions';
import { CampaignCard } from './CampaignCard';
import { CreateCampaignDialog } from './CreateCampaignDialog';
import { MonitoringPanel } from './MonitoringPanel';

interface BrainPanelProps {
  initialConfig: BrainConfig;
  initialRules: BrainRule[];
  initialDashboardConfig: DashboardConfigData;
}

type Tab = 'config' | 'rules' | 'campaigns' | 'monitor' | 'dashboards';

export function BrainPanel({ initialConfig, initialRules, initialDashboardConfig }: BrainPanelProps) {
  const [tab, setTab] = useState<Tab>('config');
  const [config, setConfig] = useState(initialConfig);
  const [rules, setRules] = useState(initialRules);
  const [dashboardConfig, setDashboardConfig] = useState(initialDashboardConfig);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  
  // Load campaigns when tab changes to campaigns
  useEffect(() => {
    if (tab === 'campaigns') {
      loadCampaigns();
    }
  }, [tab]);
  
  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const result = await getCampaigns();
      if (result.ok) {
        setCampaigns(result.data);
      } else {
        toast.error('Error al cargar campañas: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoadingCampaigns(false);
    }
  };
  
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const result = await updateBrainConfig(config);
      if (result.ok) {
        toast.success('✅ Configuración guardada');
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const result = await toggleBrainRule(ruleId, enabled);
      if (result.ok) {
        setRules(rules.map(r => r.id === ruleId ? { ...r, enabled } : r));
        toast.success(enabled ? '✅ Regla activada' : '⚠️ Regla desactivada');
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };
  
  const handleSimulateRules = async () => {
    setSimulating(true);
    try {
      const result = await evaluateRules({ simulate: true });
      if (result.ok) {
        setSimulationResult(result.data);
        toast.success('✅ Simulación completada');
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSimulating(false);
    }
  };
  
  const handleExecuteRules = async () => {
    if (!confirm('¿Ejecutar reglas y crear tareas reales?')) return;
    
    setSaving(true);
    try {
      const result = await evaluateRules({ simulate: false });
      if (result.ok) {
        toast.success(`✅ ${result.data.totalActions} tareas creadas`);
        setSimulationResult(result.data);
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveDashboardConfig = async () => {
    setSaving(true);
    try {
      const result = await updateDashboardConfig(dashboardConfig);
      if (result.ok) {
        toast.success('✅ Configuración de dashboards guardada');
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetDashboardConfig = async () => {
    if (!confirm('¿Resetear configuración a valores por defecto?')) return;
    
    setSaving(true);
    try {
      const result = await resetDashboardConfig();
      if (result.ok && result.data) {
        setDashboardConfig(result.data);
        toast.success('✅ Configuración reseteada');
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="sb-tabs">
        <button
          onClick={() => setTab('config')}
          className="sb-tab"
          aria-selected={tab === 'config'}
        >
          ⚙️ Configuración
        </button>
        <button
          onClick={() => setTab('rules')}
          className="sb-tab"
          aria-selected={tab === 'rules'}
        >
          📋 Reglas ({rules.filter(r => r.enabled).length}/{rules.length})
        </button>
        <button
          onClick={() => setTab('campaigns')}
          className="sb-tab"
          aria-selected={tab === 'campaigns'}
        >
          🚀 Campañas
        </button>
        <button
          onClick={() => setTab('dashboards')}
          className="sb-tab"
          aria-selected={tab === 'dashboards'}
        >
          📊 Dashboards
        </button>
        <button
          onClick={() => setTab('monitor')}
          className="sb-tab"
          aria-selected={tab === 'monitor'}
        >
          🔍 Monitoreo
        </button>
      </div>
      
      {/* Content */}
      {tab === 'config' && (
        <div className="space-y-6">
          <div className="sb-card">
            <h3 className="text-lg font-semibold mb-4">🕐 Horarios</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Resumen matutino
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.schedules.dailyMorningHour}
                  onChange={(e) => setConfig({
                    ...config,
                    schedules: {
                      ...config.schedules,
                      dailyMorningHour: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config.schedules.dailyMorningHour}:00
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cierre del día
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.schedules.dailyEveningHour}
                  onChange={(e) => setConfig({
                    ...config,
                    schedules: {
                      ...config.schedules,
                      dailyEveningHour: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config.schedules.dailyEveningHour}:00
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Follow-up visitas (horas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={config.schedules.visitFollowupHours}
                  onChange={(e) => setConfig({
                    ...config,
                    schedules: {
                      ...config.schedules,
                      visitFollowupHours: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  +{config.schedules.visitFollowupHours}h post-visita
                </p>
              </div>
            </div>
          </div>
          
          <div className="sb-card">
            <h3 className="text-lg font-semibold mb-4">📏 Umbrales (días)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  No-touch 30 días
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.thresholds.noTouchDays30}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: {
                      ...config.thresholds,
                      noTouchDays30: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  No-touch 60 días
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.thresholds.noTouchDays60}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: {
                      ...config.thresholds,
                      noTouchDays60: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sin pedido 45 días
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.thresholds.noOrderDays45}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: {
                      ...config.thresholds,
                      noOrderDays45: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sin pedido 90 días
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.thresholds.noOrderDays90}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: {
                      ...config.thresholds,
                      noOrderDays90: parseInt(e.target.value),
                    },
                  })}
                  className="sb-input"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="sb-btn sb-btn--primary"
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      )}
      
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rules.filter(r => r.enabled).length} reglas activas de {rules.length} totales
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSimulateRules}
                disabled={simulating}
                className="sb-btn sb-btn--ghost"
              >
                {simulating ? 'Simulando...' : '🧪 Simular'}
              </button>
              <button
                onClick={handleExecuteRules}
                disabled={saving}
                className="sb-btn sb-btn--primary"
              >
                {saving ? 'Ejecutando...' : '▶️ Ejecutar Ahora'}
              </button>
            </div>
          </div>
          
          {simulationResult && (
            <div className="sb-card" style={{ backgroundColor: 'hsl(var(--info) / 0.1)', borderColor: 'hsl(var(--info) / 0.3)' }}>
              <h4 className="font-semibold mb-2">📊 Resultado de Simulación</h4>
              <p className="text-sm">{simulationResult.preview}</p>
              {simulationResult.totalActions > 0 && (
                <div className="mt-2 text-xs">
                  <p className="font-medium">Por usuario:</p>
                  <ul className="list-disc list-inside">
                    {Object.entries(simulationResult.byUser).map(([userId, count]) => (
                      <li key={userId}>
                        {userId}: {count} tareas
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="sb-card flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{rule.name}</h4>
                    <span className={
                      rule.severity === 'CRIT' ? 'sb-badge sb-badge--destructive' :
                      rule.severity === 'WARN' ? 'sb-badge' :
                      'sb-badge sb-badge--primary'
                    }>
                      {rule.severity}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {rule.description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Scope: {rule.scope}</span>
                    <span>Dedupe: {rule.dedupeHours}h</span>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {tab === 'campaigns' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">🚀 Campañas Activas</h2>
              <p className="text-sm text-muted-foreground">
                {campaigns.filter(c => c.status === 'ACTIVE').length} en curso, {campaigns.length} totales
              </p>
            </div>
            <button 
              className="sb-btn sb-btn--primary"
              onClick={() => setShowCreateDialog(true)}
            >
              + Nueva Campaña
            </button>
          </div>
          
          {/* Campaign Cards */}
          {loadingCampaigns ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground mt-2">Cargando campañas...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="sb-card text-center py-12">
              <span className="text-4xl mb-3 block">🚀</span>
              <h3 className="font-semibold mb-2">No hay campañas activas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera campaña para lanzar productos o eventos
              </p>
              <button 
                className="sb-btn sb-btn--primary"
                onClick={() => setShowCreateDialog(true)}
              >
                + Crear Primera Campaña
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <CampaignCard 
                  key={campaign.id} 
                  campaign={campaign}
                  onUpdate={loadCampaigns}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {tab === 'dashboards' && (
        <div className="space-y-6">
          <div className="sb-card bg-info/5 border-info/20">
            <p className="text-sm">
              ⚙️ Configuración centralizada de umbrales y objetivos para todos los dashboards.
              Los cambios aquí afectan a todos los KPIs, alertas y fórmulas del sistema.
            </p>
          </div>
          
          {/* Thresholds */}
          <div className="sb-card">
            <h3 className="text-lg font-semibold mb-4">🎯 Umbrales de Alerta</h3>
            
            <div className="space-y-6">
              {/* Stock */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">📦 Stock</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Stock Crítico (unidades)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.STOCK_CRITICAL}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, STOCK_CRITICAL: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Stock Bajo (unidades)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.STOCK_LOW}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, STOCK_LOW: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cobertura Mínima (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.STOCK_COVERAGE_MIN}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, STOCK_COVERAGE_MIN: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cobertura Óptima (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.STOCK_COVERAGE_OPTIMAL}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, STOCK_COVERAGE_OPTIMAL: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Cuentas */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏪 Cuentas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cuenta Inactiva (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.ACCOUNT_INACTIVE_DAYS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, ACCOUNT_INACTIVE_DAYS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cuenta Crítica (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.ACCOUNT_CRITICAL_DAYS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, ACCOUNT_CRITICAL_DAYS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Ventas */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💰 Ventas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Conversión Mínima (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.CONVERSION_MIN}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, CONVERSION_MIN: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Conversión Óptima (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.CONVERSION_OPTIMAL}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, CONVERSION_OPTIMAL: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Objetivo Mensual Mín. (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dashboardConfig.thresholds.MONTHLY_TARGET_MIN}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, MONTHLY_TARGET_MIN: parseFloat(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Producción */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏭 Producción</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">OEE Mínimo (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.OEE_MIN}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, OEE_MIN: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">OEE Óptimo (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.OEE_OPTIMAL}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, OEE_OPTIMAL: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">QC Max Pending (horas)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.QC_PENDING_MAX_HOURS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, QC_PENDING_MAX_HOURS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Finanzas */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💵 Finanzas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Factura Vencida (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.thresholds.INVOICE_OVERDUE_DAYS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, INVOICE_OVERDUE_DAYS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Uso Crédito Warning (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dashboardConfig.thresholds.CREDIT_USAGE_WARNING * 100}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, CREDIT_USAGE_WARNING: parseFloat(e.target.value) / 100 }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Uso Crédito Crítico (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dashboardConfig.thresholds.CREDIT_USAGE_CRITICAL * 100}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        thresholds: { ...dashboardConfig.thresholds, CREDIT_USAGE_CRITICAL: parseFloat(e.target.value) / 100 }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Targets */}
          <div className="sb-card">
            <h3 className="text-lg font-semibold mb-4">🎯 Objetivos por Defecto</h3>
            
            <div className="space-y-6">
              {/* Ventas */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💰 Ventas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ventas Mensuales (€)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.MONTHLY_SALES}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, MONTHLY_SALES: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Visitas Diarias</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.DAILY_VISITS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, DAILY_VISITS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pedidos Mensuales</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.MONTHLY_ORDERS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, MONTHLY_ORDERS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Producción */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏭 Producción</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">OEE Target (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.OEE_TARGET}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, OEE_TARGET: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tasa Rechazo Max (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.REJECT_RATE_MAX}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, REJECT_RATE_MAX: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Órdenes Diarias</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.DAILY_PRODUCTION_ORDERS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, DAILY_PRODUCTION_ORDERS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Logística */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🚚 Logística</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">OTIF Target (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.OTIF_TARGET}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, OTIF_TARGET: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tiempo Entrega (días)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.DELIVERY_TIME_DAYS}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, DELIVERY_TIME_DAYS: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Finanzas */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💵 Finanzas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tasa Cobro (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.COLLECTION_RATE}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, COLLECTION_RATE: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mora Máxima (%)</label>
                    <input
                      type="number"
                      value={dashboardConfig.targets.OVERDUE_MAX}
                      onChange={(e) => setDashboardConfig({
                        ...dashboardConfig,
                        targets: { ...dashboardConfig.targets, OVERDUE_MAX: parseInt(e.target.value) }
                      })}
                      className="sb-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveDashboardConfig}
              disabled={saving}
              className="sb-btn sb-btn--primary flex-1"
            >
              {saving ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
            <button
              onClick={handleResetDashboardConfig}
              disabled={saving}
              className="sb-btn sb-btn--ghost"
            >
              🔄 Resetear a Valores por Defecto
            </button>
          </div>
        </div>
      )}
      
      {tab === 'monitor' && (
        <MonitoringPanel rules={rules} campaigns={campaigns} />
      )}
      
      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          loadCampaigns();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
