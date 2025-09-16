
// app/cashflow/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import type { CashflowSettings } from '@/domain/ssot';
import { SBCard, SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { Save } from 'lucide-react';

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
  termsByChannel: { sell_in: 45, sell_out: 30, direct: 2, online: 2 },
  lagByPaymentMethod: { tarjeta: 2, transferencia: 3, domiciliado: 5, paypal: 2, contado: 0 },
};

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 items-center gap-4">
            <label className="text-sm font-medium text-zinc-700 col-span-1">{label}</label>
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
          const r = await fetch('/api/cashflow/settings'); 
          if (r.ok){ 
              const data = await r.json();
              if (data) setS(prev => ({...prev, ...data}));
          } 
      } catch {}
    })();
  }, []);

  const apply = async () => {
    setSaving(true);
    await fetch('/api/cashflow/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s) });
    await fetch('/api/cashflow/recompute', { method:'POST' });
    setSaving(false);
  };

  const set = <K extends keyof CashflowSettings>(k:K, v:CashflowSettings[K]) => setS(prev => ({ ...prev, [k]: v }));
  const setLag = (method: keyof NonNullable<CashflowSettings['lagByPaymentMethod']>, value: string) => {
      setS(prev => ({ ...prev, lagByPaymentMethod: { ...(prev.lagByPaymentMethod || {}), [method]: Number(value) } }));
  }
  const setTerms = (channel: keyof NonNullable<CashflowSettings['termsByChannel']>, value: string) => {
      setS(prev => ({ ...prev, termsByChannel: { ...(prev.termsByChannel || {}), [channel]: Number(value) } }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Ajustes de Tesorería</h1>
        <SBButton onClick={apply} disabled={saving}>
          <Save size={16}/> {saving ? 'Guardando...' : 'Guardar y Recalcular'}
        </SBButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SBCard title="Configuración General">
            <div className="p-4 space-y-4">
                <SettingRow label="Saldo Inicial (€)">
                    <Input type="number" value={s.openingBalance} onChange={e => set('openingBalance', Number(e.target.value))} />
                </SettingRow>
                <SettingRow label="Agrupación (Bucket)">
                    <Select value={s.bucket} onChange={e => set('bucket', e.target.value as CashflowSettings['bucket'])}>
                      <option value="day">Día</option>
                      <option value="week">Semana</option>
                      <option value="month">Mes</option>
                    </Select>
                </SettingRow>
                 <SettingRow label="Niveles de Confianza">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.includeConfidence.high} onChange={e => set('includeConfidence', { ...s.includeConfidence, high: e.target.checked })}/><span>Alta</span></label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.includeConfidence.medium} onChange={e => set('includeConfidence', { ...s.includeConfidence, medium: e.target.checked })}/><span>Media</span></label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.includeConfidence.low} onChange={e => set('includeConfidence', { ...s.includeConfidence, low: e.target.checked })}/><span>Baja</span></label>
                    </div>
                </SettingRow>
            </div>
        </SBCard>
        
        <SBCard title="IVA y Comisiones">
            <div className="p-4 space-y-4">
                <SettingRow label="Modo IVA">
                     <Select value={s.vatMode} onChange={e => set('vatMode', e.target.value as CashflowSettings['vatMode'])}>
                      <option value="gross">Bruto (con IVA)</option>
                      <option value="net">Neto (sin IVA)</option>
                    </Select>
                </SettingRow>
                <SettingRow label="Día Liquidación IVA">
                    <Input type="number" value={s.vatSettlementDay ?? 20} onChange={e => set('vatSettlementDay', Number(e.target.value) as 20 | undefined)}/>
                </SettingRow>
                 <SettingRow label="Fee Payout Online (%)">
                    <Input type="number" step="0.01" value={s.payoutFeePctOnline ?? 0.02} onChange={e => set('payoutFeePctOnline', Number(e.target.value))}/>
                </SettingRow>
            </div>
        </SBCard>

        <SBCard title="Términos de Pago por Canal">
            <div className="p-4 space-y-4">
                <SettingRow label="Términos por Defecto (días)">
                    <Input type="number" value={s.defaultTermsDays} onChange={e => set('defaultTermsDays', Number(e.target.value))} />
                </SettingRow>
                {(['sell_in', 'sell_out', 'direct', 'online'] as const).map(ch => (
                     <SettingRow key={ch} label={`Días ${ch}`}>
                        <Input type="number" value={s.termsByChannel?.[ch] ?? s.defaultTermsDays} onChange={e => setTerms(ch, e.target.value)} />
                    </SettingRow>
                ))}
            </div>
        </SBCard>

        <SBCard title="Lag por Método de Pago">
            <div className="p-4 space-y-4">
                {(['contado','tarjeta','paypal','transferencia','domiciliado'] as const).map(pm => (
                    <SettingRow key={pm} label={`Lag ${pm} (días)`}>
                         <Input type="number" value={s.lagByPaymentMethod?.[pm] ?? 0} onChange={e => setLag(pm, e.target.value)} />
                    </SettingRow>
                ))}
            </div>
        </SBCard>
      </div>
    </div>
  );
}
