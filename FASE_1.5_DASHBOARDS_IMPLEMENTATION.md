# 🚀 FASE 1.5: SERVER ACTIONS DASHBOARDS - Guía de Implementación

**Inicio:** 14/01/2025  
**Duración:** 3-4 días  
**Prioridad:** ALTA  

---

## 🎯 OBJETIVO

Reemplazar los datos mock de los 7 dashboards con datos reales de Firestore mediante server actions, optimizar queries y añadir router por rol.

---

## 📋 ESTADO ACTUAL

### Dashboards con UI completa (mock data):
1. ✅ DashboardOps (5 tabs)
2. ✅ DashboardSales
3. ✅ DashboardAdmin
4. ✅ DashboardManager
5. ✅ DashboardDistributor (5 tabs)
6. ✅ DashboardMarketing
7. ✅ DashboardTechnical

### Lo que falta:
- ❌ Server actions para cada dashboard
- ❌ Router por rol en /dashboard/page.tsx
- ❌ Loading states con Suspense
- ❌ Error boundaries

---

## 📁 ESTRUCTURA DE ARCHIVOS A CREAR

```
src/server/actions/
├── dashboard-ops.ts          # Tarea 1
├── dashboard-sales.ts        # Tarea 2
├── dashboard-admin.ts        # Tarea 3
├── dashboard-manager.ts      # Tarea 4
├── dashboard-distributor.ts  # Tarea 5
├── dashboard-marketing.ts    # Tarea 6
└── dashboard-technical.ts    # Tarea 7

src/app/(app)/dashboard/
└── page.tsx                  # Tarea 8: Router por rol
```

---

## 🔄 ORDEN DE IMPLEMENTACIÓN

### DÍA 1 (Tareas 1-2):
1. **dashboard-sales.ts** (más usado, prioridad)
2. **dashboard-ops.ts** (complejo, 5 tabs)

### DÍA 2 (Tareas 3-4):
3. **dashboard-admin.ts**
4. **dashboard-manager.ts**

### DÍA 3 (Tareas 5-7):
5. **dashboard-distributor.ts**
6. **dashboard-marketing.ts**
7. **dashboard-technical.ts**

### DÍA 4 (Tareas 8-10):
8. **Router por rol** en /dashboard/page.tsx
9. **Loading states** con Suspense
10. **Error boundaries** y testing

---

## 📊 TAREA 1: dashboard-sales.ts

### Datos a obtener de Firestore:

```typescript
// src/server/actions/dashboard-sales.ts
"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";

export async function getSalesDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // 1. Obtener usuario actual para filtrar por repId
    const userDoc = await db.collection("teamMembers").doc(userId).get();
    const user = userDoc.data();
    
    // 2. KPIs del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // 3. Cuentas del usuario (filtradas por ownerId o team)
    const accountsQuery = await db
      .collection("accounts")
      .where("ownerId", "==", userId)
      .get();
    
    const accounts = accountsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 4. Pedidos del mes
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const ordersQuery = await db
      .collection("ordersSellOut")
      .where("createdBy", "==", userId)
      .where("createdAt", ">=", startOfMonth)
      .get();
    
    const orders = ordersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 5. Visitas del mes
    const visitsQuery = await db
      .collection("interactions")
      .where("createdBy", "==", userId)
      .where("type", "==", "visit")
      .where("timestamp", ">=", startOfMonth)
      .get();
    
    const visits = visitsQuery.docs.length;

    // 6. Tareas del usuario
    const tasksQuery = await db
      .collection("tasks")
      .where("assignedTo", "==", userId)
      .where("status", "!=", "completed")
      .orderBy("status")
      .orderBy("dueDate", "asc")
      .limit(20)
      .get();
    
    const tasks = tasksQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 7. Calcular KPIs
    const salesKpis = {
      monthlyTarget: user?.salesTarget || 50000,
      currentSales: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      visits,
      orders: orders.length,
      conversion: visits > 0 ? Math.round((orders.length / visits) * 100) : 0
    };

    // 8. Cuentas por stage
    const accountsByStage = accounts.reduce((acc, account) => {
      const stage = account.stagePreview || "POTENCIAL";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 9. Próximas visitas (de interactions con date futura)
    const upcomingVisitsQuery = await db
      .collection("interactions")
      .where("createdBy", "==", userId)
      .where("type", "==", "visit")
      .where("timestamp", ">=", new Date())
      .orderBy("timestamp", "asc")
      .limit(5)
      .get();
    
    const upcomingVisits = upcomingVisitsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 10. Cuentas sin actividad (>30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inactiveAccounts = accounts
      .filter(acc => {
        const lastActivity = acc.lastInteractionDate?.toDate() || new Date(0);
        return lastActivity < thirtyDaysAgo;
      })
      .slice(0, 5);

    return {
      success: true,
      data: {
        salesKpis,
        accountsByStage,
        upcomingVisits,
        inactiveAccounts,
        recentActivity: [], // TODO: Implement activity feed
        tasks
      }
    };

  } catch (error) {
    console.error("[getSalesDashboardData] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}
```

### Actualizar DashboardSales.tsx:

```typescript
// src/components/dashboards/DashboardSales.tsx
"use client";

import { useEffect, useState } from "react";
import { getSalesDashboardData } from "@/server/actions/dashboard-sales";
// ... resto de imports

export default function DashboardSales() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getSalesDashboardData();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  // Usar data.salesKpis, data.accountsByStage, etc.
  // ... resto del componente con datos reales
}
```

---

## 📊 TAREA 2: dashboard-ops.ts

### Datos a obtener:

```typescript
// src/server/actions/dashboard-ops.ts
"use server";

import { db } from "@/lib/firebase-admin";

export async function getOpsDashboardData(tab: string = "today") {
  try {
    switch (tab) {
      case "today":
        return await getTodayData();
      case "logistics":
        return await getLogisticsData();
      case "inventory":
        return await getInventoryData();
      case "quality":
        return await getQualityData();
      case "production":
        return await getProductionData();
      default:
        return await getTodayData();
    }
  } catch (error) {
    console.error("[getOpsDashboardData] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

async function getTodayData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Órdenes en tránsito
  const shipmentsQuery = await db
    .collection("shipments")
    .where("status", "in", ["PENDING", "IN_TRANSIT"])
    .get();
  
  const ordersInTransit = shipmentsQuery.size;

  // Stock crítico
  const stockQuery = await db
    .collection("onHand")
    .where("qtyOnHand", "<", 50) // threshold
    .get();
  
  const criticalStock = stockQuery.size;

  // Lotes en QC
  const qcQuery = await db
    .collection("lots")
    .where("qcStatus", "in", ["PENDING", "IN_PROGRESS"])
    .get();
  
  const lotsInQC = qcQuery.size;

  // Órdenes de producción activas
  const productionQuery = await db
    .collection("productionOrders")
    .where("status", "==", "IN_PROGRESS")
    .get();
  
  const activeProductionOrders = productionQuery.size;

  // Timeline de movimientos del día
  const movementsQuery = await db
    .collection("stockMoves")
    .where("timestamp", ">=", today)
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();
  
  const movements = movementsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    success: true,
    data: {
      todayKpis: {
        ordersInTransit,
        criticalStock,
        lotsInQC,
        activeProductionOrders
      },
      movements
    }
  };
}

async function getLogisticsData() {
  // Salidas programadas
  const shipmentsQuery = await db
    .collection("shipments")
    .where("status", "in", ["PENDING", "PREPARING", "IN_TRANSIT"])
    .orderBy("scheduledDate", "asc")
    .limit(20)
    .get();
  
  const shipments = shipmentsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    success: true,
    data: { shipments }
  };
}

async function getInventoryData() {
  // Stock por SKU
  const stockQuery = await db
    .collection("onHand")
    .get();
  
  const stock = stockQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Calcular KPIs
  const totalSKUs = stock.length;
  const totalValue = stock.reduce((sum, s) => sum + (s.value || 0), 0);
  const criticalSKUs = stock.filter(s => s.qtyOnHand < s.minQty).length;

  return {
    success: true,
    data: {
      inventoryKpis: {
        totalSKUs,
        totalValue,
        criticalSKUs,
        avgCoverage: 30 // TODO: calculate
      },
      stock: stock.filter(s => s.qtyOnHand < s.minQty).slice(0, 10)
    }
  };
}

async function getQualityData() {
  // Lotes en QC
  const lotsQuery = await db
    .collection("lots")
    .where("qcStatus", "in", ["PENDING", "IN_PROGRESS", "HOLD"])
    .get();
  
  const lots = lotsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    success: true,
    data: { lots }
  };
}

async function getProductionData() {
  // Órdenes de producción
  const productionQuery = await db
    .collection("productionOrders")
    .where("status", "in", ["IN_PROGRESS", "PENDING"])
    .get();
  
  const productionOrders = productionQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    success: true,
    data: { productionOrders }
  };
}
```

---

## 📊 TAREAS 3-7: Resto de Dashboards

Seguir el mismo patrón:

1. Crear archivo `dashboard-[nombre].ts`
2. Implementar función `get[Nombre]DashboardData()`
3. Queries a Firestore según necesidades
4. Calcular KPIs
5. Return { success, data } o { success: false, error }

---

## 🔀 TAREA 8: Router por Rol

```typescript
// src/app/(app)/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import DashboardOps from "@/components/dashboards/DashboardOps";
import DashboardSales from "@/components/dashboards/DashboardSales";
import DashboardAdmin from "@/components/dashboards/DashboardAdmin";
import DashboardManager from "@/components/dashboards/DashboardManager";
import DashboardDistributor from "@/components/dashboards/DashboardDistributor";
import DashboardMarketing from "@/components/dashboards/DashboardMarketing";
import DashboardTechnical from "@/components/dashboards/DashboardTechnical";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/login");
  }

  // Obtener rol del usuario
  const userDoc = await db.collection("teamMembers").doc(userId).get();
  const user = userDoc.data();
  const role = user?.role;

  // Router por rol
  switch (role) {
    case "ops":
      return <DashboardOps />;
    case "comercial":
    case "sales":
      return <DashboardSales />;
    case "admin":
      return <DashboardAdmin />;
    case "owner":
    case "manager":
      return <DashboardManager />;
    case "distributor":
      return <DashboardDistributor />;
    case "marketing":
      return <DashboardMarketing />;
    case "technical":
      return <DashboardTechnical />;
    default:
      // Dashboard personal por defecto
      return <DashboardSales />;
  }
}
```

---

## ⚡ OPTIMIZACIONES

### 1. Cache con Next.js 15

```typescript
import { unstable_cache } from "next/cache";

export const getSalesDashboardData = unstable_cache(
  async (userId: string) => {
    // ... lógica
  },
  ["sales-dashboard"],
  {
    revalidate: 300, // 5 minutos
    tags: ["dashboard", "sales"]
  }
);
```

### 2. Parallel Queries

```typescript
const [accounts, orders, visits] = await Promise.all([
  db.collection("accounts").where("ownerId", "==", userId).get(),
  db.collection("ordersSellOut").where("createdBy", "==", userId).get(),
  db.collection("interactions").where("createdBy", "==", userId).get()
]);
```

### 3. Índices de Firestore

Crear índices para queries compuestas:
```
accounts: ownerId + stagePreview
ordersSellOut: createdBy + createdAt
interactions: createdBy + type + timestamp
```

---

## 🧪 TESTING

### Testing manual por dashboard:

1. Login con usuario del rol correspondiente
2. Navegar a /dashboard
3. Verificar que carga datos reales
4. Verificar KPIs calculados correctamente
5. Verificar performance (< 2s carga)

### Checklist por dashboard:

- [ ] Dashboard Sales - Usuario comercial
- [ ] Dashboard Ops - Usuario ops
- [ ] Dashboard Admin - Usuario admin
- [ ] Dashboard Manager - Usuario owner/manager
- [ ] Dashboard Distributor - Usuario distribuidor
- [ ] Dashboard Marketing - Usuario marketing
- [ ] Dashboard Technical - Usuario technical

---

## 📝 PRÓXIMOS PASOS

1. **Ahora:** Crear `dashboard-sales.ts` (Tarea 1)
2. **Luego:** Actualizar `DashboardSales.tsx` para usar datos reales
3. **Testing:** Verificar con usuario comercial
4. **Continuar:** Con dashboard-ops.ts

---

**¿Listo para empezar con Tarea 1: dashboard-sales.ts?** 🚀
