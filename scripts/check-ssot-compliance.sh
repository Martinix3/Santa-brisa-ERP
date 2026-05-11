#!/bin/bash

# Script para auditar el cumplimiento del SSOT V2 en el frontend.
# Buscará patrones de código "legacy" que deben ser refactorizados.
# Saldrá con código 1 (error) si encuentra alguna violación.

FAILURE_COUNT=0
SRC_DIR="src/app"

echo "=========================================="
echo "🔎 Iniciando Auditoría de SSOT V2..."
echo "=========================================="

# ---
# HALLAZGO #1 (CRÍTICO): Uso de 'itemsBySku' en lugar de 'itemsById'
# Evidencia: InventoryClient.tsx
echo ""
echo "---"
echo "🔴 HALLAZGO #1: Buscando uso de 'itemsBySku' (debe ser 'itemsById')..."
grep -nr --include="*.tsx" --color=auto "itemsBySku" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
else
    echo "✅ OK: No se encontró 'itemsBySku'."
fi

# ---
# HALLAZGO #3 (LEGACY): Uso de '.lotNumber' en lugar de '.lotCode'
# Evidencia: LotRows.tsx, InventoryClient.tsx
echo ""
echo "---"
echo "🟡 HALLAZGO #3: Buscando uso de '.lotNumber' (debe ser '.lotCode')..."
grep -nr --include="*.tsx" --color=auto "\.lotNumber" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
else
    echo "✅ OK: No se encontró '.lotNumber'."
fi

# ---
# HALLAZGO #4 (LEGACY): Uso de 'warehouseId'
# Evidencia: LotDetailPanel.tsx
echo ""
echo "---"
echo "🟡 HALLAZGO #4: Buscando uso de 'warehouseId' (debe ser 'locationId')..."
grep -nr --include="*.tsx" --color=auto "warehouseId" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
else
    echo "✅ OK: No se encontró 'warehouseId'."
fi

# ---
# HALLAZGO #5 (LEGACY): Uso de 'move.date'
# Evidencia: LotDetailPanel.tsx
echo ""
echo "---"
echo "🟡 HALLAZGO #5: Buscando uso de 'move.date' (debe ser 'occurredAt' o 'createdAt')..."
grep -nr --include="*.tsx" --color=auto "move.date" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
else
    echo "✅ OK: No se encontró 'move.date'."
fi

# ---
# HALLAZGO #6 (LEGACY): Uso de 'item.active', 'caseUnits', 'barcode'
# Evidencia: ItemDetailDrawer.tsx
echo ""
echo "---"
echo "🟡 HALLAZGO #6: Buscando campos legacy en Item (active, caseUnits, barcode)..."
grep -nr --include="*.tsx" --color=auto "item.active" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
    echo "   (Encontrado 'item.active', debe ser 'isActive')"
fi

grep -nr --include="*.tsx" --color=auto "caseUnits" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
    echo "   (Encontrado 'caseUnits', debe ser 'unitsPerCase')"
fi

grep -nr --include="*.tsx" --color=auto "barcode" $SRC_DIR
if [ $? -eq 0 ]; then
    ((FAILURE_COUNT++))
    echo "   (Encontrado 'barcode', debe ser 'eanCode')"
fi

if [ $FAILURE_COUNT -eq 0 ]; then
    echo "✅ OK: No se encontraron campos legacy de Item."
fi

# ---
# RESUMEN FINAL
# ---
echo ""
echo "=========================================="
if [ $FAILURE_COUNT -gt 0 ]; then
    echo "❌ AUDITORÍA FALLIDA: Se encontraron $FAILURE_COUNT violaciones de SSOT."
    echo "Por favor, corrige los patrones de código listados arriba."
    exit 1
else
    echo "✅ AUDITORÍA SUPERADA: ¡Excelente! No se encontraron violaciones de SSOT pendientes."
    exit 0
fi
