"use server";

import { getFirestore } from 'firebase-admin/firestore';
import type { Project } from '@/domain/ssot';

const db = getFirestore();

export type ProjectAlert = {
  projectId: string;
  projectTitle: string;
  type: 'OVERDUE' | 'BUDGET_OVERRUN' | 'RESOURCE_OVERLOAD' | 'NO_PROGRESS' | 'MILESTONE_MISSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: string;
  createdAt: string;
};

/**
 * Verificar alertas de un proyecto específico
 */
export async function checkProjectAlerts(projectId: string): Promise<ProjectAlert[]> {
  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return [];
    }

    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;
    const alerts: ProjectAlert[] = [];
    const now = new Date();

    // 1. Verificar OVERDUE
    if (project.deadline && project.status !== 'COMPLETED') {
      const deadline = new Date(project.deadline);
      if (now > deadline) {
        const daysOverdue = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          projectId: project.id,
          projectTitle: project.title,
          type: 'OVERDUE',
          severity: daysOverdue > 14 ? 'CRITICAL' : daysOverdue > 7 ? 'HIGH' : 'MEDIUM',
          message: `Proyecto vencido hace ${daysOverdue} días`,
          details: `Deadline: ${deadline.toLocaleDateString('es-ES')}`,
          createdAt: now.toISOString()
        });
      }
    }

    // 2. Verificar BUDGET_OVERRUN
    if (project.budget && project.actualCost) {
      const overrun = ((project.actualCost - project.budget) / project.budget) * 100;
      if (overrun > 10) {
        alerts.push({
          projectId: project.id,
          projectTitle: project.title,
          type: 'BUDGET_OVERRUN',
          severity: overrun > 30 ? 'CRITICAL' : overrun > 20 ? 'HIGH' : 'MEDIUM',
          message: `Sobrepresupuesto del ${overrun.toFixed(1)}%`,
          details: `Presupuesto: €${project.budget.toLocaleString()} | Real: €${project.actualCost.toLocaleString()}`,
          createdAt: now.toISOString()
        });
      }
    }

    // 3. Verificar RESOURCE_OVERLOAD
    if (project.resourceAllocation && project.resourceAllocation.length > 0) {
      const userHours = project.resourceAllocation.reduce((acc, alloc) => {
        acc[alloc.userId] = (acc[alloc.userId] || 0) + alloc.hoursAllocated;
        return acc;
      }, {} as Record<string, number>);

      const overloadedUsers = Object.entries(userHours).filter(([_, hours]) => hours > 40);
      
      if (overloadedUsers.length > 0) {
        alerts.push({
          projectId: project.id,
          projectTitle: project.title,
          type: 'RESOURCE_OVERLOAD',
          severity: overloadedUsers.length > 2 ? 'HIGH' : 'MEDIUM',
          message: `${overloadedUsers.length} persona(s) sobrecargada(s)`,
          details: `Usuarios con más de 40h/semana asignadas`,
          createdAt: now.toISOString()
        });
      }
    }

    // 4. Verificar NO_PROGRESS (no actualizado en 7+ días)
    if (project.lastProgressUpdate && project.status === 'ACTIVE') {
      const lastUpdate = new Date(project.lastProgressUpdate);
      const daysSinceUpdate = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate > 7) {
        alerts.push({
          projectId: project.id,
          projectTitle: project.title,
          type: 'NO_PROGRESS',
          severity: daysSinceUpdate > 14 ? 'HIGH' : 'MEDIUM',
          message: `Sin progreso reportado en ${daysSinceUpdate} días`,
          details: `Última actualización: ${lastUpdate.toLocaleDateString('es-ES')}`,
          createdAt: now.toISOString()
        });
      }
    }

    // 5. Verificar MILESTONE_MISSED
    if (project.milestones && project.milestones.length > 0) {
      const missedMilestones = project.milestones.filter(m => {
        if (m.done) return false;
        const milestoneDate = new Date(m.date);
        return now > milestoneDate;
      });

      if (missedMilestones.length > 0) {
        alerts.push({
          projectId: project.id,
          projectTitle: project.title,
          type: 'MILESTONE_MISSED',
          severity: missedMilestones.length > 2 ? 'HIGH' : 'MEDIUM',
          message: `${missedMilestones.length} milestone(s) no completado(s)`,
          details: `Milestones vencidos: ${missedMilestones.map(m => m.title).join(', ')}`,
          createdAt: now.toISOString()
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('[checkProjectAlerts] Error:', error);
    return [];
  }
}

/**
 * Verificar alertas de todos los proyectos activos
 */
export async function checkAllProjectsAlerts(): Promise<ProjectAlert[]> {
  try {
    const projectsSnapshot = await db.collection('projects')
      .where('status', 'in', ['PLANNING', 'ACTIVE', 'ON_HOLD', 'REVIEW'])
      .get();

    const allAlerts: ProjectAlert[] = [];

    for (const doc of projectsSnapshot.docs) {
      const projectAlerts = await checkProjectAlerts(doc.id);
      allAlerts.push(...projectAlerts);
    }

    // Ordenar por severidad
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return allAlerts;
  } catch (error) {
    console.error('[checkAllProjectsAlerts] Error:', error);
    return [];
  }
}

/**
 * Obtener conteo de alertas por severidad
 */
export async function getAlertsSummary() {
  try {
    const alerts = await checkAllProjectsAlerts();

    return {
      success: true,
      data: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length,
        byType: {
          overdue: alerts.filter(a => a.type === 'OVERDUE').length,
          budgetOverrun: alerts.filter(a => a.type === 'BUDGET_OVERRUN').length,
          resourceOverload: alerts.filter(a => a.type === 'RESOURCE_OVERLOAD').length,
          noProgress: alerts.filter(a => a.type === 'NO_PROGRESS').length,
          milestoneMissed: alerts.filter(a => a.type === 'MILESTONE_MISSED').length,
        }
      }
    };
  } catch (error) {
    console.error('[getAlertsSummary] Error:', error);
    return {
      success: false,
      data: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byType: {
          overdue: 0,
          budgetOverrun: 0,
          resourceOverload: 0,
          noProgress: 0,
          milestoneMissed: 0,
        }
      }
    };
  }
}
