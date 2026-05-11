# 📊 AUDITORÍA COMPLETA: Valores Hardcodeados en Santa Brisa ERP

**Fecha:** 6 de Enero de 2025  
**Auditor:** Sistema Automatizado  
**Scope:** Todo el proyecto src/

---

## 🎯 RESUMEN EJECUTIVO

- **Total de valores hardcodeados encontrados:** 400+
- **Archivos afectados:** ~100
- **Categorías principales:** 4 (Colores, Números Mágicos, Metadata, Strings)
- **Prioridad:** ALTA - Estos valores deberían estar en configuración

---

## 📋 CATEGORÍA 1: COLORES (107 ocurrencias)

### **A. Colores de Marca (src/domain/ssot.ts)**
```typescript
const colorValues = {
  sun: '#fff5a9',
  sunStrong: '#fecb46',
  agua: '#99d9d9',
  cobre: '#c56a3c',
  naranja: '#ed6a36',
  verdeMar: '#5a9496',
  neutral50: '#FAFAFA',
  neutral900: '#111111',
  success: '#22c55e',
  warning: '#fecb46',
  danger: '#ef4444',
  info: '#3b82f6',
  pink: '#f472b6',
  hotpink: '#ec4899',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  gray: '#9ca3af',
}
```

### **B. Colores de Departamentos (src/domain/ssot.ts)**
```typescript
DEPT_META: {
  VENTAS:     { color: '#ea945e', textColor: '#ffffff' },
  MARKETING:  { color: '#9dd4d6', textColor: '#2F5D5D' },
  PRODUCCION: { color: '#638c8d', textColor: '#ffffff' },
  CALIDAD:    { color: '#829fce', textColor: '#ffffff' },
  ALMACEN:    { color: '#996947', textColor: '#ffffff' },
  FINANZAS:   { color: '#fecb46', textColor: '#412c00' },
  PERSONAL:   { color: 'hsl(var(--sb-accent-personal))' },
  OPS:        { color: '#6366f1', textColor: '#ffffff' },
}
```

### **C. Colores Dispersos en Componentes (76 ocurrencias)**

**Más usados:**
- `#618E8F` (verde marca) → 12 veces
- `#F7D15F` (amarillo) → 15 veces
- `#A7D8D9` (azul agua) → 8 veces
- `#D7713E` (naranja) → 6 veces
- `#e5e7eb` (gris borde) → 20+ veces
- `#6b7280` (gris texto) → 10+ veces

**Archivos afectados:**
- `src/components/sales/MixComercialDonut.tsx`
- `src/components/sales/EvolucionVentasChart.tsx`
- `src/features/personal/CompactCalendar.tsx`
- `src/features/personal/PersonalPipelineBoard.tsx`
- `src/app/(app)/sell-in/page.tsx`
- `src/app/(app)/sell-out/page.tsx`
- Y 20+ archivos más...

---

## 🔢 CATEGORÍA 2: NÚMEROS MÁGICOS (300+ ocurrencias)

### **A. Días/Tiempo**

| Valor | Uso | Ocurrencias | Archivos Clave |
|-------|-----|-------------|----------------|
| **30** | Días sin contacto, análisis de 30 días | 15+ | pipeline-helpers, sales-helpers, múltiples dashboards |
| **7** | Semana, últimos 7 días | 10+ | time-range-helpers, inventory |
| **15** | Días en stage sin acción (inferido) | ? | Por confirmar |
| **365** | Cálculos anuales | 5+ | sell-out, settings |
| **24, 60, 60, 1000** | Conversiones de tiempo | 10+ | Múltiples |

**Ejemplos específicos:**

```typescript
// src/lib/pipeline-helpers.ts:64
const sinContacto = accounts.filter((a) => {
  return ultima && daysSince(ultima.createdAt) > 30;  // ← HARDCODED
});

// src/lib/time-range-helpers.ts:45
case 'week': {
  weekAgo.setDate(weekAgo.getDate() - 7);  // ← HARDCODED
  return targetDate >= weekAgo;
}

// src/lib/time-range-helpers.ts:52
case 'month': {
  monthAgo.setDate(monthAgo.getDate() - 30);  // ← HARDCODED
  return targetDate >= monthAgo;
}
```

### **B. Objetivos y KPIs**

| Valor | Uso | Ubicación |
|-------|-----|-----------|
| **100** | Objetivo cajas por defecto | dashboard-personal/page.tsx:67 |
| **0** | Baseline por defecto | Múltiples archivos |
| **baseline** | Referencias a kpiBaseline | 20+ archivos |
| **target/objetivo** | Objetivos diversos | 50+ archivos |

**Ejemplo crítico:**
```typescript
// src/app/(app)/dashboard-personal/page.tsx:67
const objetivoCajas = currentUser.kpiBaseline?.unitsSold || 100; // ← HARDCODED
```

### **C. Thresholds y Configuraciones**

| Valor | Uso | Ubicación |
|-------|-----|-----------|
| **0.3** | Threshold búsqueda fuzzy | santa-brain/route.ts |
| **20** | Día liquidación IVA | cashflow/settings |
| **0.02** | Fee payout online (2%) | cashflow/settings |
| **0.18** | IVA 18% (probable) | Múltiples |

---

## 📚 CATEGORÍA 3: METADATA OBJECTS (50+ entradas)

### **Ubicación Principal: src/domain/ssot.ts**

```typescript
// 1. DEPT_META (8 departamentos)
export const DEPT_META: Record<Department, { 
  label: string; 
  color: string; 
  textColor: string 
}>

// 2. ORDER_STATUS_META (7 estados)
export const ORDER_STATUS_META: Record<OrderStatus, {
  label: string;
  accent: string;
}>
// Estados: open, confirmed, shipped, invoiced, paid, cancelled, lost

// 3. SHIPMENT_STATUS_META (7 estados)
export const SHIPMENT_STATUS_META: Record<ShipmentStatus, {
  label: string;
  accent: string;
}>
// Estados: pending, picking, ready_to_ship, shipped, delivered, exception, cancelled

// 4. PARTY_ROLE_META (9 roles)
export const PARTY_ROLE_META: Record<PartyRoleType, {
  label: string;
  accent: string;
}>
// Roles: CUSTOMER, SUPPLIER, DISTRIBUTOR, IMPORTER, INFLUENCER, CREATOR, EMPLOYEE, BRAND_AMBASSADOR, OTHER

// 5. LOT_QC_META (3 estados)
export const LOT_QC_META = {
  release: { label: 'LIBERADO', bg: '#22c55e', text: '#ffffff' },
  hold: { label: 'RETENIDO', bg: '#fecb46', text: '#111111' },
  reject: { label: 'RECHAZADO', bg: '#ef4444', text: '#ffffff' },
}

// 6. ITEM_CATEGORY_META (7 categorías)
export const ITEM_CATEGORY_META: Record<ItemCategory, {
  label: string;
}>
// Categorías: fg, raw, pack, label, intermediate, consumable, merch

// 7. ACCOUNT_TYPE_META (6 tipos)
export const ACCOUNT_TYPE_META: Record<AccountType, {
  label: string;
  accent: string;
}>
// Tipos: HORECA, RETAIL, DISTRIBUIDOR, PRIVADA, ONLINE, OTRO
```

---

## 💬 CATEGORÍA 4: STRINGS HARDCODEADOS

### **Labels de UI**
- Botones, títulos, placeholders
- Mensajes de validación
- Textos de ayuda
- **Estimado:** 200+ strings

### **Propuesta:** 
Estos pueden quedarse hardcodeados inicialmente o migrarse a un sistema i18n si se requiere multiidioma en el futuro.

---

## 🏗️ ESTRUCTURA PROPUESTA: systemConfig

```typescript
interface SystemConfig {
  id: 'default';
  version: string;
  updatedAt: string;
  updatedBy: string;
  
  // 1. TEMA Y COLORES
  theme: {
    brand: {
      sun: string;
      sunStrong: string;
      agua: string;
      cobre: string;
      naranja: string;
      verdeMar: string;
      neutral50: string;
      neutral900: string;
    };
    state: {
      success: string;
      warning: string;
      danger: string;
      info: string;
    };
    accent: {
      pink: string;
      hotpink: string;
      indigo: string;
      purple: string;
      gray: string;
    };
    departments: Record<Department, {
      color: string;
      textColor: string;
    }>;
  };
  
  // 2. METADATA
  metadata: {
    departments: Record<Department, { label: string }>;
    orderStatuses: Record<OrderStatus, { label: string }>;
    shipmentStatuses: Record<ShipmentStatus, { label: string }>;
    partyRoles: Record<PartyRoleType, { label: string }>;
    lotQc: {
      release: { label: string; bg: string; text: string };
      hold: { label: string; bg: string; text: string };
      reject: { label: string; bg: string; text: string };
    };
    itemCategories: Record<ItemCategory, { label: string }>;
    accountTypes: Record<AccountType, { label: string }>;
  };
  
  // 3. REGLAS DE NEGOCIO
  businessRules: {
    // Alertas y Thresholds
    alertThresholds: {
      daysWithoutContact: number;        // 30
      daysInStageNoAction: number;       // 15 (a confirmar)
      lowStockWarningDays: number;       // Por definir
      expiryWarningDays: number;         // Por definir
    };
    
    // KPIs y Objetivos por Defecto
    kpiDefaults: {
      unitsSold: number;                 // 100
      revenue: number;                   // 0 o valor a definir
      visits: number;                    // 0 o valor a definir
    };
    
    // Time Ranges
    timeRanges: {
      weekDays: number;                  // 7
      monthDays: number;                 // 30
      yearDays: number;                  // 365
    };
    
    // Configuraciones Financieras
    finance: {
      vatSettlementDay: number;          // 20
      payoutFeePctOnline: number;        // 0.02
      fuzzySearchThreshold: number;      // 0.3
    };
    
    // Inventario
    inventory: {
      nearExpiryDays: number;            // 30
      safetyStockMultiplier: number;     // 7 (días)
      targetDaysOfCover: number;         // Por definir
    };
  };
}
```

---

## 📋 PLAN DE MIGRACIÓN (3 FASES)

### **FASE 1: Infraestructura y Críticos** (8-10 horas)

**Tareas:**
1. ✅ Crear tipo `SystemConfig` en `src/domain/ssot.ts`
2. ✅ Crear hook `useSystemConfig()` en `src/hooks/useSystemConfig.ts`
3. ✅ Crear documento inicial en Firestore con valores actuales
4. ✅ Crear página `/admin/system-config` para editar valores
5. ✅ Migrar colores de marca (23 valores)
6. ✅ Migrar `DEPT_META` (8 departamentos)
7. ✅ Migrar thresholds críticos (30 días, 100 cajas)

**Archivos a modificar:** ~15

### **FASE 2: Metadata y Reglas** (8-10 horas)

**Tareas:**
1. ✅ Migrar todos los *_META objects
2. ✅ Migrar time ranges (7, 30, 365 días)
3. ✅ Migrar configuraciones financieras
4. ✅ Migrar configuraciones de inventario
5. ✅ Actualizar todos los imports en componentes

**Archivos a modificar:** ~50

### **FASE 3: Colores Dispersos** (4-6 horas)

**Tareas:**
1. ✅ Reemplazar colores hardcodeados en componentes
2. ✅ Crear sistema de temas consistente
3. ✅
