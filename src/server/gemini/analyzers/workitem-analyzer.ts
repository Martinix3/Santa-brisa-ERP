/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/server/gemini/analyzers/workitem-analyzer.ts
// ============================================================================
// WORKITEM ANALYZER - Gemini Intelligence para Tasks y Projects
// ============================================================================
// Versión robusta con:
// - Validación Zod estricta
// - Retry automático
// - Redacción de PII
// - Persistencia idempotente
// - Límites de contexto
// ============================================================================

import { getGeminiClient } from '../gemini-client';
import type { TaskNew, Project } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebase';
import { safeGenerateJSON, toIsoShort, redactPII } from '@/lib/ai/safe-generate-json';
import {
  DetectDuplicatesOut,
  SuggestProjectGroupingOut,
  DailyFocusOut,
  ProjectRisksOut,
  NextStepsOut,
  ConvertToProjectOut,
  ProjectBriefOut,
  SuggestPriorityOut,
  type DetectDuplicatesOutput,
  type SuggestProjectGroupingOutput,
  type DailyFocusOutput,
  type ProjectRisksOutput,
  type NextStepsOutput,
  type ConvertToProjectOutput,
  type ProjectBriefOutput,
  type SuggestPriorityOutput,
} from './workitem-schemas';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================================
// WORKITEM ANALYZER CLASS
// ============================================================================

export class WorkItemAnalyzer {
  private geminiClient = getGeminiClient();
  
  /**
   * Detecta tareas duplicadas o similares
   */
  async detectDuplicates(
    task: TaskNew,
    existingTasks: TaskNew[]
  ): Promise<DetectDuplicatesOutput> {
    try {
      const items = existingTasks.slice(0, 20).map(t => ({
        id: t.id,
        title: t.title,
        description: redactPII(t.desc),
        status: t.status,
      }));

      const prompt = `
Analiza si la TAREA es duplicada de alguna del LISTADO.
Responde SOLO JSON válido (sin markdown).

TAREA:
- Título: ${task.title}
- Descripción: ${redactPII(task.desc) || 'N/A'}

LISTADO:
${items.map(i => `- ${i.id} | ${i.title} | ${i.status} | ${i.description || 'N/A'}`).join('\n')}

Formato JSON exacto:
{"duplicates":[{"taskId":"id","similarity":0.85,"reason":"explicación"}],"shouldMerge":false}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        DetectDuplicatesOut,
        { level: 'simple', temperature: 0.2, maxOutputTokens: 512 }
      );

      return {
        duplicates: result.duplicates ?? [],
        shouldMerge: result.shouldMerge ?? false,
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] detectDuplicates error:', error);
      return { duplicates: [], shouldMerge: false };
    }
  }

  /**
   * Sugiere agrupación de tareas en proyecto
   */
  async suggestProjectGrouping(tasks: TaskNew[]): Promise<SuggestProjectGroupingOutput> {
    try {
      if (tasks.length < 3) {
        return SuggestProjectGroupingOut.parse({
          shouldGroup: false,
          reason: 'Menos de 3 tareas relacionadas',
        });
      }

      const trimmed = tasks.slice(0, 20).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 'MEDIUM',
        dueAt: toIsoShort(t.dueAt),
        accountId: t.accountId || 'N/A',
        description: redactPII(t.desc),
      }));

      const prompt = `
Decide si agrupar en PROYECTO. SOLO JSON válido (sin markdown).

TAREAS:
${trimmed.map(t => `- ${t.id} | ${t.title} | ${t.priority} | vence:${t.dueAt} | acct:${t.accountId} | ${t.description || 'N/A'}`).join('\n')}

Formato JSON exacto:
{"shouldGroup":true,"suggestedProject":{"title":"título","description":"desc","priority":"P1","taskIds":["id1","id2"]},"reason":"explicación"}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        SuggestProjectGroupingOut,
        { level: 'medium', temperature: 0.2, maxOutputTokens: 768 }
      );

      return {
        shouldGroup: result.shouldGroup ?? false,
        reason: result.reason ?? 'Sin razón especificada',
        suggestedProject: result.suggestedProject ? {
          ...result.suggestedProject,
          description: result.suggestedProject.description ?? '',
        } : undefined,
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] suggestProjectGrouping error:', error);
      return {
        shouldGroup: false,
        reason: 'Error al analizar agrupación',
      };
    }
  }

  /**
   * Genera "Focus del Día" para un usuario
   */
  async generateDailyFocus(
    userId: string,
    tasks: TaskNew[],
    projects: Project[]
  ): Promise<DailyFocusOutput> {
    try {
      const userTasks = tasks.filter(t =>
        t.assignedToId === userId &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELLED'
      );

      if (userTasks.length === 0) {
        return DailyFocusOut.parse({});
      }

      const items = userTasks.slice(0, 30).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 'MEDIUM',
        dueAt: toIsoShort(t.dueAt),
        projectId: t.projectId ?? 'N/A',
      }));

      const projs = projects
        .filter(p => p.createdById === userId || p.teamMemberIds.includes(userId))
        .slice(0, 10)
        .map(p => `- ${p.title} (${p.status})`);

      const prompt = `
Genera Focus del Día (TOP 5, 3 quick wins). SOLO JSON válido (sin markdown).

TAREAS:
${items.map(i => `- ${i.id} | ${i.title} | ${i.priority} | vence:${i.dueAt} | prj:${i.projectId}`).join('\n')}

PROYECTOS:
${projs.join('\n')}

Prioriza:
1) P0 vencidas/HOY; 2) Desbloquean otras; 3) Quick wins (<30m); 4) Proyectos RED/AMBER.

Formato JSON exacto:
{"topTasks":[{"taskId":"id","reason":"razón","urgency":0.9}],"quickWins":[{"taskId":"id","estimatedMins":15}],"blockers":[{"taskId":"id","blocker":"qué bloquea"}]}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        DailyFocusOut,
        { level: 'medium', temperature: 0.2, maxOutputTokens: 768 }
      );

      return {
        topTasks: result.topTasks ?? [],
        quickWins: result.quickWins ?? [],
        blockers: result.blockers ?? [],
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] generateDailyFocus error:', error);
      return { topTasks: [], quickWins: [], blockers: [] };
    }
  }

  /**
   * Analiza riesgos de un proyecto
   */
  async analyzeProjectRisks(
    project: Project,
    tasks: TaskNew[]
  ): Promise<ProjectRisksOutput> {
    try {
      const now = new Date();
      const overdueTasks = tasks.filter(t =>
        t.dueAt && new Date(t.dueAt) < now && t.status !== 'DONE'
      );
      const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
      const urgentTasks = tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');

      const prompt = `
Analiza riesgos del proyecto. SOLO JSON válido (sin markdown).

PROYECTO:
- Título: ${project.title}
- Estado: ${project.status}
- Prioridad: ${project.priority || 'MEDIUM'}
- Vencimiento: ${toIsoShort(project.deadline)}

MÉTRICAS:
- Total tareas: ${tasks.length}
- Completadas: ${tasks.filter(t => t.status === 'DONE').length}
- Vencidas: ${overdueTasks.length}
- Bloqueadas: ${blockedTasks.length}
- Urgentes/Altas: ${urgentTasks.length}

TAREAS CRÍTICAS:
${urgentTasks.slice(0, 5).map((t: TaskNew) => `- ${t.title} (${t.status}) - Vence: ${toIsoShort(t.dueAt)}`).join('\n')}

Formato JSON exacto:
{"riskScore":0.65,"risks":[{"type":"SCHEDULE","severity":"HIGH","description":"desc","mitigation":"acción"}],"healthPrediction":"AMBER"}
`;

      const response = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        ProjectRisksOut,
        { level: 'medium', temperature: 0.2, maxOutputTokens: 1024 }
      );

      // Persistencia idempotente (1 análisis/día por proyecto)
      const docId = `PROJECT_${project.id}_${new Date().toISOString().slice(0, 10)}`;
      await db.collection('geminiAnalysis').doc(docId).set({
        kind: 'PROJECT',
        targetId: project.id,
        insights: (response.risks ?? []).map(r => ({
          type: 'RISK',
          text: r.description,
          weight: r.severity === 'CRITICAL' ? 1 : r.severity === 'HIGH' ? 0.75 : r.severity === 'MEDIUM' ? 0.5 : 0.25,
          actionable: !!r.mitigation,
        })),
        riskScore: response.riskScore,
        healthPrediction: response.healthPrediction,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        riskScore: response.riskScore ?? 0,
        risks: response.risks ?? [],
        healthPrediction: response.healthPrediction ?? 'GREEN',
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] analyzeProjectRisks error:', error);
      return { riskScore: 0, risks: [], healthPrediction: 'GREEN' };
    }
  }

  /**
   * Sugiere próximos pasos para una tarea
   */
  async suggestNextSteps(task: TaskNew): Promise<NextStepsOutput> {
    try {
      const prompt = `
Sugiere próximos pasos. SOLO JSON válido (sin markdown).

TAREA:
- Título: ${task.title}
- Descripción: ${redactPII(task.desc) || 'N/A'}
- Estado: ${task.status}
- Prioridad: ${task.priority || 'MEDIUM'}

CONTEXTO:
- Proyecto: ${task.projectId || 'Sin proyecto'}
- Cuenta: ${task.accountId || 'Sin cuenta'}

Formato JSON exacto:
{"nextSteps":[{"action":"acción","priority":"P1","estimatedMins":30}],"blockers":["bloqueador"],"dependencies":["dependencia"]}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        NextStepsOut,
        { level: 'simple', temperature: 0.2, maxOutputTokens: 512 }
      );

      return {
        nextSteps: result.nextSteps ?? [],
        blockers: result.blockers ?? [],
        dependencies: result.dependencies ?? [],
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] suggestNextSteps error:', error);
      return { nextSteps: [], blockers: [], dependencies: [] };
    }
  }

  /**
   * Analiza si múltiples tareas deberían convertirse en proyecto
   */
  async analyzeTasksForProjectConversion(tasks: TaskNew[]): Promise<ConvertToProjectOutput> {
    try {
      if (tasks.length < 3) {
        return ConvertToProjectOut.parse({
          shouldConvert: false,
          confidence: 0,
          reason: 'Menos de 3 tareas relacionadas',
        });
      }

      const commonAccount = tasks.every(t => t.accountId === tasks[0].accountId);
      const commonCampaign = tasks.every(t => t.campaignId === tasks[0].campaignId);
      const hasHighPriority = tasks.some(t => t.priority === 'URGENT' || t.priority === 'HIGH');

      const trimmed = tasks.slice(0, 15).map((t, i) => ({
        idx: i + 1,
        id: t.id,
        title: t.title,
        priority: t.priority || 'MEDIUM',
        status: t.status,
        dueAt: toIsoShort(t.dueAt),
        description: redactPII(t.desc),
      }));

      const prompt = `
Analiza si convertir en PROYECTO. SOLO JSON válido (sin markdown).

TAREAS:
${trimmed.map(t => `${t.idx}. ${t.title} | ${t.priority} | ${t.status} | vence:${t.dueAt} | ${t.description || 'N/A'}`).join('\n')}

PATRONES:
- Misma cuenta: ${commonAccount ? 'Sí' : 'No'}
- Misma campaña: ${commonCampaign ? 'Sí' : 'No'}
- Alta prioridad: ${hasHighPriority ? 'Sí' : 'No'}

Formato JSON exacto:
{"shouldConvert":true,"confidence":0.85,"suggestedTitle":"título","suggestedDescription":"desc","reason":"por qué"}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        ConvertToProjectOut,
        { level: 'medium', temperature: 0.2, maxOutputTokens: 512 }
      );

      return {
        shouldConvert: result.shouldConvert ?? false,
        confidence: result.confidence ?? 0,
        reason: result.reason ?? 'Sin razón especificada',
        suggestedTitle: result.suggestedTitle,
        suggestedDescription: result.suggestedDescription,
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] analyzeTasksForProjectConversion error:', error);
      return {
        shouldConvert: false,
        confidence: 0,
        reason: 'Error al analizar',
      };
    }
  }

  /**
   * Genera resumen ejecutivo de un proyecto
   */
  async generateProjectBrief(
    project: Project,
    tasks: TaskNew[]
  ): Promise<ProjectBriefOutput> {
    try {
      const trimmed = tasks.slice(0, 20).map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority || 'MEDIUM',
        assignedTo: t.assignedToId || 'Sin asignar',
        dueAt: toIsoShort(t.dueAt),
      }));

      const prompt = `
Genera resumen ejecutivo. SOLO JSON válido (sin markdown).

PROYECTO:
- Título: ${project.title}
- Descripción: ${redactPII(project.description) || 'N/A'}
- Estado: ${project.status}
- Equipo: ${project.teamMemberIds.length} personas

TAREAS (${tasks.length} total):
${trimmed.map(t => `- ${t.title} (${t.status}) - ${t.priority} - ${t.assignedTo} - Vence: ${t.dueAt}`).join('\n')}

Formato JSON exacto:
{"summary":"resumen 2-3 frases","keyMilestones":[{"title":"hito","date":"2025-11-15","status":"PENDING"}],"teamAssignments":[{"userId":"user123","taskCount":5,"workload":"NORMAL"}],"next7Days":[{"date":"2025-10-28","tasks":["tarea1"]}]}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        ProjectBriefOut,
        { level: 'medium', temperature: 0.2, maxOutputTokens: 1024 }
      );

      return {
        summary: result.summary ?? 'Sin resumen disponible',
        keyMilestones: result.keyMilestones ?? [],
        teamAssignments: result.teamAssignments ?? [],
        next7Days: result.next7Days ?? [],
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] generateProjectBrief error:', error);
      return {
        summary: 'Error al generar resumen',
        keyMilestones: [],
        teamAssignments: [],
        next7Days: [],
      };
    }
  }

  /**
   * Sugiere prioridad óptima para una tarea
   */
  async suggestTaskPriority(task: TaskNew): Promise<SuggestPriorityOutput> {
    try {
      const prompt = `
Sugiere prioridad óptima. SOLO JSON válido (sin markdown).

TAREA:
- Título: ${task.title}
- Descripción: ${redactPII(task.desc) || 'N/A'}
- Prioridad actual: ${task.priority || 'MEDIUM'}
- Vencimiento: ${toIsoShort(task.dueAt)}
- Proyecto: ${task.projectId ? 'Sí' : 'No'}
- Cuenta: ${task.accountId ? 'Sí' : 'No'}

Formato JSON exacto:
{"suggestedPriority":"P1","confidence":0.8,"reason":"explicación breve"}
`;

      const result = await safeGenerateJSON(
        (p, opts) => this.geminiClient.generate(p, opts || {}),
        prompt,
        SuggestPriorityOut,
        { level: 'simple', temperature: 0.2, maxOutputTokens: 256 }
      );

      const fallbackPriority = (() => {
        const p = task.priority;
        if (p === 'URGENT') return 'P0';
        if (p === 'HIGH') return 'P1';
        if (p === 'MEDIUM') return 'P2';
        if (p === 'LOW') return 'P3';
        return 'P2';
      })();

      return {
        suggestedPriority: result.suggestedPriority ?? fallbackPriority,
        confidence: result.confidence ?? 0,
        reason: result.reason ?? 'Sin razón especificada',
      };

    } catch (error) {
      console.error('[WorkItemAnalyzer] suggestTaskPriority error:', error);
      const fallbackPriority = (() => {
        const p = task.priority;
        if (p === 'URGENT') return 'P0';
        if (p === 'HIGH') return 'P1';
        if (p === 'MEDIUM') return 'P2';
        if (p === 'LOW') return 'P3';
        return 'P2';
      })();
      
      return {
        suggestedPriority: fallbackPriority,
        confidence: 0,
        reason: 'Error al analizar prioridad',
      };
    }
  }
}

// Singleton instance
export const workItemAnalyzer = new WorkItemAnalyzer();
