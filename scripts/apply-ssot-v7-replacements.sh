#!/bin/bash
# Script de fuerza bruta para migrar a SSOT v7
# Aplica reemplazos seguros en todo el código

set -e  # Exit on error

echo "🚀 Iniciando migración masiva a SSOT v7..."

# 1. Propiedades de Account
echo "📝 Reemplazando propiedades de Account..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/\.ownerId/.salesRepId/g' \
  -e 's/\.segment/.accountType/g' \
  -e 's/account\.stage/account.accountStage/g' \
  -e 's/\.mode/.commercialFlow/g' \
  {} \;

# 2. Propiedades de Interaction
echo "📝 Reemplazando propiedades de Interaction..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/interaction\.note/interaction.summary/g' \
  {} \;

# 3. Colecciones en SantaData
echo "📝 Reemplazando nombres de colecciones..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/data\.teams/data.teamMembers/g' \
  -e 's/data\.users/data.teamMembers/g' \
  -e 's/data\.orderSellOut/data.ordersSellOut/g' \
  {} \;

# 4. Valores de enum CommercialFlow
echo "📝 Reemplazando valores de CommercialFlow..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s/'DIRECT'/'DIRECTA'/g" \
  -e "s/'PLACEMENT'/'COLOCACION'/g" \
  -e 's/"DIRECT"/"DIRECTA"/g' \
  -e 's/"PLACEMENT"/"COLOCACION"/g' \
  {} \;

# 5. itemId → sku en estructuras de datos
echo "📝 Reemplazando itemId por sku..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/itemId:/sku:/g' \
  {} \;

echo "✅ Reemplazos masivos completados!"
echo "⚠️  Ahora ejecuta: npx tsc --noEmit para ver errores restantes"
