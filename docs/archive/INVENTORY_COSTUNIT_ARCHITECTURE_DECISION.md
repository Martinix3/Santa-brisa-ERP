# DECISIÓN ARQUITECTÓNICA: Campo costUnit en Items
## Warehouse/Inventory Module

**Fecha:** 20 de Enero de 2025  
**Estado:** RESUELTA  
**Prioridad:** CRÍTICA

---

## CONTEXTO

Durante la auditoría técnica del módulo warehouse/inventory (ver WAREHOUSE_INVENTORY_AUDIT_REPORT.md, Hallazgos #7 y #8), se identificó una **contradicción crítica** en la lógica de negocio del campo `costUnit`:

### Componente 1: ItemDetailDrawer.tsx
```typescript
// Campo EDITABLE
<Input
  type="number"
  value={costUnit}
  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
/>
```

### Componente 2: PricingModal.tsx (DEPRECATED)
```typescript
// Campo BLOQUEADO
<Input
  type="number"
  value={costUnit}
  disabled  // ← Campo deshabilitado
/>
<p>⚙️ Calculado automáticamente desde BOM</p>
```

---

## PROBLEMA

**Riesgo Crítico:** Dos componentes con lógicas contradictorias sobre el mismo campo:
- Usuario confundido sobre si puede editar o no el costo
- Posible sobrescritura de datos calculados
- Inconsistencia en reglas de negocio
- Violación del principio de "Single Source of Truth"

---

## DECISIÓN

### ✅ Decisión Tomada: costUnit es EDITABLE MANUAL

**Razón:** Actualmente no existe implementación de cálculo automático desde BOM (Bill of Materials) en el sistema.

### Estado Actual (Inmediato)
- ✅ **ItemDetailDrawer.tsx** es el componente canónico para edición de items
- ✅ Campo `costUnit` permanece **editable manualmente**
- ✅ Mensaje aclaratorio añadido: *"Editable manualmente. En el futuro será calculado automáticamente desde BOM"*
- ❌ **PricingModal.tsx** marcado como **@deprecated** y será eliminado

### Evolución Futura (Roadmap)

Cuando se implemente el módulo BOM completo:

1. **Fase 1 - BOM Básico:**
   - Crear colección `boms` con estructura de costos
   - Implementar servicio de cálculo: `BomCostService.calculateItemCost(itemId)`

2. **Fase 2 - Migración:**
   - Cambiar `costUnit` a **campo calculado** (no editable directamente)
   - Añadir campo `costUnit_override` para casos excepcionales
   - UI mostrará: "Calculado desde BOM: X.XX € (Sobreescribir)"

3. **Fase 3 - Validación:**
   - Alertas cuando `costUnit_override` difiere significativamente del calculado
   - Dashboard de variaciones de costo

---

## CONSECUENCIAS

### Positivas ✅
1. **Consistencia inmediata:** Un solo componente, una sola lógica
2. **Transparencia:** Usuario sabe que puede editar manualmente
3. **Flexibilidad:** Permite gestión mientras no hay BOM
4. **Camino evolutivo claro:** Documentado para futura implementación

### Negativas ⚠️
1. **Mantenimiento manual:** Requiere actualización manual de costos
2. **Riesgo de desfase:** Costo puede no reflejar cambios en materias primas
3. **Sin trazabilidad:** No se sabe de dónde viene el costo

### Mitigaciones 🛡️
1. Agregar campo `costUnit_lastUpdatedAt` y `costUnit_updatedBy`
2. Dashboard de "Items con costo desactualizado (>90 días)"
3. Documentar en ItemDetailDrawer que es temporal hasta BOM

---

## IMPLEMENTACIÓN

### Cambios Realizados (Sprint 1)

#### 1. PricingModal.tsx
```typescript
/**
 * @deprecated This component is DEPRECATED and will be removed.
 * Use ItemDetailDrawer instead for consistent pricing.
 * 
 * REASON: Contradictory business logic for costUnit field.
 * See INVENTORY_COSTUNIT_ARCHITECTURE_DECISION.md
 */
```

#### 2. ItemDetailDrawer.tsx
```typescript
<Input
  type="number"
  value={costUnit}
  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
/>
<p className="text-xs text-muted-foreground">
  💡 Editable manualmente. En el futuro será calculado automáticamente desde BOM.
</p>
```

### Próximos Pasos (Sprint 2)

- [ ] Eliminar completamente PricingModal.tsx
- [ ] Buscar y refactorizar todas las referencias a PricingModal → ItemDetailDrawer
- [ ] Agregar campos de auditoría: `costUnit_lastUpdatedAt`, `costUnit_updatedBy`
- [ ] Crear dashboard de "Costos Desactualizados"

### Roadmap Futuro (Q2 2025)

- [ ] Diseñar modelo de datos BOM
- [ ] Implementar BomCostService
- [ ] Migrar costUnit a campo calculado
- [ ] Implementar costUnit_override para excepciones

---

## REFERENCIAS

- **Auditoría Técnica:** WAREHOUSE_INVENTORY_AUDIT_REPORT.md
  - Hallazgo #7: Componentes duplicados
  - Hallazgo #8: Lógica contradictoria en costUnit

- **Especificación SSOT V2:** SSOT_V2_ESPECIFICACION_TECNICA_COMPLETA.md
  - Principio de "Single Source of Truth"

- **Archivos Modificados:**
  - `src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx`
  - `src/app/(app)/warehouse/inventory/components/PricingModal.tsx` (deprecated)

---

## NOTAS ADICIONALES

### Consideraciones para BOM Future

Cuando se implemente el cálculo desde BOM, considerar:

1. **Materias primas variables:** Precio fluctúa con mercado
2. **Mano de obra:** Coste por hora puede variar
3. **Overhead:** Costos indirectos (energía, alquiler, etc.)
4. **Mermas:** Porcentaje de desperdicio en producción
5. **Economías de escala:** Costo unitario varía con volumen

### Ejemplo de Estructura BOM Futura

```typescript
interface BOM {
  id: string;
  itemId: string;  // Producto final
  version: number;
  isActive: boolean;
  
  materials: Array<{
    itemId: string;     // Materia prima
    quantity: number;
    uom: string;
    wastePercentage: number;  // % merma
  }>;
  
  labor: {
    hoursPerUnit: number;
    costPerHour: number;
  };
  
  overhead: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
  };
  
  calculatedCost: {
    materials: number;
    labor: number;
    overhead: number;
    total: number;
    calculatedAt: Date;
  };
}
```

---

**Firmado:** Cline AI - Senior Software Architect  
**Aprobado:** Equipo Técnico Santa Brisa  
**Fecha de Revisión:** Post-implementación BOM (estimado Q2 2025)
