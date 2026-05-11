#!/usr/bin/env ts-node
/**
 * Script de auditoría para detectar valores hardcodeados
 * 
 * Busca:
 * - Números mágicos (thresholds, limits, días, etc.)
 * - Strings de configuración
 * - Reglas de negocio hardcodeadas
 * 
 * Uso: ts-node scripts/audit-hardcoded-values.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface HardcodedValue {
  file: string;
  line: number;
  type: string;
  value: string;
  code: string;
  category: 'alertRules' | 'salesTargets' | 'zones' | 'businessRules' | 'thresholds' | 'colors' | 'metadata' | 'messages' | 'unknown';
  migrateTo?: string;
  severity: 'high' | 'medium' | 'low';
}

interface AuditReport {
  timestamp: string;
  hardcodedValues: HardcodedValue[];
  summary: {
    totalFound: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byFile: Record<string, number>;
  };
}

// Patrones a buscar
const PATTERNS = [
  // Colores hex
  {
    regex: /#([0-9A-Fa-f]{3,8})/g,
    category: 'colors' as const,
    severity: 'medium' as const
  },
  // Colores RGB/HSL
  {
    regex: /(?:rgb|hsl)a?\([^)]+\)/gi,
    category: 'colors' as const,
    severity: 'medium' as const
  },
  // Números con contexto de negocio
  { 
    regex: /const\s+(\w*(?:DAYS?|THRESHOLD|LIMIT|MAX|MIN|TARGET|OBJETIVO|META)\w*)\s*=\s*(\d+)/gi,
    category: 'thresholds' as const,
    severity: 'high' as const
  },
  // Alertas y notificaciones
  {
    regex: /(alert|notification|warning).*?(\d+)\s*(day|día|week|semana)/gi,
    category: 'alertRules' as const,
    severity: 'high' as const
  },
  // Objetivos y targets
  {
    regex: /(target|objetivo|meta|goal).*?(\d+)/gi,
    category: 'salesTargets' as const,
    severity: 'medium' as const
  },
  // Zonas y regiones
  {
    regex: /(zona|region|area|territory).*?['"]([^'"]+)['"]/gi,
    category: 'zones' as const,
    severity: 'medium' as const
  },
  // Reglas de negocio con números
  {
    regex: /(min|max|default)(?:imum|imun)?.*?(?:amount|price|qty|quantity).*?[=:]\s*(\d+)/gi,
    category: 'businessRules' as const,
    severity: 'high' as const
  },
  // Metadata objects (STATUS_META, DEPT_META, etc.)
  {
    regex: /const\s+(\w+_META)\s*[:=]/gi,
    category: 'metadata' as const,
    severity: 'high' as const
  }
];

// Palabras clave que indican configuración
const CONFIG_KEYWORDS = [
  'threshold', 'limit', 'max', 'min', 'default',
  'días', 'days', 'weeks', 'months',
  'target', 'objetivo', 'meta', 'goal',
  'zona', 'region', 'area',
  'alert', 'warning', 'notification',
  'color', 'accent', 'theme',
  'meta', 'config', 'settings'
];

// Archivos que sabemos contienen configuración hardcodeada
const KNOWN_CONFIG_FILES = [
  'ssot.ts',           // Colores, metadata
  'COLOR_GUIDE.md',
  'pipeline-helpers.ts',
  'dashboard-helpers.ts',
  'distributor-helpers.ts'
];

function shouldScanFile(filePath: string): boolean {
  // Solo archivos TypeScript/React
  if (!filePath.match(/\.(ts|tsx)$/)) return false;
  
  // Excluir ciertos directorios
  const excludeDirs = [
    'node_modules',
    '.next',
    'dist',
    'build',
    '.git',
    'scripts/audit', // No escanearse a sí mismo
  ];
  
  return !excludeDirs.some(dir => filePath.includes(dir));
}

function scanFile(filePath: string): HardcodedValue[] {
  const found: HardcodedValue[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index: number) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      
      // Saltar comentarios
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        return;
      }
      
      // Buscar cada patrón
      PATTERNS.forEach(pattern => {
        let regex = new RegExp(pattern.regex);
        let matches: any;
        
        // Reset regex lastIndex
        regex.lastIndex = 0;
        
        if (pattern.regex.global) {
          matches = Array.from(line.matchAll(regex));
        } else {
          const match = line.match(regex);
          matches = match ? [match] : [];
        }
        
        for (const match of matches) {
          const value = match[1] || match[0];
          
          // Filtrar falsos positivos
          if (shouldInclude(trimmedLine, value)) {
            found.push({
              file: filePath.replace(process.cwd() + '/', ''),
              line: lineNum,
              type: pattern.category.toUpperCase(),
              value: value,
              code: trimmedLine.length > 100 ? trimmedLine.substring(0, 100) + '...' : trimmedLine,
              category: pattern.category,
              severity: pattern.severity,
              migrateTo: suggestMigration(pattern.category, trimmedLine)
            });
          }
        }
      });
      
      // Buscar constantes con keywords
      const constMatch = line.match(/const\s+(\w+)\s*=\s*([^;]+)/);
      if (constMatch) {
        const varName = constMatch[1];
        const varValue = constMatch[2].trim();
        
        // Si el nombre o valor contiene keywords de configuración
        const hasConfigKeyword = CONFIG_KEYWORDS.some(keyword => 
          varName.toLowerCase().includes(keyword) || 
          varValue.toLowerCase().includes(keyword)
        );
        
        if (hasConfigKeyword && !found.some(f => f.line === lineNum)) {
          const category = categorizeByName(varName);
          found.push({
            file: filePath.replace(process.cwd() + '/', ''),
            line: lineNum,
            type: 'CONSTANT',
            value: varValue,
            code: trimmedLine,
            category,
            severity: 'medium',
            migrateTo: suggestMigration(category, varName)
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error);
  }
  
  return found;
}

function shouldInclude(line: string, value: string): boolean {
  // Excluir líneas que parecen tests o tipos
  if (line.includes('test') || line.includes('mock') || line.includes('interface ')) {
    return false;
  }
  
  // Incluir todos los demás
  return true;
}

function categorizeByName(name: string): HardcodedValue['category'] {
  const lower = name.toLowerCase();
  
  if (lower.includes('color') || lower.includes('accent') || lower.includes('theme') || lower.includes('hsl') || lower.includes('rgb')) {
    return 'colors';
  }
  if (lower.includes('_meta') || lower.includes('metadata')) {
    return 'metadata';
  }
  if (lower.includes('alert') || lower.includes('notification') || lower.includes('warning')) {
    return 'alertRules';
  }
  if (lower.includes('target') || lower.includes('objetivo') || lower.includes('goal')) {
    return 'salesTargets';
  }
  if (lower.includes('zona') || lower.includes('region') || lower.includes('territory') || lower.includes('area')) {
    return 'zones';
  }
  if (lower.includes('threshold') || lower.includes('limit') || lower.includes('max') || lower.includes('min')) {
    return 'thresholds';
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('discount') || lower.includes('payment')) {
    return 'businessRules';
  }
  if (lower.includes('message') || lower.includes('text') || lower.includes('label')) {
    return 'messages';
  }
  
  return 'unknown';
}

function suggestMigration(category: string, context: string): string {
  const suggestions: Record<string, string> = {
    colors: 'systemConfig.theme.colors',
    metadata: 'systemConfig.metadata',
    alertRules: 'systemConfig.alertRules',
    salesTargets: 'systemConfig.salesTargets',
    zones: 'systemConfig.distributorZones',
    businessRules: 'systemConfig.businessRules',
    thresholds: 'systemConfig.thresholds',
    messages: 'systemConfig.messages'
  };
  
  return suggestions[category] || 'systemConfig.general';
}

function scanDirectory(dir: string): HardcodedValue[] {
  let results: HardcodedValue[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (shouldScanFile(fullPath)) {
          results = results.concat(scanDirectory(fullPath));
        }
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        results = results.concat(scanFile(fullPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}

function generateReport(values: HardcodedValue[]): AuditReport {
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byFile: Record<string, number> = {};
  
  values.forEach((v: any) => {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    byFile[v.file] = (byFile[v.file] || 0) + 1;
  });
  
  return {
    timestamp: new Date().toISOString(),
    hardcodedValues: values,
    summary: {
      totalFound: values.length,
      byCategory,
      bySeverity,
      byFile
    }
  };
}

function printReport(report: AuditReport) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 AUDITORÍA DE VALORES HARDCODEADOS');
  console.log('='.repeat(60) + '\n');
  
  console.log(`📊 RESUMEN:`);
  console.log(`   Total encontrados: ${report.summary.totalFound}`);
  console.log();
  
  console.log(`📁 Por Categoría:`);
  Object.entries(report.summary.byCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} ${count}`);
    });
  console.log();
  
  console.log(`⚠️  Por Severidad:`);
  Object.entries(report.summary.bySeverity)
    .sort(([,a], [,b]) => b - a)
    .forEach(([sev, count]) => {
      const icon = sev === 'high' ? '🔴' : sev === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} ${sev.padEnd(15)} ${count}`);
    });
  console.log();
  
  console.log(`📄 Top 10 Archivos con más valores:`);
  Object.entries(report.summary.byFile)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`   ${count.toString().padStart(3)} - ${file}`);
    });
  console.log();
  
  // Mostrar algunos ejemplos de alta severidad
  const highSeverity = report.hardcodedValues.filter((v: any) => v.severity === 'high').slice(0, 5);
  if (highSeverity.length > 0) {
    console.log(`🔴 Ejemplos de Alta Prioridad:`);
    highSeverity.forEach((v: any) => {
      console.log(`   ${v.file}:${v.line}`);
      console.log(`   ├─ Tipo: ${v.type}`);
      console.log(`   ├─ Valor: ${v.value}`);
      console.log(`   ├─ Migrar a: ${v.migrateTo}`);
      console.log(`   └─ Código: ${v.code}`);
      console.log();
    });
  }
  
  console.log('='.repeat(60));
  console.log(`📝 Reporte completo guardado en: audit-report/hardcoded-values.json`);
  console.log('='.repeat(60) + '\n');
}

// Ejecutar auditoría
async function main() {
  console.log('🚀 Iniciando auditoría de valores hardcodeados...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const values = scanDirectory(srcDir);
  
  const report = generateReport(values);
  
  // Crear directorio de reportes si no existe
  const reportDir = path.join(process.cwd(), 'audit-report');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Guardar reporte JSON
  const reportPath = path.join(reportDir, 'hardcoded-values.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Guardar reporte Markdown
  const mdReport = generateMarkdownReport(report);
  fs.writeFileSync(path.join(reportDir, 'hardcoded-values.md'), mdReport);
  
  // Mostrar reporte en consola
  printReport(report);
}

function generateMarkdownReport(report: AuditReport): string {
  let md = `# Auditoría de Valores Hardcodeados\n\n`;
  md += `**Fecha:** ${new Date(report.timestamp).toLocaleString('es-ES')}\n\n`;
  md += `## 📊 Resumen\n\n`;
  md += `- **Total encontrados:** ${report.summary.totalFound}\n\n`;
  
  md += `### Por Categoría\n\n`;
  md += `| Categoría | Cantidad |\n`;
  md += `|-----------|----------|\n`;
  Object.entries(report.summary.byCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      md += `| ${cat} | ${count} |\n`;
    });
  md += `\n`;
  
  md += `### Por Severidad\n\n`;
  md += `| Severidad | Cantidad |\n`;
  md += `|-----------|----------|\n`;
  Object.entries(report.summary.bySeverity)
    .sort(([,a], [,b]) => b - a)
    .forEach(([sev, count]) => {
      md += `| ${sev} | ${count} |\n`;
    });
  md += `\n`;
  
  md += `## 🔴 Alta Prioridad\n\n`;
  const highPriority = report.hardcodedValues.filter((v: any) => v.severity === 'high');
  highPriority.forEach((v: any) => {
    md += `### \`${v.file}:${v.line}\`\n\n`;
    md += `- **Tipo:** ${v.type}\n`;
    md += `- **Valor:** \`${v.value}\`\n`;
    md += `- **Migrar a:** \`${v.migrateTo}\`\n`;
    md += `- **Código:** \`${v.code}\`\n\n`;
  });
  
  return md;
}

main().catch(console.error);
