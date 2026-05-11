/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Code Analyzer - Análisis de calidad y arquitectura de código usando Gemini AI
 * 
 * Analiza:
 * - Calidad y complejidad del código
 * - Patrones y anti-patterns
 * - Arquitectura y estructura
 * - Uso correcto de SSOT
 * - Oportunidades de refactorización
 * 
 * Genera:
 * - Puntuación de calidad
 * - Issues detectados
 * - Recomendaciones de mejora
 * - Oportunidades de refactorización
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;              // Complejidad estimada
  functionCount: number;
  averageFunctionLength: number;
  importCount: number;
  exportCount: number;
  commentRatio: number;            // % de líneas comentadas
  typeScriptStrict: boolean;
}

export interface CodeIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'quality' | 'architecture' | 'performance' | 'security' | 'maintainability';
  type: string;
  description: string;
  location?: {
    file: string;
    line?: number;
  };
  suggestedFix?: string;
}

export interface RefactoringOpportunity {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  type:
  | 'EXTRACT_FUNCTION'
  | 'SIMPLIFY_LOGIC'
  | 'REMOVE_DUPLICATION'
  | 'IMPROVE_NAMING'
  | 'ADD_TYPES'
  | 'SPLIT_FILE'
  | 'OPTIMIZE_IMPORTS'
  | 'ADD_ERROR_HANDLING';
  title: string;
  description: string;
  estimatedEffort: string;
  benefit: string;
  codeExample?: string;
}

export interface CodeAnalysis extends AnalysisResult {
  type: 'code';
  scope: 'file' | 'directory' | 'module';
  target: string;
  metrics: CodeMetrics;
  qualityScore: number;            // 0-100
  issues: CodeIssue[];
  refactoringOpportunities: RefactoringOpportunity[];
  architectureCompliance: {
    usesSSOT: boolean;
    followsServerActions: boolean;
    properErrorHandling: boolean;
    typeScriptCompliance: number;  // 0-100
  };
  recommendations: string[];
  insights: string[];
}

export class CodeAnalyzer extends BaseAnalyzer {
  name = 'CodeAnalyzer';
  complexity: ModelComplexity = 'complex'; // Code analysis needs more context

  private projectRoot: string;

  constructor() {
    super();
    this.projectRoot = process.cwd();
  }

  /**
   * Analiza código de un archivo o directorio
   */
  async analyze(targetPath: string): Promise<CodeAnalysis> {
    console.log(`[CodeAnalyzer] Analyzing: ${targetPath}`);

    try {
      // Normalizar path
      const fullPath = path.resolve(this.projectRoot, targetPath);

      // Determinar si es archivo o directorio
      const stats = fs.statSync(fullPath);
      const isDirectory = stats.isDirectory();

      // Leer código
      const codeFiles = isDirectory
        ? this.getFilesInDirectory(fullPath)
        : [fullPath];

      console.log(`[CodeAnalyzer] Found ${codeFiles.length} file(s) to analyze`);

      // Analizar cada archivo
      const fileAnalyses = codeFiles.map(file => this.analyzeFile(file));

      // Agregar métricas
      const metrics = this.aggregateMetrics(fileAnalyses);
      const issues = this.aggregateIssues(fileAnalyses);
      const architectureCompliance = this.checkArchitectureCompliance(fileAnalyses);

      // Construir contexto para Gemini
      const context = this.buildAnalysisContext(
        targetPath,
        codeFiles,
        fileAnalyses,
        metrics,
        issues,
        architectureCompliance
      );

      // Obtener insights de Gemini
      let geminiResponse: any;
      try {
        geminiResponse = await this.callGeminiJSON(
          this.buildCodePrompt(),
          context
        );
      } catch (error) {
        console.error('[CodeAnalyzer] Gemini error:', error);
        geminiResponse = this.generateBasicRecommendations(metrics, issues);
      }

      // Calcular quality score
      const qualityScore = this.calculateQualityScore(metrics, issues);

      // Construir análisis
      const analysis: CodeAnalysis = {
        id: `code-${Date.now()}`,
        type: 'code',
        entityId: targetPath,
        entityName: path.basename(targetPath),
        scope: isDirectory ? 'directory' : 'file',
        target: targetPath,
        metrics,
        qualityScore,
        issues,
        refactoringOpportunities: geminiResponse.refactoringOpportunities || [],
        architectureCompliance,
        recommendations: geminiResponse.recommendations || [],
        insights: geminiResponse.insights || [],
        createdAt: new Date().toISOString(),
        metadata: {
          filesAnalyzed: codeFiles.length,
          totalLines: metrics.linesOfCode
        }
      };

      // Guardar análisis
      await this.saveAnalysis('code', targetPath, analysis);

      console.log(`[CodeAnalyzer] Analysis complete: ${qualityScore}/100 quality score`);

      return analysis;

    } catch (error) {
      console.error('[CodeAnalyzer] Error:', error);
      throw error;
    }
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: CodeAnalysis): Promise<Recommendation[]> {
    return analysis.refactoringOpportunities.map(opp => ({
      id: `code-rec-${Date.now()}-${Math.random()}`,
      type: 'CODE_QUALITY',
      priority: opp.priority,
      title: opp.title,
      description: opp.description,
      metadata: {
        target: analysis.target,
        type: opp.type,
        effort: opp.estimatedEffort,
        benefit: opp.benefit
      }
    }));
  }

  /**
   * Analiza un archivo individual
   */
  private analyzeFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Métricas básicas
    const linesOfCode = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    }).length;

    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }).length;

    const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(.*?\)\s*=>/g) || []).length;
    const importCount = (content.match(/^import\s+/gm) || []).length;
    const exportCount = (content.match(/^export\s+/gm) || []).length;

    // Detectar issues básicos
    const issues: CodeIssue[] = [];

    // Issue: Archivo muy largo
    if (linesOfCode > 500) {
      issues.push({
        severity: 'medium',
        category: 'maintainability',
        type: 'LONG_FILE',
        description: `Archivo demasiado largo (${linesOfCode} líneas). Considerar dividir en módulos más pequeños.`,
        location: { file: filePath }
      });
    }

    // Issue: Función muy larga (estimado)
    if (functionCount > 0 && linesOfCode / functionCount > 50) {
      issues.push({
        severity: 'medium',
        category: 'maintainability',
        type: 'LONG_FUNCTION',
        description: 'Funciones promedio muy largas. Considerar extraer subfunciones.',
        location: { file: filePath }
      });
    }

    // Issue: Falta de comentarios
    if (linesOfCode > 100 && commentLines < linesOfCode * 0.05) {
      issues.push({
        severity: 'low',
        category: 'maintainability',
        type: 'LOW_COMMENTS',
        description: 'Bajo ratio de comentarios. Considerar documentar lógica compleja.',
        location: { file: filePath }
      });
    }

    // Issue: Demasiados imports
    if (importCount > 20) {
      issues.push({
        severity: 'low',
        category: 'architecture',
        type: 'MANY_IMPORTS',
        description: `Muchos imports (${importCount}). Posible señal de alto acoplamiento.`,
        location: { file: filePath }
      });
    }

    // Detectar patrones del proyecto
    const usesSSOT = content.includes("from '@/domain/ssot'") || content.includes('from "./ssot"');
    const usesServerAction = content.includes("'use server'");
    const hasErrorHandling = content.includes('try {') && content.includes('catch');
    const hasTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

    return {
      file: filePath,
      linesOfCode,
      commentLines,
      functionCount,
      importCount,
      exportCount,
      issues,
      patterns: {
        usesSSOT,
        usesServerAction,
        hasErrorHandling,
        hasTypeScript
      }
    };
  }

  /**
   * Obtiene archivos TypeScript/JavaScript en un directorio
   */
  private getFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath);

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules, .git, etc
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            traverse(fullPath);
          }
        } else if (stat.isFile()) {
          // Solo archivos TypeScript/JavaScript
          if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
            files.push(fullPath);
          }
        }
      }
    };

    traverse(dirPath);
    return files.slice(0, 50); // Limitar a 50 archivos para no saturar
  }

  /**
   * Agrega métricas de múltiples archivos
   */
  private aggregateMetrics(fileAnalyses: any[]): CodeMetrics {
    const totalLOC = fileAnalyses.reduce((sum, f) => sum + f.linesOfCode, 0);
    const totalComments = fileAnalyses.reduce((sum, f) => sum + f.commentLines, 0);
    const totalFunctions = fileAnalyses.reduce((sum, f) => sum + f.functionCount, 0);
    const totalImports = fileAnalyses.reduce((sum, f) => sum + f.importCount, 0);
    const totalExports = fileAnalyses.reduce((sum, f) => sum + f.exportCount, 0);

    const avgFunctionLength = totalFunctions > 0 ? totalLOC / totalFunctions : 0;
    const commentRatio = totalLOC > 0 ? (totalComments / totalLOC) * 100 : 0;

    const tsFiles = fileAnalyses.filter(f => f.patterns.hasTypeScript).length;
    const typeScriptStrict = tsFiles === fileAnalyses.length;

    // Estimar complejidad basada en métricas
    const complexity = this.estimateComplexity(totalLOC, totalFunctions, totalImports);

    return {
      linesOfCode: totalLOC,
      complexity,
      functionCount: totalFunctions,
      averageFunctionLength: avgFunctionLength,
      importCount: totalImports,
      exportCount: totalExports,
      commentRatio,
      typeScriptStrict
    };
  }

  /**
   * Agrega issues de múltiples archivos
   */
  private aggregateIssues(fileAnalyses: any[]): CodeIssue[] {
    const allIssues: CodeIssue[] = [];

    for (const fileAnalysis of fileAnalyses) {
      allIssues.push(...fileAnalysis.issues);
    }

    return allIssues;
  }

  /**
   * Verifica cumplimiento de arquitectura
   */
  private checkArchitectureCompliance(fileAnalyses: any[]): CodeAnalysis['architectureCompliance'] {
    const ssotFiles = fileAnalyses.filter(f => f.patterns.usesSSOT).length;
    const serverActionFiles = fileAnalyses.filter(f => f.patterns.usesServerAction).length;
    const errorHandlingFiles = fileAnalyses.filter(f => f.patterns.hasErrorHandling).length;
    const tsFiles = fileAnalyses.filter(f => f.patterns.hasTypeScript).length;

    return {
      usesSSOT: ssotFiles > 0,
      followsServerActions: serverActionFiles > 0,
      properErrorHandling: errorHandlingFiles / fileAnalyses.length > 0.5,
      typeScriptCompliance: (tsFiles / fileAnalyses.length) * 100
    };
  }

  /**
   * Construye contexto para Gemini
   */
  private buildAnalysisContext(
    targetPath: string,
    codeFiles: string[],
    fileAnalyses: any[],
    metrics: CodeMetrics,
    issues: CodeIssue[],
    compliance: CodeAnalysis['architectureCompliance']
  ): any {
    // Tomar muestra de código para análisis
    const sampleCode = codeFiles.slice(0, 3).map(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        return {
          file: path.relative(this.projectRoot, file),
          preview: content.substring(0, 2000) // Primeras 2000 chars
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return {
      target: targetPath,
      filesCount: codeFiles.length,
      metrics,
      issues: issues.slice(0, 10), // Top 10 issues
      compliance,
      sampleCode
    };
  }

  /**
   * Prompt para Gemini
   */
  private buildCodePrompt(): string {
    return `
Eres un experto en arquitectura de software, calidad de código y mejores prácticas.

Analiza el código de un ERP de distribución de bebidas construido con Next.js, TypeScript y Firebase.

ARQUITECTURA DEL PROYECTO:
- SSOT (Single Source of Truth): types centralizados en /domain/ssot.ts
- Server Actions: acciones del servidor con 'use server'
- Firebase/Firestore como base de datos
- TypeScript estricto
- Componentes React con hooks

ASPECTOS A EVALUAR:
1. Calidad del código y mantenibilidad
2. Cumplimiento de patrones arquitectónicos
3. Uso correcto de SSOT types
4. Error handling y robustez
5. Performance y optimizaciones
6. Complejidad y acoplamiento

Responde con JSON estructurado:
{
  "refactoringOpportunities": [
    {
      "priority": "urgent" | "high" | "medium" | "low",
      "type": "EXTRACT_FUNCTION" | "SIMPLIFY_LOGIC" | "REMOVE_DUPLICATION" | "IMPROVE_NAMING" | "ADD_TYPES" | "SPLIT_FILE" | "OPTIMIZE_IMPORTS" | "ADD_ERROR_HANDLING",
      "title": "Título breve",
      "description": "Descripción detallada",
      "estimatedEffort": "Esfuerzo estimado",
      "benefit": "Beneficio esperado",
      "codeExample": "Ejemplo de código mejorado (opcional)"
    }
  ],
  "recommendations": [
    "Recomendación 1: específica y accionable",
    "Recomendación 2: enfocada en arquitectura o patrones"
  ],
  "insights": [
    "Insight 1: análisis de calidad general",
    "Insight 2: oportunidades de mejora estructural"
  ]
}
    `.trim();
  }

  /**
   * Genera recomendaciones básicas sin IA (fallback)
   */
  private generateBasicRecommendations(metrics: CodeMetrics, issues: CodeIssue[]): any {
    const refactoringOpportunities: RefactoringOpportunity[] = [];
    const recommendations: string[] = [];
    const insights: string[] = [];

    // Refactorings basados en métricas
    if (metrics.averageFunctionLength > 50) {
      refactoringOpportunities.push({
        priority: 'high',
        type: 'EXTRACT_FUNCTION',
        title: 'Extraer funciones grandes',
        description: `Funciones promedio de ${Math.round(metrics.averageFunctionLength)} líneas. Extraer subfunciones para mejorar legibilidad.`,
        estimatedEffort: '2-4 horas',
        benefit: 'Código más mantenible y testeable'
      });
    }

    if (metrics.commentRatio < 5) {
      refactoringOpportunities.push({
        priority: 'medium',
        type: 'IMPROVE_NAMING',
        title: 'Mejorar documentación',
        description: 'Bajo ratio de comentarios. Agregar JSDoc a funciones públicas.',
        estimatedEffort: '1-2 horas',
        benefit: 'Mejor comprensión del código'
      });
    }

    if (!metrics.typeScriptStrict) {
      refactoringOpportunities.push({
        priority: 'high',
        type: 'ADD_TYPES',
        title: 'Migrar a TypeScript',
        description: 'Algunos archivos sin TypeScript. Convertir a .ts/.tsx.',
        estimatedEffort: '4-8 horas',
        benefit: 'Type safety y mejor DX'
      });
    }

    // Recomendaciones generales
    recommendations.push(
      `Mantener archivos por debajo de 300 líneas para mejor mantenibilidad`,
      `Usar SSOT types para consistencia de datos`,
      `Implementar error handling en todas las server actions`
    );

    // Insights
    insights.push(
      `${metrics.linesOfCode} líneas de código analizadas`,
      `${issues.length} issues detectados (${issues.filter((i) => i.severity === 'high').length} de prioridad alta)`,
      `Complejidad estimada: ${metrics.complexity}/10`
    );

    return { refactoringOpportunities, recommendations, insights };
  }

  /**
   * Calcula score de calidad
   */
  private calculateQualityScore(metrics: CodeMetrics, issues: CodeIssue[]): number {
    let score = 100;

    // Penalizar por issues
    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;
    const mediumIssues = issues.filter((i) => i.severity === 'medium').length;

    score -= criticalIssues * 15;
    score -= highIssues * 10;
    score -= mediumIssues * 5;

    // Penalizar por métricas pobres
    if (metrics.averageFunctionLength > 50) score -= 10;
    if (metrics.commentRatio < 5) score -= 5;
    if (!metrics.typeScriptStrict) score -= 15;
    if (metrics.complexity > 7) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estima complejidad del código
   */
  private estimateComplexity(loc: number, functions: number, imports: number): number {
    // Fórmula simple basada en métricas
    let complexity = 0;

    // LOC contribuye a complejidad
    if (loc > 1000) complexity += 3;
    else if (loc > 500) complexity += 2;
    else if (loc > 200) complexity += 1;

    // Ratio función/LOC
    const avgFunctionSize = functions > 0 ? loc / functions : 0;
    if (avgFunctionSize > 100) complexity += 3;
    else if (avgFunctionSize > 50) complexity += 2;
    else if (avgFunctionSize > 25) complexity += 1;

    // Imports indica acoplamiento
    if (imports > 30) complexity += 3;
    else if (imports > 20) complexity += 2;
    else if (imports > 10) complexity += 1;

    return Math.min(10, complexity);
  }
}
