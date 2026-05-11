# Auditoría Global – Integraciones & Conciliaciones (Shopify · Holded · Sendcloud · R15)

**Alcance:** Ciclo completo de integraciones externas (Shopify, Holded, Sendcloud) y reglas de conciliación (R15).  
**Fuentes analizadas:**  
- `src/server/actions/shopify-sync.ts`, `shopify-dashboard.ts`, `shopify` clients  
- `src/server/actions/holded-accounts-sync.ts`, `holded-orders-sync.ts`, `holded-sync.ts`, `holded-treasury-sync.ts`, `holded` clients  
- `src/server/actions/sendcloud-sync.ts`, `sendcloud` clients  
- `src/server/actions/master-sync.ts`, `integration-tests.ts`, `link-orders.ts`  
- `src/domain/integration-helpers.ts`, `src/lib/order-flow-validators.ts`  
- SSOT (`src/domain/ssot.ts`) para metadatos de sincronización.

---

## Shopify

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| `syncOrdersFromShopify` importa/actualiza pedidos directamente en Firestore sin validaciones adicionales (stock, reservas, conciliación). | ⚠ | `shopify-sync.ts` |
| La creación de cuentas/parties se hace “on the fly” dentro del sync (acopla dominio CRM con integración). | ⚠ | `findOrCreateAccount` |
| No hay trazabilidad (`TraceEvent`) ni registros de alerta para pedidos importados. | ⚠ | Falta en código |
| `updateShopifyInventory` depende de mapping manual `item.external.shopifyVariantId` (TODO pendiente). | ⚠ | Comentarios en código |
| `fulfillShopifyOrder` marca el pedido como `shipped` en ERP sin verificar lotes/líneas; no emite alertas si Shopify rechaza fulfillment. | ⚠ | `shopify-sync.ts` |
| Dashboards (`shopify-dashboard`, `analytics`) muestran placeholders; no hay pipeline de métricas consolidado. | ⚠ | `AnalyticsContent.tsx` |

**Quick wins**
1. Extraer capa `ShopifyIntegrationService` con métodos puramente técnicos (obtener pedidos, crear fulfillment, actualizar stock) y separar la lógica ERP en `ShopifyImportUseCase`.
2. Conectar importaciones con `TraceEvent` (`phase='SALE', kind='SHOPIFY_IMPORT'`) y `alertKey`.
3. Implementar tabla de mapping SKU ↔ variant ID y validaciones FEFO antes de fulfill.
4. Integrar conciliaciones: al importar, registrar relación `linkage.shopifyId` y usar `link-orders` para auditoría.

---

## Holded

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Existen múltiples acciones (`importAccountsFromHolded`, `importOrdersFromHolded`, `syncShipmentToHolded`, etc.) con lógica extensa y repetida (mapear contactos, crear party). | ⚠⚠ | `holded-*.ts` |
| Varias funciones dependen de clientes `HoldedClient` pero incluyen mocks/pendiente de implementación (tesorería, exportaciones). | ⚠ | `holded-treasury-sync.ts`, comentarios TODO |
| Falta manejo de idempotencia (`alertKey`/`sync tokens`) → riesgo de duplicados (shadow accounts). | ⚠ | `holded-orders-sync.ts`, `hydrated/shadow` logs |
| `syncShipmentToHolded` crea factura e impacta stock, pero no valida estados previos ni crea `TraceEvent` logístico. | ⚠ | `holded-sync.ts` |
| No hay conciliación automática de montos (`order.total` vs `invoice.totalPaid`). | ⚠⚠ | R15 incumplido |

**Quick wins**
1. Crear `HoldedMapper` común (contact, order, payment) y factorizar en helpers reutilizables.
2. Añadir `syncCursor`/`lastSyncAt` por colección y `alertKey` al crear/actualizar docs.
3. Implementar reconciliación (R15): reportes que comparen pedidos ERP ↔ facturas/tesorería Holded.
4. Registrar `TraceEvent` (`phase='FINANZAS'`, `kind='HOLDED_SYNC'`) en cada operación y persistir errores en `IntegrationLogs`.

---

## Sendcloud

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| `createSendcloudShipment` integra con `SendcloudClient`, crea label y actualiza shipment, pero no valida FEFO/lotes ni estados previos. | ⚠ | `sendcloud-sync.ts` |
| Los tests (`integration-tests.ts`) se ejecutan en “mock mode”; la integración real depende del client. | ⚠ | Mensajes “mock mode” |
| No existen hooks para tramitar webhooks de tracking (actualizar estados `IN_TRANSIT`, etc.). | ⚠ | `master-sync.ts` pendiente |
| No se genera `TraceEvent` (`SHIPMENT`) ni `alertKey`. | ⚠ | Falta en código |
| Falta pipeline proactivo: sugeréncia de carrier, costo/ SLA → sin uso de Gemini. | ⚠ | No implementado |

**Quick wins**
1. Añadir servicio `SendcloudWebhookHandler` para status updates → `TraceEvent` (`phase='DELIVERY'`) + tasks de incidencia.
2. Incorporar `alertKey` (por shipmentId + carrier) y logging estructurado.
3. Reutilizar validaciones de inventario antes de crear label (stock reservado, lotes liberados).
4. Añadir análisis de coste/SLA con Gemini (usando data histórica).

---

## Conciliaciones (R15)

| Regla | Estado | Evidencia / Gap |
| --- | --- | --- |
| R15.1 `Σ shipment.lines.qty = Σ order.items.qty` | ⚠ | No se encontró job/validator; depende de procesos manuales. |
| R15.2 `amountPaid = invoice.totalPaid` | ⚠⚠ | Sin reporte automático. `link-orders` hace matching textual, pero no compara importes. |
| R15.3 `reservas` restan stock temporal; solo `ENVIADO` descuenta `onHand` | ⚠ | No hay garantía: `syncShipmentToHolded` puede liberar stock sin validar reservas. |
| R15.4 `hasTraceability` → ninguna línea de envío sin `lotId` | ⚠ | No hay validador central; riesgo al crear shipments manualmente. |

**Quick wins**
1. Crear `reconciliation.jobs.ts` con checks programados (diario) que comparen pedidos ↔ shipments ↔ facturas ↔ cobros; guardar resultados en colección `reconciliationReports`.
2. Integrar alertas en Gemini (severity por gap detectado) + tasks automáticas para logística/finanzas.
3. Añadir validadores transaccionales (`order-flow-validators`) antes de confirmar pedidos y antes de sincronizar a Holded/Sendcloud.
4. Guardar `TraceEvent` específico cuando conciliaciones fallen (`phase='FINANZAS'`, `kind='RECONCILIATION_FAIL'`).

---

## Conclusión Integraciones

1. **Implementación parcial** – Existen clientes y acciones, pero con lógica dispersa, sin trazabilidad ni idempotencia. Varias operaciones están en modo mock o stubs.
2. **Falta de orquestación** – `master-sync.ts` intenta sincronizar todo, pero carece de controles de errores detallados y reporting consolidado.
3. **Conciliación pendiente** – Las reglas R15 no se aplican automáticamente; se requiere un módulo dedicado.

---

## Próximas acciones recomendadas

1. **Integration Hub**  
   - Crear carpeta `src/server/integrations/hub` con orchestrator (`runShopifySync`, `runHoldedSync`, etc.) que devuelva reportes estructurados.
   - Persistir logs en `integrationLogs` con `alertKey`.

2. **Motor de conciliaciones**  
   - Job `runReconciliations()` con checks R15 + generación de tasks/alerts.

3. **Unificación TraceEvent**  
   - Añadir helpers para registrar eventos en cada integración (import, export, reconciliación) siguiendo `TraceEventPhase` y `TraceEventKind`.

4. **Integración con Gemini**  
   - Aprovechar datos de integraciones para scoring (fraude, SLA, pagos vencidos) y acciones proactivas (tasks automáticas).

---

**Checklist progreso:**  
- Aguas abajo ✅  
- Aguas arriba ✅  
- Integraciones & conciliaciones ✅ (este informe)  
- Próximos pasos: definir capa SSOT + Gemini hooks y síntesis final.
