/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/admin/brain/page.tsx
import { getBrainConfig, getBrainRules } from '@/server/actions/brain.actions';
import { getDashboardConfig } from '@/server/actions/dashboard-config.actions';
import { BrainPanel } from './BrainPanel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Panel Santa Brain | Admin',
};

export default async function BrainControlPage() {
  const [config, rules, dashboardConfig] = await Promise.all([
    getBrainConfig(),
    getBrainRules(),
    getDashboardConfig(),
  ]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🧠 Panel de Control Santa Brain</h1>
        <p className="text-muted-foreground mt-2">
          Configura relojes, umbrales, reglas, dashboards y campañas sin tocar código
        </p>
      </div>

      <BrainPanel
        initialConfig={config}
        initialRules={rules}
        initialDashboardConfig={dashboardConfig.data}
      />
    </div>
  );
}
