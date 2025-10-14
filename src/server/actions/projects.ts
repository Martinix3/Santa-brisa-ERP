"use server";

import { getFirestore } from 'firebase-admin/firestore';
import type { Project } from '@/domain/ssot';

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
