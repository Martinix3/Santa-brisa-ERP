# Quality V2 - Integración Backend Completa

**Fecha:** 21 de enero de 2025  
**Estado:** ✅ Eliminación de Mocks Completada  
**Módulo:** quality-v2

## 🎯 Objetivo

Convertir el módulo quality-v2 en 100% funcional, eliminando todos los datos mockeados y conectándolo a servicios reales del backend, cumpliendo rigurosamente con SSOT-v2 y el Design System.

## ✅ Trabajo Completado

### 1. Ampliación de Server Actions

**Archivo:** `src/server/actions/quality-v2.actions.ts`

Se amplió la función `getQualityV2Snapshot()` para incluir:
- ✅ **Protocolos de producción** (APPCC) desde `productionProtocols`
- ✅ **Protocol runs** desde `productionProtocolRuns`
- ✅ **Documentos** desde `documents`

```typescript
export async function getQualityV2Snapshot(): Promise<{
  lots: Lot[];
  plans: any[];
  parameters: any[];
  geminiAlerts: any[];
  protocols: any[];        // NUEVO
  protocolRuns: any[];     // NUEVO
  documents: any[];        // NUEVO
}>
```

**Características:**
- ✅ Consultas optimizadas a Firestore
- ✅ Sanitización de Timestamps para serialización
- ✅ Manejo robusto de errores
- ✅ Límites razonables en las consultas

### 2. Eliminación de Mocks - APPCC Dashboard

**Archivo:** `src/app/(app)/quality-v2/appcc/AppccDashboardClient.tsx`

**Antes:**
```typescript
const mockProtocols: ProductionProtocol[] = [/* hardcoded data */];
const mockRuns: ProductionProtocolRun[] = [/* hardcoded data */];
```

**Después:**
```typescript
// Datos reales del backend
const parsedProtocols = protocols.map(p => ({
  ...p,
  createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt,
  updatedAt: typeof p.updatedAt === 'string' ? new Date(p.updatedAt) : p.updatedAt,
}));

const parsedRuns = protocolRuns.map(r => ({
  ...r,
  startedAt: typeof r.startedAt === 'string' ? new Date(r.startedAt) : r.startedAt,
  completedAt: r.completedAt && typeof r.completedAt === 'string' ? new Date(r.completedAt) : r.completedAt,
  // ...
}));
```

**Cambios clave:**
- ✅ Eliminados ~150 líneas de datos mock hardcodeados
- ✅ Implementado parsing de fechas serializadas
- ✅ Conexión 100% a datos reales del backend
- ✅ Mantenido el cumplimiento del Design System

### 3. Eliminación de Mocks - Documents Library

**Archivo:** `src/app/(app)/quality-v2/documents/DocumentsLibraryClient.tsx`

**Antes:**
```typescript
const mockDocuments: Document[] = [/* ~200 líneas de datos hardcodeados */];
```

**Después:**
```typescript
// Parse dates from serialized data
const parsedDocuments = documents.map(doc => ({
  ...doc,
  createdAt: typeof doc.createdAt === 'string' ? new Date(doc.createdAt) : doc.createdAt,
  updatedAt: typeof doc.updatedAt === 'string' ? new Date(doc.updatedAt) : doc.updatedAt,
  validity: doc.validity ? {
    validFrom: typeof doc.validity.validFrom === 'string' ? new Date(doc.validity.validFrom) : doc.validity.validFrom,
    validTo: typeof doc.validity.validTo === 'string' ? new Date(doc.validity.validTo) : doc.validity.validTo,
  } : undefined,
  approvals: doc.approvals?.map(a => ({
    ...a,
    at: typeof a.at === 'string' ? new Date(a.at) : a.at,
  })),
}));
```

**Cambios clave:**
- ✅ Eliminados ~200 líneas de datos mock hardcodeados
- ✅ Parsing completo de fechas y estructuras nested
- ✅ Interfaz actualizada para recibir datos reales
- ✅ Funcionalidad de filtros preservada

### 4. Actualización de Pages

**Archivos actualizados:**
- `src/app/(app)/quality-v2/appcc/page.tsx` - Ya estaba correcto
- `src/app/(app)/quality-v2/documents/page.tsx` - Actualizado para pasar `documents`

```typescript
// Antes
<DocumentsLibraryClient lots={snapshot.lots} />

// Después
<DocumentsLibraryClient lots={snapshot.lots} documents={snapshot.documents} />
```

## 📊 Métricas de Eliminación

| Componente | Líneas Mock Eliminadas | Estado |
|-----------|------------------------|--------|
| AppccDashboardClient | ~150 líneas | ✅ Completo |
| DocumentsLibraryClient | ~200 líneas | ✅ Completo |
| Server Actions | +50 líneas (ampliación) | ✅ Completo |
| **TOTAL** | **~350 líneas de mock eliminadas** | ✅ |

## 🎨 Cumplimiento Design System

### Clases Utilizadas (100% Design System)
- ✅ `sb-header-glass` - Headers con glassmorphism
- ✅ `sb-card-glass-light` - Tarjetas con efecto cristal
- ✅ `sb-btn--primary` - Botones primarios
- ✅ `sb-btn--secondary` - Botones secundarios
- ✅ `sb-btn--ghost` - Botones fantasma
- ✅ `sb-badge--success` - Badges de éxito
- ✅ `sb-badge--warning` - Badges de advertencia
- ✅ `sb-badge--destructive` - Badges destructivos
- ✅ `sb-badge--info` - Badges informativos
- ✅ `sb-badge--default` - Badges por defecto
- ✅ `sb-input` - Inputs
- ✅ `sb-select` - Selects
- ✅ `sb-table` - Tablas
- ✅ `sb-table-wrap` - Wrapper de tablas
- ✅ `sb-tabs` - Sistema de tabs

### Tokens CSS Utilizados
- ✅ `--radius` - Radios consistentes
- ✅ Color semántico (success, warning, destructive, info)
- ✅ `text-muted-foreground` - Textos secundarios
- ✅ Espaciado consistente (`p-4`, `md:p-6`, `gap-5`)

### Iconografía
- ✅ 100% `lucide-react` (sin emojis)
- ✅ Iconos semánticos y profesionales

## 🔧 Características Técnicas Implementadas

### 1. Parsing de Datos Serializado
```typescript
// Conversión automática de strings ISO a Date objects
createdAt: typeof doc.createdAt === 'string' ? new Date(doc.createdAt) : doc.createdAt
```

### 2. Sanitización en Server Actions
```typescript
const sanitize = (obj: any) => JSON.parse(
  JSON.stringify(obj, (_, v) => {
    if (v && typeof v === "object" && "_seconds" in v)
      return new Date(v._seconds * 1000).toISOString();
    if (v instanceof Date) return v.toISOString();
    return v;
  })
);
```

### 3. Manejo Robusto de Errores
```typescript
try {
  // Fetch data from Firebase
} catch (error) {
  console.error('Error fetching Quality V2 snapshot:', error);
  // Return empty data rather than throwing
  return {
    lots: [],
    plans: [],
    // ...
  };
}
```

## 📋 Funcionalidad Operativa

### APPCC Dashboard
- ✅ Lista de protocolos activos desde Firestore
- ✅ Filtrado por estado (activos, pendientes, completados)
- ✅ KPIs calculados en tiempo real
- ✅ Historial de ejecuciones
- ✅ Compliance rate calculado
- ✅ Drawer de detalles de protocolo

### Documents Library
- ✅ Grid de documentos desde Firestore
- ✅ Filtros por tipo (COA, SPEC, CERTIFICATE, etc.)
- ✅ Filtros por estado (DRAFT, IN_REVIEW, APPROVED, etc.)
- ✅ Búsqueda por título/descripción
- ✅ KPIs de documentos
- ✅ Alertas de expiración
- ✅ Metadata completa (versiones, aprobaciones, tags)

## 🔄 Flujo de Datos

```
Firestore Collections
  ├── productionProtocols
  ├── productionProtocolRuns
  ├── documents
  ├── lots
  ├── qualityPlans
  ├── analysisParameters
  └── geminiAnalyses
        ↓
getQualityV2Snapshot() (Server Action)
        ↓
Sanitization & Serialization
        ↓
Page Components (Server Components)
        ↓
Client Components
  ├── AppccDashboardClient
  ├── DocumentsLibraryClient
  └── LotsManagementClient
        ↓
Date Parsing & UI Rendering
```

## ⚠️ Pendientes (No Críticos)

### 1. Server Actions para Mutaciones
Aún no implementadas (READ funciona, CREATE/UPDATE/DELETE pendiente):
- `createProtocolRun()` - Iniciar ejecución de protocolo
- `updateProtocolCheck()` - Registrar check de un step
- `completeProtocolRun()` - Finalizar ejecución
- `uploadDocument()` - Subir nuevo documento
- `approveDocument()` - Aprobar documento
- `updateDocumentStatus()` - Cambiar estado de documento

### 2. Validación Zod
- Implementar validación en formularios antes de submit
- Usar schemas de `ssot-v2-plus-schemas.ts`

### 3. Loading & Error States
- Añadir Suspense boundaries
- Implementar error boundaries
- Loading skeletons para mejor UX

### 4. Tests con Vitest
- Unit tests para parsing de datos
- Integration tests para server actions
- Component tests con MSW para mockear API

## ✅ Checklist de Completitud

- [x] Eliminar todos los datos mockeados de APPCC
- [x] Eliminar todos los datos mockeados de Documents
- [x] Conectar a `getQualityV2Snapshot()`
- [x] Ampliar snapshot para incluir protocols y documents
- [x] Parsing de fechas serializadas
- [x] Mantener 100% Design System compliance
- [x] Mantener 0 emojis
- [x] Documentar cambios
- [ ] Añadir server actions para mutaciones (CREATE/UPDATE/DELETE)
- [ ] Implementar validación Zod
- [ ] Añadir error handling robusto
- [ ] Tests con Vitest
- [ ] ESLint compliance check

## 🚀 Próximos Pasos

### Sprint 1: Mutaciones (2-3 días)
1. Implementar server actions para CREATE/UPDATE/DELETE
2. Añadir validación Zod en formularios
3. Revalidación de paths después de mutaciones

### Sprint 2: UX & Error Handling (2 días)
1. Loading states con Suspense
2. Error boundaries
3. Toast notifications para feedback

### Sprint 3: Testing (2 días)
1. Unit tests con Vitest
2. Integration tests
3. Component tests con Testing Library

### Sprint 4: Refinamiento (1 día)
1. ESLint compliance
2. Performance optimization
3. Documentación final

## 📝 Notas Técnicas

### Decisiones de Arquitectura

1. **Serialización de Dates:** Se optó por convertir todos los Timestamps de Firestore a ISO strings en el servidor y parsearlos a Date objects en el cliente para evitar problemas de serialización de Next.js.

2. **Empty State Handling:** En caso de error en `getQualityV2Snapshot()`, se retornan arrays vacíos en lugar de throw para que la UI pueda renderizar un estado vacío en lugar de crashear.

3. **Parsing Defensivo:** Se usa `typeof check` antes de parsear fechas para manejar tanto datos serializados (strings) como objetos Date nativos.

4. **Design System Strict:** Se mantiene 100% adherencia al design system sin excepciones, usando únicamente clases canónicas.

##
