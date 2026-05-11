import { Campaign } from '@/domain/campaigns';
import { CampaignCard } from '../CampaignCard';

interface CampaignsTabProps {
    campaigns: Campaign[];
    loading: boolean;
    onShowCreateDialog: () => void;
    onUpdate: () => void;
}

export function CampaignsTab({ campaigns, loading, onShowCreateDialog, onUpdate }: CampaignsTabProps) {
    return (
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
                    onClick={onShowCreateDialog}
                >
                    + Nueva Campaña
                </button>
            </div>

            {/* Campaign Cards */}
            {loading ? (
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
                        onClick={onShowCreateDialog}
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
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
