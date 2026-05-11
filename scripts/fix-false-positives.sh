#!/bin/bash
# scripts/fix-false-positives.sh
# SSOT v2 - Arregla transformaciones incorrectas

echo "🔧 SSOT v2 - Fixing False Positives"

# 1. Revertir "lote" en comentarios españoles
echo "📝 Revirtiendo 'lote' en comentarios..."
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|// \*.*lotCode|// * lote|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|/\*.*lotCode.*\*/|/* lote */|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|liberar/rechazar un lotCode|liberar/rechazar un lote|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|verificar si un lotCode|verificar si un lote|g'

# 2. Revertir "batch" en operaciones Firestore
echo "📝 Revirtiendo Firestore batch operations..."
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/const lotCode = db\.lotCode()/const batch = db.batch()/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotCode\.update(/batch.update(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotCode\.set(/batch.set(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotCode\.delete(/batch.delete(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/lotCode\.commit(/batch.commit(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/await lotCode\./await batch./g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.lotCode();/.batch();/g'

# 3. Revertir "date" en contextos legítimos  
echo "📝 Revirtiendo date en contextos legítimos..."
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/new OccurredAt(/new Date(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/OccurredAt\.now(/Date.now(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.getOccurredAt(/.getDate(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.setOccurredAt(/.setDate(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/OccurredAt>/Date>/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/= OccurredAt/= Date/g'

# 4. Revertir transformaciones en strings/configuraciones
echo "📝 Revirtiendo configuraciones específicas..."
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/Tamaño de lotCode para/Tamaño de batch para/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/generar un lotCode de IDs/generar un lote de IDs/g'

# 5. Casos específicos problemáticos detectados
echo "📝 Arreglando casos específicos..."

# Firestore batch operations que se transformaron incorrectamente
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/adminDb\.lotCode()/adminDb.batch()/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/db\.lotCode()/db.batch()/g'

# Variables que se llaman batch y no deben ser lotCode
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/const lotCode = adminDb/const batch = adminDb/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/const lotCode = db/const batch = db/g'

echo ""
echo "✅ False positives fixed!"
echo "📊 Fixed patterns:"
echo "  - Spanish comments with 'lote'"
echo "  - Firestore batch operations" 
echo "  - Legitimate Date operations"
echo "  - Configuration strings"
echo ""
echo "🔍 Re-run validation:"
echo "  ./scripts/validate-ssot-v2-cutover.sh"
