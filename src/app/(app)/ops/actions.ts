
'use server';
import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import type { Interaction, Payload } from '@/domain/ssot';

export async function createTask(input: Partial<Interaction>){
  const id = input.id || `int_${Date.now()}`;
  const now = new Date().toISOString();
  const payload: Interaction = {
    ...input,
    id,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    userId: input.userId!,
    accountId: input.accountId!,
    kind: input.kind || 'OTRO',
  };
  await db.collection('interactions').doc(id).set(payload);
  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true, id };
}

export async function updateTask(id: string, patch: Partial<Interaction>){
  await db.collection('interactions').doc(id).update({ ...patch, updatedAt: new Date().toISOString() });
  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true };
}

export async function completeTask(id: string, payload?: Payload){
  // En una app real, aquí iría la lógica de validación por departamento/tipo
  // Y la creación de entidades ligadas (pedidos, etc.)
  await db.collection('interactions').doc(id).update({ 
    status: 'done', 
    resultNote: (payload as any)?.note,
    updatedAt: new Date().toISOString() 
  });
  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true };
}

export async function deleteTask(id: string){
  await db.collection('interactions').doc(id).delete();
  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true };
}

export async function scheduleEvent(input: { 
  taskId?: string; 
  accountId?: string; 
  title: string; 
  dept: Interaction['dept']; 
  startAt: string; 
  durationMin?: number 
}){
  const endAt = input.durationMin 
    ? new Date(new Date(input.startAt).getTime() + input.durationMin * 60000).toISOString()
    : undefined;
  
  const id = input.taskId || `int_${Date.now()}`;

  await db.collection('interactions').doc(id).set({
    ...input,
    id,
    note: input.title, // 'note' es el campo principal de texto en Interaction
    plannedFor: input.startAt, // Usamos plannedFor para la fecha/hora programada
    startAt: input.startAt,
    endAt,
    status: 'open',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true, eventId: id, startAt: input.startAt, endAt };
}

export async function rescheduleEvent(interactionId: string, startAt: string, durationMin = 45){
  const endAt = new Date(new Date(startAt).getTime() + durationMin*60000).toISOString();
  await db.collection('interactions').doc(interactionId).update({
    startAt,
    endAt,
    plannedFor: startAt,
    updatedAt: new Date().toISOString(),
  });
  revalidatePath('/dashboard-personal');
  revalidatePath('/agenda');
  return { ok: true, eventId: interactionId, startAt, endAt };
}

export async function computeFreeBusy({ userId, start, end }: { userId: string; start: string; end: string }){
  const snap = await db.collection('interactions')
    .where('userId', '==', userId)
    .where('startAt', '>=', start)
    .where('startAt', '<=', end)
    .get();

  const busySlots = snap.docs.map(doc => {
    const i = doc.data() as Interaction;
    return { start: i.startAt, end: i.endAt };
  });

  return { ok: true, busy: busySlots };
}

export async function getDashboardData({ period, filters }: { period?: string; filters?: any }){
  // Implementación de KPI fetching
  return { ok: true, kpis: { visitas: 0, pedidos: 0, importe: 0, tareasPendientes: 0 } };
}

export async function revalidateOpsDashboard(){
  revalidatePath('/dashboard-personal');
}
