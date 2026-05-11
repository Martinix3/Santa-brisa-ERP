/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * UI/UX Analyzer - Análisis de experiencia de usuario y accesibilidad usando Gemini AI
 * 
 * Analiza:
 * - Accesibilidad (WCAG compliance)
 * - Responsive design
 * - Design system compliance
 * - UX patterns (loading, errors, empty states)
 * - Performance optimizations
 * 
 * Genera:
 * - Puntuación de UX
 * - Issues de accesibilidad y usabilidad
 * - Recomendaciones de mejora
 * - Oportunidades de optimización
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';
import * as fs from 'fs';
import * as path from 'path';

export interface UIUXMetrics {
  accessibility: {
    ariaLabels: number;              // Cantidad de elementos con aria-label
    altTexts: number;                // Imágenes con alt text
    semanticHTML: boolean;           // Uso de semantic HTML (header, nav, main, etc)
    headingStructure: boolean;       // Estructura de headings correcta
    formLabels: number;              // Inputs con labels
  };
  responsiveness: {
    hasBreakpoints: boolean;         // Usa breakpoints de Tailwind (sm:, md:, etc)
    hardcodedWidths: number;         // Widths/heights hardcoded
    mobileFirst: boolean;            // Enfoque mobile-first
  };
  designSystem: {
    usesTokens: boolean;             // Usa tokens del design system
    colorConsistency: number;        // % de colores del theme vs hardcoded
    spacingConsistency: number;      // % de spacing estándar (p-4, m-2, etc)
    typographyConsistency: number;   // % de typography tokens
  };
  uxPatterns: {
    loadingStates: number;           // Cantidad de loading states
    errorHandling: number;           // Error boundaries o handling
    emptyStates: number;             // Empty states implementados
    feedbackMechanisms: number;      // Toasts, notifications, etc
    confirmations: number;           // Confirmaciones en acciones destructivas
  };
  performance: {
    optimizedImages: number;         // Uso de next/image
    lazyLoading: number;             // Lazy loading implementado
    memoization: number;             // useMemo, useCallback, React.memo
  };
}

export interface UIUXIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'accessibility' | 'responsiveness' | 'design-system' | 'ux-pattern' | 'performance';
  type: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    component?: string;
  };
  wcagLevel?: '2.0-A' | '2.0-AA' | '2.0-AAA' | '2.1-A' | '2.1-AA' | '2.1-AAA';
  suggestedFix?: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
}

export interface UIUXImprovement {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'accessibility' | 'responsiveness' | 'design-system' | 'ux-pattern' | 'performance';
  title: string;
  description: string;
  benefit: string;
  estimatedEffort: string;
  codeExample?: string;
}

export interface UIUXAnalysis extends AnalysisResult {
  type: 'uiux';
  scope: 'component' | 'page' | 'module';
  target: string;
  metrics: UIUXMetrics;
  uxScore: number;                   // 0-100
  accessibilityScore: number;        // 0-100
  issues: UIUXIssue[];
  improvements: UIUXImprovement[];
  wcagCompliance: {
    level: 'none' | 'partial-A' | 'A' | 'partial-AA' | 'AA' | 'partial-AAA' | 'AAA';
    passedCriteria: string[];
    failedCriteria: string[];
  };
  recommendations: string[];
  insights: string[];
}

export class UIUXAnalyzer extends BaseAnalyzer {
  name = 'UIUXAnalyzer';
  complexity: ModelComplexity = 'complex'; // UI/UX analysis needs deep understanding

  private projectRoot: string;

  constructor() {
    super();
    this.projectRoot = process.cwd();
  }

  /**
   * Analiza UI/UX de un componente, página o módulo
   */
  async analyze(targetPath: string): Promise<UIUXAnalysis> {
    console.log(`[UIUXAnalyzer] Analyzing: ${targetPath}`);

    try {
      // Normalizar path
      const fullPath = path.resolve(this.projectRoot, targetPath);

      // Determinar si es archivo o directorio
      const stats = fs.statSync(fullPath);
      const isDirectory = stats.isDirectory();

      // Obtener archivos React/Next.js
      const uiFiles = isDirectory
        ? this.getUIFilesInDirectory(fullPath)
        : [fullPath];

      console.log(`[UIUXAnalyzer] Found ${uiFiles.length} UI file(s) to analyze`);

      // Analizar cada archivo
      const fileAnalyses = uiFiles.map(file => this.analyzeUIFile(file));

      // Agregar métricas
      const metrics = this.aggregateMetrics(fileAnalyses);
      const issues = this.aggregateIssues(fileAnalyses);
      const wcagCompliance = this.checkWCAGCompliance(fileAnalyses, issues);

      // Construir contexto para Gemini
      const context = this.buildAnalysisContext(
        targetPath,
        uiFiles,
        fileAnalyses,
        metrics,
        issues,
        wcagCompliance
      );

      // Obtener insights de Gemini
      let geminiResponse: any;
      try {
        geminiResponse = await this.callGeminiJSON(
          this.buildUIUXPrompt(),
          context
        );
      } catch (error) {
        console.error('[UIUXAnalyzer] Gemini error:', error);
        geminiResponse = this.generateBasicRecommendations(metrics, issues);
      }

      // Calcular scores
      const uxScore = this.calculateUXScore(metrics, issues);
      const accessibilityScore = this.calculateAccessibilityScore(metrics, issues);

      // Construir análisis
      const analysis: UIUXAnalysis = {
        id: `uiux-${Date.now()}`,
        type: 'uiux',
        entityId: targetPath,
        entityName: path.basename(targetPath),
        scope: this.determineScope(targetPath),
        target: targetPath,
        metrics,
        uxScore,
        accessibilityScore,
        issues,
        improvements: geminiResponse.improvements || [],
        wcagCompliance,
        recommendations: geminiResponse.recommendations || [],
        insights: geminiResponse.insights || [],
        createdAt: new Date().toISOString(),
        metadata: {
          filesAnalyzed: uiFiles.length,
          componentsFound: fileAnalyses.reduce((sum, f) => sum + f.componentCount, 0)
        }
      };

      // Guardar análisis
      await this.saveAnalysis('uiux', targetPath, analysis);

      console.log(`[UIUXAnalyzer] Analysis complete: UX ${uxScore}/100, A11y ${accessibilityScore}/100`);

      return analysis;

    } catch (error) {
      console.error('[UIUXAnalyzer] Error:', error);
      throw error;
    }
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: UIUXAnalysis): Promise<Recommendation[]> {
    return analysis.improvements.map(imp => ({
      id: `uiux-rec-${Date.now()}-${Math.random()}`,
      type: 'UI_UX_IMPROVEMENT',
      priority: imp.priority,
      title: imp.title,
      description: imp.description,
      metadata: {
        target: analysis.target,
        category: imp.category,
        effort: imp.estimatedEffort,
        benefit: imp.benefit
      }
    }));
  }

  /**
   * Analiza un archivo de UI individual
   */
  private analyzeUIFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Contar componentes React
    const componentCount = (content.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+[A-Z]\w+/g) || []).length;

    // Analizar accesibilidad
    const ariaLabels = (content.match(/aria-label=/g) || []).length;
    const altTexts = (content.match(/<img[^>]+alt=/g) || []).length;
    const semanticHTML = /(<header|<nav|<main|<aside|<footer|<article|<section)/g.test(content);
    const headingStructure = /<h[1-6]/g.test(content);
    const formLabels = (content.match(/<label/g) || []).length;

    // Analizar responsive design
    const hasBreakpoints = /(sm:|md:|lg:|xl:|2xl:)/g.test(content);
    const hardcodedWidths = (content.match(/(?:width|height|w-|h-)(?:\[|\d{1,4}px)/g) || []).length;
    const mobileFirst = content.includes('min-w-') || hasBreakpoints;

    // Analizar design system
    const usesTokens = content.includes('from') && (content.includes('theme') || content.includes('design-system'));
    const tailwindColors = (content.match(/(?:bg|text|border)-(?:primary|secondary|accent|gray|red|green|blue|yellow)/g) || []).length;
    const hardcodedColors = (content.match(/#[0-9a-fA-F]{3,6}|rgb\(|rgba\(/g) || []).length;
    const colorConsistency = tailwindColors / Math.max(1, tailwindColors + hardcodedColors);

    const tailwindSpacing = (content.match(/(?:p|m|gap|space)-\d+/g) || []).length;
    const hardcodedSpacing = (content.match(/\d+px(?!\w)/g) || []).length;
    const spacingConsistency = tailwindSpacing / Math.max(1, tailwindSpacing + hardcodedSpacing);

    const tailwindTypography = (content.match(/text-(?:xs|sm|base|lg|xl|2xl|3xl)/g) || []).length;
    const typographyConsistency = tailwindTypography > 0 ? 0.8 : 0.3; // Estimado

    // Analizar UX patterns
    const loadingStates = (content.match(/(?:isLoading|loading|isPending|Skeleton|Spinner)/g) || []).length;
    const errorHandling = (content.match(/(?:error|Error|catch|ErrorBoundary)/g) || []).length;
    const emptyStates = (content.match(/(?:isEmpty|empty|no\s+\w+\s+found|EmptyState)/gi) || []).length;
    const feedbackMechanisms = (content.match(/(?:toast|notification|alert|success|error message)/gi) || []).length;
    const confirmations = (content.match(/(?:confirm|are you sure|modal.*delete|dialog.*remove)/gi) || []).length;

    // Analizar performance
    const optimizedImages = (content.match(/(?:next\/image|Image\s+from)/g) || []).length;
    const lazyLoading = (content.match(/(?:lazy|Suspense|dynamic\()/g) || []).length;
    const memoization = (content.match(/(?:useMemo|useCallback|React\.memo)/g) || []).length;

    // Detectar issues
    const issues: UIUXIssue[] = [];

    // Issue: Accesibilidad - Imágenes sin alt
    const imagesTotal = (content.match(/<img|<Image/g) || []).length;
    if (imagesTotal > 0 && altTexts < imagesTotal) {
      issues.push({
        severity: 'high',
        category: 'accessibility',
        type: 'MISSING_ALT_TEXT',
        description: `${imagesTotal - altTexts} imagen(es) sin texto alternativo. Afecta a usuarios con lectores de pantalla.`,
        location: { file: filePath },
        wcagLevel: '2.0-A',
        impact: 'serious',
        suggestedFix: 'Agregar prop alt="" a todas las imágenes con descripción significativa'
      });
    }

    // Issue: Accesibilidad - Botones sin aria-label
    const buttons = (content.match(/<button|<Button/g) || []).length;
    if (buttons > ariaLabels && buttons > 3) {
      issues.push({
        severity: 'medium',
        category: 'accessibility',
        type: 'MISSING_ARIA_LABELS',
        description: 'Botones sin etiquetas accesibles. Dificulta navegación con teclado.',
        location: { file: filePath },
        wcagLevel: '2.0-A',
        impact: 'moderate',
        suggestedFix: 'Agregar aria-label a botones de iconos o sin texto visible'
      });
    }

    // Issue: Responsive - Widths hardcoded
    if (hardcodedWidths > 5) {
      issues.push({
        severity: 'medium',
        category: 'responsiveness',
        type: 'HARDCODED_DIMENSIONS',
        description: `${hardcodedWidths} dimensiones hardcoded. Puede causar problemas en diferentes pantallas.`,
        location: { file: filePath },
        impact: 'moderate',
        suggestedFix: 'Usar clases de Tailwind responsive (w-full, max-w-*, etc) o breakpoints'
      });
    }

    // Issue: Design system - Colores hardcoded
    if (hardcodedColors > 3) {
      issues.push({
        severity: 'low',
        category: 'design-system',
        type: 'HARDCODED_COLORS',
        description: `${hardcodedColors} colores hardcoded. Dificulta mantener consistencia visual.`,
        location: { file: filePath },
        impact: 'minor',
        suggestedFix: 'Usar colores del theme de Tailwind o design tokens'
      });
    }

    // Issue: UX - Sin loading states
    if (componentCount > 0 && loadingStates === 0 && (content.includes('fetch') || content.includes('useQuery'))) {
      issues.push({
        severity: 'medium',
        category: 'ux-pattern',
        type: 'MISSING_LOADING_STATE',
        description: 'Componente realiza peticiones pero no muestra estado de carga.',
        location: { file: filePath },
        impact: 'moderate',
        suggestedFix: 'Implementar skeleton, spinner o mensaje de carga'
      });
    }

    // Issue: UX - Sin error handling
    if (componentCount > 0 && errorHandling === 0 && (content.includes('fetch') || content.includes('useQuery'))) {
      issues.push({
        severity: 'high',
        category: 'ux-pattern',
        type: 'MISSING_ERROR_HANDLING',
        description: 'Componente realiza peticiones pero no maneja errores.',
        location: { file: filePath },
        impact: 'serious',
        suggestedFix: 'Implementar try/catch y mostrar mensaje de error al usuario'
      });
    }

    // Issue: Performance - Imágenes sin optimizar
    if (imagesTotal > 0 && optimizedImages === 0) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        type: 'UNOPTIMIZED_IMAGES',
        description: `${imagesTotal} imagen(es) sin optimizar. Afecta tiempo de carga.`,
        location: { file: filePath },
        impact: 'moderate',
        suggestedFix: 'Usar next/image en lugar de <img> para optimización automática'
      });
    }

    return {
      file: filePath,
      componentCount,
      accessibility: {
        ariaLabels,
        altTexts,
        semanticHTML,
        headingStructure,
        formLabels
      },
      responsiveness: {
        hasBreakpoints,
        hardcodedWidths,
        mobileFirst
      },
      designSystem: {
        usesTokens,
        colorConsistency,
        spacingConsistency,
        typographyConsistency
      },
      uxPatterns: {
        loadingStates,
        errorHandling,
        emptyStates,
        feedbackMechanisms,
        confirmations
      },
      performance: {
        optimizedImages,
        lazyLoading,
        memoization
      },
      issues
    };
  }

  /**
   * Obtiene archivos de UI en un directorio
   */
  private getUIFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath);

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            traverse(fullPath);
          }
        } else if (stat.isFile()) {
          // Solo archivos React/Next.js
          if (/\.(tsx|jsx)$/.test(entry) && !entry.endsWith('.test.tsx') && !entry.endsWith('.test.jsx')) {
            files.push(fullPath);
          }
        }
      }
    };

    traverse(dirPath);
    return files.slice(0, 30); // Limitar a 30 archivos
  }

  /**
   * Agrega métricas de múltiples archivos
   */
  private aggregateMetrics(fileAnalyses: any[]): UIUXMetrics {
    const totalFiles = fileAnalyses.length;

    return {
      accessibility: {
        ariaLabels: fileAnalyses.reduce((sum, f) => sum + f.accessibility.ariaLabels, 0),
        altTexts: fileAnalyses.reduce((sum, f) => sum + f.accessibility.altTexts, 0),
        semanticHTML: fileAnalyses.filter(f => f.accessibility.semanticHTML).length > totalFiles * 0.5,
        headingStructure: fileAnalyses.filter(f => f.accessibility.headingStructure).length > totalFiles * 0.5,
        formLabels: fileAnalyses.reduce((sum, f) => sum + f.accessibility.formLabels, 0)
      },
      responsiveness: {
        hasBreakpoints: fileAnalyses.some(f => f.responsiveness.hasBreakpoints),
        hardcodedWidths: fileAnalyses.reduce((sum, f) => sum + f.responsiveness.hardcodedWidths, 0),
        mobileFirst: fileAnalyses.filter(f => f.responsiveness.mobileFirst).length > totalFiles * 0.5
      },
      designSystem: {
        usesTokens: fileAnalyses.some(f => f.designSystem.usesTokens),
        colorConsistency: fileAnalyses.reduce((sum, f) => sum + f.designSystem.colorConsistency, 0) / totalFiles * 100,
        spacingConsistency: fileAnalyses.reduce((sum, f) => sum + f.designSystem.spacingConsistency, 0) / totalFiles * 100,
        typographyConsistency: fileAnalyses.reduce((sum, f) => sum + f.designSystem.typographyConsistency, 0) / totalFiles * 100
      },
      uxPatterns: {
        loadingStates: fileAnalyses.reduce((sum, f) => sum + f.uxPatterns.loadingStates, 0),
        errorHandling: fileAnalyses.reduce((sum, f) => sum + f.uxPatterns.errorHandling, 0),
        emptyStates: fileAnalyses.reduce((sum, f) => sum + f.uxPatterns.emptyStates, 0),
        feedbackMechanisms: fileAnalyses.reduce((sum, f) => sum + f.uxPatterns.feedbackMechanisms, 0),
        confirmations: fileAnalyses.reduce((sum, f) => sum + f.uxPatterns.confirmations, 0)
      },
      performance: {
        optimizedImages: fileAnalyses.reduce((sum, f) => sum + f.performance.optimizedImages, 0),
        lazyLoading: fileAnalyses.reduce((sum, f) => sum + f.performance.lazyLoading, 0),
        memoization: fileAnalyses.reduce((sum, f) => sum + f.performance.memoization, 0)
      }
    };
  }

  /**
   * Agrega issues de múltiples archivos
   */
  private aggregateIssues(fileAnalyses: any[]): UIUXIssue[] {
    const allIssues: UIUXIssue[] = [];

    for (const fileAnalysis of fileAnalyses) {
      allIssues.push(...fileAnalysis.issues);
    }

    return allIssues;
  }

  /**
   * Verifica cumplimiento WCAG
   */
  private checkWCAGCompliance(fileAnalyses: any[], issues: UIUXIssue[]): UIUXAnalysis['wcagCompliance'] {
    const criticalA11yIssues = issues.filter((i) =>
      i.category === 'accessibility' && (i.severity === 'critical' || i.severity === 'high')
    ).length;

    const moderateA11yIssues = issues.filter((i) =>
      i.category === 'accessibility' && i.severity === 'medium'
    ).length;

    let level: UIUXAnalysis['wcagCompliance']['level'] = 'none';

    if (criticalA11yIssues === 0) {
      if (moderateA11yIssues === 0) {
        level = 'AA'; // Buen compliance
      } else if (moderateA11yIssues < 3) {
        level = 'partial-AA';
      } else {
        level = 'A';
      }
    } else if (criticalA11yIssues < 3) {
      level = 'partial-A';
    }

    const passedCriteria = [
      'Documentación técnica disponible',
      'Uso de framework moderno (React/Next.js)'
    ];

    const failedCriteria = issues
      .filter((i) => i.category === 'accessibility')
      .map((i) => i.description);

    return { level, passedCriteria, failedCriteria };
  }

  /**
   * Construye contexto para Gemini
   */
  private buildAnalysisContext(
    targetPath: string,
    uiFiles: string[],
    fileAnalyses: any[],
    metrics: UIUXMetrics,
    issues: UIUXIssue[],
    wcag: UIUXAnalysis['wcagCompliance']
  ): any {
    // Tomar muestra de código UI
    const sampleCode = uiFiles.slice(0, 2).map(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        return {
          file: path.relative(this.projectRoot, file),
          preview: content.substring(0, 3000) // Primeras 3000 chars
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return {
      target: targetPath,
      filesCount: uiFiles.length,
      metrics,
      issues: issues.slice(0, 15), // Top 15 issues
      wcagCompliance: wcag,
      sampleCode
    };
  }

  /**
   * Prompt para Gemini
   */
  private buildUIUXPrompt(): string {
    return `
Eres un experto en UI/UX, accesibilidad web (WCAG) y mejores prácticas de diseño.

Analiza la interfaz de usuario de un ERP de distribución de bebidas construido con Next.js, React, TypeScript y Tailwind CSS.

CONTEXTO DEL PROYECTO:
- Framework: Next.js 14+ con App Router
- UI: React con Tailwind CSS
- Design System: Tailwind theme personalizado
- Usuarios: Personal de ventas, operaciones, administración

ASPECTOS A EVALUAR:
1. **Accesibilidad (WCAG 2.1 AA)**:
   - Elementos interactivos accesibles
   - Contraste de colores
   - Navegación por teclado
   - Lectores de pantalla
   - Semántica HTML

2. **Responsive Design**:
   - Adaptación a móvil, tablet, desktop
   - Breakpoints consistentes
   - Touch targets adecuados

3. **Design System**:
   - Consistencia visual
   - Uso de tokens/variables
   - Patrones reutilizables

4. **UX Patterns**:
   - Loading states
   - Error handling
   - Empty states
   - Feedback al usuario
   - Confirmaciones

5. **Performance**:
   - Optimización de imágenes
   - Lazy loading
   - Memoization

Responde con JSON estructurado:
{
  "improvements": [
    {
      "priority": "urgent" | "high" | "medium" | "low",
      "category": "accessibility" | "responsiveness" | "design-system" | "ux-pattern" | "performance",
      "title": "Título breve",
      "description": "Descripción detallada del problema y solución",
      "benefit": "Beneficio concreto para usuarios",
      "estimatedEffort": "Esfuerzo estimado",
      "codeExample": "Ejemplo de código mejorado (opcional)"
    }
  ],
  "recommendations": [
    "Recomendación 1: específica y accionable",
    "Recomendación 2: enfocada en mejorar UX"
  ],
  "insights": [
    "Insight 1: observación general sobre la UI",
    "Insight 2: oportunidad de mejora significativa"
  ]
}
    `.trim();
  }

  /**
   * Genera recomendaciones básicas sin IA (fallback)
   */
  private generateBasicRecommendations(metrics: UIUXMetrics, issues: UIUXIssue[]): any {
    const improvements: UIUXImprovement[] = [];
    const recommendations: string[] = [];
    const insights: string[] = [];

    // Mejoras basadas en métricas
    const a11yIssues = issues.filter((i) => i.category === 'accessibility').length;
    if (a11yIssues > 0) {
      improvements.push({
        priority: 'high',
        category: 'accessibility',
        title: 'Mejorar accesibilidad',
        description: `${a11yIssues} problema(s) de accesibilidad detectados. Afecta a usuarios con discapacidades.`,
        benefit: 'Interfaz usable para todos, cumplimiento WCAG',
        estimatedEffort: '2-4 horas'
      });
    }

    if (metrics.responsiveness.hardcodedWidths > 10) {
      improvements.push({
        priority: 'medium',
        category: 'responsiveness',
        title: 'Mejorar responsive design',
        description: 'Muchas dimensiones hardcoded. Implementar breakpoints consistentes.',
        benefit: 'Mejor experiencia en móviles y tablets',
        estimatedEffort: '3-5 horas'
      });
    }

    if (metrics.designSystem.colorConsistency < 70) {
      improvements.push({
        priority: 'medium',
        category: 'design-system',
        title: 'Unificar sistema de colores',
        description: 'Baja consistencia en colores. Usar tokens del theme.',
        benefit: 'Consistencia visual, mantenimiento más fácil',
        estimatedEffort: '2-3 horas'
      });
    }

    // Recomendaciones generales
    recommendations.push(
      'Implementar loading states en todas las operaciones asíncronas',
      'Agregar textos alternativos descriptivos a todas las imágenes',
      'Usar componentes del design system para mantener consistencia'
    );

    // Insights
    insights.push(
      `${metrics.accessibility.ariaLabels} elementos con aria-label detectados`,
      `${metrics.uxPatterns.loadingStates} loading states implementados`,
      `Compliance WCAG: necesita mejoras en accesibilidad`
    );

    return { improvements, recommendations, insights };
  }

  /**
   * Calcula score de UX
   */
  private calculateUXScore(metrics: UIUXMetrics, issues: UIUXIssue[]): number {
    let score = 100;

    // Penalizar por issues
    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;
    const mediumIssues = issues.filter((i) => i.severity === 'medium').length;

    score -= criticalIssues * 20;
    score -= highIssues * 10;
    score -= mediumIssues * 5;

    // Penalizar por falta de UX patterns
    if (metrics.uxPatterns.loadingStates === 0) score -= 10;
    if (metrics.uxPatterns.errorHandling === 0) score -= 15;
    if (metrics.uxPatterns.feedbackMechanisms === 0) score -= 10;

    // Penalizar por problemas de responsive
    if (metrics.responsiveness.hardcodedWidths > 10) score -= 10;
    if (!metrics.responsiveness.hasBreakpoints) score -= 15;

    // Penalizar por baja consistencia de design system
    if (metrics.designSystem.colorConsistency < 50) score -= 10;
    if (metrics.designSystem.spacingConsistency < 50) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcula score de accesibilidad
   */
  private calculateAccessibilityScore(metrics: UIUXMetrics, issues: UIUXIssue[]): number {
    let score = 100;

    // Penalizar por issues de accesibilidad
    const a11yIssues = issues.filter((i) => i.category === 'accessibility');
    const critical = a11yIssues.filter((i) => i.severity === 'critical').length;
    const high = a11yIssues.filter((i) => i.severity === 'high').length;
    const medium = a11yIssues.filter((i) => i.severity === 'medium').length;

    score -= critical * 25;
    score -= high * 15;
    score -= medium * 8;

    // Bonificar por buenas prácticas
    if (metrics.accessibility.semanticHTML) score += 5;
    if (metrics.accessibility.headingStructure) score += 5;
    if (metrics.accessibility.ariaLabels > 10) score += 5;
    if (metrics.accessibility.altTexts > 5) score += 5;
    if (metrics.accessibility.formLabels > 3) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determina el scope del análisis
   */
  private determineScope(targetPath: string): 'component' | 'page' | 'module' {
    if (targetPath.includes('components/')) return 'component';
    if (targetPath.includes('app/') || targetPath.includes('pages/')) return 'page';
    return 'module';
  }
}
