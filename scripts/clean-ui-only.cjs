#!/usr/bin/env node

/**
 * Elimina SOLO componentes UI, páginas y features NO conectados
 * NO toca archivos de sistema (lib, server, domain, core, hooks)
 */

const fs = require('fs');

const knipResults = JSON.parse(fs.readFileSync('knip-results.json', 'utf-8'));

const uiFilesToDelete = [];
const systemFiles = [];

knipResults.files.forEach(file => {
  // SOLO eliminar archivos UI/Frontend
  const isUIFile = (
    file.includes('src/components/') ||
    file.includes('src/features/') ||
    file.includes('src/app/(app)/') && file.endsWith('/page.tsx')
  );
  
  // NO eliminar archivos del sistema
  const isSystemFile = (
    file.includes('src/lib/') ||
    file.includes('src/server/') ||
    file.includes('src/domain/') ||
    file.includes('src/core/') ||
    file.includes('src/hooks/') ||
    file.includes('src/config/') ||
    file.includes('src/i18n/') ||
    file.includes('src/modules/') ||
    file.includes('src/services/') ||
    file.includes('src/types/') ||
    file.endsWith('actions.ts')
  );
  
  if (isUIFile && !isSystemFile) {
    uiFilesToDelete.push(file);
  } else {
    systemFiles.push(file);
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   LIMPIEZA SOLO DE UI/COMPONENTES');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`🎨 Componentes UI a eliminar: ${uiFilesToDelete.length}`);
console.log(`⚙️  Archivos de sistema a MANTENER: ${systemFiles.length}\n`);

// Categorizar
const categories = {
  components: [],
  features: [],
  pages: []
};

uiFilesToDelete.forEach(file => {
  if (file.includes('src/components/')) categories.components.push(file);
  else if (file.includes('src/features/')) categories.features.push(file);
  else if (file.endsWith('/page.tsx')) categories.pages.push(file);
});

console.log('📊 Por categoría:\n');
console.log(`   Componentes: ${categories.components.length}`);
console.log(`   Features: ${categories.features.length}`);
console.log(`   Páginas: ${categories.pages.length}\n`);

// Generar script
let script = `#!/bin/bash
# Eliminar SOLO componentes UI no usados
# Fecha: ${new Date().toISOString()}

echo "🎨 Eliminando ${uiFilesToDelete.length} componentes UI no usados"
echo ""

# Crear backup
BACKUP="backup-ui-cleanup-\$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

`;

categories.components.forEach(file => {
  script += `cp --parents "${file}" "$BACKUP/" 2>/dev/null\n`;
  script += `rm "${file}"\n`;
});

categories.features.forEach(file => {
  script += `cp --parents "${file}" "$BACKUP/" 2>/dev/null\n`;
  script += `rm "${file}"\n`;
});

categories.pages.forEach(file => {
  script += `cp --parents "${file}" "$BACKUP/" 2>/dev/null\n`;
  script += `rm "${file}"\n`;
});

script += `
echo ""
echo "✅ ${uiFilesToDelete.length} archivos UI eliminados"
echo "💾 Backup en: $BACKUP"
`;

fs.writeFileSync('delete-ui-only.sh', script);
fs.chmodSync('delete-ui-only.sh', '755');

// Reporte
let report = `# Archivos UI a Eliminar

**Total:** ${uiFilesToDelete.length} archivos UI/Frontend  
**Archivos de sistema preservados:** ${systemFiles.length}

---

## Componentes (${categories.components.length})

\`\`\`
${categories.components.join('\n')}
\`\`\`

---

## Features (${categories.features.length})

\`\`\`
${categories.features.join('\n')}
\`\`\`

---

## Páginas (${categories.pages.length})

\`\`\`
${categories.pages.join('\n')}
\`\`\`

---

## ⚙️ Archivos de Sistema que SE MANTIENEN

<details>
<summary>Ver ${systemFiles.length} archivos preservados</summary>

\`\`\`
${systemFiles.join('\n')}
\`\`\`

</details>
`;

fs.writeFileSync('UI_FILES_TO_DELETE.md', report);

console.log('✅ Archivos generados:');
console.log('   - delete-ui-only.sh');
console.log('   - UI_FILES_TO_DELETE.md\n');
