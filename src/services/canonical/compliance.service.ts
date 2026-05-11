// src/services/canonical/compliance.service.ts
// SSOT V2+ Compliance Service - Protocol Scheduling & Compliance Management
// Greenfield Implementation

import { adminDb as db } from '@/server/firebase';
import {
  ComplianceSchedule,
  ProductionProtocol,
  assertSchema,
  ComplianceScheduleSchema,
} from '@/domain/ssot-v2-plus-schemas';

export class ComplianceService {
  /**
   * Schedule a protocol for recurring compliance
   */
  static async scheduleProtocol(protocolId: string): Promise<string> {
    const pSnap = await db.doc(`productionProtocols/${protocolId}`).get();
    
    if (!pSnap.exists) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }
    
    const protocol = pSnap.data() as ProductionProtocol;
    
    if (!protocol.frequency) {
      throw new Error('Protocol frequency required for scheduling');
    }
    
    if (protocol.frequency === 'PER_BATCH' || protocol.frequency === 'ON_DEMAND') {
      throw new Error(`Cannot schedule ${protocol.frequency} protocols automatically`);
    }
    
    const nextDue = this.calculateNextDueDate(new Date(), protocol.frequency);
    
    const sRef = db.collection('complianceSchedule').doc();
    const schedule: ComplianceSchedule = {
      id: sRef.id,
      protocolId: protocol.id,
      protocolCode: protocol.code,
      protocolName: protocol.name,
      category: protocol.category,
      frequency: protocol.frequency,
      nextDueDate: nextDue,
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(ComplianceScheduleSchema, schedule, 'ComplianceSchedule');
    
    await sRef.set(schedule);
    
    // Create reminder task if enabled
    if (protocol.reminder?.enabled) {
      await this.createReminderTask(schedule, protocol);
    }
    
    return sRef.id;
  }

  /**
   * Calculate next due date based on frequency
   */
  static calculateNextDueDate(
    from: Date,
    frequency: NonNullable<ProductionProtocol['frequency']>
  ): Date {
    const d = new Date(from);
    
    switch (frequency) {
      case 'DAILY':
        d.setDate(d.getDate() + 1);
        break;
      case 'WEEKLY':
        d.setDate(d.getDate() + 7);
        break;
      case 'MONTHLY':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'QUARTERLY':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'ANNUAL':
        d.setFullYear(d.getFullYear() + 1);
        break;
      case 'PER_BATCH':
      case 'ON_DEMAND':
        // No automatic scheduling
        break;
    }
    
    return d;
  }

  /**
   * Create reminder task for protocol
   */
  static async createReminderTask(
    schedule: ComplianceSchedule,
    protocol: ProductionProtocol
  ): Promise<string> {
    const due = new Date(schedule.nextDueDate);
    const daysBefore = protocol.reminder?.daysBefore ?? 0;
    due.setDate(due.getDate() - daysBefore);
    
    const tRef = db.collection('tasks').doc();
    await tRef.set({
      id: tRef.id,
      kind: 'QC',
      title: `[Recordatorio] ${protocol.name}`,
      description: `Protocolo ${protocol.code} vence el ${schedule.nextDueDate.toISOString().slice(0, 10)}`,
      linkedEntity: { type: 'protocol', id: protocol.id },
      dueAt: due,
      priority: protocol.isMandatory ? 'HIGH' : 'MEDIUM',
      assignedToRole: protocol.reminder?.assignToRole,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'SYSTEM',
      schemaVersion: 1,
    });
    
    // Link task to schedule
    await db.doc(`complianceSchedule/${schedule.id}`).update({
      reminderTaskId: tRef.id,
    });
    
    return tRef.id;
  }

  /**
   * Update schedule after protocol run completion
   */
  static async updateAfterRun(scheduleId: string, runId: string): Promise<void> {
    const sRef = db.doc(`complianceSchedule/${scheduleId}`);
    const sSnap = await sRef.get();
    
    if (!sSnap.exists) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    const schedule = sSnap.data() as ComplianceSchedule;
    
    if (!schedule.frequency) {
      throw new Error('Schedule frequency is required');
    }
    
    // Calculate next due date
    const nextDue = this.calculateNextDueDate(new Date(), schedule.frequency);
    
    await sRef.update({
      lastCompletedDate: new Date(),
      lastRunId: runId,
      nextDueDate: nextDue,
      status: 'SCHEDULED',
      updatedAt: new Date(),
    });
    
    // Create new reminder task if protocol has reminders
    const pSnap = await db.doc(`productionProtocols/${schedule.protocolId}`).get();
    if (pSnap.exists) {
      const protocol = pSnap.data() as ProductionProtocol;
      if (protocol.reminder?.enabled) {
        const updatedSchedule = { ...schedule, nextDueDate: nextDue };
        await this.createReminderTask(updatedSchedule, protocol);
      }
    }
  }

  /**
   * Daily job to update compliance statuses
   * Mark protocols as DUE or OVERDUE and create Gemini alerts
   */
  static async updateStatuses(): Promise<void> {
    const now = new Date();
    const snap = await db
      .collection('complianceSchedule')
      .where('status', 'in', ['SCHEDULED', 'DUE'])
      .get();
    
    const batch = db.batch();
    const alerts: any[] = [];
    
    for (const doc of snap.docs) {
      const schedule = doc.data() as ComplianceSchedule;
      const dueDate = new Date(schedule.nextDueDate);
      
      // Mark as OVERDUE if past due date
      if (dueDate < now && schedule.status !== 'OVERDUE') {
        batch.update(doc.ref, {
          status: 'OVERDUE',
          updatedAt: now,
        });
        
        // Create Gemini alert for overdue
        const severity = 
          schedule.category === 'PLAGAS' || schedule.category === 'AGUAS'
            ? 'critical'
            : 'warning';
        
        alerts.push({
          phase: 'QUALITY',
          signal: 'compliance_overdue',
          severity,
          detectedAt: now,
          linkedEntity: { type: 'protocol', id: schedule.protocolId },
          status: 'OPEN',
          data: {
            scheduleId: schedule.id,
            protocolCode: schedule.protocolCode,
            protocolName: schedule.protocolName,
            category: schedule.category,
            dueDate: schedule.nextDueDate,
          },
          schemaVersion: 1,
        });
      }
      // Mark as DUE if due date is today
      else if (
        dueDate.toDateString() === now.toDateString() &&
        schedule.status !== 'DUE'
      ) {
        batch.update(doc.ref, {
          status: 'DUE',
          updatedAt: now,
        });
      }
    }
    
    await batch.commit();
    
    // Create Gemini alerts for overdue protocols
    for (const alert of alerts) {
      await db.collection('geminiAnalyses').add(alert);
    }
  }

  /**
   * Get overdue protocols count by category
   */
  static async getOverdueByCategory(): Promise<Record<string, number>> {
    const snap = await db
      .collection('complianceSchedule')
      .where('status', '==', 'OVERDUE')
      .get();
    
    const counts: Record<string, number> = {};
    
    for (const doc of snap.docs) {
      const schedule = doc.data() as ComplianceSchedule;
      counts[schedule.category] = (counts[schedule.category] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Pause a schedule (e.g., equipment out of service)
   */
  static async pauseSchedule(scheduleId: string, reason: string): Promise<void> {
    await db.doc(`complianceSchedule/${scheduleId}`).update({
      status: 'PAUSED',
      updatedAt: new Date(),
      // Could add pauseReason field if needed
    });
  }

  /**
   * Resume a paused schedule
   */
  static async resumeSchedule(scheduleId: string): Promise<void> {
    const sRef = db.doc(`complianceSchedule/${scheduleId}`);
    const sSnap = await sRef.get();
    
    if (!sSnap.exists) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    const schedule = sSnap.data() as ComplianceSchedule;
    const now = new Date();
    const dueDate = new Date(schedule.nextDueDate);
    
    // Determine new status based on due date
    const status = dueDate < now ? 'OVERDUE' : dueDate.toDateString() === now.toDateString() ? 'DUE' : 'SCHEDULED';
    
    await sRef.update({
      status,
      updatedAt: now,
    });
  }
}
