#!/usr/bin/env tsx
/**
 * Codemod para resolver errores TS7006 (implicit any)
 * Añade tipos explícitos a parámetros de callbacks
 */

import { Project, SyntaxKind, Node, ArrowFunction, FunctionExpression } from 'ts-morph';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const project = new Project({
  tsConfigFilePath: join(__dirname, '..', 'tsconfig.json'),
});

interface Fix {
  file: string;
  line: number;
  fixed: boolean;
  error?: string;
}

const fixes: Fix[] = [];
let totalFixed = 0;

// Patrones comunes para inferir tipos
const COMMON_PATTERNS: Record<string, string> = {
  // React events
  'onChange': 'React.ChangeEvent<HTMLInputElement>',
  'onClick': 'React.MouseEvent<HTMLButtonElement>',
  'onSubmit': 'React.FormEvent<HTMLFormElement>',
  
  // Array methods context
  'items': 'Item',
  'lots': 'Lot',
  'orders': 'Order',
  'accounts': 'Account',
  'users': 'User',
  'boms': 'Bom',
  'events': 'TraceEvent',
  'tests': 'any', // sin schema específico
};

function inferTypeFromContext(param: string, parentText: string): string | null {
  // Intentar inferir del nombre de variable
  for (const [pattern, type] of Object.entries(COMMON_PATTERNS)) {
    if (parentText.includes(`.${pattern}.map`) || 
        parentText.includes(`.${pattern}.filter`) ||
        parentText.includes(`.${pattern}.find`)) {
      return type;
    }
  }
  
  // Event handlers
  if (param === 'e' || param === 'event') {
    if (parentText.includes('onChange=')) return 'React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>';
    if (parentText.includes('onClick=')) return 'React.MouseEvent';
    if (parentText.includes('onSubmit=')) return 'React.FormEvent';
  }
  
  // Array indices
  if (param === 'idx' || param === 'index' || param === 'i') return 'number';
  
  // Generic patterns
  if (param === 'item' || param === 'el' || param === 'element') return 'any';
  if (param === 'key' || param === 'k') return 'string';
  if (param === 'value' || param === 'val' || param === 'v') return 'any';
  
  return null;
}

function fixArrowFunction(arrowFunc: ArrowFunction | FunctionExpression): boolean {
  try {
    const params = arrowFunc.getParameters();
    if (params.length === 0) return false;
    
    let modified = false;
    const parent = arrowFunc.getParent();
    const parentText = parent?.getText() || '';
    
    for (const param of params) {
      // Skip si ya tiene tipo
      if (param.getTypeNode()) continue;
      
      const paramName = param.getName();
      const inferredType = inferTypeFromContext(paramName, parentText);
      
      if (inferredType) {
        param.setType(inferredType);
        modified = true;
        console.log(`  ✓ ${paramName}: ${inferredType}`);
      }
    }
    
    return modified;
  } catch (error) {
    console.error(`  ✗ Error fixing: ${error}`);
    return false;
  }
}

function processFile(sourceFile: any) {
  const filePath = sourceFile.getFilePath();
  const relPath = relative(process.cwd(), filePath);
  
  // Skip node_modules y archivos de configuración
  if (relPath.includes('node_modules') || relPath.includes('.next')) {
    return;
  }
  
  console.log(`\n📄 ${relPath}`);
  
  let fileModified = false;
  
  // Buscar arrow functions
  sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).forEach((arrowFunc: ArrowFunction) => {
    if (fixArrowFunction(arrowFunc)) {
      fileModified = true;
      totalFixed++;
    }
  });
  
  // Buscar function expressions
  sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression).forEach((funcExpr: FunctionExpression) => {
    if (fixArrowFunction(funcExpr)) {
      fileModified = true;
      totalFixed++;
    }
  });
  
  if (fileModified) {
    sourceFile.saveSync();
    console.log(`  💾 Guardado`);
  }
}

// Main execution
console.log('🔧 Codemod: Fixing TS7006 (implicit any parameters)\n');

const sourceFiles = project.getSourceFiles();
console.log(`📊 Analizando ${sourceFiles.length} archivos...\n`);

for (const sourceFile of sourceFiles) {
  processFile(sourceFile);
}

console.log(`\n✅ Completado: ${totalFixed} funciones corregidas`);
console.log('\n💡 Ejecuta `npx tsc --noEmit` para verificar errores restantes');
