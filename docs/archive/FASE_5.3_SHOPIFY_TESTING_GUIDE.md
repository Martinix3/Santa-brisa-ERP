# 🧪 FASE 5.3 - GUÍA DE TESTING SHOPIFY

**Fecha:** 15/01/2025  
**Objetivo:** Validar integración Shopify (Backend + Webhooks + Datos)  
**Duración estimada:** 45-60 minutos  
**Prerequisitos:** SHOPIFY_ACCESS_TOKEN configurado en .env.local ✅  
**Estado:** ⚠️ **Backend implementado, UI pendiente**

---

## ⚠️ **NOTA IMPORTANTE**

**Backend Shopify:**
```
✅ ShopifyClient implementado (8 archivos)
✅ Webhooks configurados
✅ Import orders funcional
✅ Fulfillment worker
✅ SHOPIFY_USE_REAL=true
```

**UI Shopify:**
```
❌ Dashboard /ventas/shopify NO existe todavía
❌ Fase 5.3 pendiente de implementación (4 días)
```

**Este testing cubre:**
- ✅ Backend + API Shopify
- ✅ Webhooks entrantes
- ✅ Datos en Firestore
- ⏳ UI será testeada cuando se implemente

---

## ✅ **PREREQUISITOS**

**Verificar configuración:**
```bash
✅ SHOPIFY_STORE_NAME=santabrisa
✅ SHOPIFY_ACCESS_TOKEN=[REDACTED_SHOPIFY_ACCESS_TOKEN]
✅ SHOPIFY_API_KEY=7f78c196d7c91ec63c2573addf05e371
✅ SHOPIFY_API_SECRET=a96b6714b8868afd858581546c79cc59
✅ SHOPIFY_USE_REAL=true
```

**Iniciar servidor:**
```bash
cd /Users/martinjaimesamperiz/Santa-brisa-ERP
npm run dev
```

**Acceso a Shopify:**
```
URL: https://santabrisa.myshopify.com/admin
Permisos: Admin o con acceso a Orders + Products
```

---

## 🧪 **TEST 1: WEBHOOK ORDERS/CREATE**

### **Objetivo:**
Validar que cuando se crea un pedido en Shopify, el webhook lo importa automáticamente al ERP.

### **Pasos:**

**1. Verificar webhook configurado:**
```
Shopify Admin → Settings → Notifications → Webhooks

✅ Debe existir webhook:
   Topic: orders/create
   URL: https://[your-domain]/api/webhooks/shopify
   Format: JSON
   Version: 2024-01
```

**2. Crear pedido de prueba en Shopify:**
```
1. Shopify Admin → Orders → Create order
2. Completar datos:
   - Cliente: Seleccionar o crear
   - Productos: Añadir 2-3 productos
   - Shipping address: Dirección completa
   - Payment: Mark as paid
3. Click "Create order"
```

**3. Observar logs del servidor:**
```bash
# En terminal donde corre `npm run dev`

✅ Esperado:
   [webhooks/shopify] POST /api/webhooks/shopify
   [webhooks/shopify] Signature valid
   [webhooks/shopify] Processing orders/create
   [shopify] Order imported: #[order_number]
```

**4. Verificar en Firestore:**
```
Abrir Firebase Console → ordersSellOut collection

Buscar pedido recién creado:
✅ source: "SHOPIFY"
✅ external.shopifyOrderId: [id numérico]
✅ accountId: (vinculado a cuenta si existe)
✅ lines: [{itemId, qty, priceUnit, ...}]
✅ totalAmount: [monto correcto]
✅ status: "open" o "confirmed"
✅ orderDate: [fecha del pedido]
✅ createdAt: [timestamp reciente]
```

**5. Verificar mapeo de productos:**
```
Para cada line en el pedido:

✅ itemId existe en items collection
✅ qty mapeada correctamente
✅ priceUnit correcto desde Shopify
✅ name mapeado

Si producto NO existe en ERP:
⚠️ Debe crear log de advertencia
⚠️ O skip el producto (dependiendo de config)
```

**6. Verificar cuenta vinculada:**
```
Si cliente Shopify tiene email que existe en ERP:

✅ accountId se linkea automáticamente
✅ accountName se guarda

Si cliente NO existe:
✅ Se crea nota para crear cuenta manualmente
✅ O se crea account automáticamente (si configurado)
```

**Criterio de éxito:**
- ✅ Webhook recibido y procesado
- ✅ Order creado en Firestore
- ✅ Productos mapeados correctamente
- ✅ Cliente vinculado (si existe)
- ✅ Logs sin errores

---

## 🧪 **TEST 2: IMPORT MANUAL DE ORDERS**

### **Objetivo:**
Validar el import manual de pedidos existentes en Shopify.

### **Pasos:**

**1. Verificar órdenes en Shopify:**
```
Shopify Admin → Orders

✅ Anotar 2
