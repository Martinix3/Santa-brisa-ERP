// src/features/sales/pipeline/pipeline.actions.ts

/**
 * PIPELINE ACTIONS - Server actions para el pipeline de ventas
 * 
 * Operaciones idempotentes con validación Zod
 */

'use server';

import { z } from 'zod';
import { adminDb as db } from '@/server/firebase';
import type {
  Task,
  TaskKind,
  TaskStatus,
  TaskPriority,
  QuickActionPayload,
  DragDropPayload,
} from './pipeline.types';
import { revalidatePath } from 'next/cache';

// =================================================================
// VALIDATORS
// =================================================================

const ZCreateTask = z.object({
  kind: z.enum(['interaction', 'order_prep', 'pos', 'event', 'admin']),
  title: z.string().min(3),
  desc: z.string().optional(),
  accountId: z.string().optional(),
  distributorId: z.string().optional(),
  orderId: z.string().optional(),
  assigneeId: z.string(),
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
// CREATE TASK
// =================================================================

export async function createTask(input: unknown) {
  const validated = ZCreateTask.parse(input);
  
  const now = new Date();
  const task: Task = {
    id: crypto.randomUUID(),
    kind: validated.kind,
    title: validated.title,
    desc: validated.desc,
    accountId: validated.accountId,
    distributorId: validated.distributorId,
    orderId: validated.orderId,
    assigneeId: validated.assigneeId,
    dueAt: validated.dueAt ?? new Date(now.getTime() + 7 * 24 * 3600e3).toISOString(),
    status: 'todo',
    priority: validated.priority,
    tags: validated.tags ?? [],
    objective: validated.objective ?? false,
    zone: validated.zone,
    createdAt: now.toISOString(),
  };
  
  await db.collection('tasks').doc(task.id).set(task);
  
  revalidatePath('/sales/pipeline');
  revalidatePath('/personal');
  
  return { ok: true, taskId: task.id };
}

// =================================================================
// COMPLETE TASK
// =================================================================

export async function completeTask(input: unknown) {
  const { taskId, userId } = ZCompleteTask.parse(input);
  
  const taskRef = db.collection('tasks').doc(taskId);
  const task = await taskRef.get();
  
  if (!task.exists) {
    return { ok: false, error: 'Task not found' };
  }
  
  const taskData = task.data() as Task;
  if (taskData.assigneeId !== userId) {
    return { ok: false, error: 'Not assigned to you' };
  }
  
  await taskRef.update({
    status: 'done',
    doneAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  revalidatePath('/sales/pipeline');
  revalidatePath('/personal');
  
  return { ok: true };
}

// =================================================================
// SNOOZE TASK
// =================================================================

export async function snoozeTask(input: unknown) {
  const { taskId, untilISO, userId } = ZSnoozeTask.parse(input);
  
  const taskRef = db.collection('tasks').doc(taskId);
  const task = await taskRef.get();
  
  if (!task.exists) {
    return { ok: false, error: 'Task not found' };
  }
  
  const taskData = task.data() as Task;
  if (taskData.assigneeId !== userId) {
    return { ok: false, error: 'Not assigned to you' };
  }
  
  await taskRef.update({
    status: 'snoozed',
    snoozeUntil: untilISO,
    updatedAt: new Date().toISOString(),
  });
  
  revalidatePath('/sales/pipeline');
  revalidatePath('/personal');
  
  return { ok: true };
}

// =================================================================
// QUICK ACTIONS
// =================================================================

export async function createInteractionTask(input: QuickActionPayload) {
  return createTask({
    kind: 'interaction',
    title: input.title || 'Seguimiento comercial',
    accountId: input.accountId,
    assigneeId: input.accountId, // FIXME: should be current user
    priority: input.priority || 'med',
    tags: input.tags || [],
    dueAt: input.dueAt,
  });
}

export async function createOrderPrepTask(input: QuickActionPayload) {
  return createTask({
    kind: 'order_prep',
    title: input.title || 'Preparar pedido',
    accountId: input.accountId,
    assigneeId: input.accountId, // FIXME: should be current user
    priority: input.priority || 'high',
    tags: input.tags || ['pedido'],
    dueAt: input.dueAt,
  });
}

export async function createPOSTask(input: QuickActionPayload) {
  return createTask({
    kind: 'pos',
    title: input.title || 'Acción POS',
    accountId: input.accountId,
    assigneeId: input.accountId, // FIXME: should be current user
    priority: input.priority || 'med',
    tags: input.tags || ['pos'],
    dueAt: input.dueAt,
  });
}

export async function createEventTask(input: QuickActionPayload) {
  return createTask({
    kind: 'event',
    title: input.title || 'Evento',
    accountId: input.accountId,
    assigneeId: input.accountId, // FIXME: should be current user
    priority: input.priority || 'med',
    tags: input.tags || ['evento'],
    dueAt: input.dueAt,
  });
}

// =================================================================
// TOGGLE OBJECTIVE
// =================================================================

export async function toggleObjective(input: unknown) {
  const { accountId, on, userId } = ZToggleObjective.parse(input);
  
  // Update account
  await db.collection('contacts').doc(accountId).update({
    isObjective: on,
    updatedAt: new Date().toISOString(),
  });
  
  if (on) {
    // Create monthly objective task (idempotent)
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const dedupeKey = `objective:${accountId}:${monthKey}`;
    
    // Check if already exists
    const existing = await db.collection('tasks')
      .where('tags', 'array-contains', dedupeKey)
      .limit(1)
      .get();
    
    if (existing.empty) {
      await createTask({
        kind: 'interaction',
        title: 'Objetivo del mes',
        accountId,
        assigneeId: userId,
        priority: 'high',
        tags: ['objetivo', dedupeKey],
        objective: true,
        dueAt: new Date(now.getTime() + 7 * 24 * 3600e3).toISOString(),
      });
    }
  }
  
  revalidatePath('/sales/pipeline');
  
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
    await createTask({
      kind: 'interaction',
      title: 'Seguimiento en 7 días',
      accountId,
      assigneeId: userId,
      priority: 'med',
      tags: ['autogen', 'seguimiento'],
      dueAt: new Date(Date.now() + 7 * 24 * 3600e3).toISOString(),
    });
  }
  
  revalidatePath('/sales/pipeline');
  
  return { ok: true };
}

// =================================================================
// BATCH OPERATIONS
// =================================================================

export async function batchCompleteTasksForOrder(orderId: string) {
  const tasks = await db.collection('tasks')
    .where('orderId', '==', orderId)
    .where('kind', '==', 'order_prep')
    .where('status', 'in', ['todo', 'doing'])
    .get();
  
  const batch = db.batch();
  const now = new Date().toISOString();
  
  tasks.docs.forEach((doc: any) => {
    batch.update(doc.ref, {
      status: 'done',
      doneAt: now,
      updatedAt: now,
    });
  });
  
  await batch.commit();
  
  revalidatePath('/sales/pipeline');
  
  return { ok: true, count: tasks.size };
}
