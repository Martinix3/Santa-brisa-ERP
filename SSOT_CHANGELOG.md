# 📋 CHANGELOG - Ampliación SSOT v5.1

**Fecha:** 10 de Mayo de 2025  
**Sprint:** 2.5 - Validación y Ampliación SSOT

---

## 🎯 Resumen

Se han añadido 3 nuevas entidades y ampliado 3 entidades existentes para soportar todos los KPIs del informe de inversores (septiembre 2025) y futuras integraciones con plataformas digitales.

---

## ✨ Nuevas Entidades

### 1. `SocialMetrics`
**Propósito:** Tracking de métricas de redes sociales (Instagram, TikTok, YouTube, Facebook)

**Campos:**
```typescript
{
  id: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook';
  date: ISODateString;
  followers: number;
  newFollowers: number;
  posts: number;
  reels?: number;
  stories?: number;
  views: number;
  engagement: number;
  reach?: number;
  collaborations: number;
  adSpend?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Uso en Dashboards:**
- Dashboard Marketing → KPIs Online → Instagram/TikTok/YouTube

**Colección Firestore:** `socialMetrics`

---

### 2. `WebAnalytics`
**Propósito:** Métricas de tráfico web y conversión e-commerce

**Campos:**
```typescript
{
  id: string;
  date: ISODateString;
  sessions: number;
  users: number;
  newUsers?: number;
  pageviews: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  avgOrderValue: number;
  topPages?: { path: string; views: number }[];
  source: 'Google Analytics' | 'Shopify' | 'Manual';
  createdAt: Timestamp;
}
```

**Uso en Dashboards:**
- Dashboard Marketing → KPIs Online → Web Performance

**Colección Firestore:** `webAnalytics`

**Fuentes de Datos:**
- Google Analytics API
- Shopify Analytics
- Manual (imports CSV)

---

### 3. `Activation`
**Propósito:** Tracking de activaciones de marca (tastings, displays, giftings)

**Campos:**
```typescript
{
  id: string;
  accountId?: string;
  eventId?: string;
  type: 'TASTING' | 'DISPLAY' | 'PROMOTION' | 'GIFTING';
  bottlesGiven: number;
  cost: number;
  estimatedReach?: number;
  actualReach?: number;
  notes?: string;
  result?: {
    ordersGenerated?: number;
    revenueAttributed?: number;
    roi?: number;
    upliftPct?: number;
  };
  executedAt: ISODateString;
  executedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Uso en Dashboards:**
- Dashboard Marketing → Offline → Activaciones
- ROI Calculation por activación

**Colección Firestore:** `activations`

**Diferencia con PosTactic:**
- `PosTactic`: Material POS permanente (displays, signage)
- `Activation`: Eventos temporales con producto regalado

---

## 🔧 Entidades Ampliadas

### 1. `OrderSellOut`
**Nuevos campos:**
- `region?: 'ES' | 'USA' | 'MX' | 'OTHER'` → Para KPIs por región
- `channel?: 'DIRECT' | 'DISTRIBUTOR' | 'ONLINE'` → Para mix de canal

**Impacto:**
- Dashboard Ventas → Ventas por Región
- Dashboard Ventas → Mix de Canal

**Migración:** Campos opcionales, no requiere migración de datos existentes

---

### 2. `Shipment`
**Nuevos campos:**
- `shippingCost?: number` → Coste de envío
- `expectedDeliveryDate?: Timestamp` → Fecha esperada de entrega

**Impacto:**
- Dashboard Logística → Coste medio de envío
- Dashboard Logística → OTIF (On Time In Full)

**Cálculo OTIF:**
```typescript
const otif = shipments.filter(s => 
  s.status === 'delivered' && 
  s.shippedAt <= s.expectedDeliveryDate
).length / shipmentsTotal * 100
```

---

### 3. `OnlineCampaign`
**Campo ampliado:** `metrics` ahora tiene estructura completa

**Antes:**
```typescript
metrics?: any;
```

**Después:**
```typescript
metrics?: {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number;      // Click Through Rate
  cpc?: number;      // Cost Per Click
  cpm?: number;      // Cost Per Mille
  roas?: number;     // Return On Ad Spend
  revenue?: number;
};
```

**Nuevo campo:**
```typescript
adCosts?: {
  meta?: number;
  google?: number;
  tiktok?: number;
  other?: number;
};
```

**Impacto:**
- Dashboard Marketing → ROI por canal
- Dashboard Marketing → Costos de Ads

---

## 📊 Actualización de `SantaData`

**Nuevas colecciones añadidas:**
```typescript
export interface SantaData {
  // ... existentes
  socialMetrics?: SocialMetrics[];
  webAnalytics?: WebAnalytics[];
  activations?: Activation[];
  // ... resto
}
```

**Array `SANTA_DATA_COLLECTIONS` actualizado:**
```typescript
export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
  // ... existentes
  "socialMetrics",
  "webAnalytics",
  "activations",
  // ... resto
];
```

---

## 🎯 KPIs Ahora Calculables

### Dashboard Ventas ✅
- [x] Cajas vendidas (semana/mes/YTD)
- [x] Ventas en EUR
- [x] Puntos de venta activos
- [x] Distribuidores
- [x] **NUEVO:** Ventas por región (ES/USA/MX)
- [x] **NUEVO:** Mix de canal (Direct/Distributor/Online)

### Dashboard Marketing - Offline ✅
- [x] Número de eventos
- [x] **NUEVO:** Número de activaciones
- [x] **NUEVO:** Botellas regaladas
- [x] **NUEVO:** Coste total invertido
- [x] **NUEVO:** ROI por activación

### Dashboard Marketing - Online ✅
- [x] **NUEVO:** Sesiones web
- [x] **NUEVO:** Tasa de conversión
- [x] **NUEVO:** Órdenes web
- [x] **NUEVO:** Seguidores Instagram/TikTok/YouTube
- [x] **NUEVO:** Posts/Reels/Stories
- [x] **NUEVO:** Views totales
- [x] **NUEVO:** Colaboraciones con influencers
- [x] **NUEVO:** Costos de ads por plataforma

### Dashboard Logística ✅
- [x] Pedidos pendientes
- [x] Envíos hoy
- [x] **NUEVO:** OTIF (On Time In Full)
- [x] **NUEVO:** Coste medio de envío

---

## 🔄 Próximos Pasos (Sprint 3)

1. **Crear helpers de cálculo** en `src/lib/kpi-helpers.ts`
2. **Ampliar DataProvider** para cargar nuevas colecciones
3. **Crear componentes de Dashboard** usando los nuevos KPIs
4. **Integrar con APIs externas:**
   - Google Analytics
   - Shopify
   - Instagram Graph API

---

## 📝 Notas Técnicas

- ✅ **Backward Compatible:** Todos los campos nuevos son opcionales
- ✅ **TypeScript:** Sin errores de compilación en SSOT
- ✅ **Firestore Ready:** Colecciones listas para crear
- ⚠️ **Migración de Datos:** No requerida (campos opcionales)

---

## 🚀 Estado del Proyecto

**Sprints Completados:**
- [x] Sprint 1: Fundación UI/UX (Sidebar, Header, BottomNav)
- [x] Sprint 2: Componentes Core (PageShell, KpiCard, EmptyState, LoadingState)
- [x] Sprint 2.5: Ampliación SSOT (Este documento)

**Siguiente:**
- [ ] Sprint 3: Dashboards (Personal + Ventas + Marketing)
- [ ] Sprint 4: QuickLog Pro
- [ ] Sprint 5: Integraciones externas

---

**Autor:** Cline AI Assistant  
**Revisado por:** Martin Jaime  
**Versión SSOT:** 5.1
