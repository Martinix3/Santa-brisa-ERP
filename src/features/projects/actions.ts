"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { adminDb as db } from "@/server/firebase";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateProjectIdeaSchema,
  ConvertIdeaToTaskSchema,
} from "@/domain/zod/project";
import { Department } from "@/domain/ssot";

const nowISO = () => new Date().toISOString();

// ==================== PROYECTOS ====================

export async function listProjects(filters?: {
  department?: Department;
  status?: string;
  teamMemberId?: string;
}) {
  try {
    let query = db.collection("projects").orderBy("createdAt", "desc");

    if (filters?.department) {
      query = query.where("department", "==", filters.department) as any;
    }
    if (filters?.status) {
      query = query.where("status", "==", filters.status) as any;
    }
    if (filters?.teamMemberId) {
      query = query.where("teamMemberIds", "array-contains", filters.teamMemberId) as any;
    }

    const snap = await query.limit(100).get();
    return { ok: true, data: snap.docs.map((d: any) => d.data()) };
  } catch (error: any) {
    console.error("[listProjects] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function getProject(projectId: string) {
  try {
    const doc = await db.collection("projects").doc(projectId).get();
    if (!doc.exists) {
      return { ok: false, error: "Proyecto no encontrado" };
    }
    return { ok: true, data: doc.data() };
  } catch (error: any) {
    console.error("[getProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function createProject(data: any) {
  try {
    const parsed = CreateProjectSchema.parse(data);
    const ref = db.collection("projects").doc();

    const payload = {
      ...parsed,
      id: ref.id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await ref.set(payload);
    return { ok: true, id: ref.id, data: payload };
  } catch (error: any) {
    console.error("[createProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function updateProject(projectId: string, data: any) {
  try {
    const parsed = UpdateProjectSchema.parse({ ...data, id: projectId });
    const ref = db.collection("projects").doc(projectId);

    const doc = await ref.get();
    if (!doc.exists) {
      return { ok: false, error: "Proyecto no encontrado" };
    }

    const payload = {
      ...parsed,
      updatedAt: nowISO(),
    };

    await ref.update(payload);
    return { ok: true, data: payload };
  } catch (error: any) {
    console.error("[updateProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function deleteProject(projectId: string) {
  try {
    // 1. Eliminar todas las ideas del proyecto
    const ideasSnap = await db
      .collection("projectIdeas")
      .where("projectId", "==", projectId)
      .get();

    const batch = db.batch();
    ideasSnap.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    // 2. Eliminar el proyecto
    batch.delete(db.collection("projects").doc(projectId));

    await batch.commit();
    return { ok: true };
  } catch (error: any) {
    console.error("[deleteProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

// ==================== PROGRESO DEL PROYECTO ====================

export async function getProjectProgress(projectId: string) {
  try {
    const tasksSnap = await db
      .collection("tasks")
      .where("projectId", "==", projectId)
      .get();

    const tasks = tasksSnap.docs.map((d: any) => d.data());
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "DONE").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ok: true,
      data: {
        total,
        completed,
        progress,
        inProgress: tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
        blocked: tasks.filter((t: any) => t.status === "BLOCKED").length,
      },
    };
  } catch (error: any) {
    console.error("[getProjectProgress] Error:", error);
    return { ok: false, error: error.message };
  }
}

// ==================== IDEAS ====================

export async function listProjectIdeas(projectId: string) {
  try {
    console.log("[listProjectIdeas] Loading ideas for project:", projectId);
    const snap = await db
      .collection("projectIdeas")
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "asc")
      .get();

    const ideas = snap.docs.map((d: any) => d.data());
    console.log("[listProjectIdeas] Found", ideas.length, "ideas");
    return { ok: true, data: ideas };
  } catch (error: any) {
    console.error("[listProjectIdeas] Error:", error);
    return { ok: false, error: error.message, data: [] };
  }
}

export async function listFreeIdeas() {
  try {
    console.log("[listFreeIdeas] Loading free ideas...");
    // Query sin orderBy para evitar necesidad de índice compuesto
    const snap = await db
      .collection("projectIdeas")
      .where("projectId", "==", null)
      .limit(50)
      .get();

    const ideas = snap.docs.map((d: any) => d.data());
    // Ordenar en memoria
    ideas.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    console.log("[listFreeIdeas] Found", ideas.length, "free ideas");
    return { ok: true, data: ideas.slice(0, 20) };
  } catch (error: any) {
    console.error("[listFreeIdeas] Error:", error);
    return { ok: false, error: error.message, data: [] };
  }
}

export async function assignIdeaToProject(ideaId: string, projectId: string) {
  try {
    await db.collection("projectIdeas").doc(ideaId).update({
      projectId,
      updatedAt: nowISO(),
    });

    return { ok: true };
  } catch (error: any) {
    console.error("[assignIdeaToProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function createIdea(data: any) {
  try {
    const parsed = CreateProjectIdeaSchema.parse(data);
    const ref = db.collection("projectIdeas").doc();

    const payload = {
      ...parsed,
      id: ref.id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await ref.set(payload);
    return { ok: true, id: ref.id, data: payload };
  } catch (error: any) {
    console.error("[createIdea] Error:", error);
    return { ok: false, error: error.message };
  }
}

export async function deleteIdea(ideaId: string) {
  try {
    await db.collection("projectIdeas").doc(ideaId).delete();
    return { ok: true };
  } catch (error: any) {
    console.error("[deleteIdea] Error:", error);
    return { ok: false, error: error.message };
  }
}

// ==================== CONVERSIÓN IDEA → PROYECTO ====================

export async function convertIdeaToProject(data: {
  ideaId: string;
  name?: string;
  department?: Department;
  ownerId: string;
}) {
  try {
    const { ideaId, name, department, ownerId } = data;

    // 1. Obtener la idea
    const ideaDoc = await db.collection("projectIdeas").doc(ideaId).get();
    if (!ideaDoc.exists) {
      return { ok: false, error: "Idea no encontrada" };
    }

    const idea = ideaDoc.data();
    if (!idea) {
      return { ok: false, error: "Idea inválida" };
    }

    // 2. Obtener el proyecto original para heredar departamento
    const originalProjectDoc = await db.collection("projects").doc(idea.projectId).get();
    const originalProject = originalProjectDoc.data();

    // 3. Crear nuevo proyecto
    const projectRef = db.collection("projects").doc();
    const projectPayload = {
      id: projectRef.id,
      title: name || idea.text,
      department: department || originalProject?.department || "MARKETING",
      status: "ACTIVE" as const,
      teamMemberIds: [ownerId],
      createdById: ownerId,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await projectRef.set(projectPayload);

    // 4. Marcar idea como convertida a proyecto
    await db.collection("projectIdeas").doc(ideaId).update({
      convertedToProjectId: projectRef.id,
      updatedAt: nowISO(),
    });

    return { ok: true, projectId: projectRef.id, data: projectPayload };
  } catch (error: any) {
    console.error("[convertIdeaToProject] Error:", error);
    return { ok: false, error: error.message };
  }
}

// ==================== CONVERSIÓN IDEA → TAREA ====================

export async function convertIdeaToTask(data: any) {
  try {
    const parsed = ConvertIdeaToTaskSchema.parse(data);
    const { ideaId, taskData } = parsed;

    // 1. Obtener la idea
    const ideaDoc = await db.collection("projectIdeas").doc(ideaId).get();
    if (!ideaDoc.exists) {
      return { ok: false, error: "Idea no encontrada" };
    }

    const idea = ideaDoc.data();
    if (!idea) {
      return { ok: false, error: "Idea inválida" };
    }

    // 2. Obtener el proyecto para derivar el departamento
    const projectDoc = await db.collection("projects").doc(idea.projectId).get();
    const project = projectDoc.data();

    // 3. Crear la tarea
    const taskRef = db.collection("tasks").doc();
    const taskPayload = {
      id: taskRef.id,
      kind: "GENERICA" as const,
      title: taskData.title || idea.text,
      status: "BACKLOG" as const,
      department: taskData.department || project?.department || "MARKETING",
      source: "MANUAL" as const,
      projectId: idea.projectId,
      assignedToId: taskData.assignedToId,
      createdById: idea.createdById,
      dueAt: taskData.dueAt,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await taskRef.set(taskPayload);

    // 4. Marcar idea como convertida
    await db.collection("projectIdeas").doc(ideaId).update({
      convertedToTaskId: taskRef.id,
      updatedAt: nowISO(),
    });

    return { ok: true, taskId: taskRef.id, data: taskPayload };
  } catch (error: any) {
    console.error("[convertIdeaToTask] Error:", error);
    return { ok: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS ====================

export async function getProjectStats() {
  try {
    const projectsSnap = await db.collection("projects").get();
    const projects = projectsSnap.docs.map((d: any) => d.data());

    const active = projects.filter((p: any) => p.status === "ACTIVE").length;
    const completed = projects.filter((p: any) => p.status === "COMPLETED").length;
    const onHold = projects.filter((p: any) => p.status === "ON_HOLD").length;

    return {
      ok: true,
      data: {
        total: projects.length,
        active,
        completed,
        onHold,
        byDepartment: projects.reduce((acc: any, p: any) => {
          acc[p.department] = (acc[p.department] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  } catch (error: any) {
    console.error("[getProjectStats] Error:", error);
    return { ok: false, error: error.message };
  }
}
