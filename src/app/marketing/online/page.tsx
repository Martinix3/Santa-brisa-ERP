
"use client";
import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, DataTableSB, Col, SB_COLORS, Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { OnlineCampaign } from '@/domain/ssot';
import { saveCollection } from '@/features/agenda/components/CalendarPageContent';
import { Plus } from 'lucide-react';

function StatusPill({ status }: { status: 'planned' | 'active' | 'closed' | 'cancelled' }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800 animate-pulse',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

const formatCurrency = (num?: number) => num?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) || 'N/A';
const formatNumber = (num?: number) => num?.toLocaleString('es-ES') || 'N/A';

function NewCampaignDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (campaign: Omit<OnlineCampaign, 'id' | 'status' | 'spend'>) => void; }) {
    const [title, setTitle] = useState('');
    const [channel, setChannel] = useState<'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other'>('IG');
    const [budget, setBudget] = useState(0);
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !budget || !startAt) {
            alert('Por favor, completa el título, presupuesto y fecha de inicio.');
            return;
        }
        onSave({ title, channel, budget, startAt, endAt: endAt || undefined });
        onClose();
        // Reset form
        setTitle('');
        setChannel('IG');
        setBudget(0);
        setStartAt('');
        setEndAt('');
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">Nueva Campaña Online</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <Input value={title} onChange={(e:any) => setTitle(e.target.value)} placeholder="Título de la Campaña" required />
                    <div className="grid grid-cols-2 gap-4">
                        <Select value={channel} onChange={(e:any) => setChannel(e.target.value)}>
                            <option value="IG">Instagram</option>
                            <option value="FB">Facebook</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Google">Google</option>
                            <option value="YouTube">YouTube</option>
                            <option value="Email">Email</option>
                            <option value="Other">Otro</option>
                        </Select>
                        <Input type="number" value={budget || ''} onChange={(e:any) => setBudget(Number(e.target.value))} placeholder="Presupuesto (€)" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input type="date" value={startAt} onChange={(e:any) => setStartAt(e.target.value)} required />
                        <Input type="date" value={endAt} onChange={(e:any) => setEndAt(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
                        <SBButton type="submit">Crear Campaña</SBButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function OnlineCampaignsPage(){
  const { data: santaData, setData, isPersistenceEnabled } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const campaigns = useMemo(() => santaData?.onlineCampaigns || [], [santaData]);

  const handleCreateCampaign = async (campaignData: Omit<OnlineCampaign, 'id' | 'status' | 'spend'>) => {
    if (!santaData) return;

    const newCampaign: OnlineCampaign = {
        id: `online_${Date.now()}`,
        status: 'planned',
        spend: 0,
        ...campaignData,
    };
    
    const updatedCampaigns = [...campaigns, newCampaign];
    setData(prevData => prevData ? { ...prevData, onlineCampaigns: updatedCampaigns } : null);

    if (isPersistenceEnabled) {
        await saveCollection('onlineCampaigns', updatedCampaigns, isPersistenceEnabled);
    }
  };

  const cols: Col<OnlineCampaign>[] = [
    { key: 'title', header: 'Campaña', render: r => <div className="font-semibold">{r.title}</div> },
    { key: 'channel', header: 'Canal', render: r => r.channel },
    { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
    { key: 'budget', header: 'Presupuesto', className: "justify-end", render: r => formatCurrency(r.budget) },
    { key: 'spend', header: 'Gasto', className: "justify-end", render: r => formatCurrency(r.spend) },
    { key: 'impressions', header: 'Impresiones', className: "justify-end", render: r => formatNumber(r.metrics?.impressions) },
    { key: 'clicks', header: 'Clicks', className: "justify-end", render: r => formatNumber(r.metrics?.clicks) },
    { key: 'roas', header: 'ROAS', className: "justify-end font-semibold", render: r => r.metrics?.roas ? `${r.metrics.roas.toFixed(2)}x` : 'N/A' },
  ];

  return (
    <>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Campañas de Publicidad Online</h1>
                <SBButton onClick={() => setIsDialogOpen(true)}>
                    <Plus size={16} className="mr-2"/> Nueva Campaña
                </SBButton>
            </div>
            <SBCard title="Resultados de Campañas Online">
                 <DataTableSB rows={campaigns} cols={cols as any} />
            </SBCard>
        </div>
        <NewCampaignDialog
            open={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSave={handleCreateCampaign}
        />
    </>
  );
}
