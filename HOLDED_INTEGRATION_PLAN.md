# 🔗 PLAN DE INTEGRACIÓN HOLDED - SANTA BRISA ERP

## 📊 MODELO DE NEGOCIO

### **Dos Canales de Venta**

1. **VENTA DIRECTA A DISTRIBUIDORES** (flow: DIRECT)
   - Origen: Presupuesto en Holded
   - Gestión: Holded → CRM (lectura) → Holded (factura)

2. **COLOCACIÓN** (flow: PLACEMENT)
   - Origen: Pedido en CRM
   - Gestión: CRM completo → Holded (solo factura)

---

## 🔄 FLUJO COMPLETO AUTOMATIZADO

```
HOLDED                           CRM SANTA BRISA
===============================  ================================

1. [Presupuesto Creado]
   ↓ Webhook/Polling
   
2.                               [Order Created]
                                 - flow: DIRECT
                                 - status: confirmed
                                 - external.holdedEstimateId
                                 ↓
                                 
3.                               [Shipment Created]
                                 - status: pending
                                 ↓
                                 
4.                               [Inventory Reserved]
                                 - Reservations creadas
                                 - Stock bloqueado
                                 ↓
                                 
5.                               [Shipment Validated]
                                 - status: ready_to_ship
                                 - Picking completado
                                 ↓
                                 
6.                               [Shipment Shipped]
                                 - status: shipped
                                 - Trigger: AUTO-FACTURAR
                                 ↓
   
7. [Factura Creada] ←──────────
   - Invoice created in Holded
   - Linked to estimate
   ↓
   
8.                               [Stock Withdrawn]
                                 - StockMoves negativos
                                 - OnHand recalculado
                                 - Order.external.holdedInvoiceId
                                 ↓
                                 
9. [Factura Pagada]
   ↓ Webhook
   
10.                              [Order Marked as Paid]
                                 - billingStatus: paid
                                 - paidAt: timestamp
```

---

## 🎯 COMPONENTES A IMPLEMENTAR

### **1. Webhook: Holded Estimate → CRM Order**

**Endpoint:** `/api/integrations/holded/webhooks/estimate`

**Payload esperado:**
```json
{
  "event": "estimate.created",
  "data": {
    "id": "est_123",
    "contactId": "cont_456",
    "date": "2025-01-08",
    "items": [
      {
        "sku": "SB-KOMBUCHA-350",
        "units": 24,
        "price": 2.5,
        "tax": 21
      }
    ]
  }
}
```

**Acción:**
1. Buscar/crear Party con `external.holdedContactId`
2. Buscar/crear Account linked a esa Party
3. Crear Order con:
   - `flow: DIRECT`
   - `source: HOLDED`
   - `status: confirmed`
   - `external.holdedEstimateId: est_123`

---

### **2. Trigger: Shipment Shipped → Holded Invoice**

**Trigger:** `Shipment.status` cambia a `"shipped"`

**Worker:** `CREATE_HOLDED_INVOICE_FROM_SHIPMENT`

**Lógica:**
```typescript
1. Obtener Shipment
2. Obtener Order vinculada
3. Si ya tiene holdedInvoiceId → SKIP
4. Obtener Party y validar holdedContactId
5. Crear Invoice en Holded:
   - contactId
   - items (de shipment.lines)
   - deliveryNote (si existe)
   - date: now
6. Guardar Order.external.holdedInvoiceId
7. Trigger: Retirar stock
```

---

### **3. Worker: Retirada Automática de Stock**

**Trigger:** Después de crear factura en Holded

**Worker:** `WITHDRAW_STOCK_FROM_SHIPMENT`

**Lógica:**
```typescript
1. Obtener Shipment.lines
2. Para cada line:
   - Crear StockMove {
       itemId,
       lotNumber,
       qty: -line.qty,  // NEGATIVO
       reason: "sale",
       fromLocationId,
       occurredAt: now,
       ref: { type: "shipment", id: shipmentId }
     }
3. Recalcular OnHand para cada itemId/lotNumber
4. Liberar Reservations
```

---

### **4. Webhook: Holded Invoice Paid → CRM Order**

**Endpoint:** `/api/integrations/holded/webhooks/invoice` (ya existe, mejorar)

**Payload:**
```json
{
  "event": "invoice.paid",
  "data": {
    "id": "inv_789",
    "paid": true,
    "paidAt": "2025-01-08T10:30:00Z"
  }
}
```

**Acción:**
1. Buscar Order con `external.holdedInvoiceId = inv_789`
2. Update Order:
   - `billingStatus: paid`
   - `paidAt: timestamp`

---

## 🛠️ ARCHIVOS A CREAR/MODIFICAR

### **Crear:**
- `src/app/api/integrations/holded/webhooks/estimate/route.ts`
- `src/server/integrations/holded/createInvoiceFromShipment.worker.ts`
- `src/server/workers/withdrawStockFromShipment.ts`

### **Modificar:**
- `src/server/queue/dispatcher.ts` (añadir nuevos workers)
- `src/server/integrations/holded/webhooks/route.ts` (mejorar invoice webhook)
- `src/app/(app)/admin/integrations/page.tsx` (UI para configurar webhooks)

---

## 📋 CONFIGURACIÓN NECESARIA

### **En Holded Dashboard:**

1. **Webhooks a configurar:**
   ```
   Event: estimate.created
   URL: https://tu-dominio.com/api/integrations/holded/webhooks/estimate
   
   Event: invoice.paid  
   URL: https://tu-dominio.com/api/integrations/holded/webhooks/invoice
   ```

2. **API Key:** ✅ Ya configurada en .env.local

### **En CRM:**

1. **Triggers Firestore:**
   - `shipments/{id}` onChange → Si status=shipped → Encolar CREATE_HOLDED_INVOICE_FROM_SHIPMENT

2. **Queue Dispatcher:**
   - Registrar nuevos workers

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### **Fase 1: Core (COMPLETADO ✅)**
- [x] Guardar API key Holded
- [x] Crear webhook estimate → order
- [x] Crear worker shipment → invoice
- [x] Crear worker retirada de stock
- [x] Registrar workers en dispatcher
- [x] Actualizar tipos TypeScript
- [x] Mejorar webhook invoice pagada

### **Fase 2: Testing (PENDIENTE)**
- [ ] Crear trigger Firestore para shipments
- [ ] Probar webhook estimate con Postman
- [ ] Probar flujo completo end-to-end
- [ ] Validar stock moves
- [ ] Validar reservations

### **Fase 3: Production (PENDIENTE)**
- [ ] Configurar webhooks en Holded dashboard
- [ ] Deploy triggers a Firebase Functions
- [ ] Monitorizar logs en producción
- [ ] Ajustar según feedback

---

## ⚠️ CASOS EDGE

### **Si falla creación de factura:**
- Retry automático (3 intentos)
- Si falla todo → Job a `dead_letters`
- Notificar admin por email

### **Si shipment sin lotNumber:**
- Validar antes de shipped
- No permitir shipped sin lot

### **Si Party sin holdedContactId:**
- Auto-crear contacto en Holded
- Guardar ID en Party.external

---

## 📊 MÉTRICAS A MONITORIZAR

- ⏱️ Tiempo entre presupuesto Holded → Order CRM
- ⏱️ Tiempo entre shipped → Factura creada
- ❌ Tasa de errores en workers
- 📦 Órdenes sin holdedInvoiceId después de 24h
- 💰 Facturas sin pagar después de 30 días

---

## ✅ CHECKLIST FINAL

- [x] API key configurada
- [x] Webhook estimate implementado
- [x] Webhook invoice pagada mejorado
- [x] Worker auto-facturar implementado  
- [x] Worker retirar stock implementado
- [x] Workers registrados en dispatcher
- [x] Tipos TypeScript actualizados
- [x] Script de testing creado
- [ ] Trigger Firestore creado
- [ ] Webhooks configurados en Holded
- [ ] Tests end-to-end pasando
- [ ] Logs y monitoring activos

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

### Creados:
- `src/app/api/integrations/holded/webhooks/estimate/route.ts`
- `src/server/integrations/holded/createInvoiceFromShipment.worker.ts`
- `src/server/workers/withdrawStockFromShipment.ts`
- `scripts/test-holded-webhook.sh`
- `HOLDED_INTEGRATION_PLAN.md`

### Modificados:
- `src/domain/ssot.ts` (OrderSellOut.external)
- `src/server/queue/types.ts` (nuevos JobKind)
- `src/server/queue/dispatcher.ts` (registrar workers)
- `src/server/integrations/holded/webhooks/route.ts` (mejorar invoice webhook)
- `.env.local` (HOLDED_API_KEY)

---

**Última actualización:** 2025-01-09  
**Estado:** 🟢 Fase 1 completada - Listo para testing
