#!/usr/bin/env tsx
/**
 * Data Lens - Analizador Estático de Código
 * 
 * Usa TypeScript Compiler API para analizar el código y generar
 * un mapa completo de dependencias: qué componente usa qué datos.
 * 
 * Uso: npm run trace:map
 * Output: trace-metadata.json
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface TraceMetadata {
  timestamp: string;
  version: string;
  entities: Record<string, EntityTrace>;
  stats: {
    totalFiles: number;
    totalComponents: number;
    totalReads: number;
    totalWrites: number;
    totalComputes: number;
  };
}

interface EntityTrace {
  reads: TraceEntry[];
  writes: TraceEntry[];
  computes: TraceEntry[];
}

interface TraceEntry {
  component: string;
  file: string;
  fields: string[];
  line: number;
  code?: string;
  verified?: boolean;
}

// Configuración
const CONFIG = {
  srcDir: path.join(process.cwd(), 'src'),
  outputFile: path.join(process.cwd(), 'trace-metadata.json'),
  tsConfigPath: path.join(process.cwd(), 'tsconfig.json'),
  excludeDirs: ['node_modules', '.next', 'dist', 'build'],
  
  // Entidades del SSOT que buscamos
  entities: [
    'accounts', 'parties', 'partyRoles', 'users', 'ordersSellOut',
    'interactions', 'items', 'billOfMaterials', 'productionOrders',
    'lots', 'onHand', 'stockMoves', 'shipments', 'goodsReceipts',
    'qcTests', 'qcPlans', 'marketingEvents', 'posTactics',
    'posCostCatalog', 'plv_material'
  ]
};

class TraceAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private metadata: TraceMetadata;
  private filesAnalyzed = 0;

  constructor() {
    console.log('🔍 Inicializando TypeScript Compiler...\n');
    
    // Crear programa TypeScript
    const configFile = ts.readConfigFile(CONFIG.tsConfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(CONFIG.tsConfigPath)
    );

    this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    this.checker = this.program.getTypeChecker();

    // Inicializar metadata
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      entities: {},
      stats: {
        totalFiles: 0,
        totalComponents: 0,
        totalReads: 0,
        totalWrites: 0,
        totalComputes: 0
      }
    };

    // Inicializar entidades
    CONFIG.entities.forEach(entity => {
      this.metadata.entities[entity] = {
        reads: [],
        writes: [],
        computes: []
      };
    });
  }

  analyze() {
    console.log('📂 Analizando archivos en:', CONFIG.srcDir);
    console.log('🎯 Entidades a rastrear:', CONFIG.entities.length);
    console.log('─'.repeat(60) + '\n');

    const sourceFiles = this.program.getSourceFiles()
      .filter(sf => 
        sf.fileName.startsWith(CONFIG.srcDir) &&
        !CONFIG.excludeDirs.some(dir => sf.fileName.includes(dir))
      );

    console.log(`📊 Total archivos a analizar: ${sourceFiles.length}\n`);

    sourceFiles.forEach(sourceFile => {
      this.analyzeFile(sourceFile);
    });

    this.calculateStats();
    this.printSummary();
    this.saveMetadata();
  }

  private analyzeFile(sourceFile: ts.SourceFile) {
    this.filesAnalyzed++;
    
    const fileName = sourceFile.fileName.replace(process.cwd() + '/', '');
    const isComponentFile = /\.(tsx|jsx)$/.test(fileName);
    const isHelperFile = /helpers?\.ts$/.test(fileName) || fileName.includes('/lib/');
    
    if (this.filesAnalyzed % 10 === 0) {
      process.stdout.write(`\r🔄 Analizando: ${this.filesAnalyzed} archivos...`);
    }

    // Visitar todos los nodos del AST
    const visit = (node: ts.Node) => {
      // Detectar lecturas de datos: data.accounts, data.orderSellOut, etc.
      if (ts.isPropertyAccessExpression(node)) {
        this.detectDataRead(node, sourceFile, isComponentFile, isHelperFile);
      }

      // Detectar escrituras: addDoc, setDoc, updateDoc
      if (ts.isCallExpression(node)) {
        this.detectDataWrite(node, sourceFile);
      }

      // Detectar acceso a través de destructuring: const { accounts } = data
      if (ts.isVariableDeclaration(node)) {
        this.detectDestructuredRead(node, sourceFile, isComponentFile, isHelperFile);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private detectDataRead(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    isComponent: boolean,
    isHelper: boolean
  ) {
    // Buscar patrones como: data.accounts, data.users, etc.
    const text = node.getText(sourceFile);
    
    CONFIG.entities.forEach(entity => {
      if (text === `data.${entity}` || text.includes(`.${entity}`)) {
        const componentName = this.getComponentName(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        
        // Intentar detectar qué campos se acceden
        const fields = this.detectFieldAccess(node, sourceFile);

        const entry: TraceEntry = {
          component: componentName,
          file: sourceFile.fileName.replace(process.cwd() + '/', ''),
          fields: fields.length > 0 ? fields : ['*'],
          line,
          verified: false
        };

        if (isComponent) {
          this.metadata.entities[entity].reads.push(entry);
        } else if (isHelper) {
          this.metadata.entities[entity].computes.push(entry);
        }
      }
    });
  }

  private detectDestructuredRead(
    node: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    isComponent: boolean,
    isHelper: boolean
  ) {
    // Buscar: const { accounts, users } = data
    if (!node.initializer) return;

    const initText = node.initializer.getText(sourceFile);
    if (!initText.includes('data') && !initText.includes('useData')) return;

    if (ts.isObjectBindingPattern(node.name)) {
      node.name.elements.forEach((element: any) => {
        const entityName = element.name.getText(sourceFile);
        
        if (CONFIG.entities.includes(entityName)) {
          const componentName = this.getComponentName(sourceFile);
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

          const entry: TraceEntry = {
            component: componentName,
            file: sourceFile.fileName.replace(process.cwd() + '/', ''),
            fields: ['*'],
            line,
            verified: false
          };

          if (isComponent) {
            this.metadata.entities[entityName].reads.push(entry);
          } else if (isHelper) {
            this.metadata.entities[entityName].computes.push(entry);
          }
        }
      });
    }
  }

  private detectDataWrite(node: ts.CallExpression, sourceFile: ts.SourceFile) {
    // Buscar llamadas a: addDoc, setDoc, updateDoc, collection
    const text = node.expression.getText(sourceFile);
    
    if (!text.match(/addDoc|setDoc|updateDoc|collection/)) return;

    // Intentar detectar la colección
    const args = node.arguments;
    if (args.length > 0) {
      const firstArg = args[0].getText(sourceFile);
      
      CONFIG.entities.forEach(entity => {
        if (firstArg.includes(entity)) {
          const componentName = this.getComponentName(sourceFile);
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

          const entry: TraceEntry = {
            component: componentName,
            file: sourceFile.fileName.replace(process.cwd() + '/', ''),
            fields: ['*'], // Detectar campos específicos requiere análisis más profundo
            line,
            code: node.getText(sourceFile).substring(0, 100),
            verified: false
          };

          this.metadata.entities[entity].writes.push(entry);
        }
      });
    }
  }

  private detectFieldAccess(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    // Intentar detectar accesos como: account.name, account.accountStage
    // Esto es una versión simplificada
    const fields: string[] = [];
    const parent = node.parent;

    if (parent && ts.isPropertyAccessExpression(parent)) {
      const fieldName = parent.name.getText(sourceFile);
      fields.push(fieldName);
    }

    return fields;
  }

  private getComponentName(sourceFile: ts.SourceFile): string {
    const fileName = path.basename(sourceFile.fileName, path.extname(sourceFile.fileName));
    
    // Intentar encontrar el nombre del componente o función exportada
    let componentName = fileName;

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          componentName = node.name.getText(sourceFile);
        }
      }
      
      if (ts.isVariableStatement(node)) {
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              componentName = decl.name.getText(sourceFile);
            }
          });
        }
      }
    };

    sourceFile.forEachChild(visit);
    return componentName;
  }

  private calculateStats() {
    this.metadata.stats.totalFiles = this.filesAnalyzed;
    
    let totalReads = 0;
    let totalWrites = 0;
    let totalComputes = 0;
    const components = new Set<string>();

    Object.values(this.metadata.entities).forEach(entity => {
      totalReads += entity.reads.length;
      totalWrites += entity.writes.length;
      totalComputes += entity.computes.length;

      [...entity.reads, ...entity.writes, ...entity.computes].forEach(entry => {
        components.add(entry.component);
      });
    });

    this.metadata.stats.totalComponents = components.size;
    this.metadata.stats.totalReads = totalReads;
    this.metadata.stats.totalWrites = totalWrites;
    this.metadata.stats.totalComputes = totalComputes;
  }

  private printSummary() {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RESUMEN DEL ANÁLISIS');
    console.log('='.repeat(60) + '\n');

    console.log(`✅ Archivos analizados:      ${this.metadata.stats.totalFiles}`);
    console.log(`🎯 Componentes detectados:   ${this.metadata.stats.totalComponents}`);
    console.log(`📖 Lecturas detectadas:      ${this.metadata.stats.totalReads}`);
    console.log(`✏️  Escrituras detectadas:    ${this.metadata.stats.totalWrites}`);
    console.log(`🧮 Cálculos detectados:      ${this.metadata.stats.totalComputes}`);
    console.log();

    // Top 5 entidades más usadas
    const entityUsage = CONFIG.entities.map(entity => ({
      name: entity,
      total: 
        this.metadata.entities[entity].reads.length +
        this.metadata.entities[entity].writes.length +
        this.metadata.entities[entity].computes.length
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    console.log('🏆 Top 5 Entidades Más Usadas:');
    entityUsage.forEach((e, i: number) => {
      if (e.total > 0) {
        console.log(`   ${i + 1}. ${e.name.padEnd(20)} ${e.total} usos`);
      }
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }

  private saveMetadata() {
    console.log(`💾 Guardando metadata en: ${CONFIG.outputFile}\n`);
    
    fs.writeFileSync(
      CONFIG.outputFile,
      JSON.stringify(this.metadata, null, 2),
      'utf-8'
    );

    const size = fs.statSync(CONFIG.outputFile).size;
    console.log(`✅ Archivo guardado (${(size / 1024).toFixed(2)} KB)`);
    console.log(`🔗 Usa este metadata en el Dashboard de Auditoría\n`);
  }
}

// Ejecutar análisis
async function main() {
  console.log('\n🚀 Data Lens - Analizador Estático v1.0\n');
  console.log('═'.repeat(60) + '\n');

  const startTime = Date.now();

  try {
    const analyzer = new TraceAnalyzer();
    analyzer.analyze();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tiempo total: ${duration}s\n`);
    console.log('✨ Análisis completado con éxito!\n');

  } catch (error) {
    console.error('\n❌ Error durante el análisis:', error);
    process.exit(1);
  }
}

main();
