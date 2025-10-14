import { z } from "zod";

export const TaskSubtaskSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string().min(1, "El título es requerido"),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateSubtaskSchema = TaskSubtaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  completedBy: true,
});

export const UpdateSubtaskSchema = TaskSubtaskSchema.partial().required({ id: true });

export type TaskSubtask = z.output<typeof TaskSubtaskSchema>;
export type CreateSubtaskInput = z.input<typeof CreateSubtaskSchema>;
export type UpdateSubtaskInput = z.input<typeof UpdateSubtaskSchema>;
