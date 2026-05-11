# INTEGRACIÓN DRAWERS DE VENTAS CON SSOT V2 PLUS

**Fecha:** 26 de Octubre de 2025  
**Estado:** ✅ DRAWERS IMPLEMENTADOS - Pendiente integración backend  
**SSOT:** V2 Plus (NO modificar)

---

## 📦 RESUMEN: DRAWERS CREADOS

### Drawers Implementados (5)
1. ✅ **OpportunityDrawer** - Mejorado
2. ✅ **RegisterInteractionDrawer** - Nuevo
3. ✅ **RegisterEventDrawer** - Nuevo
4. ✅ **RegisterPOSDrawer** - Nuevo
5. ✅ **QuickOrderDrawer** - Nuevo (simplificado)

---

## 🔗 MAPEO A SSOT V2 PLUS (SIN MODIFICACIONES)

### 1. RegisterInteractionDrawer → `interactions` ✅

**Colección SSOT:** `interactions` (YA EXISTE)

**Mapeo de Campos:**
```typescript
// Drawer → SSOT
accountId → interaction.accountId
accountName → (denormalizado, no se guarda)
type → interaction.kind (InteractionKind)
date + time → interaction.plannedFor
duration → interaction.durationMin (AÑADIR a drawer)
notes → interaction.note
outcome → interaction.outcome
nextAction → interaction.resultNote
```

**Campos SSOT Obligatorios:**
- `userId` - ID del usuario que registra
- `status` - 'done' por defecto
- `dept` - 'VENTAS' por defecto
- `createdAt` - Timestamp actual

**Action a Crear:**
```typescript
// src/server/actions/sales-interactions.actions.ts
export async function createInteraction(data) {
  const interaction = {
    accountId: data.accountId,
    userId: data.userId,
    kind: data.type,
    note: data.notes,
    plannedFor: data.date,
    status: 'done',
    resultNote: data.nextAction,
    outcome: data.outcome ? { type: data.outcome } : undefined,
    dept: 'VENTAS',
    durationMin: data.duration,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await adminDb.collection('interactions').add(interaction);
  
  // Actualizar Account.lastInteractionAt
  await adminDb.collection('accounts').doc(data.accountId).update({
    lastInteractionAt: data.date,
  });
}
```

---

### 2. RegisterEventDrawer → `marketingEvents` ✅

**Colección SSOT:** `marketingEvents` (YA EXISTE)

**Mapeo de Campos:**
```typescript
// Drawer → SSOT
accountId → marketingEvent.accountId
accountName → (denormalizado, no se guarda)
eventType → marketingEvent.kind (EventKind)
title → marketingEvent.title
description → (no existe en SSOT, usar notes en custom field)
date + startTime → marketingEvent.startAt
date + endTime → marketingEvent.endAt
location → marketingEvent.city
attendees → (custom field)
products → (custom field)
budget → marketingEvent.spend
notes → (custom field)
```

**Campos SSOT Obligatorios:**
- `status` - 'planned' por defecto
- `ownerUserId` - ID del usuario que crea
- `createdAt` - Timestamp actual

**Action a Crear:**
```typescript
export async function createMarketingEvent(data) {
  const event = {
    title: data.title,
    kind: mapEventTypeToKind(data.eventType),
    accountId: data.accountId,
    startAt: `${data.date}T${data.startTime}`,
    endAt: `${data.date}T${data.endTime}`,
    city: data.location,
    spend: data.budget,
    status: 'planned',
    ownerUserId: data.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Custom fields
    kpis: {
      estimatedAttendees: data.attendees,
      products: data.products,
      notes: data.notes,
    },
  };
  
  await adminDb.collection('marketingEvents').add(event);
}
```

---

### 3. RegisterPOSDrawer → ⚠️ **NO EXISTE EN SSOT**

**Problema:** No hay colección `posInstallations` en SSOT V2 Plus.

**Solución SIN modificar SSOT:**

**Opción A: Usar `PosTactic` (RECOMENDADO)**
```typescript
export async function registerPOSInstallation(data) {
  const posTactic = {
    accountId: data.accountId,
    tacticCode: 'POS_INSTALLATION',
    description: `POS ${data.model} - SN: ${data.serialNumber}`,
    customDesc: JSON.stringify({
      model: data.model,
      serialNumber: data.serialNumber,
      installationDate: data.installationDate,
      technician: data.technician,
      monthlyFee: data.monthlyFee,
      contractDuration: data.contractDuration,
      accessories: data.accessories,
      notes: data.notes,
    }),
    actualCost: data.monthlyFee * data.contractDuration || 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    createdById: data.userId,
    updatedAt: new Date().toISOString(),
  };
  
  await adminDb.collection('posTactics').add(posTactic);
  
  // Actualizar Account.posInstalled
  await adminDb.collection('accounts').doc(data.accountId).update({
    posInstalled: true,
  });
}
```

**Opción B: Extender Account (más simple)**
```typescript
// Guardar directamente en Account
await adminDb.collection('accounts').doc(data.accountId).update({
  posInstalled: true,
  posInstallation: {
    model: data.model,
    serialNumber: data.serialNumber,
    installationDate: data.installationDate,
    monthlyFee: data.monthlyFee,
    contractEndDate: addMonths(data.installationDate, data.contractDuration),
  },
});
```

---

### 4. QuickOrderDrawer → `ordersSellOut` ⚠️

**Colección SSOT:** `ordersSellOut` (YA EXISTE)

**Problema:** El drawer es muy simplificado y faltan campos obligatorios.

**Solución:** Crear pedido con campos mínimos y status 'open' para completar después.

```typescript
export async function createQuickOrder(data) {
  // Buscar partyId del account
  const accountSnap = await adminDb.collection('accounts').doc(data.accountId).get();
  const account = accountSnap.data();
  
  const order = {
    accountId: data.accountId,
    partyId: account?.partyId || 'UNKNOWN',
    customerName: data.accountName,
    
    // Líneas simplificadas
    lines: data.lines.map(line => ({
      itemId: 'MANUAL_' + line.productName.replace(/\s+/g, '_'),
      name: line.productName,
      qty: line.quantity,
      uom: 'unit',
      priceUnit: line.priceUnit,
      discountPct: 0,
    })),
    
    // Totales
    totalAmount: data.lines.reduce((sum, l) => sum + (l.quantity * l.priceUnit), 0),
    currency: 'EUR',
    
    // Defaults
    channel: 'PRIVATE',
    flow: 'DIRECT',
    source: 'MANUAL',
    status: 'open',
    
    // Notas
    notes: data.notes,
    
    // Timestamps
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: data.userId,
  };
  
  const docRef = await adminDb.collection('ordersSellOut').add(order);
  
  return { success: true, id: docRef.id, docNumber: docRef.id };
}
```

---

## 📝 CAMBIOS NECESARIOS EN DRAWERS

### RegisterInteractionDrawer
```typescript
//
