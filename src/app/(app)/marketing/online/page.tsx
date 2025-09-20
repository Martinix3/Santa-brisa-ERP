
"use client";
import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, Input, Select } from '@/components/ui/ui-primitives';
import type { OnlineCampaign } from '@/domain/ssot';
import { Plus, Edit, Save, X, Trash2 } from 'lucide-react';

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

function CampaignRow({ campaign, onUpdate }: { campaign: OnlineCampaign; onUpdate: (updatedCampaign: OnlineCampaign) => void; }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCampaign, setEditedCampaign] = useState(campaign);

    const handleSave = () => {
        onUpdate(editedCampaign);
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setEditedCampaign(campaign);
        setIsEditing(false);
    };

    const handleChange = (field: keyof OnlineCampaign, value: any) => {
        setEditedCampaign(prev => ({...prev, [field]: value}));
    }
    
    const handleMetricsChange = (field: string, value: any) => {
        setEditedCampaign(prev => ({ ...prev, metrics: { ...(prev.metrics || {}), [field]: value } as OnlineCampaign['metrics'] }));
    }

    if (isEditing) {
        return (
            <tr className="bg-yellow-50/50">
                <td className="px-2 py-2"><Input value={editedCampaign.title} onChange={e => handleChange('title', e.target.value)} /></td>
                <td className="px-2 py-2">
                    <Select value={editedCampaign.channel} onChange={e => handleChange('channel', e.target.value)}>
                        <option value="IG">Instagram</option><option value="FB">Facebook</option><option value="TikTok">TikTok</option><option value="Google">Google</option>
                        <option value="YouTube">YouTube</option><option value="Email">Email</option><option value="Other">Otro</option>
                    </Select>
                </td>
                <td className="px-2 py-2">
                    <Select value={editedCampaign.status} onChange={e => handleChange('status', e.target.value)}>
                        <option value="planned">Planned</option><option value="active">Active</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
                    </Select>
                </td>
                <td className="px-2 py-2"><Input type="number" value={editedCampaign.budget} onChange={e => handleChange('budget', Number(e.target.value))} /></td>
                <td className="px-2 py-2"><Input type="number" value={editedCampaign.spend} onChange={e => handleChange('spend', Number(e.target.value))} /></td>
                <td className="px-2 py-2"><Input type="number" value={editedCampaign.metrics?.impressions || ''} onChange={e => handleMetricsChange('impressions', Number(e.target.value))} /></td>
                <td className="px-2 py-2"><Input type="number" value={editedCampaign.metrics?.clicks || ''} onChange={e => handleMetricsChange('clicks', Number(e.target.value))} /></td>
                <td className="px-2 py-2"><Input type="number" value={editedCampaign.metrics?.roas || ''} onChange={e => handleMetricsChange('roas', Number(e.target.value))} /></td>
                <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                        <SBButton size="sm" onClick={handleSave}><Save size={14}/></SBButton>
                        <SBButton size="sm" variant="secondary" onClick={handleCancel}><X size={14}/></SBButton>
                    </div>
                </td>
            </tr>
        )
    }

    return (
        <tr className="hover:bg-zinc-50/50">
            <td className="p-3 font-semibold">{campaign.title}</td>
            <td className="p-3">{campaign.channel}</td>
            <td className="p-3"><StatusPill status={campaign.status} /></td>
            <td className="p-3 text-right">{formatCurrency(campaign.budget)}</td>
            <td className="p-3 text-right">{formatCurrency(campaign.spend)}</td>
            <td className="p-3 text-right">{formatNumber(campaign.metrics?.impressions)}</td>
            <td className="p-3 text-right">{formatNumber(campaign.metrics?.clicks)}</td>
            <td className="p-3 text-right font-semibold">{campaign.metrics?.roas ? `${campaign.metrics.roas.toFixed(2)}x` : 'N/A'}</td>
            <td className="p-3 text-center">
                 <SBButton size="sm" variant="ghost" onClick={() => setIsEditing(true)}><Edit size={14} /></SBButton>
            </td>
        </tr>
    );
}

export default function OnlineCampaignsPage(){
  const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
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
        await saveCollection('onlineCampaigns', updatedCampaigns);
    }
  };

  const handleUpdateCampaign = async (updatedCampaign: OnlineCampaign) => {
    if (!santaData) return;

    const updatedCampaigns = campaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c);
    setData(prevData => prevData ? { ...prevData, onlineCampaigns: updatedCampaigns } : null);

    if (isPersistenceEnabled) {
        await saveCollection('onlineCampaigns', updatedCampaigns);
    }
  }

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
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-zinc-50">
                            <tr>
                                <th className="p-3 font-semibold text-zinc-600">Campaña</th>
                                <th className="p-3 font-semibold text-zinc-600">Canal</th>
                                <th className="p-3 font-semibold text-zinc-600">Estado</th>
                                <th className="p-3 font-semibold text-zinc-600 text-right">Presupuesto</th>
                                <th className="p-3 font-semibold text-zinc-600 text-right">Gasto</th>
                                <th className="p-3 font-semibold text-zinc-600 text-right">Impresiones</th>
                                <th className="p-3 font-semibold text-zinc-600 text-right">Clicks</th>
                                <th className="p-3 font-semibold text-zinc-600 text-right">ROAS</th>
                                <th className="p-3 font-semibold text-zinc-600 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {campaigns.map(c => <CampaignRow key={c.id} campaign={c} onUpdate={handleUpdateCampaign} />)}
                        </tbody>
                    </table>
                 </div>
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

    
