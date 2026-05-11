# SSOT V2 - CODE-ONLY CUTOVER PLAN
## Migración Segura Sin Tocar Datos

### ESTRATEGIA: CODE-ONLY CUTOVER

**🎯 ENFOQUE:** Migrar SOLO código, sin tocar Firestore  
**⏱️ TIEMPO:** 2-3 horas vs 2-3 días  
**🚨 RIESGO:** Mínimo (rollback = git revert)  
**✅ BUILD:** Debe quedar verde tras cutover  

---

## 🔄 PLAN DE EJECUCIÓN (ORDEN EXACTO)

### PASO 1: Añadir Tipos/Servicios Canónicos ✅
- [x] `src/domain/types.ts` - Tipos canónicos creado
- [x] `src/services/canonical/` - Servicios implementados
- [x] `.eslintrc.ssot-v2.js` - Rules anti-legacy creadas

### PASO 2: Transformación Automática (Codemods/Scripts)
```bash
# 1. Transformar campos legacy → canónicos
npm run codemod:ssot-v2

# 2. Verificar transformaciones
npm run lint:ssot-v2 --fix

# 3. Revisar diff manual
git diff
```

### PASO 3: Activar ESLint Anti-Legacy
```bash
# Cambiar .eslintrc.js para usar reglas SSOT v2
cp .eslintrc.ssot-v2.js .eslintrc.js

# Verificar que build falla con legacy patterns
npm run lint
```

### PASO 4: Arreglar Type Errors Restantes
```bash
# Los errores TypeScript son tu guía de refactor
npm run build 2>&1 | grep error

# Arreglar uno por uno hasta build verde
npm run build
```

### PASO 5: Seeds Mínimos (Opcional)
```bash
# Solo si quieres recrear colecciones de test
npx tsx scripts/seed-minimal.ts
```

---

## 🛠️ TRANSFORMACIONES AUTOMÁTICAS

### Script de Transformación Global
```bash
#!/bin/bash
# scripts/transform-ssot-v2.sh

echo "🚀 SSOT v2 - Code-Only Cutover"

# 1. lotNumber → lotCode
echo "🔄 lotNumber → lotCode"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotNumber/lotCode/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lote\b/lotCode/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/batch\b/lotCode/g'

# 2. warehouseId → fromLocationId/toLocationId  
echo "🔄 warehouseId → fromLocationId"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/warehouseId/fromLocationId/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/toWarehouseId/toLocationId/g'

# 3. date → occurredAt (en contexto StockMove)
echo "🔄 date → occurredAt"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.date\b/.occurredAt/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/'date'/'occurredAt'/g"

# 4. Reemplazar imports legacy
echo "🔄 Replacing legacy imports"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/warehouse-generators|@/services/canonical|g'

# 5. Reemplazar generadores
echo "🔄 Replacing generators"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/generateSKU(/SkuService.makeSku(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/generateInternalLot(/LotService.generateLotCode(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/findNextLotNumber(/LotService.generateLotCode(/g'

echo "✅ Transformations complete!"
echo "🔍 Run: npm run build to check for remaining issues"
```

### Validación de Transformaciones
```bash
#!/bin/bash
# scripts/validate-ssot-v2-cutover.sh

echo "🔍 SSOT v2 - Validating Cutover"

# Buscar patrones legacy que deberían estar eliminados
echo "❌ Checking for legacy patterns..."

legacy_count=0

# lotNumber variants
legacy_lotNumber=$(grep -r "lotNumber\|lote\b\|batch\b" src --include="*.ts" --include="*.tsx" | wc -l)
if [ $legacy_lotNumber -gt 0 ]; then
  echo "  ❌ Found $legacy_lotNumber legacy lot references"
  legacy_count=$((legacy_count + legacy_lotNumber))
fi

# warehouseId variants  
legacy_warehouse=$(grep -r "warehouseId\|toWarehouseId" src --include="*.ts" --include="*.tsx" | wc -l)
if [ $legacy_warehouse -gt 0 ]; then
  echo "  ❌ Found $legacy_warehouse legacy warehouse references"
  legacy_count=$((legacy_count + legacy_warehouse))
fi

# Legacy generators
legacy_generators=$(grep -r "generateSKU\|generateInternalLot\|lotPrefixFromSku\|findNextLotNumber" src --include="*.ts" --include="*.tsx" | wc -l)
if [ $legacy_generators -gt 0 ]; then
  echo "  ❌ Found $legacy_generators legacy generator references"  
  legacy_count=$((legacy_count + legacy_generators))
fi

# Legacy imports
legacy_imports=$(grep -r "@/lib/warehouse-generators" src --include="*.ts" --include="*.tsx" | wc -l)
if [ $legacy_imports -gt 0 ]; then
  echo "  ❌ Found $legacy_imports legacy import references"
  legacy_count=$((legacy_count + legacy_imports))
fi

if [ $legacy_count -eq 0 ]; then
  echo "✅ No legacy patterns found"
else
  echo "❌ Total legacy patterns: $legacy_count"
  echo "🔧 Run transformations again or fix manually"
  exit 1
fi

echo "✅ SSOT v2 cutover validation passed!"
```

---

## 📋 CHECKLIST CODE-ONLY CUTOVER

### Pre-Cutover ☑️
- [x] ✅ Tipos canónicos en `src/domain/types.ts`
- [x] ✅ Servicios canónicos en `src/services/canonical/`
- [x] ✅ ESLint rules anti-legacy preparadas
- [ ] ✅ Scripts de transformación listos
- [ ] ✅ Backup de código actual (git commit)

### Transformación ☑️
- [ ] ✅ lotNumber → lotCode transformado
- [ ] ✅ warehouseId → fromLocationId transformado
- [ ] ✅ date → occurredAt transformado  
- [ ] ✅ generateSKU → SkuService.makeSku transformado
- [ ] ✅ Imports legacy → @/services/canonical transformado

### Post-Cutover ☑️
- [ ] ✅ ESLint rules activas (.eslintrc.js actualizado)
- [ ] ✅ npm run lint = 0 errores legacy
- [ ] ✅ npm run build = success
- [ ] ✅ npm run test = passing
- [ ] ✅ git commit "SSOT v2 code cutover"

---

## 🚀 EJECUCIÓN RÁPIDA

### Comando One-Liner
```bash
# Backup + Transformación + Validación
git add . && git commit -m "Pre-SSOT-v2 backup" && \
chmod +x scripts/transform-ssot-v2.sh && ./scripts/transform-ssot-v2.sh && \
cp .eslintrc.ssot-v2.js .eslintrc.js && \
npm run build && \
echo "🎉 SSOT v2 cutover complete!"
```

### Rollback One-Liner
```bash
# Si algo falla, rollback inmediato
git reset --hard HEAD~1 && \
echo "🔄 Rollback complete, back to legacy SSOT"
```

---

## 🎯 CRITERIOS DE ÉXITO

### Build Verde ✅
- `npm run build` = success (0 TypeScript errors)
- `npm run lint` = success (0 ESLint errors)  
- `npm run test:basic` = passing

### Legacy Eliminado ✅
- 0 referencias a `lotNumber`, `warehouseId`, `toWarehouseId`
- 0 imports de `@/lib/warehouse-generators`
- 0 llamadas a `generateSKU`, `generateInternalLot`
- 100% uso de `SkuService`, `LotService`

### Funcionalidad ✅
- Server actions compilan correctamente
- Tipos canónicos importados donde se necesiten
- UI no tiene errores de compilación

**RESULTADO:** Repo limpio con SSOT v2 canónico, **sin tocar datos**, **rollback trivial** con git.

---

## 🚨 VENTAJAS vs MIGRACIÓN DE DATOS

| Aspecto | Code-Only | Migración Datos |
|---------|-----------|------------------|
| **Tiempo** | 2-3 horas | 2-3 días |
| **Riesgo** | Mínimo | Alto |
| **Rollback** | `git revert` | Restore backups |
| **Testing** | Build local | Staging + Prod |
| **Downtime** | 0 minutos | Potencial |
| **Complejidad** | Baja | Alta |

**RECOMENDACIÓN:** Ejecutar code-only cutover **AHORA**, migración de datos **después** si realmente necesaria.
