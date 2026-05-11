/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { z } from "zod";

export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const SlaBucketEnum = z.enum(["OVERDUE", "TODAY", "WEEK", "LATER", "NONE"]);
export const TaskKindEnum = z.enum(["GENERICA", "VISITA", "COBRO", "PEDIDO", "MARKETING", "INTERACTION", "ORDER_PREP", "POS", "EVENT", "ADMIN"]);
export const TaskOutcomeEnum = z.enum(["NEXT_VISIT", "ORDER_PLACED", "COMPLETED", "CANCELLED"]);
export const TaskStatusEnum = z.enum(["BACKLOG","DRAFT","IN_PROGRESS","BLOCKED","DONE","CANCELLED","PROGRAMADA","SNOOZED"]);

// Schema para Recurrence (tareas recurrentes del pipeline)
export const RecurrenceSchema = z.object({
  freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interval: z.number().min(1).optional(),
  byWeekday: z.array(z.number().min(0).max(6)).optional(), // 0=Monday, 6=Sunday
});

export const TaskSchema = z.object({
  id: z.string(),
  kind: TaskKindEnum.default("GENERICA"),
  title: z.string().min(2),
  desc: z.string().optional(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum.optional(),
  isPriority: z.boolean().optional(),
  priorityRank: z.number().min(0).max(3).optional(),
  progress: z.number().min(0).max(100).optional(),
  department: z.enum(["PERSONAL","VENTAS","MARKETING","PRODUCCION","ALMACEN","FINANZAS","CALIDAD","OPS"]),
  source: z.enum(["MANUAL","AUTO_RULE","EVENT","CAMPAIGN","INTEGRATION"]),
  dueAt: z.string().optional(),
  slaBucket: SlaBucketEnum.optional(),
  assignedToId: z.string(),
  createdById: z.string(),
  accountId: z.string().optional(),
  orderId: z.string().optional(),
  eventId: z.string().optional(),
  campaignId: z.string().optional(),
  projectId: z.string().optional(),
  distributorId: z.string().optional(),      // Del pipeline
  snoozeUntil: z.string().optional(),        // Del pipeline
  recurrence: RecurrenceSchema.optional(),   // Del pipeline
  // Campos de cierre
  outcome: TaskOutcomeEnum.optional(),
  nextEventId: z.string().optional(),
  closedAt: z.string().optional(),
  closedById: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskInput = z.input<typeof TaskSchema>;
export type Task = z.output<typeof TaskSchema>;

/**
 * Calcula el ranking de prioridad basado en priority level y pin
 * URGENT → 2, HIGH → 1, MEDIUM/LOW → 0
 * +1 si isPriority=true (cap at 3)
 */
export function computePriorityRank(
  priority?: z.infer<typeof TaskPriorityEnum>,
  isPriority?: boolean
): number {
  const base = priority === "URGENT" ? 2 : priority === "HIGH" ? 1 : 0;
  return Math.min(3, base + (isPriority ? 1 : 0));
}

/**
 * Calcula el bucket de SLA basado en la fecha de vencimiento
 */
export function computeSlaBucket(
  dueAt?: string,
  now = new Date()
): z.infer<typeof SlaBucketEnum> {
  if (!dueAt) return "NONE";
  
  // Normalizar a 00:00 local para comparar solo fechas
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(dueAt);
  const diffMs = dueDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays < 0) return "OVERDUE";
  if (diffDays === 0) return "TODAY";
  if (diffDays <= 7) return "WEEK";
  return "LATER";
}

// Schema para creación (sin id, createdAt, updatedAt)
export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTaskInput = z.input<typeof CreateTaskSchema>;

// Schema para actualización (todos los campos opcionales excepto id)
export const UpdateTaskSchema = TaskSchema.partial().required({ id: true });

export type UpdateTaskInput = z.input<typeof UpdateTaskSchema>;
