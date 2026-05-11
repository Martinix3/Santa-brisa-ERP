/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/server/gemini/analyzers/workitem-schemas.ts
// ============================================================================
// WORKITEM ANALYZER SCHEMAS - Validación Zod para respuestas de Gemini
// ============================================================================

import { z } from 'zod';

// ============================================================================
// SCHEMAS DE RESPUESTA
// ============================================================================

export const DuplicateSchema = z.object({
  taskId: z.string(),
  similarity: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const DetectDuplicatesOut = z.object({
  duplicates: z.array(DuplicateSchema).max(20).default([]),
  shouldMerge: z.boolean().default(false),
});

export const SuggestProjectGroupingOut = z.object({
  shouldGroup: z.boolean(),
  suggestedProject: z.object({
    title: z.string(),
    description: z.string().default(''),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']),
    taskIds: z.array(z.string()).min(1),
  }).optional(),
  reason: z.string().default(''),
});

export const DailyFocusOut = z.object({
  topTasks: z.array(z.object({
    taskId: z.string(),
    reason: z.string(),
    urgency: z.number().min(0).max(1),
  })).max(5).default([]),
  quickWins: z.array(z.object({
    taskId: z.string(),
    estimatedMins: z.number().int().positive().max(60),
  })).max(3).default([]),
  blockers: z.array(z.object({
    taskId: z.string(),
    blocker: z.string(),
  })).default([]),
});

export const ProjectRisksOut = z.object({
  riskScore: z.number().min(0).max(1).default(0),
  risks: z.array(z.object({
    type: z.enum(['SCHEDULE', 'RESOURCE', 'DEPENDENCY', 'QUALITY']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    mitigation: z.string().optional(),
  })).default([]),
  healthPrediction: z.enum(['GREEN', 'AMBER', 'RED']).default('GREEN'),
});

export const NextStepsOut = z.object({
  nextSteps: z.array(z.object({
    action: z.string(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']),
    estimatedMins: z.number().int().positive().max(240).optional(),
  })).default([]),
  blockers: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
});

export const ConvertToProjectOut = z.object({
  shouldConvert: z.boolean(),
  confidence: z.number().min(0).max(1).default(0),
  suggestedTitle: z.string().optional(),
  suggestedDescription: z.string().optional(),
  reason: z.string().default(''),
});

export const ProjectBriefOut = z.object({
  summary: z.string().default(''),
  keyMilestones: z.array(z.object({
    title: z.string(),
    date: z.string(), // ISO
    status: z.string(),
  })).default([]),
  teamAssignments: z.array(z.object({
    userId: z.string(),
    taskCount: z.number().int().nonnegative(),
    workload: z.string(),
  })).default([]),
  next7Days: z.array(z.object({
    date: z.string(),
    tasks: z.array(z.string()),
  })).default([]),
});

export const SuggestPriorityOut = z.object({
  suggestedPriority: z.enum(['P0', 'P1', 'P2', 'P3']),
  confidence: z.number().min(0).max(1).default(0.5),
  reason: z.string().default(''),
});

// ============================================================================
// TYPES
// ============================================================================

export type DetectDuplicatesOutput = z.infer<typeof DetectDuplicatesOut>;
export type SuggestProjectGroupingOutput = z.infer<typeof SuggestProjectGroupingOut>;
export type DailyFocusOutput = z.infer<typeof DailyFocusOut>;
export type ProjectRisksOutput = z.infer<typeof ProjectRisksOut>;
export type NextStepsOutput = z.infer<typeof NextStepsOut>;
export type ConvertToProjectOutput = z.infer<typeof ConvertToProjectOut>;
export type ProjectBriefOutput = z.infer<typeof ProjectBriefOut>;
export type SuggestPriorityOutput = z.infer<typeof SuggestPriorityOut>;
