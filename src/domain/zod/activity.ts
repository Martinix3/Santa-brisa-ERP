/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { z } from "zod";

export const TaskActivityKindEnum = z.enum([
  "COMMENT",
  "STATUS_CHANGE",
  "ASSIGNMENT_CHANGE",
  "PRIORITY_CHANGE",
  "DUE_DATE_CHANGE",
  "SUBTASK_ADDED",
  "SUBTASK_COMPLETED",
  "CREATED",
]);

export const TaskActivitySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  kind: TaskActivityKindEnum,
  userId: z.string(),
  userName: z.string().optional(),
  comment: z.string().optional(),
  metadata: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      fieldName: z.string().optional(),
      subtaskTitle: z.string().optional(),
    })
    .optional(),
  createdAt: z.string(),
});

export const CreateActivitySchema = TaskActivitySchema.omit({
  id: true,
  createdAt: true,
});

export type TaskActivity = z.output<typeof TaskActivitySchema>;
export type CreateActivityInput = z.input<typeof CreateActivitySchema>;
