// src/server/actions/quicklog.actions.ts
'use server';

import { adminDb } from '@/server/firebase';
import type { ProcessedSummary } from '@/features/quicklog/components/QuickLogConfirmation';
import type { Account, Interaction, TaskNew, Note, OrderSellOut, Stage } from '@/domain/ssot';

/**
 * Guarda los datos procesados del QuickLog en Firestore
 * Crea/actualiza Account, Interaction, Task, Note u OrderSellOut según corresponda
 */
export async function saveQuickLogData(
  summary: ProcessedSummary,
  userId: string,
  notes: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const batch = adminDb.batch();
    const now = new Date().toISOString();
    const results: any = {};
    
    // Determinar stage objetivo basado en acciones
    const hasOrder = summary.actions.some(a => a.type === 'PEDIDO' && (a.details.lines?.length || 0) > 0);
    const hasInteraction = summary.actions.some(a => a.type === 'VISITA' || a.type === 'EVENTO' || a.type === 'POS');
    const stageFromActions: Stage | undefined = hasOrder ? 'ACTIVA' : (hasInteraction ? 'SEGUIMIENTO' : undefined);

    // 1. CREAR O ACTUALIZAR CUENTA
    let accountId = summary.account.id;
    
    if (summary.account.isNew && summary.account.name) {
      // Crear nueva cuenta
      const accountRef = adminDb.collection('accounts').doc();
      accountId = accountRef.id;
      
      const newAccount: Partial<Account> = {
        id: accountId,
        partyId: accountRef.id, // Temporal - debería crear Party también
        name: summary.account.name,
        segment: (summary.account.segment as any) || 'HORECA',
        stage: stageFromActions || 'POTENCIAL',
        ownerId: userId,
        flow: 'DIRECT',
        createdAt: now,
        updatedAt: now,
        source: 'QUICKLOG',
      };
      
      batch.set(accountRef, newAccount);
      results.account = { id: accountId, created: true };
    } else if (accountId) {
      // Actualizar última interacción
      const accountRef = adminDb.collection('accounts').doc(accountId);
      // Leer stage actual para decidir si se escala
      let nextStage: Stage | undefined = undefined;
      if (stageFromActions) {
        try {
          const snap = await accountRef.get();
          const currentStage = (snap.data()?.stage as Stage | undefined) || 'POTENCIAL';
          const rank: Record<Stage, number> = {
            POTENCIAL: 1,
            SEGUIMIENTO: 2,
            ACTIVA: 3,
            FALLIDA: 0,
            CERRADA: 0,
            BAJA: 0,
          };
          if (rank[stageFromActions] > (rank[currentStage] ?? 0)) {
            nextStage = stageFromActions;
          }
        } catch (e) {
          // si falla la lectura, continuar sin cambiar stage
        }
      }
      batch.update(accountRef, {
        lastInteractionAt: now,
        updatedAt: now,
        ...(nextStage ? { stage: nextStage } : {}),
      });
      results.account = { id: accountId, updated: true };
    }

    // 2. PROCESAR ACCIONES
    for (const action of summary.actions) {
      switch (action.type) {
        case 'VISITA': {
          // Crear Interaction
          const interactionRef = adminDb.collection('interactions').doc();
          const interaction: Partial<Interaction> = {
            id: interactionRef.id,
            userId,
            accountId: accountId || '',
            kind: 'VISITA',
            note: action.details.notes || notes,
            createdAt: now,
            status: 'done',
            dept: 'VENTAS',
            plannedFor: action.date,
            resultNote: action.details.notes,
          };
          
          batch.set(interactionRef, interaction);
          results.interaction = { id: interactionRef.id, created: true };
          break;
        }

        case 'PEDIDO': {
          // Crear OrderSellOut
          if (action.details.lines && action.details.lines.length > 0) {
            const orderRef = adminDb.collection('ordersSellOut').doc();
            const order: Partial<OrderSellOut> = {
              id: orderRef.id,
              accountId: accountId || '',
              partyId: accountId, // Temporal
              status: 'open',
              flow: 'DIRECT',
              lines: action.details.lines.map(line => ({
                itemId: line.itemName, // Temporal - debería buscar el itemId real
                name: line.itemName,
                qty: line.qty,
                uom: line.uom as any,
                priceUnit: 0, // Calcular precio
                discountPct: 0,
              })),
              totalAmount: action.details.estimatedTotal || 0,
              currency: 'EUR',
              source: 'CRM',
              notes: action.details.notes || notes,
              createdAt: now,
              updatedAt: now,
              createdById: userId,
              orderDate: action.date,
            };
            
            batch.set(orderRef, order);
            results.order = { id: orderRef.id, created: true };
          }
          break;
        }

        case 'EVENTO': {
          // Crear Task
          const taskRef = adminDb.collection('tasks').doc();
          const task: Partial<TaskNew> = {
            id: taskRef.id,
            kind: 'EVENT',
            title: action.details.title || 'Evento desde QuickLog',
            desc: action.details.description || notes,
            status: 'BACKLOG',
            priority: 'MEDIUM',
            department: 'VENTAS',
            source: 'MANUAL',
            assignedToId: userId,
            createdById: userId,
            accountId: accountId,
            dueAt: action.date,
            createdAt: now,
            updatedAt: now,
          };
          
          batch.set(taskRef, task);
          results.task = { id: taskRef.id, created: true };
          break;
        }

        case 'POS': {
          // Crear nota sobre instalación de POS
          const noteRef = adminDb.collection('notes').doc();
          const note: Partial<Note> = {
            id: noteRef.id,
            text: `POS instalado en ${action.details.location}. ${action.details.notes || ''}`,
            createdAt: now,
            accountId: accountId,
            accountName: summary.account.name,
            derived: { kind: 'POS_PLV' },
          };
          
          batch.set(noteRef, note);
          results.posNote = { id: noteRef.id, created: true };
          break;
        }

        case 'NOTA':
        default: {
          // Crear Note genérica
          const noteRef = adminDb.collection('notes').doc();
          const note: Partial<Note> = {
            id: noteRef.id,
            text: action.details.notes || notes,
            createdAt: now,
            accountId: accountId,
            accountName: summary.account.name,
            derived: { kind: 'NOTA' },
          };
          
          batch.set(noteRef, note);
          results.note = { id: noteRef.id, created: true };
          break;
        }
      }
    }

    // Commit batch
    await batch.commit();

    return {
      success: true,
      message: 'QuickLog guardado exitosamente',
      data: results,
    };

  } catch (error) {
    console.error('[QuickLog] Error saving data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
