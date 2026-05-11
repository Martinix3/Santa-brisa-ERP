#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// =============================================================
// Presupuestos de build (muy simples)
// - Falla si alguna página (JS) supera los 180kb.
// - Falla si el JS común ('framework' + 'shared') supera los 250kb.
// =============================================================

const MAX_PAGE_KB = 180;
const MAX_COMMON_KB = 250;

try {
  const manifest = require(path.join(process.cwd(), '.next/build-manifest.json'));
  const root = path.join(process.cwd(), '.next');

  const commonFiles = new Set([
    ...(manifest.pages['/_app'] || []),
    ...(manifest.ampFirstPages || []),
  ]);

  let commonSize = 0;
  for (const f of commonFiles) {
    if (f.endsWith('.js')) {
      commonSize += fs.statSync(path.join(root, f)).size;
    }
  }

  const commonKb = commonSize / 1024;
  console.log(`\n📦 JS Común (framework, shared, _app): ${commonKb.toFixed(2)} KB`);

  if (commonKb > MAX_COMMON_KB) {
    console.error(`\n🚨 ERROR: El JS común excede el presupuesto de ${MAX_COMMON_KB} KB.`);
    process.exit(1);
  } else {
    console.log(`✅ OK: El JS común está dentro del presupuesto.`);
  }

  const errors = [];
  for (const page in manifest.pages) {
    if (page === '/_app') continue;
    const files = manifest.pages[page];
    const size = files
      .filter(f => f.endsWith('.js') && !commonFiles.has(f))
      .reduce((s, f) => s + fs.statSync(path.join(root, f)).size, 0);
    const kb = size / 1024;

    if (kb > MAX_PAGE_KB) {
      errors.push(`- ${page} (${kb.toFixed(2)} KB)`);
    }
  }

  if (errors.length) {
    console.error(`\n🚨 ERROR: ${errors.length} página(s) exceden el presupuesto de ${MAX_PAGE_KB} KB:\n`);
    console.error(errors.join('\n'));
    process.exit(1);
  } else {
    console.log(`\n✅ OK: Todas las páginas están dentro del presupuesto.\n`);
  }

} catch (e) {
  console.error('\n🚨 ERROR: No se pudo leer el `build-manifest.json`.');
  console.error('Asegúrate de haber ejecutado `npm run build` antes de `npm run check-budgets`.\n');
  process.exit(1);
}
