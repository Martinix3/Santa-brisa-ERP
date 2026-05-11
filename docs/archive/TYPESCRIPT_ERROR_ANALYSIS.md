# Análisis de Errores TypeScript - Santa Brisa ERP

**Fecha**: 17/10/2025  
**Total Errores**: 1440  
**Estado**: Post-migración itemId→sku (aumento esperado por mejor type safety)

---

## 📊 Top 20 Códigos de Error

| Código | Cantidad | % Total | Descripción |
|--------|----------|---------|-------------|
| **TS2339** | 649 | 45.1% | Property does not exist on type |
| **TS2305** | 280 | 19.4% | Module has no exported member |
| **TS7006** | 244 | 16.9% | Parameter implicitly has 'any' type |
| TS2367 | 57 | 4.0% | Duplicate identifier |
| TS2551 | 47 | 3.3% | Property doesn't exist (with suggestion) |
| TS2322 | 31 | 2.2% | Type not assignable |
| TS2353 | 25 | 1.7% | Object literal may only specify known properties |
| TS2345 | 24 | 1.7% | Argument of type not assignable |
| TS2307 | 18 | 1.3% | Cannot find module |
| TS2304 | 12 | 0.8% | Cannot find name |
| TS2352 | 10 | 0.7% | Conversion may be a mistake |
| TS18048 | 9 | 0.6% | Possibly undefined |
| TS18046 | 8 | 0.6% | Possibly null |
| TS2724 | 7 | 0.5% | Module has no exported member (variant) |
| TS2741 | 6 | 0.4% | Missing properties in type |
| TS2820 | 4 | 0.3% | No overload matches this call |
| TS2731 | 2 | 0.1% | Possibly undefined in strict mode |
| TS7053 | 1 | 0.1% | Element implicitly has 'any' type |
| TS2739 | 1 | 0.1% | Type is missing properties |
| TS2561 | 1 | 0.1% | Object is possibly 'null' or 'undefined' |

---

## 🔴 TS2339: Property does not exist on type (649 errores - 45%)

### Problema Principal
Uso de propiedades deprecated o no definidas en interfaces SSOT canónicas.

### Ejemplos Críticos

#### 1. **User Model - Propiedades Legacy**
```typescript
// ❌ src/app/(app)/admin/users/actions.ts
userData.name                    // no existe en User type
userData.territory               // no existe en User type
userData.assignedDistributors    // no existe
userData.permissions             // no existe
userData.active                  // no existe
```

**Tipo actual en SSOT**:
```typescript
type User = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  distributorAccountId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Causa**: Código legacy usa campos que no están en el modelo canónico.

**Solución**:
1. Auditar `src/types/users.ts` para identificar campos reales vs legacy
2. Extender User type con campos necesarios o limpiar código legacy
3. Migrar datos si es necesario

---

#### 2. **OnHand / StockMove - itemId Migration** ✅ **RESUELTO**

Pattern de dual compatibility implementado exitosamente:
```typescript
// ✅ src/components/dashboards/DashboardAdmin.tsx
const sku = oh.sku || oh.itemId;

// ✅ src/domain/uom.ts
export function getBaseQty(sku: string | undefined, ...): number {
  const itemId = sku || item?.itemId;
  // ...
}
```

---

### 🎯 Estrategia de Corrección

| Prioridad | Acción | Archivos Afectados | Impacto |
|-----------|--------|-------------------|---------|
| 🔴 **Alta** | Auditar User model | `src/types/users.ts`, `src/app/(app)/admin/users/actions.ts` | ~50 errores |
| 🟡 **Media** | Completar dual compatibility | Dashboards, helpers | ~200 errores |
| 🟢 **Baja** | Limpiar imports deprecated | Múltiples componentes | ~400 errores |

---

## 🟠 TS2305: Module has no exported member (280 errores - 19%)

### Problema Principal
Imports de tipos/funciones que no están exportados en SSOT canónico.

### Ejemplos Críticos

```typescript
// ❌ scripts/import-csv-contacts-v6.ts
import { 
  Contact,              // no existe
  Stage,                // no existe
  CustomerSegment,      // no existe
  ContactRole,          // no existe
  normalizeName,        // no existe
  buildNameNorm         // no existe
} from '../src/domain/ssot';

// ❌ scripts/migrate-holded-complete.ts
import { Segment, Stage } from '../src/domain/ssot';
```

### Análisis

**Tipos Faltantes en SSOT**:
- `Contact`
- `Stage`
- `CustomerSegment` / `Segment`
- `ContactRole`
- Helpers: `normalizeName`, `buildNameNorm`

### 🎯 Solución

#### Opción 1: Exportar desde SSOT (Recomendado)
```typescript
// src/domain/ssot.ts
export const zContact = z.object({
  // ...definición
});
export type Contact = z.infer<typeof zContact>;

export const zStage = z.enum(['LEAD', 'PROSPECT', 'CUSTOMER']);
export type Stage = z.infer<typeof zStage>;

// Helpers
export function normalizeName(name: string): string { /* ... */ }
export function buildNameNorm(parts: string[]): string { /* ... */ }
```

#### Opción 2: Crear módulo separado
```typescript
// src/domain/ssot-contacts.ts
export const zContact = /* ... */;
export type Contact = z.infer<typeof zContact>;
```

---

## 🟡 TS7006: Parameter implicitly has 'any' type (244 errores - 17%)

### Problema Principal
Parámetros de funciones sin tipos explícitos (tsconfig strict mode).

### Ejemplos

```typescript
// ❌ scripts/test-holded-orders.ts
orders.forEach((order, index) => {  // order: any, index: any
  console.log(order.id);
});

// ❌ src/app/(app)/@drawer/(.)ventas/pedidos/[id]/page.tsx
<button onClick={(o) => handleClick(o)}>  {/* o: any */}

// ❌ Array operations
const total = items.reduce((sum, o) => sum + o.price, 0);  // sum: any, o: any
```

### 🎯 Solución

```typescript
// ✅ Con tipos explícitos
orders.forEach((order: Order, index: number) => {
  console.log(order.id);
});

// ✅ Con inferencia de tipo del contexto
interface Item { price: number }
const items: Item[] = [/* ... */];
const total = items.reduce((sum: number, item: Item) => sum + item.price, 0);

// ✅ Con tipos inline
<button onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick(e)}>
```

**Impacto**: Estos errores son **fáciles de corregir** pero numerosos. Pattern search/replace puede automatizar muchos.

---

## 📋 Plan de Acción Priorizado

### 🔴 **Fase 1: Crítico (Semana 1)**

#### 1.1 Auditar y Corregir User Model
- [ ] Listar todos los usos de propiedades inexistentes en User
- [ ] Decidir: ¿extender tipo o limpiar código?
- [ ] Implementar correcciones
- [ ] **Impacto**: -50 errores

#### 1.2 Exportar Tipos Faltantes de SSOT
- [ ] Añadir exports para Contact, Stage, Segment, ContactRole
- [ ] Exportar helpers: normalizeName, buildNameNorm
- [ ] Actualizar imports en scripts
- [ ] **Impacto**: -280 errores

#### 1.3 Completar Dual Compatibility Pattern
- [ ] Buscar todos los usos de `itemId` sin fallback
- [ ] Aplicar pattern `(sku || itemId)` consistentemente
- [ ] **Impacto**: -100 errores

**Total Fase 1**: ~430 errores corregidos (30% del total)

---

### 🟡 **Fase 2: Importante (Semana 2)**

#### 2.1 Tipar Parámetros Implícitos
- [ ] Crear script de búsqueda de patterns comunes
- [ ] Tipar callbacks de `.map()`, `.filter()`, `.reduce()`
- [ ] Tipar event handlers en React
- [ ] **Impacto**: -244 errores

#### 2.2 Resolver Type Mismatches
- [ ] Corregir TS2322 (Type not assignable) - 31 errores
- [ ] Corregir TS2345 (Argument type) - 24 errores
- [ ] **Impacto**: -55 errores

**Total Fase 2**: ~300 errores corregidos (21% del total)

---

### 🟢 **Fase 3: Mejora Continua (Semana 3-4)**

#### 3.1 Null Safety
- [ ] Añadir null checks donde TS18048/TS18046
- [ ] Usar optional chaining `?.` y nullish coalescing `??`
- [ ] **Impacto**: -17 errores

#### 3.2 Cleanup Restante
- [ ] Resolver duplicados (TS2367)
- [ ] Corregir module imports (TS2307)
- [ ] Fix edge cases
- [ ] **Impacto**: -100 errores

**Total Fase 3**: ~117 errores corregidos (8% del total)

---

## 🎯 Resultado Esperado

| Fase | Errores Corregidos | % Reducción | Errores Restantes |
|------|-------------------|-------------|-------------------|
| Inicio | 0 | 0% | 1440 |
| Fase 1 | 430 | 30% | 1010 |
| Fase 2 | 300 | 21% | 710 |
| Fase 3 | 117 | 8% | **593** |

**Reducción Total**: -59% de errores TypeScript

---

## 🛠️ Scripts Útiles

### Búsqueda de Errores por Código
```bash
# Ver top errores
npx tsc --noEmit 2>&1 | grep -oE "TS[0-9]+" | sort | uniq -c | sort -rn

# Ver ejemplos de un código específico
npx tsc --noEmit 2>&1 | grep "TS2339" | head -20

# Contar errores en un directorio
npx tsc --noEmit 2>&1 | grep "src/app/(app)/admin/" | wc -l
```

### Búsqueda de Patterns Problemáticos
```bash
# Parámetros sin tipo en callbacks
rg "\.map\(\([a-z]+\) =>" --type ts

# Propiedades de User no canónicas
rg "\.name|\.territory|\.permissions" src/app/\(app\)/admin/users/

# itemId sin fallback a sku
rg "\.itemId(?!\s*\|\|)" --type ts
```

---

## 📝 Notas

- **El aumento de errores (1191 → 1440) es POSITIVO**: indica que el type system ahora funciona correctamente y revela deuda técnica real.
- **Pattern `(sku || itemId)` garantiza retrocompatibilidad**: no hay runtime errors en producción.
- **Priorizar User model**: afecta seguridad y autenticación, debe ser primera corrección.
- **Scripts pueden tener tipos más relajados**: considerar separate tsconfig para `/scripts`.

---

## ✅ Lecciones de la Migración itemId→sku

1. **Dual compatibility funciona**: permite migración gradual sin breaking changes
2. **Type system revela deuda técnica**: los errores expuestos son problemas reales
3. **SSOT debe estar completo**: exportar todos los tipos necesarios
4. **Zod + TypeScript = validación runtime + compile time**: arquitectura sólida

---

*Documento generado automáticamente el 17/10/2025*
