#!/bin/bash
# scripts/mark-quality-legacy-deprecated.sh
# Marca todo el código quality legacy como @deprecated

set -e

echo "🗑️ Marcando archivos quality legacy como @deprecated..."
echo ""

# Counter
count=0

# Function to add deprecation header
add_deprecation() {
  local file="$1"
  local message="$2"
  
  if [ -f "$file" ] && ! grep -q "@deprecated" "$file"; then
    # Create temp file with deprecation comment
    {
      echo "/**"
      echo " * @deprecated $message"
      echo " * Use quality-v2 system instead"
      echo " * See: QUALITY_DEPRECATION_PLAN.md"
      echo " */"
      cat "$file"
    } > "$file.tmp"
    
    mv "$file.tmp" "$file"
    echo "✅ $file"
    ((count++))
  fi
}

# 1. Páginas quality/
echo "📄 Marcando páginas quality/..."
find src/app/\(app\)/quality -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  add_deprecation "$file" "Legacy Quality page"
done

# 2. Componentes quality/
echo ""
echo "🧩 Marcando componentes quality/..."
find src/components/quality -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  add_deprecation "$file" "Legacy Quality component"
done

# 3. Server actions quality
echo ""
echo "⚙️ Marcando server actions quality..."
add_deprecation "src/server/actions/quality.actions.ts" "Legacy Quality actions - Use quality-v2.actions.ts"
add_deprecation "src/server/actions/quality.data.ts" "Legacy Quality data queries - Use canonical services"
add_deprecation "src/server/actions/quality-helpers.ts" "Legacy Quality helpers - Migrate to QualityService"
add_deprecation "src/server/actions/quality-stats.ts" "Legacy Quality stats - Use canonical services"

# 4. Domain helpers
echo ""
echo "🔧 Marcando helpers..."
add_deprecation "src/domain/qc-plan-helpers.ts" "Legacy QC helpers - Use QualityService"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deprecación completada"
echo "📊 Archivos marcados: $count"
echo ""
echo "⚠️  Próximos pasos:"
echo "  1. Revisar warnings en IDE"
echo "  2. Migrar referencias restantes"
echo "  3. Ejecutar tests de regresión"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
