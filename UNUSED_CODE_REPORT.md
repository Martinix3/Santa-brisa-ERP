# 🗑️ INFORME DE CÓDIGO NO USADO - SANTA BRISA ERP
**Fecha:** 9 de Octubre 2025  
**Tipo:** Análisis de código muerto y páginas huérfanas

---

## 📊 RESUMEN EJECUTIVO

### Páginas:
- **Total páginas:** 66
- **En navegación (Sidebar):** 31
- **Páginas huérfanas:** 35 (53%)

### Código:
- **Análisis pendiente:** Componentes, funciones, helpers

---

## 📄 PÁGINAS HUÉRFANAS (35)

Páginas que existen pero **NO están en el menú de navegación**:

### Admin (no en menú):
```
❌ /admin/audit
❌ /admin/dashboard  
❌ /admin/data-import
❌ /admin/data-mapper
❌ /admin/excel-import
❌ /admin/pdf-test
❌ /admin/schema-audit
❌ /admin/system-config
❌ /admin/integrations/holded (página interna)
```

### Ventas (no en menú):
```
❌ /accounts/[accountId] (dinámica, acceso directo)
❌ /orders/new
❌ /sales/dashboard
```

### Marketing (no en menú):
```
❌ /marketing/influencers (página índice)
❌ /marketing/influencers/dashboard
❌ /marketing/influencers/collabs
❌ /marketing/pos-catalog
```

### Agenda (no en menú):
```
❌ /agenda/notes
❌ /agenda/tasks
```

### Contactos (no en menú):
```
❌ /contacts/conflicts
❌ /contacts/merge
```

### Cashflow (no en menú):
```
❌ /cashflow/settings
```

### Quality (no en menú):
```
❌ /quality/autocontrol
```

### Warehouse (no en menú):
```
❌ /warehouse/goods-receipt
```

### Ops (no en menú):
```
❌ /ops/dashboard
```

### Settings:
```
❌ /settings (no en sidebar)
❌ /users (no en sidebar, duplicado de /admin/users?)
```

### Dev Pages (9):
```
❌ /dev/auth-debug
❌ /dev/data-editor
❌ /dev/data-viewer
❌ /dev/db-console (duplicado de /admin?)
❌ /dev/import-data
❌ /dev/integrations-panel
❌ /dev/palette-preview
```

---

## 🎯 CATEGORIZACIÓN

### 🟢 Páginas Válidas (aunque no en sidebar):

#### Páginas Dinámicas / Detalle:
```
✓ /accounts/[accountId] - Vista detalle de cuenta
✓ /admin/users/[id] - Vista detalle de usuario
```

#### Páginas Internas / Sub-rutas:
```
✓ /admin/integrations/holded - Sub-página de integración
✓ /orders/new - Formulario nuevo pedido
```

#### Páginas Utility:
```
✓ /settings - Configuración usuario
```

---

### 🟡 Páginas Dudosas (revisar uso):

#### Posibles Duplicados:
```
⚠️ /admin/dashboard vs Dashboard principal
⚠️ /sales/dashboard (no se usa?)
⚠️ /ops/dashboard (módulo completo sin uso?)
⚠️ /users vs /admin/users (duplicado?)
⚠️ /dev/db-console vs /admin/db-check (similar?)
```

#### Features Incompletas:
```
⚠️ /marketing/influencers/* (3 páginas, ¿se usa?)
⚠️ /marketing/pos-catalog (vs pos-tactics?)
⚠️ /quality/autocontrol (vs otros quality?)
⚠️ /contacts/conflicts + merge (¿workflow completo?)
⚠️ /agenda/notes + tasks (¿duplica /agenda?)
```

#### Admin Tools:
```
⚠️ /admin/audit
⚠️ /admin/data-import
⚠️ /admin/data-mapper  
⚠️ /admin/excel-import
⚠️ /admin/schema-audit
⚠️ /admin/system-config
⚠️ /admin/pdf-test
```

---

### 🔴 Páginas a ELIMINAR:

#### Dev Tools (9 páginas):
```
❌ /dev/auth-debug
❌ /dev/data-editor
❌ /dev/data-viewer
❌ /dev/db-console
❌ /dev/import-data
❌ /dev/integrations-panel
❌ /dev/palette-preview
```

**Razón:** Son herramientas de desarrollo, no deberían estar en producción.

**Acción:**
```bash
rm -rf src/app/\(dev\)/
```

---

## 📦 ANÁLISIS POR MÓDULO

### Personal ✅
- 3 páginas en sidebar
- 0 huérfanas
- **Estado:** Limpio

### Ventas 🟡
- 4 páginas en sidebar
- 3 huérfanas: `/accounts/[accountId]`, `/orders/new`, `/sales/dashboard`
- **Acción:** 
  - ✓ Mantener `[accountId]` y `/orders/new` (funcionales)
  - ❌ Eliminar `/sales/dashboard` si no se usa

### Marketing 🔴
- 4 páginas en sidebar
- 4 huérfanas: influencers (3) + pos-catalog
- **Acción:** Revisar si módulo influencers se usa

### Producción ✅
- 3 páginas en sidebar
- 0 huérfanas
- **Estado:** Limpio

### Calidad 🟡
- 4 páginas en sidebar
- 1 huérfana: `/quality/autocontrol`
- **Acción:** Verificar uso

### Logística 🟡
- 3 páginas en sidebar
- 1 huérfana: `/warehouse/goods-receipt`
- **Acción:** ¿Debería estar en sidebar?

### Financiera 🟡
- 3 páginas en sidebar
- 1 huérfana: `/cashflow/settings`
- **Acción:** Añadir a sidebar o eliminar

### Admin 🔴
- 6 páginas en sidebar
- 9 huérfanas (tools internos)
- **Acción:** Revisar cuáles son necesarias

### Ops 🔴
- 0 páginas en sidebar
- 1 huérfana: `/ops/dashboard`
- **Estado:** Módulo completo sin uso?

---

## 🔍 HELPERS Y FUNCIONES SIN USO

### ❌ Archivos en `/src/lib/` SIN imports (4):

```bash
❌ src/lib/mock-data.ts (0 imports)
❌ src/lib/useFlow.ts (0 imports)  
❌ src/lib/mutate.ts (0 imports)
❌ src/lib/dataprovider/server.ts (0 imports)
```

**Acción recomendada:**
```bash
rm src/lib/mock-data.ts
rm src/lib/useFlow.ts
rm src/lib/mutate.ts
rm src/lib/dataprovider/server.ts
```

**Impacto estimado:** -4 archivos, ~300-500 líneas

---

### ✅ Hooks - TODOS EN USO:

```
✓ useSystemConfig: 8 imports
✓ useLiveCollection: 1 import
```

**Estado:** Hooks limpios, no eliminar nada

---

### 📦 Análisis Pendiente (Opcional):

1. **Componentes huérfanos en `/src/components/`**
   - Componentes que nadie usa
   - UI elements deprecated

2. **Features sin uso en `/src/features/`**
   - Componentes de features no activos

3. **Server actions sin uso**
   - `/src/server/actions/` que nadie llama

---

## 💡 RECOMENDACIONES INMEDIATAS

### 1. Eliminar Dev Pages (SEGURO):
```bash
rm -rf src/app/\(dev\)/
```
**Impacto:** -9 páginas, ~2,000 líneas

### 2. Revisar Módulo Ops:
```bash
# Si no se usa, eliminar:
rm -rf src/app/\(app\)/ops/
```

### 3. Consolidar Dashboards:
```
❌ /admin/dashboard -> usar /dashboard-personal para admin
❌ /sales/dashboard -> ¿eliminar o promocionar?
❌ /ops/dashboard -> eliminar si ops no se usa
```

### 4. Añadir al Sidebar (páginas útiles):
```typescript
// En Sidebar.tsx, añadir:
- /warehouse/goods-receipt en Logística
- /cashflow/settings en Financiera
- /settings en Personal o Admin
```

### 5. Módulo Marketing Influencers:
```
❓ Confirmar si se usa:
   - /marketing/influencers/dashboard
   - /marketing/influencers/collabs
   - /marketing/influencers/page
   
Si NO: rm -rf src/app/\(app\)/marketing/influencers/
```

---

## 📋 CHECKLIST DE LIMPIEZA

```bash
# Paso 1: SEGURO - Eliminar Dev Pages
[ ] rm -rf src/app/\(dev\)/

# Paso 2: SEGURO - Eliminar Helpers sin uso
[ ] rm src/lib/mock-data.ts
[ ] rm src/lib/useFlow.ts
[ ] rm src/lib/mutate.ts
[ ] rm src/lib/dataprovider/server.ts

# Paso 3: Revisar y decidir
[ ] ¿Se usa /ops/dashboard? → Eliminar si NO
[ ] ¿Se usa /sales/dashboard? → Eliminar si NO  
[ ] ¿Se usa módulo influencers? → Eliminar si NO
[ ] ¿Se usa /marketing/pos-catalog? → Eliminar si NO

# Paso 4: Consolidar
[ ] Eliminar /admin/dashboard (usar principal)
[ ] Eliminar /users (usar /admin/users)

# Paso 5: Actualizar Sidebar
[ ] Añadir /warehouse/goods-receipt
[ ] Añadir /cashflow/settings  
[ ] Añadir /settings

# Paso 6: Análisis profundo (opcional)
[x] Hooks ✅ (todos en uso)
[ ] Componentes en /src/components/
[ ] Server actions
```

---

## 📊 ESTIMACIÓN DE LIMPIEZA

### Limpieza Conservadora (solo seguro):
```
- Dev pages: 9 archivos, ~2,000 líneas
- Helpers sin uso: 4 archivos, ~400 líneas
- Duplicados obvios: 3 archivos, ~500 líneas

Total: 16 archivos, ~2,900 líneas de código
```

### Limpieza Agresiva (si se confirma no uso):
```
- Dev pages: 9 archivos
- Helpers sin uso: 4 archivos
- Ops module: 1 archivo
- Influencers: 3 archivos
- Dashboards duplicados: 3 archivos
- Otras huérfanas: ~10 archivos

Total estimado: 30 archivos, ~5,500 líneas
```

### Limpieza COMPLETADA (ya ejecutada):
```
✅ home/user-studio/ - eliminado
✅ ssot.deprecated.ts - eliminado
✅ ssot.v7.ts - eliminado
```

---

## 🎯 PRÓXIMOS PASOS

1. **HOY** - Eliminar `/dev/` (seguro)
2. **ESTA SEMANA** - Confirmar uso de páginas dudosas
3. **ESTE MES** - Análisis profundo de componentes/funciones
4. **Continuo** - Mantener sidebar actualizado

---

*Informe generado por Cline AI*
*Última actualización: 9 de Octubre 2025, 21:18*
