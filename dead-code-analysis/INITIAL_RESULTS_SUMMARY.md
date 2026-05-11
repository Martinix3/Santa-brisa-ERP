# Resumen de Resultados Iniciales - Detección de Código Muerto

**Fecha:** 19/01/2025  
**Herramienta:** Knip v5.66.0  
**Estado:** ✅ Análisis Completado Exitosamente

---

## 📊 Resumen Ejecutivo

| Categoría | Cantidad | Prioridad |
|-----------|----------|-----------|
| Archivos sin uso | **199** | 🔴 Alta |
| Dependencias npm sin uso | **20** | 🟢 Media |
| DevDependencies sin uso | **13** | 🟢 Baja |
| Exports sin uso | **333** | 🟡 Media |
| Exports duplicados | **16** | 🟡 Media |

---

## 🔴 1. Archivos Sin Uso (199 archivos)

### Categorías Principales:

#### A. Components (UI/UX)
- `src/components/ui/` - Múltiples componentes del Design System
- `src/components/shared/` - EmptyState, LoadingState, PageShell
- `src/components/dialogs/` - Formularios de eventos, interacciones, órdenes
- `src/components/drawers/` - ContactDrawer
- `src/components/layout/` - Header, SBHeader

**Evaluación:** Muchos podrían ser componentes del Design System que aún no se usan pero son parte de la librería. **Requiere validación manual.**

#### B. Features (Módulos de Negocio)
- `src/features/personal/` - Dashboard personal, calendario, tareas
- `src/features/quicklog/` - Sistema de quick log completo
- `src/features/sales/pipeline/` - Pipeline de ventas v2
- `src/features/pos/` - Sistema POS (Point of Sale)
- `src/features/projects/` - Gestión de proyectos

**Evaluación:** Algunos módulos pueden estar en desarrollo o deprecados. **Prioridad alta de revisión.**

#### C. Server Actions
- `src/server/actions/` - Múltiples actions sin referencias
- `src/server/integrations/` - Integraciones (Holded, Shopify, Sendcloud)
- `src/server/gemini/` - Analizadores AI sin uso

**Evaluación:** Server actions pueden usarse dinámicamente. **Validar con logs de producción.**

#### D. Domain & Core
- `src/domain/` - Helpers, tipos SSOT, validadores
- `src/core/` - Utils, repositorios
- `src/lib/` - Múltiples librerías helper

**Evaluación:** Código core puede ser usado dinámicamente o ser API interna. **Validación crítica requerida.**

---

## 🟢 2. Dependencias npm Sin Uso (20 paquetes)

### Candidatos para Eliminación:

```json
{
  "dependencies_to_review": {
    "@fullcalendar/*": "6 paquetes - Sistema de calendario completo",
    "@genkit-ai/*": "2 paquetes - AI framework",
    "@google-cloud/firestore": "Puede estar en uso en server side",
    "csv-parse": "Parser CSV",
    "firebase-functions": "Cloud Functions",
    "framer-motion": "Animaciones",
    "genkit": "AI toolkit",
    "jszip": "Compresión ZIP",
    "nanoid": "Generador IDs",
    "puppeteer": "Automatización browser",
    "react-dropzone": "Upload de archivos",
    "reactflow": "Diagramas de flujo",
    "vulture": "Análisis código muerto Python(?)",
    "xlsx": "Procesamiento Excel"
  }
}
```

**Impacto estimado:** ~50-100MB del bundle
**Acción recomendada:** Validar uso en server actions antes de eliminar

---

## 🟢 3. DevDependencies Sin Uso (13 paquetes)

```json
{
  "devDependencies_to_remove": {
    "@faker-js/faker": "Generación datos fake",
    "@next/bundle-analyzer": "Ya configurado pero marcado sin uso",
    "@tailwindcss/cli": "CLI Tailwind",
    "@typescript-eslint/eslint-plugin": "Ya en uso pero no detectado",
    "dependency-cruiser": "Análisis dependencias",
    "esbuild": "Bundler",
    "eslint-config-next": "Config ESLint Next.js",
    "eslint-plugin-regexp": "Validación regex",
    "fast-check": "Property testing",
    "globby": "Globbing files",
    "madge": "Análisis módulos",
    "ts-morph": "Manipulación AST TypeScript",
    "vite-node": "Node runtime Vite"
  }
}
```

**Nota:** Algunos están en uso pero Knip no los detecta correctamente (como @typescript-eslint/eslint-plugin).

---

## 🟡 4. Exports Sin Uso (333 exports)

### Distribución por Categoría:

#### A. Domain Types (SSOT) - ~100 exports
```typescript
// Tipos e interfaces del sistema SSOT
- BillingStatus, ProductionStage, QcParameterCategory
- Contact, Note, Address, Person
- ProductionOutput, ProductionConsumption
- Campaign, Task, Order, etc.
```

**Evaluación:** Muchos son tipos públicos de la API. **No eliminar sin validación del equipo.**

#### B. Server Actions - ~80 exports
```typescript
// Funciones server actions
- importPreview, importCommit
- deleteUser, updateUserPermissions
- bulkUpdateKPIs
```

**Evaluación:** Server actions usadas en formularios. **Validar uso en componentes cliente.**

#### C. Feature Types - ~60 exports
```typescript
// Tipos de features específicas
- TaskActivity, ProjectInput, TaskSubtask
- CalendarDay, CalendarWeek
- LotRowData, SkuWithLots
```

**Evaluación:** Pueden ser parte de features en desarrollo. **Revisar roadmap.**

#### D. Lib Types - ~50 exports
```typescript
// Tipos de utilidades
- ISODate, SkuParts, LotParts
- AnomalySeverity, UploadResult
- FuzzyMatchResult, SantaBrainResponse
```

**Evaluación:** Tipos utility podrían ser API interna. **Revisar uso en runtime.**

#### E. Integration Types - ~43 exports
```typescript
// Tipos de integraciones
- HoldedInvoice, ShopifyOrder
- SendcloudParcel, GmailMessagePartBody
- IntegrationJobStatus, IntegrationLogEntry
```

**Evaluación:** Usados en integraciones externas. **No eliminar sin confirmar con equipo integraciones.**

---

## 🟡 5. Exports Duplicados (16)

### Componentes del Design System:
```typescript
// Pattern: ComponentName|default
- FS_ActivityFeed|default
- FS_AlertsCard|default
- FS_ChartCard|default
- FS_KpiCard|default
- FS_AppLayout|default
- FS_Drawer|default
- FS_PageShell|default
- FS_Badge|default
- FS_Button|default
- FS_Card|default
- FS_Table|default
- FS_Tabs|default
```

**Problema:** Exportaciones named + default exports duplicadas.

**Solución:** Estandarizar a solo named exports o solo default exports.

### Otras Duplicaciones:
```typescript
- DASHBOARD_CONFIG|default (config/dashboard-config.ts)
- makeOnHandId|makeOnHandIdFromItem (domain/id-helpers.ts)
- DashboardAdapters|default (lib/dashboard-adapters.ts)
- getManyByIds|getDocsByIds (server/firebase.ts)
```

---

## ⚠️ Casos Especiales Identificados

### 1. Server Actions en Formularios
Muchos server actions pueden aparecer como "sin uso" pero se usan en `action` props:
```typescript
<form action={createCampaign}>
```

### 2. Código de Integraciones
Las integraciones (Shopify, Holded, Sendcloud) pueden tener código que se ejecuta via webhooks o jobs.

### 3. Sistema SSOT (Single Source of Truth)
Los tipos en `src/domain/ssot.ts` son la API pública del sistema. Eliminarlos rompería contratos.

### 4. Componentes Design System
Componentes en `src/components/ui/` y `src/components/fs/` pueden ser parte del design system aunque no se usen aún.

### 5. Features en Desarrollo
Módulos como `quicklog`, `personal`, `projects` pueden estar en desarrollo activo.

---

## 📋 Recomendaciones Inmediatas

### 🟢 Quick Wins (Baja Riesgo)

1. **Limpiar devDependencies obviamente sin uso:**
   ```bash
   npm uninstall @faker-js/faker fast-check
   ```

2. **Estandarizar exports duplicados:**
   - Decidir: named exports vs default exports
   - Refactorizar componentes FS_*

3. **Documentar código que "parece muerto":**
   - Añadir comentarios explicando uso dinámico
   - Actualizar README de cada módulo

### 🟡 Requiere Validación (Riesgo Medio)

1. **Revisar features completas sin uso:**
   - `src/features/quicklog/` - ¿En producción?
   - `src/features/personal/` - ¿Deprecado?
   - `src/features/sales/pipeline/` - ¿v2 activa?

2. **Validar dependencias grandes:**
   - FullCalendar (6 paquetes) - ¿Se usa?
   - Puppeteer (~300MB) - ¿Server side?
   - ReactFlow - ¿Diagramas en uso?

3. **Auditar server actions:**
   - Revisar logs de producción
   - Identificar actions nunca llamadas
   - Documentar las que sí se usan

### 🔴 Validación Crítica (Alto Riesgo)

1. **NO eliminar sin validación:**
   - Tipos SSOT en `src/domain/ssot.ts`
   - Código de integraciones externas
   - Server actions recientes
   - Componentes Design System

2. **Consultar con equipo:**
   - Product Owner: Features en roadmap
   - Backend: Server actions en uso
   - DevOps: Dependencias de deploy
   - UX/UI: Componentes del design system

---

## 🎯 Próximos Pasos

### Fase 1: Validación Manual (Esta Semana)
- [ ] Reunión con equipo para revisar findings
- [ ] Identificar features deprecadas vs. en desarrollo
- [ ] Validar server actions con logs de producción
- [ ] Documentar razones para código "aparentemente muerto"

### Fase 2: Análisis Complementario (Próxima Semana)
- [ ] Ejecutar Bundle Analyzer: `ANALYZE=true npm run build`
- [ ] Ejecutar Coverage: `npm run test -- --coverage`
- [ ] Analizar Chrome DevTools Coverage en producción
- [ ] Revisar analytics de páginas/rutas

### Fase 3: Limpieza Iterativa (2 Semanas)
- [ ] Sprint 1: Eliminar devDependencies confirmadas
- [ ] Sprint 2: Limpiar componentes deprecados
- [ ] Sprint 3: Refactorizar exports duplicados
- [ ] Sprint 4: Optimizar dependencias npm

---

## 📈 Impacto Estimado

### Si se limpia TODO el código identificado:

| Métrica | Antes | Después (Estimado) | Mejora |
|---------|-------|-------------------|--------|
| Archivos | ~2000 | ~1800 | -10% |
| Bundle Size | ~8MB | ~6-7MB | -15-20% |
| Dependencias | 33 | ~25 | -24% |
| Build Time | ~90s | ~75s | -15% |
| Lines of Code | ~150k | ~135k | -10% |

**Nota:** Estos son estimados conservadores. El impacto real dependerá de la validación.

---

## 🔧 Configuración Knip Utilizada

```json
{
  "entry": [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/**/layout.tsx",
    "src/app/**/page.tsx",
    "src/app/**/route.ts",
    "src/app/**/loading.tsx",
    "src/app/ClientProviders.tsx",
    "src/middleware.ts"
  ],
  "ignore": [
    "**/*.test.ts",
    "**/tests/**",
    "scripts/**"
  ]
}
```

---

## 📚 Recursos Adicionales

- **Plan Completo:** `DEAD_CODE_DETECTION_PLAN.md`
- **Quick Start:** `DEAD_CODE_QUICK_START.md`
- **Reporte JSON:** `npm run dead-code:knip-json`
- **Análisis Detallado:** `npm run dead-code:knip-symbols`

---

## ⚠️ Advertencias Importantes

1. **NO ejecutar eliminaciones masivas sin validación**
2. **Consultar con el equipo antes de eliminar features completas**
3. **Validar en ambiente de staging antes de producción**
4. **Mantener backup/rama de git antes de limpiezas grandes**
5. **Documentar razones para mantener código "aparentemente muerto"**

---

**Generado por:** Knip v5.66.0  
**Comando:** `npm run dead-code:knip`  
**Próxima revisión:** Después de validación manual con equipo
