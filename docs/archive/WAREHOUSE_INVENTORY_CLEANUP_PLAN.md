# Plan de Limpieza - Módulo Warehouse/Inventory

## Fecha: 20/10/2025

## Objetivo
Eliminar todos los componentes, páginas y features que NO estén relacionados con el módulo `/warehouse/inventory`.

## Análisis Realizado

### ✅ Componentes USADOS por `/warehouse/inventory`:

**Ubicación: `src/features/warehouse/inventory/`**
- ✅ `components/InventoryFiltersBar.tsx`
- ✅ `components/SkuAccordionRow.tsx`
- ✅ `hooks/useInventoryData.ts`
- ✅ `hooks/useInventoryFilters.ts`

**Ubicación: `src/features/warehouse/components/`**
- ✅ `GoodsReceiptDrawer.tsx` - Usado en InventoryClient
- ✅ `InventoryDashboard.tsx` - Usado en InventoryClient

**Ubicación: `src/app/(app)/warehouse/inventory/`**
- ✅ `page.tsx`
- ✅ `InventoryClient.tsx`
- ✅ `components/NewOnHandDialog.tsx`
- ✅ `components/LotDetailPanel.tsx`
- ✅ `components/LotRows.tsx`
- ✅ `components/ItemDetailDrawer.tsx`
- ✅ `components/PricingModal.tsx`
- ✅ `components/SkuAccordionRow.tsx`

### ❌ Archivos MARCADOS para ELIMINACIÓN:

#### 1. Componentes de Logistics (NO usados en inventory)
- ❌ `src/features/warehouse/components/LogisticsKPIs.tsx`
- ❌ `src/features/warehouse/components/NewShipmentDialog.tsx`
- ❌ `src/features/warehouse/components/ShipmentsTable.tsx`
- ❌ `src/features/warehouse/components/ValidateDialog.tsx`

**Razón:** Estos componentes SOLO se usan en `/warehouse/logistics/page.tsx`, no en inventory.

#### 2. Páginas/Módulos NO relacionados con inventory
- ❌ `src/app/(app)/warehouse/logistics/` (directorio completo)
  - `page.tsx`
  - `actions.ts`
- ❌ `src/app/(app)/warehouse/dashboard/` (directorio completo)
  - `page.tsx`
- ❌ `src/app/(app)/warehouse/goods-receipt/page.tsx.bak` (archivo backup)

**Razón:** Estos módulos son independientes del módulo de inventory.

#### 3. Archivo de layout (REVISAR)
- ⚠️ `src/app/(app)/warehouse/layout.tsx` - **MANTENER** (layout compartido)

## Acciones a Ejecutar

### Paso 1: Eliminar componentes de logistics
```bash
rm src/features/warehouse/components/LogisticsKPIs.tsx
rm src/features/warehouse/components/NewShipmentDialog.tsx
rm src/features/warehouse/components/ShipmentsTable.tsx
rm src/features/warehouse/components/ValidateDialog.tsx
```

### Paso 2: Eliminar módulos no relacionados
```bash
rm -rf src/app/(app)/warehouse/logistics/
rm -rf src/app/(app)/warehouse/dashboard/
rm src/app/(app)/warehouse/goods-receipt/page.tsx.bak
```

### Paso 3: Verificar imports rotos
Después de eliminar los archivos, verificar que no haya imports rotos ejecutando:
```bash
npm run build
```

## Impacto Esperado

### ✅ Archivos que permanecen (módulo inventory):
- 2 hooks personalizados
- 2 componentes en features/warehouse/inventory
- 2 componentes compartidos (GoodsReceiptDrawer, InventoryDashboard)
- 1 página principal
- 1 cliente de inventario
- 6 componentes de página

Total: **14 archivos** relacionados con inventory

### ❌ Archivos eliminados:
- 4 componentes de logistics
- 2 páginas/módulos completos (logistics, dashboard)
- 1 archivo backup

Total: **~7 archivos/directorios** eliminados

## Estado: ✅ COMPLETADO

### Resultados de la Limpieza

#### ✅ Archivos Eliminados Exitosamente:

**Componentes de logistics eliminados:**
- ✅ `src/features/warehouse/components/LogisticsKPIs.tsx`
- ✅ `src/features/warehouse/components/NewShipmentDialog.tsx`
- ✅ `src/features/warehouse/components/ShipmentsTable.tsx`
- ✅ `src/features/warehouse/components/ValidateDialog.tsx`

**Módulos eliminados:**
- ✅ `src/app/(app)/warehouse/logistics/` (directorio completo con page.tsx y actions.ts)
- ✅ `src/app/(app)/warehouse/dashboard/` (directorio completo con page.tsx)
- ✅ `src/app/(app)/warehouse/goods-receipt/page.tsx.bak`

#### ✅ Verificación de Build:

El build de Next.js compiló correctamente después de la limpieza. Los warnings que aparecen son de otros módulos no relacionados (campaigns, shopify, gmail) y NO están relacionados con los archivos eliminados del warehouse.

**Conclusión:** No se detectaron imports rotos ni errores relacionados con el módulo warehouse/inventory después de la limpieza.

#### 📊 Estructura Final del Módulo Inventory:

**`src/features/warehouse/`**
```
components/
  ├── GoodsReceiptDrawer.tsx ✅
  └── InventoryDashboard.tsx ✅
inventory/
  ├── components/
  │   ├── InventoryFiltersBar.tsx ✅
  │   └── SkuAccordionRow.tsx ✅
  └── hooks/
      ├── useInventoryData.ts ✅
      └── useInventoryFilters.ts ✅
```

**`src/app/(app)/warehouse/`**
```
layout.tsx ✅
inventory/
  ├── page.tsx ✅
  ├── InventoryClient.tsx ✅
  └── components/
      ├── ItemDetailDrawer.tsx ✅
      ├── LotDetailPanel.tsx ✅
      ├── LotRows.tsx ✅
      ├── NewOnHandDialog.tsx ✅
      ├── PricingModal.tsx ✅
      └── SkuAccordionRow.tsx ✅
goods-receipt/ (directorio vacío)
```

#### 🔄 Segunda Fase de Limpieza - Archivos Server y Drawer:

**Archivos server eliminados:**
- ✅ `src/server/actions/logistics.actions.ts` - Solo usada por página eliminada de logistics

**Drawer eliminado:**
- ✅ `src/app/(app)/@drawer/(.)warehouse/` (directorio completo con logistics/[id]/page.tsx)

**Archivos server MANTENIDOS (usados por inventory):**
- ✅ `src/server/actions/warehouse.actions.ts` - Usado por GoodsReceiptDrawer
- ✅ `src/server/actions/warehouse-suppliers.ts` - Usado por GoodsReceiptDrawer
- ✅ `src/server/actions/inventory.actions.ts` - Core del módulo inventory

### Resumen Final:

- **Archivos mantenidos:** 14 archivos esenciales del módulo inventory + 3 server actions
- **Archivos eliminados en total:** 9 archivos/directorios no relacionados
  - 4 componentes de logistics (features)
  - 3 páginas/módulos (logistics, dashboard, goods-receipt backup)
  - 1 archivo server actions (logistics.actions.ts)
  - 1 drawer completo (logistics)
- **Imports rotos:** 0
- **Errores de compilación:** 0 (relacionados con esta limpieza)

El módulo `/warehouse/inventory` ahora está completamente limpio y solo contiene los componentes, hooks, páginas y server actions que utiliza directamente.
