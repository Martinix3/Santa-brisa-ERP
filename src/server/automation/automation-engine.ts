/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/server/automation/automation-engine.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { createAlert } from '@/server/actions/alerts.actions';
import type { Department } from '@/domain/ssot';

/**
 * ⚙️ AUTOMATION ENGINE
 * 
 * Sistema de reglas que ejecuta acciones automáticas basadas en eventos del sistema.
 * 
 * FASE FINAL.3 - Action Automation Engine
 */

// =================================================================
// TYPES
// =================================================================

export type TriggerType = 
  | 'EMAIL_RECEIVED' | 'ALERT_CREATED' | 'TASK_OVERDUE' | 'TASK_COMPLETED'
  | 'ACCOUNT_INACTIVE' | 'EVENT_UPCOMING' | 'CAMPAIGN_START' | 'CAMPAIGN_END'
  | 'STOCK_LOW' | 'QC_FAILED' | 'ORDER_CREATED' | 'SHIPMENT_DELAYED'
  | 'PAYMENT_OVERDUE' | 'PROJECT_MILESTONE' | 'CUSTOM';

export type ActionType = 
  | 'CREATE_ALERT' | 'CREATE_TASK' | 'SEND_EMAIL' 
  | 'UPDATE_ENTITY' | 'WEBHOOK' | 'RUN_SCRIPT';

export interface AutomationTrigger {
  type: TriggerType;
  conditions?: {
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    department?: Department;
    sentiment?: 'positive' | 'neutral' | 'negative';
    hasAttachments?: boolean;
    alertSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    alertType?: string;
    daysInactive?: number;
    hoursBeforeEvent?: number;
    threshold?: number;
    customCondition?: string;
  };
}

export interface AutomationAction {
  type: ActionType;
  params: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  priority?: number;
  runOnce?: boolean;
  cooldownMinutes?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastRunAt?: string;
  runCount?: number;
  successCount?: number;
  errorCount?: number;
}

export interface ExecutionContext {
  triggerType: TriggerType;
  triggerData: Record<string, any>;
  entityType?: string;
  entityId?: string;
  userId?: string;
  userName?: string;
  triggeredAt: string;
}

export interface ExecutionResult {
  success: boolean;
  ruleId: string;
  actionsExecuted: number;
  actionResults: Array<{
    actionType: ActionType;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  executionTime: number;
}

// =================================================================
// EXECUTE AUTOMATION RULE
// =================================================================

export async function executeAutomationRule(
  rule: AutomationRule,
  context: ExecutionContext
): Promise<ExecutionResult> {
  
  const startTime = Date.now();
  
  const result: ExecutionResult = {
    success: true,
    ruleId: rule.id,
    actionsExecuted: 0,
    actionResults: [],
    executionTime: 0,
  };
  
  try {
    if (!rule.enabled) {
      return result;
    }
    
    if (!evaluateTriggerConditions(rule.trigger, context)) {
      return result;
    }
    
    if (rule.cooldownMinutes && rule.lastRunAt) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      const timeSinceLastRun = Date.now() - new Date(rule.lastRunAt).getTime();
      if (timeSinceLastRun < cooldownMs) {
        return result;
      }
    }
    
    console.log(`[Automation] 🚀 Executing rule: ${rule.name}`);
    
    for (const action of rule.actions) {
      const actionResult = await executeAction(action, context);
      result.actionResults.push(actionResult);
      if (actionResult.success) result.actionsExecuted++;
      else result.success = false;
    }
    
    await updateRuleMetadata(rule.id, {
      lastRunAt: new Date().toISOString(),
      runCount: (rule.runCount || 0) + 1,
      successCount: (rule.successCount || 0) + (result.success ? 1 : 0),
      errorCount: (rule.errorCount || 0) + (result.success ? 0 : 1),
    });
    
    result.executionTime = Date.now() - startTime;
    
  } catch (error) {
    console.error(`[Automation] Error executing rule ${rule.id}:`, error);
    result.success = false;
    result.executionTime = Date.now() - startTime;
  }
  
  return result;
}

async function executeAction(
  action: AutomationAction,
  context: ExecutionContext
): Promise<{ actionType: ActionType; success: boolean; result?: any; error?: string }> {
  
  const actionResult = {
    actionType: action.type,
    success: false as boolean,
    result: undefined as any,
    error: undefined as string | undefined,
  };
  
  try {
    const params = replaceVariables(action.params, context);
    
    switch (action.type) {
      case 'CREATE_ALERT':
        actionResult.result = await executeCreateAlert(params, context);
        actionResult.success = actionResult.result.success;
        break;
      case 'CREATE_TASK':
        actionResult.result = await executeCreateTask(params, context);
        actionResult.success = actionResult.result.success;
        break;
      case 'SEND_EMAIL':
        actionResult.result = await executeSendEmail(params);
        actionResult.success = actionResult.result.success;
        break;
      case 'UPDATE_ENTITY':
        actionResult.result = await executeUpdateEntity(params);
        actionResult.success = actionResult.result.success;
        break;
      case 'WEBHOOK':
        actionResult.result = await executeWebhook(params, context);
        actionResult.success = actionResult.result.success;
        break;
      default:
        actionResult.error = `Unknown action type: ${action.type}`;
        break;
    }
  } catch (error) {
    actionResult.error = String(error);
  }
  
  return actionResult;
}

// =================================================================
// ACTION EXECUTORS
// =================================================================

async function executeCreateAlert(params: any, context: ExecutionContext) {
  return createAlert({
    type: params.alertType || 'CUSTOM',
    severity: params.alertSeverity || 'MEDIUM',
    title: params.title || 'Alerta automática',
    message: params.message || '',
    userId: context.userId || '',
    department: params.department || 'OPS',
    entityType: context.entityType as any,
    entityId: context.entityId,
    actionable: params.actionable ?? true,
    metadata: { source: 'AUTOMATION', triggerType: context.triggerType },
  });
}

async function executeCreateTask(params: any, context: ExecutionContext) {
  try {
    const dueDate = params.dueInHours 
      ? new Date(Date.now() + params.dueInHours * 3600 * 1000).toISOString()
      : undefined;
    
    const task = {
      kind: params.taskKind || 'GENERICA',
      title: params.taskTitle || params.title || 'Tarea automática',
      desc: params.taskDesc || params.message,
      status: 'BACKLOG' as const,
      priority: params.taskPriority || 'MEDIUM',
      department: params.department || 'OPS',
      source: 'AUTO_RULE' as const,
      assignedToId: context.userId || '',
      createdById: context.userId || 'system',
      dueAt: dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('tasks').add(task);
    return { success: true, taskId: docRef.id };
  } catch (error) {
    return { success: false };
  }
}

async function executeSendEmail(params: any) {
  // TODO: Integrar con Gmail
  console.log('[Automation] TODO: Send email to', params.to);
  return { success: true, messageId: 'mock_email_id' };
}

async function executeUpdateEntity(params: any) {
  try {
    if (!params.collection || !params.docId) {
      throw new Error('Missing collection or docId');
    }
    await db.collection(params.collection).doc(params.docId).update({
      ...params.updates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

async function executeWebhook(params: any, context: ExecutionContext) {
  try {
    const response = await fetch(params.url, {
      method: params.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...params.headers },
      body: JSON.stringify(params.payload || context.triggerData),
    });
    if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
    const data = await response.json();
    return { success: true, response: data };
  } catch (error) {
    return { success: false };
  }
}

function evaluateTriggerConditions(trigger: AutomationTrigger, context: ExecutionContext): boolean {
  if (!trigger.conditions) return true;
  const { conditions } = trigger;
  const { triggerData } = context;
  
  if (conditions.priority && triggerData.priority !== conditions.priority) return false;
  if (conditions.department && triggerData.department !== conditions.department) return false;
  if (conditions.sentiment && triggerData.sentiment !== conditions.sentiment) return false;
  if (conditions.alertSeverity && triggerData.severity !== conditions.alertSeverity) return false;
  if (conditions.hasAttachments !== undefined && (triggerData.attachments?.length > 0) !== conditions.hasAttachments) return false;
  
  return true;
}

function replaceVariables(params: Record<string, any>, context: ExecutionContext): Record<string, any> {
  const replaced: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      let replacedValue = value;
      if (context.userId) replacedValue = replacedValue.replace(/{userId}/g, context.userId);
      if (context.userName) replacedValue = replacedValue.replace(/{userName}/g, context.userName);
      if (context.entityId) replacedValue = replacedValue.replace(/{entityId}/g, context.entityId);
      Object.entries(context.triggerData).forEach(([k, v]) => {
        replacedValue = replacedValue.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
      replaced[key] = replacedValue;
    } else {
      replaced[key] = value;
    }
  }
  return replaced;
}

async function updateRuleMetadata(ruleId: string, metadata: Partial<Pick<AutomationRule, 'lastRunAt' | 'runCount' | 'successCount' | 'errorCount'>>): Promise<void> {
  try {
    await db.collection('automation_rules').doc(ruleId).update({ ...metadata, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Automation] Error updating rule metadata:', error);
  }
}

export async function createAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; ruleId?: string }> {
  try {
    const newRule = { ...rule, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), runCount: 0, successCount: 0, errorCount: 0 };
    const docRef = await db.collection('automation_rules').add(newRule);
    console.log('[Automation] ✅ Created rule:', docRef.id, rule.name);
    return { success: true, ruleId: docRef.id };
  } catch (error) {
    console.error('[Automation] Error creating rule:', error);
    return { success: false };
  }
}

export async function getActiveRules(): Promise<AutomationRule[]> {
  try {
    const snapshot = await db.collection('automation_rules').where('enabled', '==', true).orderBy('priority', 'desc').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AutomationRule[];
  } catch (error) {
    console.error('[Automation] Error getting rules:', error);
    return [];
  }
}

export async function getRulesByTrigger(triggerType: TriggerType): Promise<AutomationRule[]> {
  try {
    const snapshot = await db.collection('automation_rules').where('enabled', '==', true).where('trigger.type', '==', triggerType).orderBy('priority', 'desc').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AutomationRule[];
  } catch (error) {
    console.error('[Automation] Error getting rules by trigger:', error);
    return [];
  }
}

export async function toggleAutomationRule(ruleId: string, enabled: boolean): Promise<{ success: boolean }> {
  try {
    await db.collection('automation_rules').doc(ruleId).update({ enabled, updatedAt: new Date().toISOString() });
    console.log(`[Automation] ✅ Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    return { success: true };
  } catch (error) {
    console.error('[Automation] Error toggling rule:', error);
    return { success: false };
  }
}

export async function executeRulesForTrigger(triggerType: TriggerType, context: ExecutionContext): Promise<ExecutionResult[]> {
  try {
    const rules = await getRulesByTrigger(triggerType);
    console.log(`[Automation] Found ${rules.length} rules for trigger ${triggerType}`);
    const results: ExecutionResult[] = [];
    for (const rule of rules) {
      const result = await executeAutomationRule(rule, context);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('[Automation] Error executing rules for trigger:', error);
    return [];
  }
}

export async function installSystemRules(): Promise<{ installed: number }> {
  try {
    let installed = 0;
    for (const rule of SYSTEM_AUTOMATION_RULES) {
      const result = await createAutomationRule(rule);
      if (result.success) installed++;
    }
    console.log(`[Automation] ✅ Installed ${installed} system rules`);
    return { installed };
  } catch (error) {
    console.error('[Automation] Error installing system rules:', error);
    return { installed: 0 };
  }
}

export const SYSTEM_AUTOMATION_RULES: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Email urgente → Alerta', description: 'Crear alerta cuando llega email urgente', enabled: true, priority: 90, trigger: { type: 'EMAIL_RECEIVED', conditions: { priority: 'urgent' } }, actions: [{ type: 'CREATE_ALERT', params: { alertType: 'EMAIL_URGENT', alertSeverity: 'CRITICAL', title: '📧 Email urgente: {subject}', message: 'De: {from}\n\n{body}', department: '{department}' } }] },
  { name: 'Alerta crítica → Tarea', description: 'Convertir alerta crítica en tarea', enabled: true, priority: 80, trigger: { type: 'ALERT_CREATED', conditions: { alertSeverity: 'CRITICAL' } }, actions: [{ type: 'CREATE_TASK', params: { taskPriority: 'URGENT', taskTitle: 'Atender: {title}', taskDesc: '{message}', dueInHours: 1 } }] },
  { name: 'Evento 24h → Recordatorio', description: 'Alerta 24h antes evento', enabled: true, priority: 50, trigger: { type: 'EVENT_UPCOMING', conditions: { hoursBeforeEvent: 24 } }, actions: [{ type: 'CREATE_ALERT', params: { alertType: 'EVENT_UPCOMING', alertSeverity: 'MEDIUM', title: '📅 Evento mañana: {eventTitle}', message: 'Evento: {eventDate}' } }] },
  { name: 'Campaña inicia → Alerta', description: 'Notificar inicio campaña', enabled: true, priority: 60, trigger: { type: 'CAMPAIGN_START' }, actions: [{ type: 'CREATE_ALERT', params: { alertType: 'CAMPAIGN_START', alertSeverity: 'MEDIUM', title: '🚀 Campaña: {campaignTitle}', message: 'Campaña {campaignTitle} iniciada', department: 'MARKETING' } }] },
  { name: 'Cuenta inactiva → Alerta', description: 'Alerta cuenta 30 días inactiva', enabled: true, priority: 40, trigger: { type: 'ACCOUNT_INACTIVE', conditions: { daysInactive: 30 } }, actions: [{ type: 'CREATE_ALERT', params: { alertType: 'ACCOUNT_INACTIVE', alertSeverity: 'MEDIUM', title: '🏪 Inactiva: {accountName}', message: '{daysInactive} días sin actividad', department: 'VENTAS' } }, { type: 'CREATE_TASK', params: { taskKind: 'VISITA', taskTitle: 'Visitar {accountName}', taskPriority: 'MEDIUM', dueInHours: 72 } }] },
  { name: 'Stock bajo → Alerta', description: 'Alerta stock bajo mínimo', enabled: true, priority: 70, trigger: { type: 'STOCK_LOW', conditions: { threshold: 50 } }, actions: [{ type: 'CREATE_ALERT', params: { alertType: 'STOCK_LOW', alertSeverity: 'HIGH', title: '📦 Stock bajo: {itemName}', message: 'Solo {qtyAvailable} unidades disponibles', department: 'ALMACEN' } }] },
];
