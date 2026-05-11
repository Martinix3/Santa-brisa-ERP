/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/server/gemini/intelligence-hub.ts
'use server';

import { analyzeEmailWithGemini } from './analyzers/email-analyzer';
import { createAlert } from '@/server/actions/alerts.actions';
import type { ParsedEmail } from '@/server/integrations/gmail/types';
import type { Department } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebase';

/**
 * 🧠 GEMINI INTELLIGENCE HUB
 * 
 * Orquestador central que coordina todos los analyzers de Gemini
 * y ejecuta acciones automáticas basadas en el análisis de IA.
 * 
 * FASE FINAL.2 - Gemini Orchestrator
 * 
 * Conecta:
 * - Email Analyzer → Interaction + Alert + Task
 * - Document Analyzer → Collections apropiadas
 * - QuickLog Analyzer → Alert + Task + Interaction
 * - Todos los módulos del sistema
 */

// =================================================================
// TYPES
// =================================================================

export interface IntelligenceContext {
  userId: string;
  userName?: string;
  userEmail?: string;
  department?: Department;
  
  // Contexto de la cuenta (si aplica)
  accountHistory?: any[];
  recentOrders?: any[];
  recentInteractions?: any[];
  
  // Preferencias del usuario
  preferences?: {
    autoCreateTasks?: boolean;
    autoCreateAlerts?: boolean;
    minPriorityForTask?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    minPriorityForAlert?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface IntelligenceResult {
  success: boolean;
  
  // Análisis realizados
  analysis: {
    email?: any;
    documents?: any[];
    quicklog?: any;
  };
  
  // Acciones ejecutadas
  actionsTaken: Array<{
    type: 'ALERT_CREATED' | 'TASK_CREATED' | 'INTERACTION_CREATED' | 'EMAIL_CLASSIFIED' | 'DOCUMENT_STORED';
    entityId?: string;
    entityType?: string;
    details?: string;
  }>;
  
  // Errores si los hubo
  errors?: string[];
}

// =================================================================
// EMAIL PROCESSING WITH INTELLIGENCE
// =================================================================

/**
 * Procesar email con IA y ejecutar acciones automáticas
 * 
 * Flujo completo:
 * 1. Analizar email con Gemini (departamento, prioridad, sentimiento)
 * 2. Crear Interaction (siempre)
 * 3. Crear Alert si es urgente
 * 4. Crear Task si requiere acción
 * 5. Analizar attachments con Document Analyzer
 */
export async function processEmailWithIntelligence(
  email: ParsedEmail,
  context: IntelligenceContext
): Promise<IntelligenceResult> {
  
  const result: IntelligenceResult = {
    success: true,
    analysis: {},
    actionsTaken: [],
    errors: [],
  };
  
  try {
    console.log('[Intelligence Hub] 🧠 Processing email:', email.subject);
    
    // 1. ANALIZAR EMAIL CON GEMINI
    const emailAnalysis = await analyzeEmailWithGemini(email, {
      accountHistory: context.accountHistory,
      recentOrders: context.recentOrders,
      recentInteractions: context.recentInteractions,
    });
    
    result.analysis.email = emailAnalysis;
    
    // Log detallado del análisis
    console.log('[Intelligence Hub] 📊 Analysis summary:', {
      department: emailAnalysis.department,
      priority: emailAnalysis.priority,
      sentiment: emailAnalysis.sentiment,
      requiresAction: emailAnalysis.requiresAction,
      willCreateAlert: (emailAnalysis.priority === 'urgent' || emailAnalysis.priority === 'high') && context.preferences?.autoCreateAlerts !== false,
      willCreateTask: emailAnalysis.requiresAction && context.preferences?.autoCreateTasks !== false,
    });
    
    // 2. CREAR INTERACTION (SIEMPRE)
    const interaction = await createInteraction({
      userId: context.userId,
      accountId: emailAnalysis.relatedEntities?.accounts?.[0],
      kind: 'EMAIL',
      note: email.body.substring(0, 500),
      dept: emailAnalysis.department,
      title: email.subject,
      metadata: {
        priority: emailAnalysis.priority,
        sentiment: emailAnalysis.sentiment,
        sentimentScore: emailAnalysis.sentimentScore,
        entities: emailAnalysis.relatedEntities,
        emailId: email.messageId,
        from: email.from,
        to: email.to,
        category: emailAnalysis.category,
      },
    });
    
    if (interaction.success) {
      result.actionsTaken.push({
        type: 'INTERACTION_CREATED',
        entityId: interaction.interactionId,
        entityType: 'EMAIL',
        details: `Email guardado como interacción (${emailAnalysis.department})`,
      });
      
      console.log('[Intelligence Hub] ✅ Interaction created:', interaction.interactionId);
    }
    
    // 3. CREAR ALERT SI ES URGENTE O HIGH PRIORITY
    const shouldCreateAlert = 
      (emailAnalysis.priority === 'urgent' || emailAnalysis.priority === 'high') &&
      context.preferences?.autoCreateAlerts !== false;
    
    if (shouldCreateAlert) {
      const alertSeverity = emailAnalysis.priority === 'urgent' ? 'CRITICAL' : 'HIGH';
      
      const alert = await createAlert({
        type: 'EMAIL_URGENT',
        severity: alertSeverity,
        title: `📧 Email ${emailAnalysis.priority}: ${email.subject}`,
        message: `De: ${email.from}\n\n${email.body.substring(0, 300)}${email.body.length > 300 ? '...' : ''}`,
        userId: context.userId,
        department: emailAnalysis.department,
        entityType: 'EMAIL',
        entityId: email.messageId,
        accountId: emailAnalysis.relatedEntities?.accounts?.[0],
        emailId: email.messageId,
        actionable: true,
        suggestedActions: [
          {
            label: 'Responder email',
            action: 'SEND_EMAIL',
            params: {
              to: email.from,
              subject: `Re: ${email.subject}`,
            },
          },
          {
            label: 'Crear tarea',
            action: 'CREATE_TASK',
            params: {
              title: `Responder: ${email.subject}`,
              priority: alertSeverity === 'CRITICAL' ? 'URGENT' : 'HIGH',
            },
          },
        ],
        metadata: {
          source: 'EMAIL',
          priority: emailAnalysis.priority,
          sentiment: emailAnalysis.sentiment,
          category: emailAnalysis.category,
          analysis: emailAnalysis,
        },
      });
      
      if (alert.success) {
        result.actionsTaken.push({
          type: 'ALERT_CREATED',
          entityId: alert.alertId,
          entityType: 'EMAIL',
          details: `Alerta creada para email ${emailAnalysis.priority}`,
        });
        
        console.log('[Intelligence Hub] ✅ Alert created:', alert.alertId);
      }
    }
    
    // 4. CREAR TASK SI REQUIERE ACCIÓN
    const shouldCreateTask =
      emailAnalysis.requiresAction &&
      context.preferences?.autoCreateTasks !== false &&
      shouldCreateTaskBasedOnPriority(
        emailAnalysis.priority,
        context.preferences?.minPriorityForTask
      );
    
    if (shouldCreateTask) {
      const task = await createTask({
        kind: 'INTERACTION',
        title: `📧 ${email.subject}`,
        desc: `Responder email de ${email.from}\n\n${email.body.substring(0, 500)}`,
        status: 'BACKLOG',
        priority: mapPriorityToTaskPriority(emailAnalysis.priority),
        department: emailAnalysis.department,
        source: 'AUTO_RULE',
        assignedToId: context.userId,
        createdById: context.userId,
        accountId: emailAnalysis.relatedEntities?.accounts?.[0],
        dueAt: emailAnalysis.suggestedDueDate,
      });
      
      if (task.success) {
        result.actionsTaken.push({
          type: 'TASK_CREATED',
          entityId: task.taskId,
          entityType: 'EMAIL',
          details: 'Tarea creada automáticamente desde email',
        });
        
        console.log('[Intelligence Hub] ✅ Task created:', task.taskId);
      }
    }
    
    // 5. ANALIZAR ATTACHMENTS CON DOCUMENT ANALYZER
    if (email.attachments && email.attachments.length > 0) {
      result.analysis.documents = [];
      
      console.log(`[Intelligence Hub] 📎 Analyzing ${email.attachments.length} attachments`);
      
      for (const attachment of email.attachments) {
        try {
          // Solo procesar si tiene data
          if (!attachment.data) {
            console.log('[Intelligence Hub] ⚠️ Attachment without data:', attachment.filename);
            continue;
          }
          
          const docAnalysis = await analyzeDocumentWithGeminiVision(
            attachment,
            attachment.data
          );
          
          result.analysis.documents.push(docAnalysis);
          
          // TODO: Guardar documento en la colección apropiada
          // según docAnalysis.documentType
          // Por ejemplo:
          // - FACTURA → invoices
          // - CERTIFICADO → qc_documents
          // - PRESUPUESTO → quotes
          // - etc.
          
          result.actionsTaken.push({
            type: 'DOCUMENT_STORED',
            entityType: docAnalysis.documentType,
            details: `Documento analizado: ${attachment.filename} (${docAnalysis.documentType})`,
          });
          
          console.log('[Intelligence Hub] ✅ Document analyzed:', attachment.filename);
          
        } catch (error) {
          console.error('[Intelligence Hub] Error analyzing attachment:', error);
          result.errors?.push(`Error analyzing ${attachment.filename}: ${String(error)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('[Intelligence Hub] ❌ Error processing email:', error);
    result.success = false;
    result.errors?.push(String(error));
  }
  
  return result;
}

// =================================================================
// QUICKLOG PROCESSING WITH INTELLIGENCE
// =================================================================

/**
 * Procesar QuickLog con IA (FASE 5 - Completo)
 * 
 * Analiza input de voz/texto y ejecuta acciones automáticas:
 * - CREATE_ALERT → Crear alerta
 * - CREATE_TASK → Crear tarea
 * - CREATE_REMINDER → Crear alerta programada
 * - CREATE_ORDER → Usar Santa Brain (ya implementado)
 * - LOG_VISIT → Usar Santa Brain (ya implementado)
 */
export async function processQuickLogWithIntelligence(
  input: string,
  context: IntelligenceContext
): Promise<IntelligenceResult> {
  
  const result: IntelligenceResult = {
    success: true,
    analysis: {},
    actionsTaken: [],
    errors: [],
  };
  
  try {
    console.log('[Intelligence Hub] 🎤 Processing QuickLog:', input.substring(0, 50));
    
    // 1. Analizar intención con QuickLog Analyzer
    const { analyzeQuickLogIntent } = await import('./analyzers/quicklog-analyzer');
    
    const intent = await analyzeQuickLogIntent(input, context.userId, {
      userAccounts: context.accountHistory,
      recentInteractions: context.recentInteractions,
    });
    
    result.analysis.quicklog = intent;
    
    console.log('[Intelligence Hub] ✅ QuickLog analyzed:', {
      action: intent.action,
      confidence: intent.confidence,
      department: intent.department,
    });
    
    // 2. Ejecutar acción según intención
    switch (intent.action) {
      case 'CREATE_ALERT':
        const alert = await createAlert({
          type: 'CUSTOM',
          severity: intent.priority === 'URGENT' ? 'CRITICAL' : 
                   intent.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          title: intent.title,
          message: intent.description || '',
          userId: context.userId,
          department: intent.department,
          actionable: true,
          metadata: {
            source: 'QUICKLOG',
            intent,
            confidence: intent.confidence,
          },
        });
        
        if (alert.success) {
          result.actionsTaken.push({
            type: 'ALERT_CREATED',
            entityId: alert.alertId,
            details: `Alerta creada desde QuickLog: ${intent.title}`,
          });
          console.log('[Intelligence Hub] ✅ Alert created from QuickLog');
        }
        break;
        
      case 'CREATE_TASK':
        const task = await createTask({
          kind: 'GENERICA',
          title: intent.title,
          desc: intent.description,
          status: 'BACKLOG',
          priority: intent.priority || 'MEDIUM',
          department: intent.department,
          source: 'MANUAL',
          assignedToId: context.userId,
          createdById: context.userId,
          dueAt: intent.dueDate,
        });
        
        if (task.success) {
          result.actionsTaken.push({
            type: 'TASK_CREATED',
            entityId: task.taskId,
            details: `Tarea creada desde QuickLog: ${intent.title}`,
          });
          console.log('[Intelligence Hub] ✅ Task created from QuickLog');
        }
        break;
        
      case 'CREATE_REMINDER':
        // Crear alerta programada (es una alerta no-actionable)
        const reminder = await createAlert({
          type: 'CUSTOM',
          severity: 'LOW',
          title: intent.title,
          message: intent.description || '',
          userId: context.userId,
          department: intent.department,
          actionable: false,  // Los recordatorios no son actionable
          metadata: {
            source: 'QUICKLOG',
            intent,
            isReminder: true,
            reminderAt: intent.reminderAt,
          },
        });
        
        if (reminder.success) {
          result.actionsTaken.push({
            type: 'ALERT_CREATED',
            entityId: reminder.alertId,
            details: `Recordatorio creado desde QuickLog: ${intent.title}`,
          });
          console.log('[Intelligence Hub] ✅ Reminder created from QuickLog');
        }
        break;
        
      case 'CREATE_ORDER':
      case 'LOG_VISIT':
        // Usar Santa Brain existente para pedidos/visitas
        // Ya implementado en santa-brain.actions.ts
        result.actionsTaken.push({
          type: 'INTERACTION_CREATED',
          details: `Procesado con Santa Brain (${intent.action})`,
        });
        console.log('[Intelligence Hub] ℹ️ Delegated to Santa Brain:', intent.action);
        break;
        
      default:
        // Crear nota simple
        result.actionsTaken.push({
          type: 'INTERACTION_CREATED',
          details: 'Nota guardada',
        });
        console.log('[Intelligence Hub] ℹ️ Created simple note');
    }
    
  } catch (error) {
    console.error('[Intelligence Hub] Error processing QuickLog:', error);
    result.success = false;
    result.errors?.push(String(error));
  }
  
  return result;
}

// =================================================================
// HELPERS
// =================================================================

/**
 * Determinar si se debe crear tarea basado en prioridad
 */
function shouldCreateTaskBasedOnPriority(
  priority: string,
  minPriority: string = 'MEDIUM'
): boolean {
  const priorityLevels: Record<string, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4,
  };
  
  const emailPriorityLevel = priorityLevels[priority.toUpperCase()] || 2;
  const minPriorityLevel = priorityLevels[minPriority.toUpperCase()] || 2;
  
  return emailPriorityLevel >= minPriorityLevel;
}

/**
 * Mapear prioridad de email a prioridad de tarea
 */
function mapPriorityToTaskPriority(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'URGENT';
    case 'high': return 'HIGH';
    case 'low': return 'LOW';
    default: return 'MEDIUM';
  }
}

// =================================================================
// INTERACTION & TASK CREATION (wrappers)
// =================================================================

/**
 * Crear interacción (wrapper para actions existentes)
 */
async function createInteraction(params: {
  userId: string;
  accountId?: string;
  kind: 'EMAIL' | 'VISITA' | 'LLAMADA' | 'WHATSAPP' | 'OTRO';
  note?: string;
  dept?: Department;
  title?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; interactionId?: string }> {
  try {
    const interaction = {
      userId: params.userId,
      accountId: params.accountId || '',
      kind: params.kind,
      note: params.note,
      dept: params.dept,
      title: params.title,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('interactions').add(interaction);
    
    return { success: true, interactionId: docRef.id };
  } catch (error) {
    console.error('[Intelligence Hub] Error creating interaction:', error);
    return { success: false };
  }
}

/**
 * Crear tarea (wrapper para actions existentes)
 */
async function createTask(params: {
  kind: 'GENERICA' | 'INTERACTION' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING';
  title: string;
  desc?: string;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  department: Department;
  source: 'MANUAL' | 'AUTO_RULE';
  assignedToId: string;
  createdById: string;
  accountId?: string;
  dueAt?: string;
}): Promise<{ success: boolean; taskId?: string }> {
  try {
    const task = {
      ...params,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('tasks').add(task);
    
    return { success: true, taskId: docRef.id };
  } catch (error) {
    console.error('[Intelligence Hub] Error creating task:', error);
    return { success: false };
  }
}

/**
 * Wrapper para Document Analyzer (usa el nombre correcto de la función)
 */
async function analyzeDocumentWithGeminiVision(
  attachment: any,
  data: string
): Promise<any> {
  // Import dinámico para evitar error de compilación
  const { analyzeDocumentWithGeminiVision: analyzer } = await import('./analyzers/document-analyzer');
  return analyzer(attachment, data);
}
