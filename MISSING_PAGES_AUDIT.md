# Auditoría de Páginas Faltantes - Santa Brisa ERP

**Fecha:** 10/10/2025
**Estado:** CRÍTICO - Muchas rutas definidas en Sidebar sin implementación

## Resumen Ejecutivo

El sistema tiene **33 rutas definidas** en el Sidebar, pero solo **~8 páginas realmente implementadas** (24% de cobertura).

## Análisis por Módulo

### ✅ CALIDAD (4/4 - 100%)
Todas las páginas implementadas:
- ✅ `/quality/dashboard` - Dashboard de calidad
- ✅ `/quality/release` - Liberación de lotes
- ✅ `/quality/traceability` - Trazabilidad
- ✅ `/quality/parametros` - Parámetros de calidad

### 🟡 PRODUCCIÓN (2/3 - 67%)
- ❌ `/production/dashboard` - **FALTANTE** (carpeta vacía existe)
- ✅ `/production/bom` - BOMs (Listas de materiales)
- ✅ `/production/execution` - Elaboración/Ejecución

### 🟡 LOGÍSTICA (2/3 - 67%)
- ❌ `/warehouse/dashboard` - **FALTANTE**
- ✅ `/warehouse/logistics` - Envíos y logística
- ✅ `/warehouse/inventory` - Inventario

### ❌ PERSONAL (0/3 - 0%)
Ninguna página implementada:
- ❌ `/dashboard-personal` - **FALTANTE**
- ❌ `/agenda` - **FALTANTE**
- ❌ `/contacts` - **FALTANTE**

### ❌ VENTAS (0/4 - 0%)
Ninguna página implementada:
- ❌ `/sell-out` - **FALTANTE** (Colocación)
- ❌ `/sell-in` - **FALTANTE** (Directas)
- ❌ `/accounts` - **FALTANTE** (Cuentas)
- ❌ `/orders` - **FALTANTE** (Pedidos)

### ❌ MARKETING (0/4 - 0%)
Ninguna página implementada:
- ❌ `/marketing/dashboard` - **FALTANTE**
- ❌ `/marketing/events` - **FALTANTE**
- ❌ `/marketing/online` - **FALTANTE** (Ads)
- ❌ `/marketing/pos-tactics` - **FALTANTE**

### ❌ FINANCIERA (0/3 - 0%)
Ninguna página implementada:
- ❌ `/cashflow/dashboard` - **FALTANTE**
- ❌ `/cashflow/payments` - **FALTANTE** (Pagos)
- ❌ `/cashflow/collections` - **FALTANTE** (Cobros)

### ❌ ADMIN (0/6 - 0%)
Ninguna página implementada:
- ❌ `/admin/db-check` - **FALTANTE**
- ❌ `/admin/fix-dates` - **FALTANTE**
- ❌ `/admin/kpi-settings` - **FALTANTE**
- ❌ `/admin/users` - **FALTANTE**
- ❌ `/admin/sku-management` - **FALTANTE**
- ❌ `/admin/integrations` - **FALTANTE**

## Páginas Existentes No en Sidebar

### Ops
- `/ops/dashboard` - Existe pero no está en sidebar
- `/ops/actions.ts` - Existe

### Dev/Debug
- `/dev/db-console` - Herramienta de desarrollo
- `/settings/page.tsx.bak` - Backup de configuración

### Admin
- `/admin/data-import` - Existe pero no está en sidebar

## Impacto en UX

### Problemas Actuales:
1. **Enlaces rotos** - 25 rutas del sidebar llevan a páginas 404
2. **Expectativas no cumplidas** - Los usuarios ven opciones que no funcionan
3. **Percepción de sistema incompleto** - Reduce confianza del usuario
4. **Navegación confusa** - No está claro qué funciona y qué no

### Módulos Más Afectados:
1. **Personal, Ventas, Marketing, Financiera, Admin** - 0% implementados (20 páginas faltantes)
2. **Producción, Logística** - Parcialmente implementados (3 páginas faltantes)
3. **Calidad** - ✅ Completo

## Recomendaciones

### Opción A: Implementación Progresiva (Recomendado)
1. **Corto plazo** (1-2 semanas):
   - Crear dashboards básicos para cada módulo
   - Implementar páginas críticas de Ventas (/orders, /accounts)
   - Completar dashboards de Producción y Logística

2. **Medio plazo** (1 mes):
   - Implementar módulo Personal completo
   - Implementar módulo Financiero básico
   - Implementar páginas admin básicas

3. **Largo plazo** (2-3 meses):
   - Completar módulo Marketing
   - Refinar todas las funcionalidades
   - Agregar features avanzadas

### Opción B: Ocultar Lo No Implementado
- Modificar Sidebar para mostrar solo páginas existentes
- Agregar badge "Próximamente" a módulos en desarrollo
- Implementar sistema de permisos/features flags

### Opción C: Páginas Placeholder
- Crear páginas "En construcción" para todas las rutas
- Mostrar roadmap de implementación
- Permitir feedback/sugerencias del usuario

## Estructura de Archivos Sugerida

```
src/app/(app)/
├── personal/
│   ├── dashboard/page.tsx          # TODO
│   ├── agenda/page.tsx              # TODO
│   └── contacts/page.tsx            # TODO
├── sales/
│   ├── sell-out/page.tsx            # TODO
│   ├── sell-in/page.tsx             # TODO
│   ├── accounts/page.tsx            # TODO
│   └── orders/page.tsx              # TODO
├── marketing/
│   ├── dashboard/page.tsx           # TODO
│   ├── events/page.tsx              # TODO
│   ├── online/page.tsx              # TODO
│   └── pos-tactics/page.tsx         # TODO
├── production/
│   ├── dashboard/page.tsx           # TODO - Carpeta existe
│   ├── bom/page.tsx                 # ✅ EXISTS
│   └── execution/page.tsx           # ✅ EXISTS
├── quality/
│   ├── dashboard/page.tsx           # ✅ EXISTS
│   ├── release/page.tsx             # ✅ EXISTS
│   ├── traceability/page.tsx        # ✅ EXISTS
│   └── parametros/page.tsx          # ✅ EXISTS
├── warehouse/
│   ├── dashboard/page.tsx           # TODO
│   ├── logistics/page.tsx           # ✅ EXISTS
│   └── inventory/page.tsx           # ✅ EXISTS
├── cashflow/
│   ├── dashboard/page.tsx           # TODO
│   ├── payments/page.tsx            # TODO
│   └── collections/page.tsx         # TODO
└── admin/
    ├── db-check/page.tsx            # TODO
    ├── fix-dates/page.tsx           # TODO
    ├── kpi-settings/page.tsx        # TODO
    ├── users/page.tsx               # TODO
    ├── sku-management/page.tsx      # TODO
    └── integrations/page.tsx        # TODO
```

## Próximos Pasos Sugeridos

1. **Decisión de estrategia** - Elegir entre Opción A, B o C
2. **Priorización** - Definir qué páginas son más críticas para el negocio
3. **Estimación** - Calcular tiempo/recursos necesarios
4. **Planificación sprint** - Organizar implementación en sprints
5. **Comunicación** - Informar al equipo sobre el roadmap

## Notas Técnicas

### Páginas que necesitan integración con datos existentes:
- `/orders` - Hay features de órdenes en `src/features/orders/`
- `/accounts` - Hay sistema de cuentas en el backend
- `/warehouse/dashboard` - Hay KPIs en `src/features/warehouse/components/LogisticsKPIs.tsx`
- `/production/dashboard` - Carpeta existe, falta página

### Recursos reutilizables:
- Componentes en `src/features/*` pueden ser base para nuevas páginas
- Layouts ya existen para cada módulo
- Sistema de tipos SSOT ya tiene modelos de datos

## Conclusión

El sistema tiene una base sólida con 8 páginas bien implementadas, especialmente en el módulo de Calidad. Sin embargo, **faltan 25 páginas (76%)** lo que representa una deuda técnica significativa que afecta la UX. Se recomienda implementación progresiva comenzando por los módulos más críticos para el negocio (Ventas, Producción, Logística).
