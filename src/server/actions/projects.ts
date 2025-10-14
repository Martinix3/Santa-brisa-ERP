"use server";

import { getFirestore } from 'firebase-admin/firestore';
import type { Project, ProjectStatus } from '@/domain/ssot';

const db = getFirestore();

/**
 * Obtener proyectos donde el usuario es miembro del equipo
 */
export async function listUserProjects(userId: string) {
  try {
    const snapshot = await db.collection('projects')
      .where('teamMemberIds', 'array-contains', userId)
      .where('status', 'in', ['ACTIVE', 'ON_HOLD'])
      .orderBy('createdAt', 'desc')
      .get();

    const projects: Project[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    return { success: true, data: projects };
  } catch (error) {
    console.error('[listUserProjects] Error:', error);
    return { success: false, error: 'Error al cargar proyectos', data: [] };
  }
}

/**
 * Obtener todos los proyectos activos (para managers/admins)
 */
export async function listAllProjects() {
  try {
    const snapshot = await db.collection('projects')
      .where('status', 'in', ['ACTIVE', 'ON_HOLD'])
      .orderBy('createdAt', 'desc')
      .get();

    const projects: Project[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    return { success: true, data: projects };
  } catch (error) {
    console.error('[listAllProjects] Error:', error);
    return { success: false, error: 'Error al cargar proyectos', data: [] };
  }
}

/**
 * Calcular progreso de un proyecto basado en sus tareas
 */
export async function calculateProjectProgress(projectId: string) {
  try {
    const tasksSnapshot = await db.collection('tasks')
      .where('projectId', '==', projectId)
      .get();

    if (tasksSnapshot.empty) {
      return { success: true, progress: 0 };
    }

    const tasks = tasksSnapshot.docs.map(doc => doc.data());
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const progress = Math.round((completedTasks / tasks.length) * 100);

    return { success: true, progress };
  } catch (error) {
    console.error('[calculateProjectProgress] Error:', error);
    return { success: false, progress: 0 };
  }
}

/**
 * Obtener KPIs de proyectos (Fase 2)
 * - Proyectos activos
 * - On-time % (con deadline y actualizados)
 * - Budget variance %
 * - Progreso medio ponderado
 */
export async function getProjectsKPIs() {
  try {
    const now = new Date();
    
    // Obtener todos los proyectos activos
    const projectsSnapshot = await db.collection('projects')
      .where('status', 'in', ['PLANNING', 'ACTIVE', 'ON_HOLD', 'REVIEW'])
      .get();

    if (projectsSnapshot.empty) {
      return {
        success: true,
        data: {
          activeCount: 0,
          onTimePercentage: 0,
          budgetVariance: 0,
          avgProgress: 0
        }
      };
    }

    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // 1. Proyectos activos
    const activeCount = projects.length;

    // 2. On-time % - proyectos con deadline y lastProgressUpdate <= deadline
    const projectsWithDeadline = projects.filter(p => p.deadline);
    let onTimeCount = 0;
    
    if (projectsWithDeadline.length > 0) {
      onTimeCount = projectsWithDeadline.filter(p => {
        if (!p.lastProgressUpdate || !p.deadline) return false;
        const lastUpdate = new Date(p.lastProgressUpdate);
        const deadline = new Date(p.deadline);
        return lastUpdate <= deadline;
      }).length;
    }
    
    const onTimePercentage = projectsWithDeadline.length > 0
      ? Math.round((onTimeCount / projectsWithDeadline.length) * 100)
      : 0;

    // 3. Budget variance % - (actualCost - budget) / budget
    const projectsWithBudget = projects.filter(p => p.budget && p.budget > 0);
    let totalVariance = 0;
    
    if (projectsWithBudget.length > 0) {
      totalVariance = projectsWithBudget.reduce((sum, p) => {
        const actual = p.actualCost || 0;
        const budget = p.budget || 1;
        const variance = ((actual - budget) / budget) * 100;
        return sum + variance;
      }, 0);
    }
    
    const budgetVariance = projectsWithBudget.length > 0
      ? Math.round(totalVariance / projectsWithBudget.length)
      : 0;

    // 4. Progreso medio ponderado por estimatedHours o budget
    let totalWeightedProgress = 0;
    let totalWeight = 0;

    for (const project of projects) {
      // Obtener progreso del proyecto
      const progressResult = await calculateProjectProgress(project.id);
      const progress = progressResult.progress || 0;
      
      // Usar estimatedHours como peso, o budget, o 1 por defecto
      const weight = project.estimatedHours || project.budget || 1;
      
      totalWeightedProgress += progress * weight;
      totalWeight += weight;
    }

    const avgProgress = totalWeight > 0
      ? Math.round(totalWeightedProgress / totalWeight)
      : 0;

    return {
      success: true,
      data: {
        activeCount,
        onTimePercentage,
        budgetVariance,
        avgProgress
      }
    };

  } catch (error) {
    console.error('[getProjectsKPIs] Error:', error);
    return {
      success: false,
      error: 'Error al calcular KPIs',
      data: {
        activeCount: 0,
        onTimePercentage: 0,
        budgetVariance: 0,
        avgProgress: 0
      }
    };
  }
}

/**
 * Obtener lista de proyectos con filtros (Fase 2)
 */
export async function listProjects(filters?: {
  department?: string;
  status?: string;
}) {
  try {
    let query = db.collection('projects').orderBy('createdAt', 'desc');

    // Aplicar filtros si existen
    if (filters?.department) {
      query = query.where('department', '==', filters.department) as any;
    }
    
    if (filters?.status) {
      query = query.where('status', '==', filters.status) as any;
    }

    const snapshot = await query.get();

    const projects: Project[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    return { ok: true, data: projects };
  } catch (error) {
    console.error('[listProjects] Error:', error);
    return { ok: false, error: 'Error al cargar proyectos', data: [] };
  }
}

/**
 * Obtener progreso de un proyecto (wrapper compatible)
 */
export async function getProjectProgress(projectId: string) {
  const result = await calculateProjectProgress(projectId);
  return { ok: result.success, data: { progress: result.progress } };
}

/**
 * Actualizar status de un proyecto (Fase 2 - Kanban)
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus
) {
  try {
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Proyecto no encontrado'
      };
    }

    // Actualizar status y timestamp
    await projectRef.update({
      status: newStatus,
      statusChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastProgressUpdate: new Date().toISOString()
    });

    return {
      success: true,
      message: `Estado actualizado a ${newStatus}`
    };

  } catch (error) {
    console.error('[updateProjectStatus] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
