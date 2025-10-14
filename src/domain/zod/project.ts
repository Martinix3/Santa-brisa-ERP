// src/domain/zod/project.ts
import { z } from "zod";

// Proyecto
export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(2, "El título debe tener al menos 2 caracteres"),
  department: z.enum([
    "PERSONAL",
    "VENTAS",
    "MARKETING",
    "PRODUCCION",
    "ALMACEN",
    "CALIDAD",
    "FINANZAS",
    "OPS",
  ]),
  description: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
  teamMemberIds: z.array(z.string()),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectInput = z.input<typeof ProjectSchema>;
export type ProjectOutput = z.output<typeof ProjectSchema>;

// Idea de proyecto
export const ProjectIdeaSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable().optional(), // null = idea libre/suelta
  text: z.string().min(1, "El texto de la idea no puede estar vacío"),
  createdById: z.string(),
  convertedToTaskId: z.string().optional(),
  convertedToProjectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectIdeaInput = z.input<typeof ProjectIdeaSchema>;
export type ProjectIdeaOutput = z.output<typeof ProjectIdeaSchema>;

// Payload para crear proyecto
export const CreateProjectSchema = ProjectSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    // Si hay endAt, debe ser posterior a startAt
    if (data.startAt && data.endAt) {
      return new Date(data.endAt) >= new Date(data.startAt);
    }
    return true;
  },
  {
    message: "La fecha de fin debe ser posterior a la fecha de inicio",
    path: ["endAt"],
  }
);

// Payload para actualizar proyecto
export const UpdateProjectSchema = ProjectSchema.partial().required({ id: true });

// Payload para crear idea
export const CreateProjectIdeaSchema = ProjectIdeaSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  convertedToTaskId: true,
});

// Payload para convertir idea a tarea
export const ConvertIdeaToTaskSchema = z.object({
  ideaId: z.string(),
  taskData: z.object({
    title: z.string().optional(),
    dueAt: z.string().optional(),
    assignedToId: z.string(),
    department: z
      .enum([
        "PERSONAL",
        "VENTAS",
        "MARKETING",
        "PRODUCCION",
        "ALMACEN",
        "CALIDAD",
        "FINANZAS",
        "OPS",
      ])
      .optional(),
  }),
});
