# Plan de Mejora del Módulo Sales/Pipeline

**Fecha:** 2025-01-18  
**Estado:** Análisis Completado  
**Versión:** 1.0

---

## 🎯 RESUMEN EJECUTIVO

El módulo de **Sales/Pipeline** está funcionalmente correcto pero puede beneficiarse significativamente de las mismas optimizaciones aplicadas a Inventory.

**Calificación Actual:** 7/10 (Bueno)  
**Calificación Objetivo:** 9/10 (Excelente)

---

## 📊 ANÁLISIS DEL ESTADO ACTUAL

### Estructura del Módulo
```
features/sales/pipeline/
├── components/
│   ├── AccountCard.tsx         (~140 líneas)
│   ├── AccountDrawer.tsx
│   ├── PipelineBoard.tsx       (~40 líneas - OK)
│   ├── PipelineColumn.tsx
│   ├── PipelineHeader.tsx
│   ├── StageColumn.tsx
│   └── skeletons.tsx
├── hooks/
│   └── usePipeline.ts          (~60 líneas - básico)
├── pipeline.actions.v2.ts      ✅ Usa TaskNew
├── pipeline.mappers.ts
├── pipeline.service.ts
└── pipeline.types.ts
```

### ✅ PUNTOS FUERTES

1. **Ya migrado a TaskNew del SSOT** ✅
```typescript
// ✅ Usa tipos canónicos
import type { TaskNew } from '@/domain/ssot';
```

2. **Estructura modular** ✅
- Componentes separados
- Hook personalizado
- Service layer
- Tipos definidos

3. **Quick actions bien organizadas** ✅
```typescript
createInteractionTask()
createOrderPrepTask()
createPOSTask()
createEventTask()
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **usePipeline Usa API Route en vez de Server Action**
**Severidad: MEDIA**

```typescript
// ❌ ACTUAL: Fetch a API route
async function fetchPipelineData(filters) {
  const res = await fetch(`/api/pipeline-board?${params}`);
  return data.accounts;
}
```

**Problema:**
- Capa extra innecesaria
- No aprovecha server actions
- Menos type-safe

**Solución:**
```typescript
// ✅ PROPUESTO: Server action directo
import { getPipelineAccounts } from '@/server/actions/pipeline.actions';

export function usePipeline() {
  const { data, isLoading, error } = useSWR(
    ['pipeline', filters],
    () => getPipelineAccounts(filters)
  );
}
```

### 2. **AccountCard Sin Optimización de Re-renders**
**Severidad: MEDIA**

```typescript
// ❌ Sin memo
export function AccountCard({ account, ... }: Props) {
  // Botones con handlers inline
  <button onClick={async (e) => {
    await createInteractionTask({...});
  }}>
}
```

**Problemas:**
- Re-renderiza en cada cambio de parent
- Handlers inline se re-crean
- No usa useCallback

**Solución:**
```typescript
// ✅ Con memo y useCallback
export const AccountCard = memo(({ account, ... }: Props) => {
  const handleCreateInteraction = useCallback(async () => {
    await createInteractionTask({...});
  }, [account.id]);
  
  return <button onClick={handleCreateInteraction}>...
}, (prev, next) => prev.account.id === next.account.id);
```

### 3. **Sin Debounce en Búsqueda de Filtros**
**Severidad: BAJA**

```typescript
// ❌ Filtros inmediatos
const [filters, setFilters] = useState<PipelineFilters>({});

// Cada cambio de filter → nueva llamada a API
```

**Solución:**
```typescript
// ✅ Con debounce como en inventory
const { 
  filteredAccounts,
  isSearching 
} = usePipelineFilters({ 
  accounts, 
  filters,
  debounceMs: 300 
});
```

### 4. **Falta Error Boundary**
**Severidad: BAJA**

```typescript
// ❌ Sin error handling visual
export function PipelineBoard() {
  if (error) {
    toast.error(error);  // Solo toast
  }
}
```

**Solución:**
```typescript
// ✅ Con ErrorBoundary
<ErrorBoundary fallback={<PipelineError />}>
  <PipelineBoar
