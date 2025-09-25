
// app/cashflow/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import type { AccountType, SB_THEME } from '@/domain/ssot';
import { SBCard, SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { Save } from 'lucide-react';

export interface CashflowSettings {
    currency: 'EUR';
    openingBalance: number;
    defaultTermsDays: number;
    includeConfidence: { high: boolean; medium: boolean; low: boolean; };
    vatMode: 'gross' | 'net';
    vatSettlementDay?: 20;
    payoutFeePctOnline?: number;
    bankFeePct?: number;
    bucket?: 'day' | 'week' | 'month';
    termsByChannel?: Partial<Record<AccountType, number>>;
    lagByPaymentMethod?: Partial<Record<'tarjeta' | 'transferencia' | 'domiciliado' | 'paypal' | 'contado', number>>;
}

const DEFAULTS: CashflowSettings = {
  currency: 'EUR',
  openingBalance: 25000,
  defaultTermsDays: 30,
  includeConfidence: { high: true, medium: true, low: false },
  vatMode: 'gross',
  vatSettlementDay: 20,
  payoutFeePctOnline: 0.02,
  bankFeePct: 0.001,
  bucket: 'week',
  termsByChannel: { HORECA: 30, RETAIL: 30, ONLINE: 2 },
  lagByPaymentMethod: { tarjeta: 2, transferencia: 3, domiciliado: 5, paypal: 2, contado: 0 },
};

function SettingRow({ label, children, htmlFor }: { label: string; children: React.ReactNode, htmlFor?: string }) {
    return (
        <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 col-span-1">{label}</label>
            <div className="col-span-2">
                {children}
            </div>
        </div>
    );
}

export default function CashflowSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<CashflowSettings>(DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/cashflow/settings');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setS((prev: CashflowSettings) => ({...prev, ...data}));
          }
        } else {
            console.warn("Received non-JSON response from settings API");
        }
      } catch (error) {
        console.error("Failed to load cashflow settings:", error);
      }
    })();
  }, []);

  const apply = async () => {
    setSaving(true);
    await fetch('/api/cashflow/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s) });
    await fetch('/api/cashflow/recompute', { method:'POST' });
    setSaving(false);
  };

  const set = <K extends keyof CashflowSettings>(k:K, v:CashflowSettings[K]) => setS((prev: CashflowSettings) => ({ ...prev, [k]: v }));
  const setLag = (method: keyof NonNullable<CashflowSettings['lagByPaymentMethod']>, value: string) => {
      setS((prev: CashflowSettings) => ({ ...prev, lagByPaymentMethod: { ...(prev.lagByPaymentMethod || {}), [method]: Number(value) } }));
  }
  const setTerms = (channel: AccountType, value: string) => {
      setS((prev: CashflowSettings) => ({ ...prev, termsByChannel: { ...(prev.termsByChannel || {}), [channel]: Number(value) } }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Ajustes de Tesorería</h1>
        <SBButton onClick={apply} disabled={saving}>
          <Save size={16} className="sb-icon"/> {saving ? 'Guardando...' : 'Guardar y Recalcular'}
        </SBButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SBCard title="Configuración General">
            <div className="p-4 space-y-4">
                <SettingRow label="Saldo Inicial (€)" htmlFor="openingBalance">
                    <Input id="openingBalance" name="openingBalance" type="number" value={s.openingBalance} onChange={e => set('openingBalance', Number(e.target.value))} />
                </SettingRow>
                <SettingRow label="Agrupación (Bucket)" htmlFor="bucket">
                    <Select id="bucket" name="bucket" value={s.bucket} onChange={e => set('bucket', e.target.value as CashflowSettings['bucket'])}>
                      <option value="day">Día</option>
                      <option value="week">Semana</option>
                      <option value="month">Mes</option>
                    </Select>
                </SettingRow>
                 <SettingRow label="Niveles de Confianza">
                    <div className="flex items-center gap-4">
                        <label htmlFor="confidenceHigh" className="flex items-center gap-2 text-sm"><input id="confidenceHigh" type="checkbox" checked={s.includeConfidence.high} onChange={e => set('includeConfidence', { ...s.includeConfidence, high: e.target.checked })}/><span>Alta</span></label>
                        <label htmlFor="confidenceMedium" className="flex items-center gap-2 text-sm"><input id="confidenceMedium" type="checkbox" checked={s.includeConfidence.medium} onChange={e => set('includeConfidence', { ...s.includeConfidence, medium: e.target.checked })}/><span>Media</span></label>
                        <label htmlFor="confidenceLow" className="flex items-center gap-2 text-sm"><input id="confidenceLow" type="checkbox" checked={s.includeConfidence.low} onChange={e => set('includeConfidence', { ...s.includeConfidence, low: e.target.checked })}/><span>Baja</span></label>
                    </div>
                </SettingRow>
            </div>
        </SBCard>
        
        <SBCard title="IVA y Comisiones">
            <div className="p-4 space-y-4">
                <SettingRow label="Modo IVA" htmlFor="vatMode">
                     <Select id="vatMode" name="vatMode" value={s.vatMode} onChange={e => set('vatMode', e.target.value as CashflowSettings['vatMode'])}>
                      <option value="gross">Bruto (con IVA)</option>
                      <option value="net">Neto (sin IVA)</option>
                    </Select>
                </SettingRow>
                <SettingRow label="Día Liquidación IVA" htmlFor="vatSettlementDay">
                    <Input id="vatSettlementDay" name="vatSettlementDay" type="number" value={s.vatSettlementDay ?? 20} onChange={e => set('vatSettlementDay', Number(e.target.value) as 20 | undefined)}/>
                </SettingRow>
                 <SettingRow label="Fee Payout Online (%)" htmlFor="payoutFee">
                    <Input id="payoutFee" name="payoutFee" type="number" step="0.01" value={s.payoutFeePctOnline ?? 0.02} onChange={e => set('payoutFeePctOnline', Number(e.target.value))}/>
                </SettingRow>
            </div>
        </SBCard>

        <SBCard title="Términos de Pago por Tipo de Cuenta">
            <div className="p-4 space-y-4">
                <SettingRow label="Términos por Defecto (días)" htmlFor="defaultTerms">
                    <Input id="defaultTerms" name="defaultTerms" type="number" value={s.defaultTermsDays} onChange={e => set('defaultTermsDays', Number(e.target.value))} />
                </SettingRow>
                {(['HORECA', 'RETAIL', 'ONLINE'] as const).map(ch => (
                     <SettingRow key={ch} label={`Días ${ch}`} htmlFor={`terms-${ch}`}>
                        <Input id={`terms-${ch}`} name={`terms-${ch}`} type="number" value={s.termsByChannel?.[ch] ?? s.defaultTermsDays} onChange={e => setTerms(ch as AccountType, e.target.value)} />
                    </SettingRow>
                ))}
            </div>
        </SBCard>

        <SBCard title="Lag por Método de Pago">
            <div className="p-4 space-y-4">
                {(['contado','tarjeta','paypal','transferencia','domiciliado'] as const).map(pm => (
                    <SettingRow key={pm} label={`Lag ${pm} (días)`} htmlFor={`lag-${pm}`}>
                         <Input id={`lag-${pm}`} name={`lag-${pm}`} type="number" value={s.lagByPaymentMethod?.[pm] ?? 0} onChange={e => setLag(pm, e.target.value)} />
                    </SettingRow>
                ))}
            </div>
        </SBCard>
      </div>
    </div>
  );
}
