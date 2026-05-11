/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/OrderBadges.tsx
import { ORDER_STATUS_META, type OrderStatus } from '@/domain/ssot';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <span className={`sb-badge ${meta.className}`}>{meta.label}</span>;
}

export function ChannelChip({ channel }: { 
  channel?: 'PRIVATE' | 'DISTRIBUTOR' | 'ONLINE' | 'HORECA' | 'CATERING' 
}) {
  if (!channel) return null;
  
  const channelConfig: Record<string, { label: string; className: string }> = {
    PRIVATE: { label: 'Privada', className: 'sb-chip--warning' },
    DISTRIBUTOR: { label: 'Distribuidor', className: 'sb-chip--success' },
    ONLINE: { label: 'Online', className: 'sb-chip--info' },
    HORECA: { label: 'Horeca', className: 'sb-chip--primary' },
    CATERING: { label: 'Catering', className: 'sb-chip--default' },
  };
  
  const config = channelConfig[channel];
  return <span className={`sb-chip ${config.className}`}>{config.label}</span>;
}

export function SourceChip({ source }: { 
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED' 
}) {
  if (!source) return null;
  
  const sourceConfig: Record<string, { label: string; className: string; icon?: string }> = {
    SHOPIFY: { label: 'Shopify', className: 'sb-chip--success', icon: '🛒' },
    B2B: { label: 'B2B', className: 'sb-chip--primary', icon: '🏢' },
    Direct: { label: 'Directo', className: 'sb-chip--info', icon: '📞' },
    CRM: { label: 'CRM', className: 'sb-chip--warning', icon: '👥' },
    MANUAL: { label: 'Manual', className: 'sb-chip--default', icon: '✏️' },
    HOLDED: { label: 'Holded', className: 'sb-chip--success', icon: '📊' },
  };
  
  const config = sourceConfig[source];
  return (
    <span className={`sb-chip ${config.className}`}>
      {config.icon && <span className="sb-chip__icon">{config.icon}</span>}
      {config.label}
    </span>
  );
}

export function OwnerBadge({ 
  ownerId, 
  ownerName, 
  size = 'sm' 
}: { 
  ownerId?: string; 
  ownerName?: string; 
  size?: 'xs' | 'sm' | 'md' 
}) {
  if (!ownerId && !ownerName) return null;
  
  const displayName = ownerName || ownerId;
  const initials = displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
  
  return (
    <div className={`sb-owner-badge sb-owner-badge--${size}`}>
      <div className="sb-owner-badge__avatar">
        {initials}
      </div>
      <span className="sb-owner-badge__name">{displayName}</span>
    </div>
  );
}

export function FlowBadge({ 
  flow,
  showLabel = true,
  size = 'md'
}: { 
  flow?: 'PLACEMENT' | 'DIRECT';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!flow || flow === 'DIRECT') {
    return (
      <span className="sb-chip sb-chip--info" title="Venta directa al cliente">
        <span className="sb-chip__icon">🎯</span>
        {showLabel && (size === 'sm' ? 'DIR' : 'Venta Directa')}
      </span>
    );
  }
  
  return (
    <span className="sb-chip sb-chip--warning" title="Colocación por comercial">
      <span className="sb-chip__icon">📍</span>
      {showLabel && (size === 'sm' ? 'COL' : 'Colocación')}
    </span>
  );
}
