# ✅ Plan de Validación de Módulos Reactivados

## 📋 Checklist de Validación

### 1. Acceso y Autenticación
- [ ] Iniciar sesión en http://localhost:3001
- [ ] Verificar que el usuario tiene rol de Admin para ver todos los módulos

---

## 🏭 Módulo: Producción (/production)

### Dashboard
- [ ] Navegar a `/production/dashboard`
- [ ] Verificar que carga sin errores en consola
- [ ] Comprobar que muestra información relevante

### BOM (Bill of Materials)
- [ ] Navegar a `/production/bom`
- [ ] Verificar que carga la lista de recetas
- [ ] Comprobar que usa tipos `BillOfMaterial` del SSOT

### Execution
- [ ] Navegar a `/production/execution`
- [ ] Verificar que muestra órdenes de producción
- [ ] Comprobar que usa tipos `ProductionOrder` del SSOT

**Layout:**
- [ ] Verificar que tiene ModuleHeader con icono Factory
- [ ] Verificar navegación interna entre pestañas

---

## 🥼 Módulo: Calidad (/quality)

### Dashboard
- [ ] Navegar a `/quality/dashboard`
- [ ] Verificar que carga sin errores

### Lot Release
- [ ] Navegar a `/quality/lot-release`
- [ ] Verificar que muestra lotes para liberación
- [ ] Comprobar que usa tipos `Lot`, `QcTest` del SSOT

### Trazabilidad
- [ ] Navegar a `/quality/traceability` (CORREGIDO)
- [ ] Verificar que carga la página completa de trazabilidad
- [ ] Seleccionar un producto y lote
- [ ] Verificar que genera el informe completo con:
  - [ ] Genealogía
  - [ ] Resumen de Calidad
  - [ ] Historial cronológico
- [ ] Comprobar que usa tipos `Lot`, `LotGenealogyEdge` del SSOT

### Parámetros
- [ ] Navegar a `/quality/parametros`
- [ ] Verificar que muestra planes y parámetros de QC
- [ ] Comprobar que usa tipos `QcPlanBySku`, `ParameterBySku` del SSOT

**Layout:**
- [ ] Verificar que tiene ModuleHeader con icono ShieldCheck
- [ ] Verificar navegación interna entre pestañas

---

## 🚚 Módulo: Almacén (/warehouse)

### Inventario
- [ ] Navegar a `/warehouse/inventory` (ACTUALIZADO)
- [ ] Verificar que muestra el dashboard de inventario
- [ ] Verificar tabs "Por SKU" y "Por Lote"
- [ ] Probar filtros:
  - [ ] Búsqueda por texto
  - [ ] Filtro por ubicación
  - [ ] Filtro por QC
  - [ ] Toggle "Solo con Stock"
- [ ] Verificar que usa tipos `OnHandView`, `Item` del SSOT
- [ ] Verificar botón "Nueva Recepción"
- [ ] Verificar botón "Ajuste Manual"

### Recepciones
- [ ] Navegar a `/warehouse/goods-receipt` (ACTUALIZADO)
- [ ] Verificar que carga la página
- [ ] Comprobar que usa tipos `GoodsReceipt` del SSOT

### Logística
- [ ] Navegar a `/warehouse/logistics` (ACTUALIZADO)
- [ ] Verificar que muestra envíos y logística
- [ ] Comprobar que usa tipos `Shipment`, `StockMove` del SSOT

**Layout:**
- [ ] Verificar que tiene ModuleHeader con icono Warehouse
- [ ] Verificar navegación interna entre pestañas

---

## 💵 Módulo: Finanzas (/finance)

### Dashboard
- [ ] Navegar a `/finance/dashboard`
- [ ] Verificar que carga sin errores

### Cobros
- [ ] Navegar a `/finance/cobros`
- [ ] Verificar que muestra información de cobros
- [ ] Comprobar que usa tipos `FinanceLink` del SSOT

### Pagos
- [ ] Navegar a `/finance/pagos`
- [ ] Verificar que muestra información de pagos
- [ ] Comprobar que usa tipos `PaymentLink` del SSOT

**Sin Layout Propio:**
- [ ] Verificar que usa solo la estructura `sb-page`

---

## ⚙️ Módulo: Admin (/admin)

### Integraciones
- [ ] Navegar a `/admin/integrations`
- [ ] Verificar que muestra integraciones disponibles

### Variables
- [ ] Navegar a `/admin/variables`
- [ ] Verificar que muestra variables del sistema

### Settings (NUEVO)
- [ ] Navegar a `/admin/settings`
- [ ] Verificar que carga la nueva página
- [ ] Confirmar que muestra "Configuración del Sistema"

### Users (NUEVO)
- [ ] Navegar a `/admin/users`
- [ ] Verificar que carga la nueva página
- [ ] Confirmar que muestra "Gestión de Usuarios"

**Sin Layout Propio:**
- [ ] Verificar que usa solo la estructura `sb-page`

---

## 🎨 Validación de Sidebar

### Navegación Principal
- [ ] Verificar que todos los módulos están visibles
- [ ] Verificar iconos correctos para cada módulo
- [ ] Probar colapsar/expandir sidebar

### Hover Popover
- [ ] Colapsar sidebar
- [ ] Hacer hover sobre cada módulo
- [ ] Verificar que aparece el popover con sub-items
- [ ] Verificar que los links funcionan desde el popover

### Accordion
- [ ] Expandir sidebar
- [ ] Hacer clic en cada módulo para expandir accordion
- [ ] Verificar que muestra los sub-items correctos
- [ ] Verificar resaltado del item activo

---

## 🔍 Validación de Consola

Durante toda la navegación:
- [ ] No hay errores en consola del navegador
- [ ] No hay warnings de tipos TypeScript
- [ ] No hay errores 404 de recursos
- [ ] No hay errores de SSOT (tipos no encontrados)

---

## 📊 Verificación SSOT

Para cada módulo, confirmar que usa los tipos correctos:

### Production
- [ ] `BillOfMaterial`
- [ ] `ProductionOrder`
- [ ] `ProductionStatus`
- [ ] `Uom`

### Quality
- [ ] `Lot`
- [ ] `QcStatus`
- [ ] `QcTest`
- [ ] `QcPlanBySku`
- [ ] `ParameterBySku`
- [ ] `LotGenealogyEdge`

### Warehouse
- [ ] `OnHandView`
- [ ] `StockMove`
- [ ] `Shipment`
- [ ] `GoodsReceipt`
- [ ] `Item`

### Finance
- [ ] `FinanceLink`
- [ ] `PaymentLink`
- [ ] `Currency`

---

## 🎯 Resultado Esperado

Al completar esta validación:
- ✅ Todos los módulos deben cargar sin errores
- ✅ La navegación debe ser fluida entre módulos
- ✅ Los tipos del SSOT deben estar correctamente implementados
- ✅ No debe haber rutas 404
- ✅ La Sidebar debe mostrar todos los módulos correctamente

---

## 🐛 Registro de Problemas Encontrados

| Módulo | Ruta | Problema | Prioridad |
|--------|------|----------|-----------|
|        |      |          |           |

---

## ✅ Estado Final

- [ ] Todos los ítems del checklist completados
- [ ] Todos los problemas documentados
- [ ] Módulos listos para uso en producción
