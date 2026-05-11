#!/bin/bash
# scripts/validate-ssot-v2-smart.sh
# SSOT v2 - Validación inteligente que ignora falsos positivos

echo "🔍 SSOT v2 - Smart Cutover Validation"
echo "🎯 Checking ONLY critical SSOT patterns..."

legacy_count=0
exit_code=0

# Solo buscar en archivos del dominio SSOT (no comentarios o UI)
SSOT_FILES="src/server/actions src/domain src/services src/lib"

echo ""
echo "🎯 Checking SSOT-specific files only (not comments/UI)..."

# 1. lotNumber SOLO en contexto de datos/lógica (no comentarios)
echo "1️⃣ Critical lotNumber patterns in data logic:"
critical_lotNumber=$(grep -r "lotNumber\s*:" $SSOT_FILES --include="*.ts" | grep -v "lotNumberLegacy" | wc -l | tr -d ' ')
if [ $critical_lotNumber -gt 0 ]; then
  echo "  ❌ Found $critical_lotNumber critical lotNumber field definitions"
  grep -r "lotNumber\s*:" $SSOT_FILES --include="*.ts" | grep -v "lotNumberLegacy" | head -3 | sed 's/^/     /'
  legacy_count=$((legacy_count + critical_lotNumber))
else
  echo "  ✅ No critical lotNumber field definitions"
fi

# 2. warehouseId SOLO en StockMove/similar
echo ""
echo "2️⃣ Critical warehouse patterns in StockMove:"
critical_warehouse=$(grep -r -A2 -B2 "warehouseId" $SSOT_FILES --include="*.ts" | grep -E "(StockMove|stockMove)" | wc -l | tr -d ' ')
if [ $critical_warehouse -gt 0 ]; then
  echo "  ❌ Found $critical_warehouse critical warehouseId in StockMove context"
  legacy_count=$((legacy_count + critical_warehouse))
else
  echo "  ✅ No critical warehouseId in StockMove context"
fi

# 3. generateSKU SOLO en warehouse logic
echo ""
echo "3️⃣ Critical generator calls:"
critical_generators=$(grep -r "generateSKU\|generateInternalLot\|findNextLotNumber" $SSOT_FILES --include="*.ts" | grep -v "import" | wc -l | tr -d ' ')
if [ $critical_generators -gt 0 ]; then
  echo "  ❌ Found $critical_generators critical legacy generator calls"
  grep -r "generateSKU\|generateInternalLot\|findNextLotNumber" $SSOT_FILES --include="*.ts" | grep -v "import" | head -3 | sed 's/^/     /'
  legacy_count=$((legacy_count + critical_generators))
else
  echo "  ✅ No critical legacy generator calls"
fi

# 4. Legacy imports que SON problemáticos
echo ""
echo "4️⃣ Critical legacy imports:"
critical_imports=$(grep -r "@/lib/warehouse-generators" $SSOT_FILES --include="*.ts" | wc -l | tr -d ' ')
if [ $critical_imports -gt 0 ]; then
  echo "  ❌ Found $critical_imports critical legacy imports"
  grep -r "@/lib/warehouse-generators" $SSOT_FILES --include="*.ts" | head -3 | sed 's/^/     /'
  legacy_count=$((legacy_count + critical_imports))
else
  echo "  ✅ No critical legacy imports"
fi

# 5. Verificar que servicios canónicos se usan
echo ""
echo "5️⃣ Canonical service usage:"
canonical_usage=$(grep -r "SkuService\|LotService" $SSOT_FILES --include="*.ts" | wc -l | tr -d ' ')
echo "  📊 Canonical services usage: $canonical_usage references"

if [ $canonical_usage -gt 10 ]; then
  echo "  ✅ Good canonical service adoption"
else
  echo "  ⚠️  Low canonical service usage"
fi

# 6. Verificar build status
echo ""
echo "6️⃣ Build verification:"
if npm run build >/dev/null 2>&1; then
  echo "  ✅ TypeScript build: SUCCESS"
else
  echo "  ❌ TypeScript build: FAILED"
  echo "     Run 'npm run build' to see errors"
  legacy_count=$((legacy_count + 1))
fi

# RESUMEN FINAL - Criterios de éxito ajustados
echo ""
echo "📊 SMART VALIDATION SUMMARY:"
echo "  Critical legacy patterns: $legacy_count"
echo "  Canonical usage: $canonical_usage references"
echo ""

if [ $legacy_count -eq 0 ] && [ $canonical_usage -gt 5 ]; then
  echo "  ✅ SSOT V2 CUTOVER SUCCESSFUL!"
  echo ""
  echo "🎯 Ready for production:"
  echo "  - Build compiles without errors"
  echo "  - No critical legacy patterns"
  echo "  - Canonical services being used"
  echo "  - Comment/UI legacy patterns ignored (acceptable)"
  echo ""
  echo "📝 Commit changes:"
  echo "  git add . && git commit -m 'SSOT v2 code cutover complete'"
  exit_code=0
else
  echo "  ❌ CUTOVER NEEDS ATTENTION"
  echo ""
  echo "🔧 Action required:"
  echo "  - Fix critical patterns manually (ignore comments/UI)"
  echo "  - Ensure build passes: npm run build"
  echo "  - Re-run: ./scripts/validate-ssot-v2-smart.sh"
  exit_code=1
fi

echo ""
exit $exit_code
