# PROPUESTA: MODELO DE SUPPLIERS EN SSOT V7

**Fecha:** 9/10/2025  
**Estado:** PROPUESTA - Requiere decisión de negocio  
**Archivos afectados:** 2 (QuickGoodsReceiptDialog, NewShipmentDialog)

---

## 📋 PROBLEMA ACTUAL

En SSOT v6, el modelo de suppliers usa:
- `Party` - Entidad genérica para personas/empresas
- `PartyRole` - Define roles (SUPPLIER, CUSTOMER, etc.)
- `Account` tiene `partyId` que referencia a `Party`
- `billingAddress` está en `Party`

**En SSOT v7:**
- ❌ `Party` fue eliminado (simplificación)
- ❌ `PartyRole` fue eliminado  
- ❌ `Account.partyId` no existe
- ❌ Direcciones aún no están definidas en `Account`

**Archivos bloqueados:**
1. `src/features/warehouse/components/QuickGoodsReceiptDialog.tsx` (198 líneas)
2. `src/features/warehouse/components/NewShipmentDialog.tsx` (225 líneas)

---

## 🎯 OPCIONES DE SOLUCIÓN

### **OPCIÓN A: Suppliers como Accounts con segment='SUPPLIER'** ⭐ RECOMENDADA

```typescript
// src/domain/ssot.v7.ts

interface Account {
  id: string;
  name: string;
  segment: AccountSegment;
  
  // Datos de contacto
  email?: string;
  phone?: string;
  
  // Direcciones (NUEVO)
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Metadata
  taxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type AccountSegment = 
  | 'HORECA'
  | 'RETAIL' 
  | 'DISTRIBUIDOR'
  | 'ONLINE'
  | 'SUPPLIER'      // ← NUEVO
  | 'INTERNAL';     // ← Para uso interno

interface Address {
  street: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}
```

**Ventajas:**
- ✅ Unificación total - un solo modelo para clientes y proveedores
- ✅ Menos entidades = menos complejidad
- ✅ Reutilización de código (direcciones, contactos, etc.)
- ✅ Más fácil cuando un supplier también es customer
- ✅ Consistente con filosofía SSOT v7 (simplificación)

**Desventajas:**
- ⚠️ Mezcla conceptos de negocio diferentes
- ⚠️ Campos de Account pensados para customers podrían no aplicar a suppliers

**Implementación:**
```typescript
// Crear supplier
const supplier: Account = {
  id: 'acc_supplier_123',
  name: 'Proveedor XYZ S.L.',
  segment: 'SUPPLIER',
  taxId: 'B12345678',
  billingAddress: {
    street: 'C/ Industrial 5',
    city: 'Madrid',
    zip: '28001',
    country: 'España'
  },
  email: 'compras@proveedor.com',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z'
};

// Buscar suppliers
const suppliers = accounts.filter(a => a.segment === 'SUPPLIER');
```

---

### **OPCIÓN B: Nueva entidad Supplier separada**

```typescript
// src/domain/ssot.v7.ts

interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  
  // Contacto
  email?: string;
  phone?: string;
  contactPerson?: string;
  
  // Dirección
  address?: Address;
  
  // Metadata
  paymentTerms?: number; // días
  currency?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

interface GoodsReceipt {
  // ...
  supplierId: string;  // Referencia a Supplier, no Account
  // ...
}
```

**Ventajas:**
- ✅ Separación clara de conceptos
- ✅ Campos específicos para suppliers (paymentTerms, etc.)
- ✅ Más semántico en el código

**Desventajas:**
- ❌ Nueva entidad = más complejidad
- ❌ Duplicación de lógica (direcciones, contactos)
- ❌ ¿Qué pasa si un supplier también es customer?
- ❌ Va contra filosofía SSOT v7 (simplificación)

---

### **OPCIÓN C: Modelo híbrido (NO RECOMENDADO)**

Mantener `Party` solo para suppliers, mientras customers usan `Account`.

**NO RECOMENDADO** - Genera inconsistencia y complejidad innecesaria.

---

## 💡 RECOMENDACIÓN: OPCIÓN A

**Suppliers como Accounts con segment='SUPPLIER'**

### Razones:

1. **Simplicidad** - Un solo modelo unificado
2. **Flexibilidad** - Si un supplier se vuelve customer, ya está modelado
3. **Consistencia** - Todo el modelo de "partes externas" unificado
4. **Reutilización** - Direcciones, contactos, etc. compartidos
5. **Filosofía v7** - Menos entidades, más simplicidad

### Casos de uso reales:

```typescript
// 1. Proveedor que también es cliente (ejemplo: distribuidor)
const distributor: Account = {
  id: 'acc_dist_123',
  name: 'Distribuidora Nacional',
  segment: 'DISTRIBUIDOR', // Es customer
  // Pero también le compramos (supplier)
  // No necesitamos duplicar la entidad
};

// 2. Proveedor puro
const pureSupplier: Account = {
  id: 'acc_supp_456',
  name: 'Fábrica de Botellas S.L.',
  segment: 'SUPPLIER',
  billingAddress: { /* ... */ }
};

// 3. Queries simples
const allSuppliers = accounts.filter(a => a.segment === 'SUPPLIER');
const allCustomers = accounts.filter(a => 
  ['HORECA', 'RETAIL', 'DISTRIBUIDOR'].includes(a.segment)
);
```

---

## 🔧 CAMBIOS NECESARIOS

### 1. Actualizar SSOT v7

```typescript
// src/domain/ssot.v7.ts

// Añadir Address interface
export interface Address {
  street: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

// Actualizar Account
export interface Account {
  // ... campos existentes ...
  
  // NUEVO: Direcciones
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Actualizar segment
  segment: 
    | 'HORECA'
    | 'RETAIL'
    | 'DISTRIBUIDOR'
    | 'ONLINE'
    | 'SUPPLIER'    // ← NUEVO
    | 'INTERNAL';
}

// Actualizar GoodsReceipt
export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;  // Referencia a Account (segment='SUPPLIER')
  deliveryNote: string;
  receiptDate: string;
  lines: GoodsReceiptLine[];
  notes?: string;
  status: 'pending' | 'received' | 'quality_check' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Actualizar Shipment (eliminar partyId)
export interface Shipment {
  id: string;
  orderId: string;
  accountId: string;  // Ya no necesita partyId
  // ... resto de campos
}
```

### 2. Refactorizar 2 archivos bloqueados

**QuickGoodsReceiptDialog.tsx:**
```typescript
// ANTES (v6):
import type { Party, PartyRole } from '@/domain/ssot';
const suppliers = parties.filter(p => 
  partyRoles.some(r => r.partyId === p.id && r.role === 'SUPPLIER')
);

// DESPUÉS (v7):
import type { Account } from '@/domain/ssot.v7';
const suppliers = accounts.filter(a => a.segment === 'SUPPLIER');
```

**NewShipmentDialog.tsx:**
```typescript
// ANTES (v6):
const party = parties.find(p => p.id === account.partyId);
const address = party?.billingAddress;

// DESPUÉS (v7):
const address = account.billingAddress;  // Directo en Account
```

### 3. Migración de datos existentes

```typescript
// Script de migración
async function migratePartiesToAccounts() {
  const suppliers = parties.filter(p => 
    partyRoles.some(r => r.partyId === p.id && r.role === 'SUPPLIER')
  );
  
  for (const party of suppliers) {
    const account: Account = {
      id: `acc_${party.id}`,  // Nuevo ID
      name: party.name,
      segment: 'SUPPLIER',
      taxId: party.taxId,
      email: party.email,
      phone: party.phone,
      billingAddress: party.billingAddress ? {
        street: party.billingAddress.street,
        city: party.billingAddress.city,
        zip: party.billingAddress.zip,
        country: party.billingAddress.country
      } : undefined,
      createdAt: party.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    await createAccount(account);
  }
}
```

---

## 📅 PLAN DE IMPLEMENTACIÓN

### Fase 1: Decidir modelo (AHORA)
- [ ] Revisar propuesta
- [ ] Decidir: ¿Opción A o B?
- [ ] Validar con equipo si es necesario

### Fase 2: Actualizar SSOT v7 (15 min)
- [ ] Añadir `Address` interface
- [ ] Actualizar `Account` con `billingAddress`/`shippingAddress`
- [ ] Añadir `'SUPPLIER'` a `AccountSegment`
- [ ] Actualizar `GoodsReceipt` 
- [ ] Actualizar `Shipment` (eliminar `partyId`)

### Fase 3: Refactorizar archivos (30 min)
- [ ] Refactorizar `QuickGoodsReceiptDialog.tsx`
- [ ] Refactorizar `NewShipmentDialog.tsx`
- [ ] Testing de ambos componentes

### Fase 4: Migración de datos (1 hora)
- [ ] Crear script de migración
- [ ] Backup de datos
- [ ] Ejecutar migración
- [ ] Validar integridad

### Fase 5: Cleanup (15 min)
- [ ] Eliminar `Party` de v6 si ya no se usa
- [ ] Eliminar `PartyRole` de v6
- [ ] Actualizar documentación
- [ ] Commit final

**Tiempo total estimado:** ~2-3 horas

---

## ❓ PREGUNTAS PARA DECIDIR

1. **¿Hay casos donde un supplier también es customer?**
   - Si SÍ → Opción A es claramente mejor
   - Si NO → Ambas opciones son válidas

2. **¿Los suppliers necesitan campos específicos que los customers no?**
   - Si SÍ (muchos) → Opción B podría ser mejor
   - Si NO → Opción A es más simple

3. **¿Cuántos suppliers actuales hay?**
   - Si MUCHOS → Migración más crítica
   - Si POCOS → Migración más simple

4. **¿Los suppliers se gestionan de forma muy diferente a los customers?**
   - Si SÍ → Opción B da más flexibilidad
   - Si NO → Opción A unifica todo

---

## 🎯 PRÓXIMOS PASOS

1. **LEE ESTA PROPUESTA** completa
2. **RESPONDE** las preguntas de decisión arriba
3. **ELIGE** Opción A o B
4. **AVÍSAME** y procedo con la implementación

Una vez decidido, puedo completar Warehouse module en ~1 hora.

---

## 📞 CONTACTO

Si tienes dudas sobre la propuesta o necesitas discutir las opciones:
- Responde con tus preguntas
- O simplemente di "Opción A" o "Opción B" para proceder

**Archivo creado:** `SSOT_V7_SUPPLIERS_PROPOSAL.md`  
**Estado:** Esperando decisión para implementar ⏳
