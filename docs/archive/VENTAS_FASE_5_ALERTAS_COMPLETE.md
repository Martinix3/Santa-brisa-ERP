# ✅ FASE 5 COMPLETA: Sistema de Alertas para Pedidos

**Fecha:** 26 de Octubre de 2025  
**Módulo:** Ventas - Pedidos  
**Estado:** ✅ COMPLETADO

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado exitosamente un **sistema completo de alertas automáticas** para el módulo de pedidos, integrado con el sistema de alertas general del ERP.

---

## 🎯 OBJETIVOS CUMPLIDOS

### ✅ 1. Sistema de Alertas Automáticas
**Archivo:** `src/server/automation/order-alerts.ts`

**Reglas implementadas:**

#### REGLA 1: Pedidos sin confirmar > 24h
- **Trigger:** Pedido en estado `open` por más de 24 horas
- **Severidad:** MEDIUM
- **Departamento:** VENTAS
- **Acciones sugeridas:**
  - Confirmar pedido
  - Contactar cliente

#### REGLA 2: Pedidos sin enviar > 48h
- **Trigger:** Pedido en estado `confirmed` por más de 48 horas
- **Severidad:** HIGH
- **Departamento:** ALMACEN
- **Acciones sugeridas:**
  - Crear envío
  - Verificar stock

#### REGLA 3: Pedidos sin facturar > 7 días
- **Trigger:** Pedido en estado `shipped` por más de 7 días
- **Severidad:** MEDIUM
- **Departamento:** FINANZAS
- **Acciones sugeridas:**
  - Generar factura
  - Verificar envío

### ✅ 2. Integración con Order Service
**Archivo:** `src/services/canonical/order.service.ts`

**Funcionalidad añadida:**
- Resolución automática de alertas al cambiar estado del pedido
- Método privado `resolveOrderAlerts()`
- Integrado en `updateOrderStatus()`

**Flujo:**
```
Usuario cambia estado del pedido
  ↓
order.service.updateOrderStatus()
  ↓
Valida transición
  ↓
Actualiza estado en Firestore
  ↓
Crea audit log
  ↓
Resuelve alertas relacionadas automáticamente ✨
```

### ✅ 3. Funciones Exportadas

```typescript
// Verificar todos los pedidos y crear alertas
export async function checkOrderAlerts(): Promise<{
  checked: number;
  alertsCreated: number;
  errors: number;
}>

// Verificar un pedido específico
export async function checkSingleOrderAlerts(
  orderId: string
): Promise<{ alertsCreated: number }>

// Resolver alertas de un pedido
export async function resolveOrderAlerts(
  orderId: string,
  userId: string
): Promise<{ resolved: number }>
```

---

## 📊 ESTRUCTURA DE ALERTAS

### Campos de una Alerta de Pedido

```typescript
{
  // Clasificación
  type: 'ORDER_PENDING',
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL',
  source: 'SYSTEM',
  
  // Contenido
  title: 'Pedido sin confirmar',
  message: 'Pedido PED-2025-000123 lleva más de 24h sin confirmar',
  
  // Asignación
  userId: 'comercial_id',
  department: 'VENTAS' | 'ALMACEN' | 'FINANZAS',
  
  // Relaciones
  entityType: 'ORDER',
  entityId: 'order_id',
  accountId: 'account_id',
  
  // Estado
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED',
  actionable: true,
  
  // Acciones sugeridas
  suggestedActions: [
    { 
      label: 'Confirmar pedido', 
      action: 'CUSTOM', 
      params: { orderId, customAction: 'CONFIRM_ORDER' } 
    }
  ],
  
  // Metadata
  metadata: {
    orderNumber: 'PED-2025-000123',
    customerName: 'Cliente ABC',
    totalAmount: 1500.00,
    daysPending: 2
  },
  
  // Auditoría
  createdAt: '2025-10-26T12:00:00Z',
  updatedAt: '2025-10-26T12:00:00Z',
}
```

---

## 🔄 FLUJO DE ALERTAS

### Creación Automática

```
Cron Job (cada hora)
  ↓
checkOrderAlerts()
  ↓
Consulta pedidos por estado
  ↓
Verifica tiempo transcurrido
  ↓
Crea alerta si cumple condiciones
  ↓
Notifica al usuario asignado
```

### Resolución Automática

```
Usuario cambia estado del pedido
  ↓
order.service.updateOrderStatus()
  ↓
Actualiza estado
  ↓
resolveOrderAlerts()
  ↓
Marca alertas como RESOLVED
  ↓
Usuario ve alerta resuelta
```

---

## 🎨 VISUALIZACIÓN EN UI

### Dashboard de Ventas
Las alertas de pedidos aparecerán en:
- Widget de Alertas (sidebar)
- Dashboard de Ventas
- Página de Pedidos
- Detalle del pedido

### Ejemplo Visual

```
🔔 Alertas (3)
├─ ⚠️ MEDIUM - Pedido sin confirmar
│  PED-2025-000123 • Cliente ABC • €1,500
│  [Confirmar] [Contactar]
│
├─ 🔴 HIGH - Pedido sin enviar
│  PED-2025-000120 • Cliente XYZ • €2,300
│  [Crear envío] [Ver stock]
│
└─ ⚠️ MEDIUM - Pedido sin facturar
   PED-2025-000115 • Cliente DEF • €890
   [Generar factura] [Verificar]
```

---

## 🚀 PRÓXIMOS PASOS

### Configurar Cron Job

Para ejecutar la verificación automática de alertas:

```typescript
// En automation-engine.ts o similar
import { checkOrderAlerts } from '@/server/automation/order-alerts';

// Ejecutar cada hora
setInterval(async () => {
  const result = await checkOrderAlerts();
  console.log(`Alertas de pedidos: ${result.alertsCreated} creadas`);
}, 60 * 60 * 1000); // 1 hora
```

### Integrar con UI

```typescript
// En PedidosContent.tsx o similar
import { getUserAlerts } from '@/server
