# Auditoría de Inventario (Entrada / Warehouse Inventory)
_Fecha: 2025-10-18_ | _Actualizado: 2025-10-18_

## Resumen operativo
- **Arquitectura:** Migrado a **React Server Components (RSC)**. `src/app/(app)/warehouse/inventory/page.tsx` es ahora un server component que obtiene datos mediante `getInventorySnapshot()` y los pasa a `InventoryClient`.
- **UI actual:** `src/app/(app)/warehouse/inventory/InventoryClient.tsx` recibe el snapshot del servidor y gestiona interacción (filtros, tablas, drawers) únicamente en el cliente.
- **Backoffice asociado:** `src/server/actions/inventory.actions.ts` (`getInventorySnapshot`, `syncInventoryAlerts`, `createManualOnHand`, `rebuildOnHand`), `goods-receipt.actions.ts`, `warehouse.actions.ts`.
- **Helpers:** `src/lib/inventory.ts` (`computeSkuRollup`, `checkOrderStock`, etc), integración SSOT con `TraceEventFactory` y `makeAlertKey/makeTaskKey`.

## Observaciones clave

### 1. Server actions y SSOT
- `findNextLotNumber` genera prefijos `SKU-YYMM-XX`, pero las acciones que deberían usarlo (`createManualOnHand`, `rebuildOnHand`) son stubs; cualquier flujo que dependa de ellos no persiste datos reales.
- `computeSkuRollup` intenta calcular `totalValue` con `itemsMap`, pero indexa por `sku` cuando el mapa está construido por `item.id`; resultado: `totalValue` ≈ 0 siempre.
- Faltan validaciones al grabar ajustes manuales: no se normaliza UoM/warehouseId, no se bloquea creación de lotes duplicados, y `sendToQc` no propaga a cambios de estado QC.

### 2. UI / UX
- La página es `use client` y tira de `useData`, cargando todo el inventario en memoria; con datasets grandes se vuelve muy pesado. No hay paginación ni data fetching incremental.
- El filtro de QC compara literal `=== qcFilter`; los valores en onHand pueden venir en distintos casing (`hold`, `HOLD`, etc.). Falta normalización.
- En la vista SKU, la columna “Reservado” está mal calculada: `summary.lotsCount - summary.totalReleasedFree` mezcla conteo de lotes con unidades libres.
- En la vista por lotes, `lotRows` replica `r.qty` para cada `lotNumber`, sin usar el breakdown real de `lot.lotNumbers`; muestra cantidades incorrectas cuando el registro tiene varios lotes.
- No existen indicadores de accesibilidad (sin `aria` en botones/card, tabla no responsive accesible).

### 3. Integraciones y automatización
- ✅ **Alertas persistentes:** `syncInventoryAlerts` genera alertas con `alertKey/taskKey` que persisten en Firestore y se vinculan a TraceEvents.
- ✅ **TraceEvents:** Sistema de trazabilidad registra eventos tipo 'ALERT' para auditoría completa.
- ⚠️ Falta integración con Gemini/analizadores para generar `GeminiAnalysis` y tareas automáticas.
- ⚠️ El drawer de recepción (`GoodsReceiptDrawer`) requiere migración a `BaseDrawer` y optimización de fetches.

### 4. CSS / Tokens
- La vista usa clases como `.sb-card`, `.sb-toolbar`, etc., pero el drawer de recepción sigue utilizando componentes legacy (`SBDialog`, comboboxes personalizados) con estilos ad-hoc.
- Falta centralizar constantes (colores por categoría, iconografía QC) para que coincidan con el diseño general (nuevos tokens).

## Mejores prácticas y riesgos
- **Riesgo operacional:** al ser stubs, `createManualOnHand` y `rebuildOnHand` dan feedback positivo sin tocar la BBDD → confianza errónea en los ajustes.
- **Datos inconsistentes:** `computeSkuRollup` y `lotRows` reportan cantidades erróneas; cualquier decisión (pedido, reposición) basada en estos números es poco fiable.
- **Performance:** cargar todo `onHand` y `stockMoves` en el cliente escalará mal. Tampoco se memoiza `stockMoves.filter` por lot, lo que degrada al seleccionar repetidamente.
- **Automatización:** sin business rules ni Gemini, no hay alertas en tasks/agenda cuando un lote lleva demasiado tiempo en HOLD o un SKU cae a cero.

## Sugerencias de mejora (añadidas al registro)
1. **Implementar acciones reales de inventario** (crear movimientos, bloquear lotes, reconstrucción) y usar `TraceEventFactory` + `IntegrationLogger`.  
2. **Corregir `computeSkuRollup`** (map por `itemId`, totalValue real) y recalcular columnas en UI (`reservado`, `free`, `lotRows`).  
3. **Normalizar filtros QC y casing**, y ajustar FEFO usando datos de lotes maestros en vez de `createdAt`.  
4. **Migrar InventoryPage a server component** (RSC + hooks client mínimos) con paginación o data fetching incremental.  
5. **Conectar con `businessRules`/Gemini** para generar `alertKey/taskKey` cuando detecte stock crítico, lotes en HOLD > SLA, etc.  
6. **Unificar UI con `BaseDrawer` y tokens** (GoodsReceipt, ajustes manuales), revisando accesibilidad según checklist.  
7. **Revisar lot detail** para mostrar cantidades reales por lote (`lotNumbers[lot]`), historiales extensos y enlaces a trace events.  
8. **Rediseñar UX de cabeceras y herramientas**: consolidar estructura (una sola cabecera), aplicar tokens/typography y reorganizar filtros.  
9. **Optimizar recepciones y selección inteligente**: drawer unificado que autocomplete categoría, UoM, último coste, y permita costes logísticos/arancelarios.  
10. **Introducir códigos amigables** (lots/SKUs) accesibles para operadores.  
11. **Mejorar alertas persistentes**: convertir banners en señales alimentadas por `alertKey/taskKey` que lleguen a agenda/tareas.

## Próximos pasos
- Validar estas mejoras con el equipo (operaciones/logística) y priorizarlas en el plan maestro (F1/F2).  
- Abrir tickets específicos en `docs/mejoras-propuestas.md` o tablero de planning con el detalle técnico/UX necesario.
