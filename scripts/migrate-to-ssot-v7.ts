#!/usr/bin/env tsx
/**
 * Script de migración automática a SSOT v7
 * 
 * Este script:
 * 1. Actualiza todos los imports de '@/domain/ssot' a '@/domain/ssot.v7'
 * 2. Identifica archivos que necesitan revisión manual
 * 3. Genera un reporte detallado
 * 
 * Uso:
 *   npx tsx scripts/migrate-to-ssot-v7.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationResult {
  file: string;
  updated: boolean;
  needsReview: boolean;
  reasons: string[];
  changes: number;
}

const results: MigrationResult[] = [];

// Patrones que indican que un archivo necesita revisión manual
const REVIEW_PATTERNS = [
  { pattern: /\.tipo/g, reason: 'Usa campo "tipo" (debe cambiar a "segment")' },
  { pattern: /\.estado/g, reason: 'Usa campo "estado" (debe cambiar a "stage")' },
  { pattern: /collection\(['"]orders['"]\)/g, reason: 'Query de orders (añadir documentType)' },
  { pattern: /where\(['"]status['"]/g, reason: 'Filtro por status en orders' },
  { pattern: /OrderStatus/g, reason: 'Usa OrderStatus (puede necesitar documentType)' },
];

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function findFilesWithSSOT(): string[] {
  try {
    const result = execSync(
      `grep -rl "from '@/domain/ssot'" src/ --include="*.ts" --include="*.tsx"`,
      { encoding: 'utf-8' }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function updateImports(content: string): { updated: string; changes: number } {
  let changes = 0;
  
  // Patrón para capturar imports del SSOT
  const importPattern = /from ['"]@\/domain\/ssot['"]/g;
  
  const updated = content.replace(importPattern, (match) => {
    changes++;
    return "from '@/domain/ssot.v7'";
  });
  
  return { updated, changes };
}

function checkNeedsReview(content: string): { needs: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  for (const { pattern, reason } of REVIEW_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push(reason);
    }
  }
  
  return {
    needs: reasons.length > 0,
    reasons
  };
}

function processFile(filePath: string): MigrationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Actualizar imports
  const { updated, changes } = updateImports(content);
  
  // Verificar si necesita revisión
  const { needs, reasons } = checkNeedsReview(content);
  
  // Guardar cambios si no es dry-run
  if (!DRY_RUN && changes > 0) {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }
  
  return {
    file: filePath,
    updated: changes > 0,
    needsReview: needs,
    reasons,
    changes
  };
}

function generateReport() {
  const updated = results.filter(r => r.updated);
  const needsReview = results.filter(r => r.needsReview);
  
  log('\n' + '='.repeat(80), colors.bright);
  log('  REPORTE DE MIGRACIÓN A SSOT V7', colors.bright + colors.cyan);
  log('='.repeat(80), colors.bright);
  
  log(`\n📊 RESUMEN:`, colors.bright);
  log(`  Total archivos analizados: ${results.length}`);
  log(`  Archivos actualizados: ${colors.green}${updated.length}${colors.reset}`);
  log(`  Archivos que necesitan revisión: ${colors.yellow}${needsReview.length}${colors.reset}`);
  log(`  Total cambios: ${updated.reduce((sum, r) => sum + r.changes, 0)}`);
  
  if (DRY_RUN) {
    log(`\n⚠️  MODO DRY-RUN - No se han realizado cambios`, colors.yellow);
  } else {
    log(`\n✅ Cambios aplicados exitosamente`, colors.green);
  }
  
  // Archivos actualizados
  if (updated.length > 0) {
    log(`\n📝 ARCHIVOS ACTUALIZADOS:`, colors.bright);
    updated.forEach(r => {
      const reviewTag = r.needsReview ? ` ${colors.yellow}⚠ REVISAR${colors.reset}` : '';
      log(`  ${colors.green}✓${colors.reset} ${r.file} (${r.changes} cambios)${reviewTag}`);
    });
  }
  
  // Archivos que necesitan revisión
  if (needsReview.length > 0) {
    log(`\n⚠️  ARCHIVOS QUE NECESITAN REVISIÓN MANUAL:`, colors.bright + colors.yellow);
    needsReview.forEach(r => {
      log(`\n  📄 ${r.file}`, colors.cyan);
      r.reasons.forEach(reason => {
        log(`     • ${reason}`, colors.yellow);
      });
    });
    
    log(`\n📋 ACCIONES NECESARIAS:`, colors.bright);
    log(`  1. Revisar cada archivo marcado arriba`);
    log(`  2. Actualizar campos renombrados (.tipo → .segment, .estado → .stage)`);
    log(`  3. Añadir documentType en queries de orders`);
    log(`  4. Verificar que las validaciones incluyan nuevos campos obligatorios`);
    log(`  5. Ejecutar: npm run typecheck`);
    log(`  6. Ejecutar: npm test`);
  }
  
  // Siguiente paso
  log(`\n🚀 SIGUIENTES PASOS:`, colors.bright);
  
  if (DRY_RUN) {
    log(`  1. Revisar el reporte arriba`);
    log(`  2. Si todo está OK, ejecutar sin --dry-run:`);
    log(`     ${colors.cyan}npx tsx scripts/migrate-to-ssot-v7.ts${colors.reset}`);
  } else {
    log(`  1. Revisar archivos marcados para revisión manual`);
    log(`  2. Verificar compilación: ${colors.cyan}npm run typecheck${colors.reset}`);
    log(`  3. Ejecutar tests: ${colors.cyan}npm test${colors.reset}`);
    log(`  4. Commit cambios: ${colors.cyan}git add -A && git commit -m "chore: migrate to SSOT v7"${colors.reset}`);
  }
  
  log('\n' + '='.repeat(80), colors.bright);
}

// Ejecutar migración
async function main() {
  log('\n🔄 Iniciando migración a SSOT v7...', colors.bright + colors.cyan);
  
  if (DRY_RUN) {
    log('  Modo: DRY-RUN (solo análisis, sin cambios)', colors.yellow);
  } else {
    log('  Modo: PRODUCCIÓN (se aplicarán cambios)', colors.green);
  }
  
  // Encontrar archivos
  log('\n📁 Buscando archivos...', colors.blue);
  const files = findFilesWithSSOT();
  log(`  Encontrados: ${files.length} archivos`, colors.blue);
  
  // Procesar cada archivo
  log('\n⚙️  Procesando archivos...', colors.blue);
  for (const file of files) {
    const result = processFile(file);
    results.push(result);
    
    if (result.updated) {
      const reviewTag = result.needsReview ? ' ⚠️' : ' ✓';
      log(`  ${reviewTag} ${path.relative(process.cwd(), file)}`);
    }
  }
  
  // Generar reporte
  generateReport();
  
  // Exit code
  const hasErrors = results.some(r => r.needsReview);
  if (hasErrors && !DRY_RUN) {
    log(`\n⚠️  Algunos archivos necesitan revisión manual`, colors.yellow);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  process.exit(1);
});
