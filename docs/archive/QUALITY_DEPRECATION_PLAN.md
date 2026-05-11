# 🗑️ PLAN DE DEPRECACIÓN QUALITY LEGACY
## Marcar como obsoleto todo lo que NO use quality-v2

**Fecha:** 20 de Octubre 2025  
**Criterio:** Si NO lo usa quality-v2 → Marcar como `@deprecated`

---

## ✅ LO QUE USA QUALITY-V2 (MANTENER)

### Dependencias Directas quality-v2
```typescript
// MÓDULOS NUEVOS - MANTENER
@/server/actions/quality-v2.actions         ✅ NUEVO SISTEMA
@/server/actions/analysis-library.actions   ✅ NUEVO SISTEMA
@/server/actions/compliance.actions          ✅ NUEVO SISTEMA
@/server/actions/documents-v2.actions        ✅ NUEVO SISTEMA

@/components/quality-v2/*                    ✅ NUEVO SISTEMA
@/domain/ssot-v2-plus-schemas               ✅ NUEVO SISTEMA
@/services/canonical/*                       ✅ NUEVO SISTEMA

// EXTERNOS
lucide-react                                 ✅ MANTENER
sonner                                       ✅ MANTENER
react                                        ✅ MANTENER
```

---

## ❌ MARCAR COMO @deprecated (NO USADO POR QUALITY-V2)

### 🗂️ PÁGINAS LEGACY - DEPRECAR COMPLETO

```bash
src/app/(app)/quality/
├── dashboard/          ❌ @deprecated - Usar /quality-v2/dashboard
├── lots/              ❌ @deprecated - Pendiente migración a quality-v2
├── releases/          ❌ @deprecated - Pendiente migración a quality-v2
├── plans/             ❌ @deprecated - Pendiente migración a quality-v2
└── traceability/      ❌ @deprecated - Pendiente migración a quality-v2
```

**Acción:**
```typescript
// src/app/(app)/quality/dashboard/page.tsx
/**
 * @deprecated Use /quality-v2/dashboard instead
 * This legacy module will be removed in next major version
 * Migration guide: See QUALITY_LEGACY_VS_V2_ANALYSIS.md
 */
```

### 🧩 COMPONENTES LEGACY - DEPRECAR TODOS

```bash
src/components/quality/
├── GeminiAlertsCard.tsx      ❌ @deprecated
├── QcPlanDrawer.tsx          ❌ @deprecated  
├── QcPlanEditorDrawer.tsx    ❌ @deprecated
├── ReleaseLotDrawer.tsx      ❌ @deprecated - Usar @/components/quality-v2/LotQcDrawer
├── QualityBadge.tsx          ❌ @deprecated - Usar .sb-badge--variant
└── DecisionBadge.tsx         ❌ @deprecated - Usar .sb-badge--variant
```

**Acción:**
```typescript
// src/components/quality/GeminiAlertsCard.tsx
/**
 * @deprecated Legacy component - will be migrated to quality-v2
 * Use quality-v2 components with Design System v2.0 instead
 * DO NOT use in new code
 */

// src/components/quality/QualityBadge.tsx
/**
 * @deprecated Use Design System v2.0 badges instead
 * Replace with: <span className="sb-badge--success">APROBADO</span>
 * See: docs/design_SYSTEM_GIDE2.md
 */
```

### ⚙️ SERVER ACTIONS LEGACY - DEPRECAR TODOS

```bash
src/server/actions/
├── quality.actions.ts        ❌ @deprecated - Usar quality-v2.actions.ts
├── quality.data.ts           ❌ @deprecated - Usar servicios canónicos
├── quality-helpers.ts        ❌ @deprecated - Migrar a QualityService
└── quality-stats.ts          ❌ @deprecated - Usar servicios canónicos
```

**Acción:**
```typescript
// src/server/actions/quality.actions.ts
/**
 * @deprecated Legacy Quality Actions
 * Use @/server/actions/quality-v2.actions.ts instead
 * 
 * Migration path:
 * - All QC operations → quality-v2.actions.ts
 * - Data queries → @/services/canonical/quality.service.ts
 * 
 * This file will be removed in v3.0
 */
```

### 🔧 HELPERS LEGACY - DEPRECAR TODOS

```bash
src/domain/
└── qc-plan-helpers.ts        ❌ @deprecated - Usar QualityService

src/lib/
└── (cualquier helper de quality legacy)  ❌ @deprecated
```

**Acción:**
```typescript
// src/domain/qc-plan-helpers.ts
/**
 * @deprecated Legacy QC Plan helpers
 * Migrate logic to @/services/canonical/quality.service.ts
 * DO NOT use in new code
 */
```

---

## 📋 SCRIPT DE DEPRECACIÓN AUTOMÁTICA

```bash
#!/bin/bash
# scripts/mark-quality-legacy-deprecated.sh

echo "Marcando archivos quality legacy como @deprecated..."

# Páginas quality/
for file in src/app/\(app\)/quality/**/*.{ts,tsx}; do
  if [ -f "$file" ]; then
    sed -i '' '1i\
/**\
 * @deprecated Legacy Quality module\
 * Use /quality-v2/ instead\
 * Migration guide: QUALITY_LEGACY_VS_V2_ANALYSIS.md\
 */\
' "$file"
  fi
done

# Componentes quality/
for file in src/components/quality/*.{ts,tsx}; do
  if [ -f "$file" ]; then
    sed -i '' '1i\
/**\
 * @deprecated Legacy component\
 * Use quality-v2 components with Design System v2.0\
 * DO NOT use in new code\
 */\
' "$file"
  fi
done

# Server actions quality
sed -i '' '1i\
/**\
 * @deprecated Use @/server/actions/quality-v2.actions.ts\
 * This file will be removed in v3.0\
 */\
' src/server/actions/quality.actions.ts

sed -i '' '1i\
/**\
 * @deprecated Use @/services/canonical/quality.service.ts\
 */\
' src/server/actions/quality.data.ts

sed -i '' '1i\
/**\
 * @deprecated Migrate to @/services/canonical/quality.service.ts\
 */\
' src/server/actions/quality-helpers.ts

sed -i '' '1i\
/**\
 * @deprecated Use @/services/canonical/quality.service.ts\
 */\
' src/server/actions/quality-stats.ts

echo "✅ Deprecación completada"
```

---

## 📊 RESUMEN DE DEPRECACIÓN

### TOTAL A DEPRECAR

| Categoría | Archivos | Referencias | Estado |
|-----------|----------|-------------|--------|
| **Páginas quality/** | ~5 | Múltiples | ❌ Deprecar |
| **Componentes quality/** | ~6 | 48+ | ❌ Deprecar |
| **Server actions** | ~4 | 22+ | ❌ Deprecar |
| **Helpers** | ~1 | 1 | ❌ Deprecar |
| **TOTAL** | **~16** | **~71+** | **❌** |

### LO QUE SE MANTIENE

| Categoría | Archivos | Estado |
|-----------|----------|--------|
| **quality-v2/** | 5 | ✅ ACTIVO |
| **quality-v2.actions.ts** | 1 | ✅ ACTIVO |
| **analysis-library.actions.ts** | 1 | ✅ ACTIVO |
| **compliance.actions.ts** | 1 | ✅ ACTIVO |
| **documents-v2.actions.ts** | 1 | ✅ ACTIVO |
| **Servicios canónicos** | ~6 | ✅ ACTIVO |
| **Schemas SSOT_V2_PLUS** | 1 | ✅ ACTIVO |

---

## 🎯 EJECUCIÓN DEL PLAN

### Opción 1: Manual (Recomendado para revisión)

1. Añadir `@deprecated` en cada archivo legacy
2. Incluir mensaje de migración
3. Referenciar documentación

### Opción 2: Automática (Script)

```bash
chmod +x scripts/mark-quality-legacy-deprecated.sh
./scripts/mark-quality-legacy-deprecated.sh
```

### Opción 3: Eslint Rule (Preventivo)

```javascript
// .eslintrc.js
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: '@/server/actions/quality.actions',
        message: 'Use @/server/actions/quality-v2.actions instead'
      }, {
        name: '@/components/quality/*',
        message: 'Use @/components/quality-v2/* instead'
      }]
    }]
  }
}
```

---

## ⚠️ ADVERTENCIAS

### NO Deprecar (Aún en uso activo)

Estos archivos legacy tienen **71+ referencias activas**. Antes de eliminarlos:

1. ✅ Marcar como `@deprecated`
2. ⚠️ Migrar todas las referencias a quality-v2
3. ✅ Verificar que no se rompa funcionalidad
4. ✅ Ejecutar tests de regresión
5. ✅ Solo entonces ELIMINAR archivos

### Timeline Sugerido

- **Semana 1:** Marcar como @deprecated + Eslint rules
- **Semana 2-3:** Migrar componentes restantes a quality-v2
- **Semana 4:** Actualizar referencias en codebase
- **Semana 5:** Eliminar archivos legacy tras verificación

---

## 📋 CHECKLIST DE DEPRECACIÓN

- [ ] Marcar páginas quality/ como @deprecated
- [ ] Marcar componentes quality/ como @deprecated
- [ ] Marcar quality.actions.ts como @deprecated
- [ ] Marcar quality.data.ts como @deprecated
- [ ] Marcar quality-helpers.ts como @deprecated
- [ ] Marcar quality-stats.ts como @deprecated
- [ ] Marcar qc-plan-helpers.ts como @deprecated
- [ ] Añadir Eslint rules preventivas
- [ ] Documentar plan de migración
- [ ] Comunicar a equipo

---

## 🎯 RESULTADO ESPERADO

Tras ejecutar este plan:

✅ Todo el código legacy quedará **claramente marcado** como obsoleto  
✅ Los desarrolladores verán **warnings** en el IDE  
✅ Eslint **prevendrá** nuevos usos de código legacy  
✅ La migración a quality-v2 será **guiada y segura**
