# 🚀 Santa Brain - Fase 2: Campañas

## 🎯 Objetivos

Sistema de campañas proactivas para:
- Lanzamientos de productos
- Push de SKUs específicos
- Eventos temporales
- Cuotas diarias por rep
- Auto-asignación inteligente

## 📋 Estructura de Datos

### Campaign Type

```typescript
interface Campaign {
  id: string;
  type: 'PRODUCT_LAUNCH' | 'SKU_PUSH' | 'EVENT' | 'QUOTA_SPRINT';
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  
  // Timing
  startDate: Date;
  endDate: Date;
  
  // Target
  targetAccounts?: string[]; // accountIds
  targetStages?: string[];   // ['ACTIVA', 'POTENCIAL']
  targetReps?: string[];     // teamMemberIds
  
  // Goals
  goals: {
    type: 'VISITS' | 'ORDERS' | 'REVENUE' | 'SKU_PLACEMENT';
    target: number;
    unit: 'units' | 'EUR' | 'visits';
    perRep?: boolean;
  }[];
  
  // Actions
  actions: {
    createTasks?: {
      template: string;
      priority: 'low' | 'med' | 'high' | 'critical';
      dueInDays: number;
      assignmentStrategy: 'ACCOUNT_OWNER' | 'ROUND_ROBIN' | 'CUSTOM';
    };
    sendNotification?: {
      channel: 'INAPP' | 'EMAIL';
      message: string;
    };
  };
  
  // Tracking
  progress: {
    repId: string;
    current: number;
    target: number;
  }[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Daily Quota System

```typescript
interface DailyQuota {
  repId: string;
  date: string; // YYYY-MM-DD
  quotas: {
    visits: { target: number; current: number };
    calls: { target: number; current: number };
    orders: { target: number; current: number };
  };
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
  lastUpdated: Date;
}
```

## 🎮 UI Components

### 1. Tab Campañas

```tsx
{tab === 'campaigns' && (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold">🚀 Campañas Activas</h2>
        <p className="text-sm text-muted-foreground">
          {campaigns.filter(c => c.status === 'ACTIVE').length} en curso
        </p>
      </div>
      <button className="sb-btn sb-btn--primary">
        + Nueva Campaña
      </button>
    </div>
    
    {/* Campaign Cards */}
    <div className="space-y-3">
      {campaigns.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  </div>
)}
```

### 2. CampaignCard Component

```tsx
function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <div className="sb-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{campaign.name}</h3>
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        </div>
        <span className={`sb-badge ${
          campaign.status === 'ACTIVE' ? 'sb-badge--success' :
          campaign.status === 'PAUSED' ? 'sb-badge' :
          'sb-badge--primary'
        }`}>
          {campaign.status}
        </span>
      </div>
      
      {/* Timeline */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span>📅 {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}</span>
        <span>•</span>
        <span>{daysRemaining(campaign.endDate)} días restantes</span>
      </div>
      
      {/* Progress */}
      <div className="space-y-2">
        {campaign.goals.map(goal => (
          <div key={goal.type}>
            <div className="flex justify-between text-sm mb-1">
              <span>{goal.type}</span>
              <span className="font-medium">
                {calculateProgress(campaign, goal.type)} / {goal.target} {goal.unit}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary"
                style={{ width: `${calculatePercentage(campaign, goal.type)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button className="sb-btn sb-btn--sm sb-btn--ghost">
          📊 Ver Detalles
        </button>
        <button className="sb-btn sb-btn--sm sb-btn--ghost">
          ⏸️ Pausar
        </button>
      </div>
    </div>
  );
}
```

### 3. Create Campaign Dialog

```tsx
function CreateCampaignDialog() {
  return (
    <div className="sb-dialog">
      <div className="sb-dialog__header">
        <h3 className="sb-dialog__title">Nueva Campaña</h3>
      </div>
      
      <div className="sb-dialog__body space-y-4">
        {/* Campaign Type */}
        <div>
          <label className="sb-label">Tipo de Campaña</label>
          <select className="sb-select">
            <option value="PRODUCT_LAUNCH">🎉 Lanzamiento Producto</option>
            <option value="SKU_PUSH">📦 Push SKU</option>
            <option value="EVENT">🎪 Evento Temporal</option>
            <option value="QUOTA_SPRINT">🎯 Sprint Cuotas</option>
          </select>
        </div>
        
        {/* Name & Description */}
        <div>
          <label className="sb-label">Nombre</label>
          <input type="text" className="sb-input" placeholder="Ej: Lanzamiento Turrón Supremo 2025" />
        </div>
        
        <div>
          <label className="sb-label">Descripción</label>
          <textarea className="sb-textarea" placeholder="Objetivo y detalles..." />
        </div>
        
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="sb-label">Fecha Inicio</label>
            <input type="date" className="sb-input" />
          </div>
          <div>
            <label className="sb-label">Fecha Fin</label>
            <input type="date" className="sb-input" />
          </div>
        </div>
        
        {/* Target Selection */}
        <div>
          <label className="sb-label">Cuentas Objetivo</label>
          <select className="sb-select" multiple>
            <option>Todas las cuentas ACTIVA</option>
            <option>Cuentas con pedido &lt; 30 días</option>
            <option>Cuentas sin SKU específico</option>
            <option>Selección manual...</option>
          </select>
        </div>
        
        {/* Goals */}
        <div>
          <label className="sb-label">Objetivos</label>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select className="sb-select">
                <option>VISITS</option>
                <option>ORDERS</option>
                <option>REVENUE</option>
                <option>SKU_PLACEMENT</option>
              </select>
              <input type="number" className="sb-input" placeholder="Target" />
              <select className="sb-select">
                <option>units</option>
                <option>EUR</option>
                <option>visits</option>
              </select>
            </div>
            <button className="text-xs text-primary">+ Añadir objetivo</button>
          </div>
        </div>
        
        {/* Task Template */}
        <div>
          <label className="sb-label">Template de Tarea</label>
          <input 
            type="text" 
            className="sb-input" 
            placeholder="Ej: Presentar {{product}} a {{account.name}}"
          />
        </div>
      </div>
      
      <div className="sb-dialog__footer">
        <button className="sb-btn sb-btn--ghost">Cancelar</button>
        <button className="sb-btn sb-btn--primary">Crear Campaña</button>
      </div>
    </div>
  );
}
```

## 🔧 Server Actions

### `src/server/actions/campaigns.actions.ts`

```typescript
'use server';

import { adminDb } from '@/server/firebase';
import type { Campaign, DailyQuota } from '@/domain/campaigns';

export async function createCampaign(data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await adminDb.collection('campaigns').add({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return { ok: true, id: docRef.id };
}

export async function getCampaigns(status?: Campaign['status']) {
  const query = status 
    ? adminDb.collection('campaigns').where('status', '==', status)
    : adminDb.collection('campaigns');
  
  const snapshot = await query.get();
  const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return { ok: true, data: campaigns as Campaign[] };
}

export async function updateCampaignProgress(campaignId: string, repId: string, value: number) {
  const campaignRef = adminDb.collection('campaigns').doc(campaignId);
  const campaign = (await campaignRef.get()).data() as Campaign;
  
  const updatedProgress = campaign.progress.map(p => 
    p.repId === repId ? { ...p, current: p.current + value } : p
  );
  
  await campaignRef.update({ progress: updatedProgress, updatedAt: new Date() });
  
  return { ok: true };
}

export async function getDailyQuotas(repId: string, date: string) {
  const doc = await adminDb.collection('dailyQuotas').doc(`${repId}_${date}`).get();
  
  if (!doc.exists) {
    // Crear quotas default
    const defaultQuotas: DailyQuota = {
      repId,
      date,
      quotas: {
        visits: { target: 5, current: 0 },
        calls: { target: 10, current: 0 },
        orders: { target: 3, current: 0 },
      },
      status: 'ON_TRACK',
      lastUpdated: new Date(),
    };
    
    await adminDb.collection('dailyQuotas').doc(`${repId}_${date}`).set(defaultQuotas);
    return { ok: true, data: defaultQuotas };
  }
  
  return { ok: true, data: doc.data() as DailyQuota };
}

export async function incrementQuota(repId: string, date: string, type: keyof DailyQuota['quotas']) {
  const docRef = adminDb.collection('dailyQuotas').doc(`${repId}_${date}`);
  const doc = await docRef.get();
  const data = doc.data() as DailyQuota;
  
  const updated = {
    ...data,
    quotas: {
      ...data.quotas,
      [type]: {
        ...data.quotas[type],
        current: data.quotas[type].current + 1,
      },
    },
    lastUpdated: new Date(),
  };
  
  // Recalcular status
  updated.status = calculateQuotaStatus(updated.quotas);
  
  await docRef.update(updated);
  
  return { ok: true, data: updated };
}

function calculateQuotaStatus(quotas: DailyQuota['quotas']): DailyQuota['status'] {
  const hour = new Date().getHours();
  const expectedProgress = hour / 24; // % del día
  
  const visitsProgress = quotas.visits.current / quotas.visits.target;
  const ordersProgress = quotas.orders.current / quotas.orders.target;
  
  const avgProgress = (visitsProgress + ordersProgress) / 2;
  
  if (avgProgress >= expectedProgress * 0.8) return 'ON_TRACK';
  if (avgProgress >= expectedProgress * 0.5) return 'AT_RISK';
  return 'BEHIND';
}
```

## 📊 Monitoring Dashboard

### Daily Quotas Widget

```tsx
function DailyQuotasWidget({ repId }: { repId: string }) {
  const [quotas, setQuotas] = useState<DailyQuota | null>(null);
  
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    getDailyQuotas(repId, today).then(res => setQuotas(res.data));
  }, [repId]);
  
  if (!quotas) return <div>Cargando...</div>;
  
  return (
    <div className="sb-card">
      <h3 className="font-semibold mb-3">📊 Cuotas de Hoy</h3>
      
      <div className="space-y-3">
        {Object.entries(quotas.quotas).map(([key, quota]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize">{key}</span>
              <span className="font-medium">
                {quota.current} / {quota.target}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary"
                style={{ width: `${(quota.current / quota.target) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-3 text-xs font-medium ${
        quotas.status === 'ON_TRACK' ? 'text-success' :
        quotas.status === 'AT_RISK' ? 'text-warning' :
        'text-destructive'
      }`}>
        {quotas.status === 'ON_TRACK' ? '✅ En objetivo' :
         quotas.status === 'AT_RISK' ? '⚠️ En riesgo' :
         '🔴 Detrás del objetivo'}
      </div>
    </div>
  );
}
```

## 🎯 Integration Points

### 1. Auto-increment on Actions

Cuando se crea una visita/pedido, incrementar quotas automáticamente:

```typescript
// En create-visit.action.ts
await incrementQuota(userId, today, 'visits');

// En create-order.action.ts
await incrementQuota(userId, today, 'orders');
```

### 2. Campaign Task Creation

Al activar una campaña, crear tasks para todas las cuentas objetivo:

```typescript
async function activateCampaign(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  const accounts = await getTargetAccounts(campaign);
  
  for (const account of accounts) {
    await createTask({
      title: renderTemplate(campaign.actions.createTasks.template, { account }),
      accountId: account.id,
      assignedTo: getAssignment(campaign, account),
      priority: campaign.actions.createTasks.priority,
      dueDate: addDays(new Date(), campaign.actions.createTasks.dueInDays),
      origin: 'campaign',
      metadata: { campaignId },
    });
  }
}
```

## 📅 Roadmap

### Sprint 1 (2-3 días)
- [ ] Types Campaign y DailyQuota
- [ ] Server actions básicas
- [ ] UI Tab Campañas (lista)
- [ ] CampaignCard component

### Sprint 2 (2-3 días)
- [ ] CreateCampaignDialog
- [ ] Lógica de activación
- [ ] Progress tracking
- [ ] Daily quotas widget

### Sprint 3 (1-2 días)
- [ ] Auto-increment integration
- [ ] Campaign detail view
- [ ] Pause/Resume functionality
- [ ] Testing & polish

## 🔗 Referencias

- Panel Brain: `docs/SANTA_BRAIN_PANEL.md`
- Types: `src/domain/brain.ts` → extender a `campaigns.ts`
- UI System: `src/styles/components.css`
