#!/bin/bash
# scripts/transform-ssot-v2.sh
# SSOT v2 - Transformación Automática Code-Only

echo "🚀 SSOT v2 - Code-Only Cutover"
echo "🔄 Transforming legacy patterns to canonical..."

# 1. lotNumber → lotCode (todas las variantes)
echo "📝 1/6: lotNumber → lotCode"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotNumber/lotCode/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\blote\b/lotCode/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\bbatch\b/lotCode/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lot_code/lotCode/g'

# 2. warehouseId → fromLocationId/toLocationId  
echo "📝 2/6: warehouseId → locations"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/warehouseId/fromLocationId/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/toWarehouseId/toLocationId/g'

# 3. date → occurredAt (en contexto StockMove)
echo "📝 3/6: date → occurredAt"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.date\b/.occurredAt/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/'date'/'occurredAt'/g"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/"date"/"occurredAt"/g'

# 4. Reemplazar imports legacy → canonical
echo "📝 4/6: Legacy imports → @/services/canonical"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/warehouse-generators|@/services/canonical|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from.*warehouse-generators.*|from "@/services/canonical"|g'

# 5. Reemplazar generadores legacy → servicios canónicos
echo "📝 5/6: Legacy generators → SkuService/LotService"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/generateSKU(/SkuService.makeSku(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/generateInternalLot(/LotService.generateLotCode(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/findNextLotNumber(/LotService.generateLotCode(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotPrefixFromSku(/LotService.generateLotCode(/g'

# 6. Arreglar imports donde se necesiten los servicios
echo "📝 6/6: Adding missing imports"
# Buscar archivos que usan SkuService pero no lo importan
for file in $(grep -l "SkuService" src/**/*.ts src/**/*.tsx 2>/dev/null); do
  if ! grep -q "import.*SkuService" "$file"; then
    # Añadir import al principio del archivo
    sed -i '' '1i\
import { SkuService } from "@/services/canonical";\
' "$file"
  fi
done

# Buscar archivos que usan LotService pero no lo importan
for file in $(grep -l "LotService" src/**/*.ts src/**/*.tsx 2>/dev/null); do
  if ! grep -q "import.*LotService" "$file"; then
    sed -i '' '1i\
import { LotService } from "@/services/canonical";\
' "$file"
  fi
done

echo ""
echo "✅ Transformations complete!"
echo "📊 Summary:"
echo "  - lotNumber → lotCode"
echo "  - warehouseId → fromLocationId/toLocationId"  
echo "  - date → occurredAt"
echo "  - Legacy generators → SkuService/LotService"
echo "  - Legacy imports → @/services/canonical"
echo ""
echo "🔍 Next steps:"
echo "  1. npm run build (check for TypeScript errors)"
echo "  2. npm run lint (check for ESLint errors)"
echo "  3. Fix any remaining issues manually"
echo "  4. git commit 'SSOT v2 code cutover'"
