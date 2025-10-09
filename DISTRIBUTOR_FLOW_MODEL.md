# 🏗️ Modelo de Flujos de Distribución - Santa Brisa ERP

**Fecha:** 6 de Enero de 2025  
**Versión:** 1.0  
**Estado:** Definitivo

---

## 📋 Resumen Ejecutivo

Este documento define las reglas de negocio para los flujos de pedidos en Santa Brisa ERP, específicamente la relación entre **distribuidores**, **cuentas de colocación** y **comerciales**.

### Conceptos Clave

- **PLACEMENT (Colocación)**: Pedido que pasa por un distribuidor (interno o externo)
- **DIRECT (Venta Directa)**: Pedido sin intermediario, Santa Brisa factura directamente
- **Santa Brisa como Distribuidor**: Distribuidor especial interno para permitir que comerciales hagan ventas directas

---

## 🎯 Reglas de Flujo por Origen

| Origen del Pedido | flow=PLACEMENT | flow=DIRECT | Regla de Negocio |
|-------------------|----------------|-------------|------------------|
| **Comercial (CRM)** | ✅ **SIEMPRE** | ❌ **NUNCA** | Los comerciales no tienen capacidad de facturar |
| **Admin (/pedidos)** | ✅ **PUEDE** | ✅ **PUEDE** | Admin tiene control total, elige según el caso |
| **Online (Shopify)** | ❌ **NUNCA** | ✅ **SIEMPRE** | Venta directa ecommerce pura |

---

## 📐 Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────┐
│                    SANTA BRISA                           │
│                  (Nuestra Empresa)                       │
│                                                          │
│  • Factura a distribuidores (sell-in)                   │
│  • Factura directamente a clientes finales (DIRECT)     │
└──────────────────────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┬─────────────┐
      ↓              ↓              ↓             ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│COMERCIAL │  │  ADMIN   │  │ ONLINE   │  │DISTRIBUIDORES│
│  (CRM)   │  │(Pedidos) │  │(Shopify) │  │  EXTERNOS    │
└─────┬────┘  └─────┬────┘  └─────┬────┘  └──────┬───────┘
      │             │             │               │
   PLACEMENT     PLACEMENT      DIRECT            │
    (solo)      o DIRECT        (solo)            │
      │             │             │               │
      └─────────────┴─────────────┘               │
                    ↓                              │
         ┌────────────────────┐                   │
         │ distributorPartyId │◄──────────────────┘
         │ (Santa Brisa o     │
         │  Distribuidor Real)│
         └────────────────────┘
```

---

## 🔄 Flujos Detallados

### 1️⃣ Flujo PLACEMENT (Colocación)

**Definición**: Pedido que pasa por un distribuidor antes de llegar al cliente final.

**Características**:
- `flow = 'PLACEMENT'`
- `distributorPartyId` **OBLIGATORIO**
- Puede ser "Santa Brisa" (distribuidor interno) o distribuidor externo

**Transacciones**:
1. **Sell-In**: Santa Brisa → Distribuidor
2. **Sell-Out**: Distribuidor → Cliente Final (opcional, si es distribuidor externo)

**Casos de Uso**:

#### A. Comercial vende directamente a un cliente
```typescript
{
  createdById: 'comercial123',
  flow: 'PLACEMENT',  // OBLIGATORIO para comerciales
  distributorPartyId: 'santa-brisa-party-id',  // Distribuidor interno
  accountId: 'cliente-privado-xyz',
  source: 'CRM'
}
```
📝 **Explicación**: El comercial no puede facturar, así que usa "Santa Brisa" como distribuidor intermediario. Santa Brisa factura directamente al cliente.

#### B. Comercial vende vía distribuidor externo
```typescript
{
  createdById: 'comercial123',
  flow: 'PLACEMENT',
  distributorPartyId: 'distribuidor-mahou-id',
  accountId: 'bar-ejemplo-id',
  source: 'CRM'
}
```
📝 **Explicación**: 
- Santa Brisa factura a Mahou (sell-in)
- Mahou factura al bar (sell-out, lo reporta Mahou)

#### C. Admin crea pedido de colocación
```typescript
{
  createdById: 'admin456',
  flow: 'PLACEMENT',  // Admin eligió PLACEMENT
  distributorPartyId: 'distribuidor-damm-id',
  accountId: 'restaurante-xyz',
  source: 'MANUAL'
}
```

---

### 2️⃣ Flujo DIRECT (Venta Directa)

**Definición**: Pedido sin intermediario, Santa Brisa factura directamente al cliente final.

**Características**:
- `flow = 'DIRECT'`
- `distributorPartyId` **DEBE SER NULL/UNDEFINED**
- Solo 1 transacción: Santa Brisa → Cliente

**Transacciones**:
1. **Único**: Santa Brisa → Cliente Final

**Casos de Uso**:

#### D. Admin crea pedido directo
```typescript
{
  createdById: 'admin456',
  flow: 'DIRECT',  // Admin eligió DIRECT
  distributorPartyId: null,  // No hay distribuidor
  accountId: 'retail-grande-xyz',
  source: 'MANUAL'
}
```

#### E. Pedido online (Shopify)
```typescript
{
  source: 'SHOPIFY',
  flow: 'DIRECT',  // SIEMPRE para online
  distributorPartyId: null,
  accountId: 'cliente-web-123',
  channel: 'ONLINE'
}
```
📝 **Explicación**: Ecommerce puro, el cliente compra online y Santa Brisa envía directamente.

---

## 🔐 Reglas de Validación

### Regla 1: Online siempre DIRECT
```typescript
if (order.source === 'SHOPIFY') {
  assert(order.flow === 'DIRECT');
  assert(order.distributorPartyId === null);
}
```

### Regla 2: Comerciales solo PLACEMENT
```typescript
if (createdByUser.role === 'comercial') {
  assert(order.flow === 'PLACEMENT');
  assert(order.distributorPartyId !== null);
}
```

### Regla 3: PLACEMENT requiere distributor
```typescript
if (order.flow === 'PLACEMENT') {
  assert(order.distributorPartyId !== null);
}
```

### Regla 4: DIRECT no debe tener distributor
```typescript
if (order.flow === 'DIRECT') {
  assert(order.distributorPartyId === null);
}
```

---

## 👥 Relaciones Entidades

### User (Comercial)
```typescript
interface User {
  id: string;
  name: string;
  role: 'comercial' | 'admin' | 'ops' | 'owner';
  
  // Distribuidores asignados a este comercial (N:N)
  assignedDistributors?: Array<{
    partyId: string;      // ID del distribuidor
    priority: number;     // ⚠️ LEGACY - Actualmente sin uso
  }>;
}
```

**Relaciones**:
- **N:N con Distribuidores**: Un comercial puede tener múltiples distribuidores asignados
- **1:N con Cuentas**: Un comercial es `ownerId` de múltiples cuentas
- **Criterio de asignación**: Área geográfica

### Account (Cuenta)
```typescript
interface Account {
  id: string;
  partyId: string;
  name: string;
  segment: 'HORECA' | 'RETAIL' | 'ONLINE' | 'PRIVADA' | 'DISTRIBUIDOR';
  stage: Stage;
  
  // Comercial responsable de esta cuenta
  ownerId: string;  // → User.id
  
  // Flujo comercial
  flow: 'DIRECT' | 'PLACEMENT';
  
  // Distribuidor (solo si flow = PLACEMENT)
  distributorPartyId?: string;  // → Party.id del distribuidor
}
```

**Relaciones**:
- **N:1 con User (ownerId)**: Cada cuenta tiene un comercial responsable
- **N:1 con Party (distributorPartyId)**: Cada cuenta PLACEMENT tiene un distribuidor
- **Especial**: Si `segment = 'DISTRIBUIDOR'` → Esta cuenta ES un distribuidor

### Party (Entidad Jurídica)
```typescript
interface Party {
  id: string;
  name: string;
  kind: 'ORG' | 'PERSON';
  roles?: PartyRoleType[];  // Puede incluir 'DISTRIBUTOR'
}
```

**Tipos de Distribuidores**:
1. **Santa Brisa (Interno)**: Party con nombre "Santa Brisa" + Account con segment="DISTRIBUIDOR"
2. **Externos**: Cualquier otro Party con rol 'DISTRIBUTOR'

### OrderSellOut (Pedido)
```typescript
interface OrderSellOut {
  id: string;
  accountId: string;
  partyId?: string;
  
  // Flujo del pedido
  flow?: 'PLACEMENT' | 'DIRECT';
  
  // Distribuidor (requerido si flow = PLACEMENT)
  distributorId?: string;  // ⚠️ Inconsistencia: Debería ser distributorPartyId
  
  // Origen del pedido
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  
  // Quién creó el pedido
  createdById?: string;  // → User.id
  
  // Canal de venta
  channel?: 'DIRECT' | 'DISTRIBUTOR' | 'ONLINE';
}
```

---

## 📊 Matriz de Decisiones

### ¿Cuándo usar PLACEMENT?

| Situación | PLACEMENT? | Distributor | Razón |
|-----------|------------|-------------|-------|
| Comercial crea pedido | ✅ SÍ (obligatorio) | Santa Brisa o Externo | No puede facturar |
| Admin vende vía distribuidor | ✅ SÍ (elección) | Externo | Canal de distribución |
| Admin vende directo | ❌ NO (usa DIRECT) | - | Simplifica proceso |
| Cliente compra online | ❌ NO (usa DIRECT) | - | Ecommerce puro |
| Venta a gran cadena retail | ⚖️ Depende | - | Admin decide según contrato |

### ¿Cuándo usar DIRECT?

| Situación | DIRECT? | Razón |
|-----------|---------|-------|
| Pedido online (Shopify) | ✅ SÍ (obligatorio) | Venta directa ecommerce |
| Admin vende sin intermediario | ✅ SÍ (opción) | Más eficiente |
| Comercial quiere facturar directo | ❌ NO | No tienen permiso |
| Venta a distribuidor (sell-in) | ❌ NO (usar PLACEMENT) | Es una colocación |

---

## 🔍 Queries Útiles

### Obtener cuentas de un comercial
```typescript
function getAccountsByComercial(comercialId: string, accounts: Account[]): Account[] {
  return accounts.filter(a => a.ownerId === comercialId);
}
```

### Obtener cuentas de un distribuidor
```typescript
function getAccountsByDistributor(distributorId: string, accounts: Account[]): Account[] {
  return accounts.filter(a => 
    a.flow === 'PLACEMENT' && 
    a.distributorPartyId === distributorId
  );
}
```

### Obtener pedidos de colocación de un comercial
```typescript
function getPlacementOrdersByComercial(
  comercialId: string, 
  orders: OrderSellOut[]
): OrderSellOut[] {
  return orders.filter(o => 
    o.createdById === comercialId &&
    o.flow === 'PLACEMENT'
  );
}
```

### Identificar pedidos inválidos
```typescript
function findInvalidOrders(orders: OrderSellOut[]): OrderSellOut[] {
  return orders.filter(o => {
    // Online debe ser DIRECT
    if (o.source === 'SHOPIFY' && o.flow !== 'DIRECT') return true;
    
    // PLACEMENT sin distributor
    if (o.flow === 'PLACEMENT' && !o.distributorId) return true;
    
    // DIRECT con distributor
    if (o.flow === 'DIRECT' && o.distributorId) return true;
    
    return false;
  });
}
```

---

## ⚠️ Problemas Conocidos

### 1. Naming Inconsistente
- `OrderSellOut.distributorId` vs `Account.distributorPartyId`
- **Impacto**: Confusión en el código
- **Solución**: Normalizar a `distributorPartyId` en todas las entidades

### 2. Campo `priority` sin uso
- En `User.assignedDistributors[].priority`
- **Impacto**: Dato legacy que ocupa espacio
- **Soluciones**:
  - A) Eliminarlo (limpieza)
  - B) Usarlo para ordenar distribuidores en UI
  - C) Usarlo para "distribuidor preferido"

### 3. Identificación de "Santa Brisa"
- Actualmente se busca por nombre: `p.name.toLowerCase().includes('santa brisa')`
- **Riesgo**: Cambio de nombre rompe lógica
- **Soluciones**:
  - A) Campo `Party.isInternalDistributor: boolean`
  - B) Config en SystemConfig: `internalDistributorPartyId`
  - C) Constante: `const SANTA_BRISA_PARTY_ID = '...'`

### 4. Falta validación en runtime
- No hay checks al crear pedidos
- **Riesgo**: Datos inconsistentes
- **Solución**: Implementar `validateOrderFlow()` (ver siguiente sección)

---

## 🛠️ Implementación de Validaciones

Ver archivo: `src/lib/order-flow-validators.ts`

```typescript
/**
 * Valida que un pedido cumpla las reglas de flow
 */
export function validateOrderFlow(
  order: OrderSellOut, 
  createdByUser?: User
): ValidationResult {
  // Implementación en archivo separado
}
```

---

## 📚 Referencias

- **SSOT**: `src/domain/ssot.ts` - Definiciones de tipos
- **Helpers**: `src/lib/distributor-helpers.ts` - Funciones de ayuda
- **Sales Helpers**: `src/lib/sales-helpers.ts` - Cálculos de ventas

---

## 📝 Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-06 | Documento inicial definitivo |

---

## ✅ Checklist de Implementación

- [x] Documentar reglas de negocio
- [x] Crear diagrama de arquitectura
- [ ] Implementar validaciones en código
- [ ] Crear tests unitarios
- [ ] Agregar validación en UI al crear pedidos
- [ ] Normalizar naming (distributorId → distributorPartyId)
- [ ] Decidir qué hacer con campo `priority`
- [ ] Implementar identificación robusta de Santa Brisa

---

**Documento mantenido por**: Equipo de Desarrollo  
**Última revisión**: 6 de Enero de 2025
