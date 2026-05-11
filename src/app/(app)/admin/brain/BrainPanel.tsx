'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

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
import { CreateCampaignDialog } from './CreateCampaignDialog';
import { MonitoringPanel } from './MonitoringPanel';
import { BrainConfigTab } from './components/BrainConfigTab';
import { RulesTab } from './components/RulesTab';
import { CampaignsTab } from './components/CampaignsTab';
import { DashboardsTab } from './components/DashboardsTab';
import { SyncRulesTab } from './components/SyncRulesTab';

interface BrainPanelProps {
  initialConfig: BrainConfig;
  initialRules: BrainRule[];
  initialDashboardConfig: DashboardConfigData;
}

type Tab = 'config' | 'rules' | 'campaigns' | 'monitor' | 'dashboards' | 'sync-rules';

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
        <button
          onClick={() => setTab('sync-rules')}
          className="sb-tab"
          aria-selected={tab === 'sync-rules'}
        >
          🔄 Reglas de Sync
        </button>
      </div>

      {/* Content */}
      {tab === 'config' && (
        <BrainConfigTab
          config={config}
          setConfig={setConfig}
          onSave={handleSaveConfig}
          saving={saving}
        />
      )}

      {tab === 'rules' && (
        <RulesTab
          rules={rules}
          onToggleRule={handleToggleRule}
          onSimulate={handleSimulateRules}
          onExecute={handleExecuteRules}
          simulating={simulating}
          saving={saving}
          simulationResult={simulationResult}
        />
      )}

      {tab === 'campaigns' && (
        <CampaignsTab
          campaigns={campaigns}
          loading={loadingCampaigns}
          onShowCreateDialog={() => setShowCreateDialog(true)}
          onUpdate={loadCampaigns}
        />
      )}

      {tab === 'dashboards' && (
        <DashboardsTab
          config={dashboardConfig}
          setConfig={setDashboardConfig}
          onSave={handleSaveDashboardConfig}
          onReset={handleResetDashboardConfig}
          saving={saving}
        />
      )}

      {tab === 'monitor' && (
        <MonitoringPanel rules={rules} campaigns={campaigns} />
      )}

      {tab === 'sync-rules' && (
        <SyncRulesTab />
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
