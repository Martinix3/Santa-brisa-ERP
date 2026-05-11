#!/bin/bash
# scripts/validate-ssot-v2-cutover.sh
# SSOT v2 - Validación de Code-Only Cutover

echo "🔍 SSOT v2 - Validating Code-Only Cutover"
echo "🔍 Checking for legacy patterns that should be eliminated..."

legacy_count=0
exit_code=0

# Función para reportar findings
report_findings() {
  local pattern="$1"
  local description="$2" 
  local findings
  
  findings=$(grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
  
  if [ "$findings" -gt 0 ]; then
    echo "  ❌ Found $findings $description"
    legacy_count=$((legacy_count + findings))
    
    # Mostrar primeros 3 ejemplos
    echo "     Examples:"
    grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -3 | sed 's/^/       /'
    echo ""
  else
    echo "  ✅ No $description found"
  fi
}

echo ""
echo "1️⃣ Legacy lot field patterns:"
report_findings "lotNumber\b" "lotNumber references"
report_findings "\blote\b" "lote references" 
report_findings "\bbatch\b" "batch references"

echo ""
echo "2️⃣ Legacy warehouse field patterns:"
report_findings "warehouseId\b" "warehouseId references"
report_findings "toWarehouseId\b" "toWarehouseId references"

echo ""
echo "3️⃣ Legacy date field patterns:"
report_findings "\.date\b" "date field accesses"
report_findings "'date'" "date string literals in queries"

echo ""
echo "4️⃣ Legacy generator function calls:"
report_findings "generateSKU\s*\(" "generateSKU() calls"
report_findings "generateInternalLot\s*\(" "generateInternalLot() calls"
report_findings "lotPrefixFromSku\s*\(" "lotPrefixFromSku() calls"
report_findings "findNextLotNumber\s*\(" "findNextLotNumber() calls"

echo ""
echo "5️⃣ Legacy imports:"
report_findings "@/lib/warehouse-generators" "warehouse-generators imports"
report_findings "warehouse-generators" "warehouse-generators module references"

echo ""
echo "6️⃣ Canonical usage verification:"
canonical_sku=$(grep -r "SkuService" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
canonical_lot=$(grep -r "LotService" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')

echo "  📊 SkuService usage: $canonical_sku references"
echo "  📊 LotService usage: $canonical_lot references"

if [ "$canonical_sku" -gt 0 ] || [ "$canonical_lot" -gt 0 ]; then
  echo "  ✅ Canonical services being used"
else
  echo "  ⚠️  No canonical service usage detected"
fi

echo ""
echo "📊 SUMMARY:"
echo "  Legacy patterns found: $legacy_count"
echo "  Canonical usage: $((canonical_sku + canonical_lot)) references"

if [ $legacy_count -eq 0 ]; then
  echo "  ✅ CUTOVER VALIDATION PASSED!"
  echo ""
  echo "🎯 Ready for:"
  echo "  - npm run build"
  echo "  - npm run lint" 
  echo "  - git commit 'SSOT v2 code cutover'"
  exit_code=0
else
  echo "  ❌ CUTOVER VALIDATION FAILED!"
  echo ""
  echo "🔧 Action required:"
  echo "  - Run transformations again: ./scripts/transform-ssot-v2.sh"
  echo "  - Fix remaining issues manually"
  echo "  - Re-run validation: ./scripts/validate-ssot-v2-cutover.sh"
  exit_code=1
fi

echo ""
exit $exit_code
