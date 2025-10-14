// src/server/actions/brain.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { BrainRule, BrainConfig, SimulationResult, BrainLogEntry } from '@/domain/brain';
import { ok, fail, type ActionResult } from '@/lib/result';
import crypto from 'crypto';

// =================================================================
// GET CONFIG
// =================================================================

export async function getBrainConfig(): Promise<BrainConfig> {
  const doc = await db.collection('system').doc('config').get();
  
  if (!doc.exists) {
    // Defaults
    return {
      schedules: {
        dailyMorningHour: 9,
        dailyEveningHour: 19,
        visitFollowupHours: 3,
      },
      thresholds: {
        noTouchDays30: 30,
        noTouchDays60: 60,
        noOrderDays45: 45,
        noOrderDays90: 90,
      },
      strictCanonWrites: false,
    };
  }
  
  return doc.data() as BrainConfig;
}

// =================================================================
// UPDATE CONFIG
// =================================================================

export async function updateBrainConfig(config: BrainConfig): Promise<ActionResult<void>> {
  try {
    await db.collection('system').doc('config').set(config);
    return ok(undefined);
  } catch (error: any) {
    return fail(error.message);
  }
}

// =================================================================
// GET RULES
// =================================================================

export async function getBrainRules(): Promise<BrainRule[]> {
  const snap = await db.collection('rules').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BrainRule));
}

// =================================================================
// UPDATE RULE
// =================================================================

export async function updateBrainRule(rule: BrainRule): Promise<ActionResult<void>> {
  try {
    const { id, ...data } = rule;
    await db.collection('rules').doc(id).set(data);
    return ok(undefined);
  } catch (error: any) {
    return fail(error.message);
  }
}

// =================================================================
// TOGGLE RULE
// =================================================================

export async function toggleBrainRule(ruleId: string, enabled: boolean): Promise<ActionResult<void>> {
  try {
    await db.collection('rules').doc(ruleId).update({ enabled });
    return ok(undefined);
  } catch (error: any) {
    return fail(error.message);
  }
}

// =================================================================
// EVALUATE RULES (main engine)
// =================================================================

export async function evaluateRules(params: {
  simulate?: boolean;
  ruleIds?: string[]; // si no se pasa, evalúa todas las enabled
}): Promise<ActionResult<SimulationResult>> {
  const { simulate = false, ruleIds } = params;
  
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 1. Cargar reglas
    let rulesSnap = await db.collection('rules').get();
    let rules = rulesSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as BrainRule))
      .filter(r => r.enabled);
    
    if (ruleIds && ruleIds.length > 0) {
      rules = rules.filter(r => ruleIds.includes(r.id));
    }
    
    console.log(`[Brain] Evaluando ${rules.length} reglas${simulate ? ' (simulación)' : ''}`);
    
    const result: SimulationResult = {
      totalActions: 0,
      byUser: {},
      accounts: [],
      preview: '',
    };
    
    // 2. Evaluar cada regla
    for (const rule of rules) {
      if (rule.condition.kind === 'ACCOUNT') {
        const matches = await evaluateAccountRule(rule, simulate);
        result.totalActions += matches.length;
        result.accounts.push(...matches.map(m => ({
          id: m.accountId,
          name: m.accountName,
          reason: rule.action.createTask?.reason || rule.id,
        })));
        
        // Contar por usuario
        matches.forEach(m => {
          result.byUser[m.userId] = (result.byUser[m.userId] || 0) + 1;
        });
      }
      // TODO: Implementar TASK y QUICKLOG kinds
    }
    
    // 3. Preview
    const userCount = Object.keys(result.byUser).length;
    result.preview = `Se ${simulate ? 'generarían' : 'generaron'} ${result.totalActions} tareas para ${userCount} usuarios`;
    
    return ok(result);
  } catch (error: any) {
    console.error('[Brain] Error evaluando reglas:', error);
    return fail(error.message);
  }
}

// =================================================================
// EVALUATE ACCOUNT RULE (helper)
// =================================================================

async function evaluateAccountRule(
  rule: BrainRule,
  simulate: boolean
): Promise<Array<{ accountId: string; accountName: string; userId: string }>> {
  const matches: Array<{ accountId: string; accountName: string; userId: string }> = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 1. Query base de cuentas
  let query = db.collection('contacts').where('kind', '==', 'ORG');
  
  // Filtros de condición
  if (rule.condition.stageIn && rule.condition.stageIn.length > 0) {
    query = query.where('stage', 'in', rule.condition.stageIn);
  }
  
  const accountsSnap = await query.get();
  console.log(`[Brain] Regla ${rule.id}: ${accountsSnap.size} cuentas candidatas`);
  
  // 2. Filtrar en memoria (fechas, etc.)
  for (const doc of accountsSnap.docs) {
    const account = doc.data();
    const accountId = doc.id;
    const ownerId = account.customer?.ownerId || account.ownerId;
    
    if (!ownerId) continue; // Skip si no tiene owner
    
    // Check minDaysSinceLastInteraction
    if (rule.condition.minDaysSinceLastInteraction) {
      const interactionsSnap = await db.collection('interactions')
        .where('accountId', '==', accountId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!interactionsSnap.empty) {
        const lastInteraction = new Date(interactionsSnap.docs[0].data().createdAt);
        const daysSince = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSince < rule.condition.minDaysSinceLastInteraction) {
          continue; // No cumple
        }
      }
    }
    
    // Check minDaysSinceLastOrder
    if (rule.condition.minDaysSinceLastOrder) {
      const ordersSnap = await db.collection('ordersSellOut')
        .where('accountId', '==', accountId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!ordersSnap.empty) {
        const lastOrder = new Date(ordersSnap.docs[0].data().createdAt);
        const daysSince = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSince < rule.condition.minDaysSinceLastOrder) {
          continue; // No cumple
        }
      }
    }
    
    // 3. Check dedupe
    if (!simulate) {
      const dedupeKey = `${rule.id}:${accountId}`;
      const dedupeHash = crypto.createHash('md5').update(dedupeKey).digest('hex');
      
      const cutoff = new Date(now.getTime() - rule.dedupeHours * 60 * 60 * 1000).toISOString();
      const recentLogsSnap = await db.collection('brain').doc('logs').collection(today)
        .where('payloadHash', '==', dedupeHash)
        .where('at', '>', cutoff)
        .limit(1)
        .get();
      
      if (!recentLogsSnap.empty) {
        console.log(`[Brain] Dedupe: ${rule.id} para ${accountId} ya ejecutado`);
        continue; // Ya se ejecutó recientemente
      }
    }
    
    // 4. Cumple condiciones → añadir a matches
    matches.push({
      accountId,
      accountName: account.displayName || account.name || 'Sin nombre',
      userId: ownerId,
    });
    
    // 5. Ejecutar acción (si no es simulación)
    if (!simulate && rule.action.createTask) {
      await executeTaskAction(rule, accountId, account.displayName || account.name, ownerId);
    }
  }
  
  return matches;
}

// =================================================================
// EXECUTE TASK ACTION (helper)
// =================================================================

async function executeTaskAction(
  rule: BrainRule,
  accountId: string,
  accountName: string,
  userId: string
) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const action = rule.action.createTask!;
  
  // Template replacement
  const title = action.title.replace(/{{account\.name}}/g, accountName);
  
  // Calculate due date
  const dueDate = new Date(now.getTime() + action.dueInDays * 24 * 60 * 60 * 1000);
  
  // Determine assignee
  let assigneeId = userId; // default ACCOUNT_OWNER
  if (action.assignTo === 'SPECIFIC_USER') {
    // TODO: Implementar asignación específica
  }
  
  // Create task
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.collection('tasks').doc(taskId).set({
    id: taskId,
    kind: 'interaction',
    title,
    desc: `Generado por regla: ${rule.name}`,
    accountId,
    assigneeId,
    dueAt: dueDate.toISOString(),
    status: 'todo',
    priority: action.priority,
    tags: [...(action.tags || []), 'brain', 'autogen'],
    origin: 'brain',
    autoContext: {
      ruleId: rule.id,
      reason: action.reason || rule.id,
      accountId,
    },
    createdAt: now.toISOString(),
  });
  
  console.log(`[Brain] ✅ Task creada: ${taskId} para ${accountName}`);
  
  // Log for dedupe
  const dedupeKey = `${rule.id}:${accountId}`;
  const payloadHash = crypto.createHash('md5').update(dedupeKey).digest('hex');
  
  const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.collection('brain').doc('logs').collection(today).doc(logId).set({
    at: now.toISOString(),
    ruleId: rule.id,
    accountId,
    userId,
    action: 'createTask',
    payloadHash,
  } as BrainLogEntry);
}
