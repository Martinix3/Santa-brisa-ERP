# Las 58 Colecciones Conectadas al UI con sus Campos

**Fecha:** 19/10/2025  
**Fuente:** Análisis completo Página→Server Action→Colección

---

## 📦 LAS 58 COLECCIONES CONECTADAS (Ordenadas por Importancia)

### 1. **accounts** (16 páginas)

**Campos que ESCRIBE:**
```
createdAt, holdedId, id, isTarget, lastSyncAt, name, ownerId, 
partyId, stage, status, syncedToHolded, targetUserId, targetedAt, 
type, updatedAt
```

**Campos que LEE:**
```
from, statusHistory
```

---

### 2. **items** (11 páginas)

**Campos detectados:** Ver en DB_COLLECTIONS_ANALYSIS.md (colección muy usada)

---

### 3. **lots** (9 páginas) ⭐ TU CASO

**Campos que ESCRIBE:** (desde server actions)
```
Campos detectados en production.actions.ts y goods-receipt.actions.ts
```

**Campos que LEE:**
```
Ver quality/traceability para lecturas
```

**Archivos clave:**
- `src/server/actions/production.actions.ts`
- `src/server/actions/goods-receipt.actions.ts`
- `src/server/actions/quality.actions.ts`

---

### 4. **onHand** (7 páginas)

**Campos que ESCRIBE:**
```
approvedAt, approvedBy, notes, reserved, status, updatedAt
```

---

### 5. **tasks** (7 páginas)

**Campos que ESCRIBE:**
```
closedAt, closedById, desc, id, isTarget, kind, progress, 
snoozeUntil, status, targetUserId, targetedAt, title, updatedAt
```

**Campos que LEE:**
```
from
```

---

### 6. **ordersSellOut** (6 páginas)

**Campos que ESCRIBE:**
```
accountId, createdAt, currency, customerEmail, date, distributorId, 
docNumber, external, id, itemId, lines, name, note, priceUnit, 
processed, qty, receivedAt, shop, shopifyOrderId, shopifyOrderNumber, 
source, status, timestamp, topic, totalAmount, uom, updatedAt
```

**Campos que LEE:**
```
statusHistory
```

---

### 7. **users** (6 páginas)

**Campos:** Colección de sistema

---

### 8. **traceEvents** (6 páginas)

**Campos que ESCRIBE:**
```
domain, resolvedAt, status, updatedAt
```

---

### 9. **qualityReleases** (6 páginas)

**Campos:** Ver en quality.actions.ts

---

### 10. **qcPlansNew** (6 páginas)

**Campos que ESCRIBE:**
```
active, effectiveFrom, updatedAt
```

---

### 11. **shipments** (5 páginas)

**Campos que ESCRIBE:**
```
accountId, carrier, deliveryNoteGeneratedAt, deliveryNoteUrl, 
holdedInvoiceId, holdedInvoiceNumber, holdedInvoiceStatus, 
holdedSyncedAt, id, itemId, labelUrl, lines, name, orderId, 
partyId, qty, sendcloudParcelId, sku, status, trackingCode, 
trackingUrl, uom, updatedAt
```

---

### 12. **alerts** (5 páginas)

**Campos que ESCRIBE:**
```
department, kind, message, resolvedAt, severity, status, title, updatedAt
```

---

### 13. **warehouseSuppliers** (5 páginas)

---

### 14. **stockMoves** (4 páginas)

---

### 15. **ai_analyses** (4 páginas)

**Campos que ESCRIBE:**
```
analysis, complexity, createdAt, entityId, type
```

---

### 16. **gemini_usage** (4 páginas)

---

### 17. **interactions** (4 páginas)

**Campos que ESCRIBE:**
```
createdAt, date, dept, endAt, entityId, entityType, fromStatus, 
id, kind, metadata, note, plannedFor, resultNote, scheduledDate, 
startAt, status, timestamp, toStatus, updatedAt, userId, userName
```

---

### 18-58. **Otras 40 Colecciones Conectadas**

```
marketingEvents (3 páginas)
parties (3 páginas)
productionOrders (3 páginas)
campaigns (3 páginas)
dailyQuotas (3 páginas)
projects (3 páginas)
financeLinks (2 páginas)
recommendation_sets (2 páginas)
recommendation_actions (2 páginas)
system (2 páginas)
rules (2 páginas)
brain (2 páginas)
partyRoles (2 páginas)
posTactics (2 páginas)
_system (2 páginas)
orders (2 páginas)
sellout_records (2 páginas)
billOfMaterials (2 páginas)
invoices (2 páginas)
teamMembers (2 páginas)
events (2 páginas)
collaborations (2 páginas)
ads (2 páginas)
onlineCampaigns (2 páginas)
influencerCollabs (2 páginas)
plv_material (2 páginas)
ai_context_log (2 páginas)
qcPlans (2 páginas)
qcTests (2 páginas)
shipmentRequests (2 páginas)
webAnalytics (2 páginas)
opportunities (1 página)
equipment (1 página)
maintenance (1 página)
goodsReceipts (1 página)
payments (1 página)
sync_decisions (1 página)
entries (1 página)
posCostCatalog (1 página)
gemini_alerts (1 página)
email_queue (1 página)
```

---

## 📊 RESUMEN

**Total:** 58 colecciones conectadas al UI vía server actions

**Campos totales estimados:** ~250 campos únicos entre todas

**Para ver campos completos de cada colección:**
```bash
cat db-collections-analysis.json | jq '.lots'
cat db-collections-analysis.json | jq '.items'
cat db-collections-analysis.json | jq '.onHand'
```

**Colecciones con más páginas:**
1. accounts (16 páginas)
2. items (11 páginas)  
3. lots (9 páginas)
4. onHand (7 páginas)
5. tasks (7 páginas)
