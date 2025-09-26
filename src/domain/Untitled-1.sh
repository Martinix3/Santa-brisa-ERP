#!/usr/bin/env bash
set -euo pipefail

files=$(git ls-files "src/**.[tj]s*" | tr '\n' ' ')
[ -z "${files}" ] && exit 0

# === UOM: 'uds' -> 'unit'
perl -pi -e "s/'uds'/'unit'/g" $files
perl -pi -e 's/\buds\b/unit/g' $files

# === lotIds -> lotNumbers
perl -pi -e 's/\blotIds\b/lotNumbers/g' $files

# === InventoryItem -> OnHandView (tipo)
perl -pi -e 's/\bInventoryItem\b/OnHandView/g' $files

# === colección inventory -> onHand (ojo: UI puede necesitar mapping de sku)
perl -pi -e 's/(\bsantaData\?|\bdata\?)\.inventory\b/\1.onHand/g' $files
# rutas con "inventory" genérico en features/api (mejor aproximación)
perl -pi -e 's/\binventory\b/onHand/g' src/app/api src/features 2>/dev/null || true

# === ShipmentLine: .sku -> .itemId
perl -pi -e 's/(\.)sku\b/\1itemId/g' src/app src/features src/server src/lib 2>/dev/null || true

# === ProductionOrder: lotId -> batchCode
perl -pi -e 's/\blotId\b/batchCode/g' $files

# === QACheck: lotId usages (dashboard/traceability)
perl -pi -e 's/\bcheck\.lotId\b/(check.subject?.kind==="LOT"?check.subject.id:undefined)/g' src/app 2>/dev/null || true
# filtros
perl -pi -e 's/\bqaChecks\.filter\(\s*\(\w+\)\s*=>\s*\1\.lotId\s*===\s*(\w+)\s*\)/qaChecks.filter(($1)=>$1.subject?.kind==="LOT" && $1.subject.id===$2)/g' src/app 2>/dev/null || true

# === StockMove: fromLocation / toLocation -> locationId único
perl -pi -e 's/\bfromLocation\b/locationId/g' src 2>/dev/null || true
perl -pi -e 's/\btoLocation\b/locationId/g' src 2>/dev/null || true

# === CODE_POLICIES (si cambió el nombre)
# (no sustituimos automáticamente; se ajusta en patch puntual abajo)

echo "✅ migrate_v2.sh completed"
