# Plan de Reparación: Flujo Pedidos → Envíos

**Fecha:** 19 de Enero de 2025  
**Problema:** Flujo incompleto entre pedidos y envíos  
**Prioridad:** CRÍTICA - Afecta operación diaria

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Módulo de Pedidos (Orders)

**Archivo:** `src/app/(app)/orders/actions.ts`

**Estado Actual:**
```typescript
// ❌ TODOS SON STUBS
export async function placeOrder(_: any) { return { ok: true }; }
export async function placeQuickOrder(_: any) { return { ok: true }; }
export async function importShopifyOrder(_: any) { return { ok: true }; }
export async function createSalesInvoice(_: any) { return { ok: true }; }
```

**Problemas:**
- ⚠️ No hay validación de input
- ⚠️ No hay creación real de pedidos
- ⚠️ No hay validación de stock
- ⚠️ No hay asignación de lotes (FEFO)
- ⚠️ No hay validación QC
- ⚠️ No hay TraceEvents
- ⚠️ No hay tasks automáticas

### 2. Módulo de Logística (Logistics)

**Archivo:** `src/server/actions/logistics.actions.ts`

**Estado Actual:**
- ✅ `confirmOrderShipment()` existe pero tiene problemas
- ✅ `validateShipment()` existe pero básica
- ✅ `markShipmentShipped()` existe
- ⚠️ Funciones usan queue jobs (complejidad innecesaria para algunas)

**Problemas Detectados:**
1. **No valida QC de lotes** antes de reservar/enviar
2. **No usa TraceEventFactory** para eventos
3. **Usa Order en vez de OrderSellOut** (tipo incorrecto del SSOT)
4. **Status 'ABIERTO'** no está en SSOT (debería ser 'open')
5. **Mezcla responsabilidades:** confirmOrder + createShipment en una función
6. **Asignación de lotes compleja** sin usar helpers FEFO que creamos

### 3. Integración Pedidos ↔ Envíos

**Problemas:**
- ⚠️ No hay flujo claro desde `placeOrder()` hasta `shipment`
- ⚠️ `confirmOrderShipment()` hace demasiado (antipatrón)
- ⚠️ No hay separación de responsabilidades
- ⚠️ Difícil testear y debuguear

---

## 🎯 ARQUITECTURA PROPUESTA

### Flujo Ideal

```
1. placeOrder() 
   ├─ Validar input
   ├─ Verificar stock disponible
   ├─ Sugerir lotes (FEFO, sin reservar aún)
   ├─ Crear OrderSellOut (status='open')
   ├─ TraceEventFactory.create(SALE)
   └─ Return order

2. confirmOrder()
   ├─ Validar pedido existe
   ├─ Asignar lotes FEFO
   ├─ ✅ validate
