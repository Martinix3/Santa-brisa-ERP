/**
 * PIPELINE ACTIONS V2 - Server actions usando TaskNew unificado
 * 
 * Migrado para usar el sistema unificado de tareas (TaskNew)
 */

'use server';

import { z } from 'zod';
import { adminDb as db } from '@/server/firebase';
import type { TaskNew } from '@/domain/ssot';
import { CreateTaskSchema } from '@/domain/zod/task';
import { revalidatePath } from 'next/cache';
import {
  mapPipelineKindToTaskNew,
  mapPipelinePriorityToTaskNew,
} from './pipeline.mappers';

// =================================================================
// VALIDATORS (Actualizados para TaskNew)
// =================================================================

const ZCreatePipelineTask = z.object({
  kind: z.enum(['interaction', 'order_prep', 'pos', 'event', 'admin']),
  title: z.string().min(3),
  desc: z.string().optional(),
  accountId: z.string().optional(),
  distributorId: z.string().optional(),
  orderId: z.string().optional(),
  assigneeId: z.string(),
  createdById: z.string(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(['low', 'med', 'high', 'critical']).default('med'),
  tags: z.array(z.string()).optional(),
  objective: z.boolean().optional(),
  zone: z.string().optional(),
});

const ZCompleteTask = z.object({
  taskId: z.string(),
  userId: z.string(),
});

const ZSnoozeTask = z.object({
  taskId: z.string(),
  untilISO: z.string().datetime(),
  userId: z.string(),
});

const ZToggleObjective = z.object({
  accountId: z.string(),
  on: z.boolean(),
  userId: z.string(),
});

const ZUpdateStage = z.object({
  accountId: z.string(),
  fromStage: z.string(),
  toStage: z.string(),
  userId: z.string(),
});

// =================================================================
// CREATE TASK (Usando TaskNew)
// =================================================================

export async function createPipelineTask(input: unknown) {
  const validated = ZCreatePipelineTask.parse(input);
  
  const now = new Date();
  const task: TaskNew = {
    id: crypto.randomUUID(),
    kind: mapPipelineKindToTaskNew(validated.kind),
    title: validated.title,
    desc: validated.desc,
    status: 'BACKLOG',
    priority: mapPipelinePriorityToTaskNew(validated.priority),
    department: 'VENTAS',
    source: 'MANUAL',
    dueAt: validated.dueAt ?? new Date(now.getTime() + 7 * 24 * 3600e3).toISOString(),
    assignedToId: validated.assigneeId,
    createdById: validated.createdById,
    accountId: validated.accountId,
    distributorId: validated.distributorId,
    orderId: validated.orderId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  await db.collection('tasks').doc(task.id).set(task);
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  revalidatePath('/personal');
  
  return { ok: true, taskId: task.id };
}

// =================================================================
// COMPLETE TASK
// =================================================================

export async function completePipelineTask(input: unknown) {
  const { taskId, userId } = ZCompleteTask.parse(input);
  
  const taskRef = db.collection('tasks').doc(taskId);
  const task = await taskRef.get();
  
  if (!task.exists) {
    return { ok: false, error: 'Task not found' };
  }
  
  const taskData = task.data() as TaskNew;
  if (taskData.assignedToId !== userId) {
    return { ok: false, error: 'Not assigned to you' };
  }
  
  await taskRef.update({
    status: 'DONE',
    closedAt: new Date().toISOString(),
    closedById: userId,
    updatedAt: new Date().toISOString(),
  });
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  revalidatePath('/personal');
  
  return { ok: true };
}

// =================================================================
// SNOOZE TASK
// =================================================================

export async function snoozePipelineTask(input: unknown) {
  const { taskId, untilISO, userId } = ZSnoozeTask.parse(input);
  
  const taskRef = db.collection('tasks').doc(taskId);
  const task = await taskRef.get();
  
  if (!task.exists) {
    return { ok: false, error: 'Task not found' };
  }
  
  const taskData = task.data() as TaskNew;
  if (taskData.assignedToId !== userId) {
    return { ok: false, error: 'Not assigned to you' };
  }
  
  await taskRef.update({
    status: 'SNOOZED',
    snoozeUntil: untilISO,
    updatedAt: new Date().toISOString(),
  });
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  revalidatePath('/personal');
  
  return { ok: true };
}

// =================================================================
// QUICK ACTIONS
// =================================================================

export async function createInteractionTask(input: {
  accountId: string;
  userId: string;
  title?: string;
  dueAt?: string;
  priority?: 'low' | 'med' | 'high' | 'critical';
}) {
  return createPipelineTask({
    kind: 'interaction',
    title: input.title || 'Seguimiento comercial',
    accountId: input.accountId,
    assigneeId: input.userId,
    createdById: input.userId,
    priority: input.priority || 'med',
    dueAt: input.dueAt,
  });
}

export async function createOrderPrepTask(input: {
  accountId: string;
  userId: string;
  orderId?: string;
  title?: string;
  dueAt?: string;
}) {
  return createPipelineTask({
    kind: 'order_prep',
    title: input.title || 'Preparar pedido',
    accountId: input.accountId,
    orderId: input.orderId,
    assigneeId: input.userId,
    createdById: input.userId,
    priority: 'high',
    dueAt: input.dueAt,
  });
}

export async function createPOSTask(input: {
  accountId: string;
  userId: string;
  title?: string;
  dueAt?: string;
}) {
  return createPipelineTask({
    kind: 'pos',
    title: input.title || 'Acción POS',
    accountId: input.accountId,
    assigneeId: input.userId,
    createdById: input.userId,
    priority: 'med',
    dueAt: input.dueAt,
  });
}

export async function createEventTask(input: {
  accountId: string;
  userId: string;
  title?: string;
  dueAt?: string;
}) {
  return createPipelineTask({
    kind: 'event',
    title: input.title || 'Evento',
    accountId: input.accountId,
    assigneeId: input.userId,
    createdById: input.userId,
    priority: 'med',
    dueAt: input.dueAt,
  });
}

// =================================================================
// TOGGLE OBJECTIVE
// =================================================================

export async function toggleAccountObjective(input: unknown) {
  const { accountId, on, userId } = ZToggleObjective.parse(input);
  
  // Update account
  await db.collection('contacts').doc(accountId).update({
    isTarget: on,
    targetUserId: on ? userId : null,
    targetedAt: on ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
  
  if (on) {
    // Create monthly objective task (idempotent)
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const dedupeKey = `objective:${accountId}:${monthKey}`;
    
    // Check if already exists
    const existing = await db.collection('tasks')
      .where('accountId', '==', accountId)
      .where('status', 'in', ['BACKLOG', 'IN_PROGRESS', 'PROGRAMADA'])
      .where('source', '==', 'MANUAL')
      .limit(1)
      .get();
    
    if (existing.empty) {
      await createInteractionTask({
        accountId,
        userId,
        title: 'Objetivo del mes - Seguimiento',
        priority: 'high',
        dueAt: new Date(now.getTime() + 7 * 24 * 3600e3).toISOString(),
      });
    }
  }
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  
  return { ok: true };
}

// =================================================================
// UPDATE STAGE (Drag & Drop)
// =================================================================

export async function updateAccountStage(input: unknown) {
  const { accountId, fromStage, toStage, userId } = ZUpdateStage.parse(input);
  
  // Update account stage
  await db.collection('contacts').doc(accountId).update({
    stage: toStage,
    updatedAt: new Date().toISOString(),
  });
  
  // Auto-create tasks based on stage transition
  if (toStage === 'SEGUIMIENTO') {
    // Create follow-up task in 7 days
    await createInteractionTask({
      accountId,
      userId,
      title: 'Seguimiento programado',
      priority: 'med',
      dueAt: new Date(Date.now() + 7 * 24 * 3600e3).toISOString(),
    });
  }
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  
  return { ok: true };
}

// =================================================================
// BATCH OPERATIONS
// =================================================================

export async function batchCompleteTasksForOrder(orderId: string) {
  const tasks = await db.collection('tasks')
    .where('orderId', '==', orderId)
    .where('kind', '==', 'ORDER_PREP')
    .where('status', 'in', ['BACKLOG', 'IN_PROGRESS'])
    .get();
  
  const batch = db.batch();
  const now = new Date().toISOString();
  
  tasks.docs.forEach((doc: any) => {
    batch.update(doc.ref, {
      status: 'DONE',
      closedAt: now,
      updatedAt: now,
    });
  });
  
  await batch.commit();
  
  revalidatePath('/ventas/accounts');
  revalidatePath('/ventas/pipeline');
  
  return { ok: true, count: tasks.size };
}

// =================================================================
// DnD SUPPORT - Simple wrapper for drag & drop
// =================================================================

export async function updateAccountStageSimple(accountId: string, stage: string) {
  try {
    const docRef = db.collection('contacts').doc(accountId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.error(`Account ${accountId} not found`);
      return { ok: false, error: 'Account not found' };
    }
    
    await docRef.update({
      stage: stage,
      updatedAt: new Date().toISOString(),
    });
    
    revalidatePath('/ventas/cuentas');
    revalidatePath('/ventas/accounts');
    revalidatePath('/ventas/pipeline');
    
    return { ok: true };
  } catch (error) {
    console.error('Error updating account stage:', error);
    return { ok: false, error: String(error) };
  }
}
