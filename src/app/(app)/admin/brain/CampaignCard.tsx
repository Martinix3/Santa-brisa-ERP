'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { Campaign } from '@/domain/campaigns';
import { 
  calculateProgress, 
  calculatePercentage, 
  daysRemaining, 
  formatDate,
  getCampaignIcon,
  getStatusColor 
} from '@/domain/campaigns';
import { updateCampaignStatus } from '@/server/actions/campaigns.actions';
import { toast } from 'sonner';

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate?: () => void;
}

export function CampaignCard({ campaign, onUpdate }: CampaignCardProps) {
  const handlePause = async () => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const result = await updateCampaignStatus(campaign.id, newStatus);
    
    if (result.ok) {
      toast.success(newStatus === 'ACTIVE' ? '▶️ Campaña reanudada' : '⏸️ Campaña pausada');
      onUpdate?.();
    } else {
      toast.error('Error: ' + result.message);
    }
  };
  
  const days = daysRemaining(campaign.endDate);
  const isExpired = days < 0;
  const isNearEnd = days <= 3 && days >= 0;
  
  return (
    <div className="sb-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{getCampaignIcon(campaign.type)}</span>
            <h3 className="font-semibold">{campaign.name}</h3>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        <span className={`sb-badge ${getStatusColor(campaign.status)}`}>
          {campaign.status}
        </span>
      </div>
      
      {/* Timeline */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span>📅 {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}</span>
        <span>•</span>
        {isExpired ? (
          <span className="text-destructive font-medium">Expirada</span>
        ) : isNearEnd ? (
          <span className="text-warning font-medium">{days} días restantes</span>
        ) : (
          <span>{days} días restantes</span>
        )}
      </div>
      
      {/* Progress Bars */}
      <div className="space-y-2 mb-3">
        {campaign.goals.map((goal) => {
          const current = calculateProgress(campaign, goal.type);
          const percentage = calculatePercentage(campaign, goal.type);
          
          return (
            <div key={goal.type}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{goal.type}</span>
                <span className="font-medium">
                  {current} / {goal.target} {goal.unit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Target Info */}
      {campaign.targetStages && campaign.targetStages.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          <span className="text-xs text-muted-foreground">Stages:</span>
          {campaign.targetStages.map(stage => (
            <span key={stage} className="sb-badge text-xs">
              {stage}
            </span>
          ))}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        <button 
          className="sb-btn sb-btn--sm sb-btn--ghost"
          onClick={() => toast.info('📊 Vista detallada - Próximamente')}
        >
          📊 Ver Detalles
        </button>
        {campaign.status !== 'COMPLETED' && (
          <button 
            className="sb-btn sb-btn--sm sb-btn--ghost"
            onClick={handlePause}
          >
            {campaign.status === 'ACTIVE' ? '⏸️ Pausar' : '▶️ Reanudar'}
          </button>
        )}
      </div>
    </div>
  );
}
