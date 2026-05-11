#!/usr/bin/env ts-node
/**
 * SSOT Conflicts Auditor
 * 
 * Busca automáticamente todos los conflictos con el Single Source of Truth:
 * - Datos mock hardcoded
 * - Variables CSS custom
 * - Enums/tipos duplicados
 * - Magic numbers
 * - Configuraciones de negocio hardcoded
 * - Metadata duplicado
 */

import * as fs from 'fs';
import * as path from 'path';

interface Conflict {
  file: string;
  line: number;
  code: string;
  type: 'mockData' | 'cssVariable' | 'duplicatedType' | 'magicNumber' | 'businessConfig' | 'duplicatedMetadata';
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion?: string;
}

interface AuditReport {
  timestamp: string;
  totalConflicts: number;
  mockData: Conflict[];
  cssVariables: Conflict[];
  duplicatedTypes: Conflict[];
  magicNumbers: Conflict[];
  businessConfig: Conflict[];
  duplicatedMetadata: Conflict[];
}

// Patrones a buscar
const PATTERNS = {
  mockData: [
    /const\s+MOCK_\w+\s*=\s*\[/g,
    /const\s+SAMPLE_\w+\s*=\s*\[/g,
    /const\s+DEMO_\w+\s*=\s*\[/g,
    /const\s+TEST_\w+\s*=\s*\[/g,
  ],
  cssVariable: [
    /var\(--[\w-]+\)/g,
    /hsl\(var\(--[\w-]+\)\)/g,
    /className=["'][^"']*\[hsl\(var\(--[\w-]+\)\)\][^"']*["']/g,
  ],
  duplicatedType: [
    /type\s+OrderStatus\s*=/g,
    /type\s+ShipmentStatus\s*=/g,
    /type\s+Department\s*=/g,
    /type\s+Stage\s*=/g,
    /const\s+STAGE\s*:\s*Record</g,
    /const\s+STATUS_\w+\s*:\s*Record</g,
  ],
  magicNumber: [
    />\s*30(?!\d)/g,  // > 30 (días típicos)
    />\s*60(?!\d)/g,  // > 60
    /<\s*50(?!\d)/g,  // < 50 (stock bajo típico)
    /\*\s*0\.21/g,    // * 0.21 (IVA)
    /\*\s*0\.\d+/g,   // porcentajes
  ],
  businessConfig: [
    /const\s+\w*threshold\w*\s*=\s*\d+/gi,
    /const\s+\w*alert\w*\s*=\s*\d+/gi,
    /const\s+\w*limit\w*\s*=\s*\d+/gi,
    /const\s+\w*days\w*\s*=\s*\d+/gi,
  ],
  duplicatedMetadata: [
    /const\s+\w*labels?\w*\s*=\s*\{/gi,
    /const\s+\w*status\w*\s*=\s*\{[^}]*label\s*:/gi,
    /Pendiente|Enviado|Entregado|Cancelado/g, // Labels comunes
  ],
};

// Directorios a excluir
const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
];

// Archivos a excluir
const EXCLUDE_FILES = [
  'ssot.ts', // El propio SSOT
  'audit-ssot-conflicts.ts', // Este script
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
];

function shouldSkipPath(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Excluir directorios
  if (EXCLUDE_DIRS.some(dir => relativePath.includes(dir))) {
    return true;
  }
  
  // Excluir archivos específicos
  if (EXCLUDE_FILES.some(file => relativePath.endsWith(file))) {
    return true;
  }
  
  return false;
}

function scanFile(filePath: string): Conflict[] {
  if (shouldSkipPath(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const conflicts: Conflict[] = [];

  lines.forEach((line, index: number) => {
    const lineNumber = index + 1;

    // Buscar datos mock
    PATTERNS.mockData.forEach(pattern => {
      if (pattern.test(line)) {
        conflicts.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          type: 'mockData',
          severity: 'critical',
          suggestion: 'Usar useData() y obtener datos reales de Firestore'
        });
      }
    });

    // Buscar variables CSS
    PATTERNS.cssVariable.forEach(pattern => {
      if (pattern.test(line) && !line.includes('// @ssot-exception')) {
        conflicts.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          type: 'cssVariable',
          severity: 'high',
          suggestion: 'Usar useSystemConfig() y obtener color desde config.theme'
        });
      }
    });

    // Buscar tipos duplicados
    PATTERNS.duplicatedType.forEach(pattern => {
      if (pattern.test(line)) {
        conflicts.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          type: 'duplicatedType',
          severity: 'high',
          suggestion: 'Importar tipo desde @/domain/ssot'
        });
      }
    });

    // Buscar magic numbers (solo en condicionales)
    if (line.includes('if') || line.includes('filter') || line.includes('>') || line.includes('<')) {
      PATTERNS.magicNumber.forEach(pattern => {
        if (pattern.test(line) && !line.includes('// @ssot-exception')) {
          conflicts.push({
            file: filePath,
            line: lineNumber,
            code: line.trim(),
            type: 'magicNumber',
            severity: 'medium',
            suggestion: 'Usar config.businessRules o constante del SSOT'
          });
        }
      });
    }

    // Buscar configuraciones de negocio
    PATTERNS.businessConfig.forEach(pattern => {
      if (pattern.test(line)) {
        conflicts.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          type: 'businessConfig',
          severity: 'medium',
          suggestion: 'Mover a config.businessRules en SystemConfig'
        });
      }
    });

    // Buscar metadata duplicado
    PATTERNS.duplicatedMetadata.forEach(pattern => {
      if (pattern.test(line) && !line.includes('// @ssot-exception')) {
        conflicts.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          type: 'duplicatedMetadata',
          severity: 'low',
          suggestion: 'Usar ORDER_STATUS_META, DEPT_META, etc. del SSOT'
        });
      }
    });
  });

  return conflicts;
}

function scanDirectory(dir: string): Conflict[] {
  let conflicts: Conflict[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldSkipPath(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      conflicts = conflicts.concat(scanDirectory(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      conflicts = conflicts.concat(scanFile(fullPath));
    }
  }

  return conflicts;
}

function generateReport(): AuditReport {
  console.log('🔍 Iniciando auditoría de conflictos SSOT...\n');

  const srcPath = path.join(process.cwd(), 'src');
  const conflicts = scanDirectory(srcPath);

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalConflicts: conflicts.length,
    mockData: conflicts.filter(c => c.type === 'mockData'),
    cssVariables: conflicts.filter(c => c.type === 'cssVariable'),
    duplicatedTypes: conflicts.filter(c => c.type === 'duplicatedType'),
    magicNumbers: conflicts.filter(c => c.type === 'magicNumber'),
    businessConfig: conflicts.filter(c => c.type === 'businessConfig'),
    duplicatedMetadata: conflicts.filter(c => c.type === 'duplicatedMetadata'),
  };

  return report;
}

function printReport(report: AuditReport): void {
  console.log('📊 REPORTE DE AUDITORÍA SSOT');
  console.log('═'.repeat(80));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Total de conflictos encontrados: ${report.totalConflicts}\n`);

  const categories = [
    { name: 'Datos Mock', icon: '🔴', data: report.mockData },
    { name: 'Variables CSS', icon: '🟠', data: report.cssVariables },
    { name: 'Tipos Duplicados', icon: '🟡', data: report.duplicatedTypes },
    { name: 'Magic Numbers', icon: '🟢', data: report.magicNumbers },
    { name: 'Config de Negocio', icon: '🔵', data: report.businessConfig },
    { name: 'Metadata Duplicado', icon: '🟣', data: report.duplicatedMetadata },
  ];

  categories.forEach(cat => {
    console.log(`\n${cat.icon} ${cat.name}: ${cat.data.length} conflictos`);
    console.log('─'.repeat(80));
    
    if (cat.data.length > 0) {
      // Agrupar por archivo
      const byFile = cat.data.reduce((acc, conflict) => {
        const relativePath = path.relative(process.cwd(), conflict.file);
        if (!acc[relativePath]) acc[relativePath] = [];
        acc[relativePath].push(conflict);
        return acc;
      }, {} as Record<string, Conflict[]>);

      Object.entries(byFile).forEach(([file, conflicts]) => {
        console.log(`\n  📄 ${file}`);
        conflicts.slice(0, 3).forEach(c => {
          console.log(`     L${c.line}: ${c.code.substring(0, 70)}${c.code.length > 70 ? '...' : ''}`);
        });
        if (conflicts.length > 3) {
          console.log(`     ... y ${conflicts.length - 3} más`);
        }
      });
    }
  });

  console.log('\n' + '═'.repeat(80));
}

function saveReport(report: AuditReport): void {
  const outputPath = path.join(process.cwd(), 'ssot-conflicts-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Reporte guardado en: ${outputPath}`);
}

// Ejecutar auditoría
const report = generateReport();
printReport(report);
saveReport(report);

// Sugerir próximos pasos
console.log('\n💡 PRÓXIMOS PASOS:');
console.log('1. Revisar ssot-conflicts-report.json para detalles completos');
console.log('2. Priorizar correcciones: Crítico → Alto → Medio → Bajo');
console.log('3. Para excepciones válidas, agregar comentario: // @ssot-exception');
console.log('4. Re-ejecutar este script después de cada corrección\n');

// Exit code según severidad
const criticalCount = report.mockData.length;
const highCount = report.cssVariables.length + report.duplicatedTypes.length;

if (criticalCount > 0) {
  console.log('❌ CRÍTICO: Se encontraron datos mock. Prioridad máxima de corrección.\n');
  process.exit(2);
} else if (highCount > 0) {
  console.log('⚠️  ALTO: Se encontraron conflictos de alta prioridad.\n');
  process.exit(1);
} else if (report.totalConflicts > 0) {
  console.log('ℹ️  MEDIO/BAJO: Se encontraron conflictos menores.\n');
  process.exit(0);
} else {
  console.log('✨ PERFECTO: No se encontraron conflictos con el SSOT!\n');
  process.exit(0);
}
