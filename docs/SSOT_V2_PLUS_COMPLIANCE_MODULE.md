# SSOT V2+ — MÓDULO DE COMPLIANCE Y PRP
## Programas de Prerrequisitos y Protocolos Regulatorios

**Versión:** 2.3.0  
**Fecha:** 20 de Octubre 2025  
**Estado:** EXTENSIÓN OFICIAL - Compliance & PRP  
**Base:** `docs/SSOT_V2_PLUS_ANNEXE_DOCUMENTS_METHODS_PROTOCOLS.md`

---

## 0. RESUMEN EJECUTIVO

Este módulo extiende **Production Protocols** para soportar **PRP (Prerequisite Programs)** y compliance regulatorio:

### Categorías de Compliance
1. **🪳 PLAGAS** - Control de trampas y monitoreo
2. **💧 AGUAS** - Control de aguas potables y proceso
3. **🧽 LIMPIEZA** - Protocolos de higiene y sanitización
4. **🧑‍🏫 FORMACIÓN** - Capacitación y certificación
5. **🌡️ TEMPERATURA** - Monitoreo de cadena de frío
6. **🏭 MANTENIMIENTO** - Mantenimiento preventivo
7. **🔬 CALIBRACIÓN** - Calibración de equipos
8. **📋 AUDITORÍAS** - Auditorías internas y externas

### Características
- ✅ Protocolos programados por frecuencia (DAILY, WEEKLY, MONTHLY, ANNUAL)
- ✅ Recordatorios automáticos vía Tasks
- ✅ Dashboard de compliance con % completado
- ✅ Alertas Gemini por incumplimiento
- ✅ Nuevo tipo de step: INPUT (texto libre)
- ✅ Integración con rol HR para formación

---

## 1. EXTENSIÓN DE PRODUCTION PROTOCOLS

### 1.1 Nuevos Campos en ProductionProtocol

```typescript
interface ProductionProtocol {
  // ... campos existentes ...
  
  // CLASIFICACIÓN COMPLIANCE
  category?: 'PRODUCCION' | 'PLAGAS' | 'AGUAS' | 'LIMPIEZA' | 'FORMACION' | 
             'TEMPERATURA' | 'MANTENIMIENTO' | 'CALIBRACION' | 'AUDITORIA';
  
  // FRECUENCIA PROGRAMADA (para PRP)
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ON_DEMAND';
  
  // CONFIGURACIÓN DE RECORDATORIOS
  reminder?: {
    enabled: boolean;
    daysBefore: number;       // Días antes de crear task
    assignToRole?: 'QUALITY' | 'OPERATIONS' | 'MAINTENANCE' | 'HR';
  };
  
  // REGULATORIO
  regulatoryRef?: string;     // Ej: "ISO 22000:2018 § 7.2.1"
  isMandatory: boolean;       // Si es obligatorio por ley/norma
  
  // ... resto de campos ...
}
```

---

### 1.2 Nuevo Tipo de Step: INPUT

```typescript
interface ProductionProtocol {
  steps: Array<{
    // ... campos existentes ...
    
    // NUEVO TIPO
    kind: 'CHECK' | 'MEASURE' | 'VERIFY_DOC' | 'PHOTO' | 'SIGN' | 'INPUT';
    
    rule?: {
      // ... reglas existentes ...
      
      // NUEVA REGLA: INPUT
      input?: {
        placeholder?: string;     // Ej: "Ej. trampa 3: captura mosca"
        maxLength?: number;       // Máximo de caracteres
        pattern?: string;         // Regex opcional para validación
        multiline?: boolean;      // Si permite múltiples líneas
      };
    };
  }>;
}
```

---

### 1.3 Esquema Zod Actualizado

```typescript
// src/domain/ssot-v2-schemas.ts

export const ProductionProtocolSchemaV2 = z.object({
  id: z.string(),
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  version: z.number().int().min(1),
  
  // NUEVO
  category: z.enum([
    'PRODUCCION', 'PLAGAS', 'AGUAS', 'LIMPIEZA', 'FORMACION',
    'TEMPERATURA', 'MANTENIMIENTO', 'CALIBRACION', 'AUDITORIA'
  ]).optional(),
  
  frequency: z.enum([
    'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ON_DEMAND'
  ]).optional(),
  
  reminder: z.object({
    enabled: z.boolean(),
    daysBefore: z.number().int().min(0),
    assignToRole: z.enum(['QUALITY', 'OPERATIONS', 'MAINTENANCE', 'HR']).optional()
  }).optional(),
  
  regulatoryRef: z.string().optional(),
  isMandatory: z.boolean(),
  
  steps: z.array(z.object({
    id: z.string(),
    order: z.number().int(),
    title: z.string(),
    description: z.string().optional(),
    required: z.boolean(),
    
    kind: z.enum(['CHECK', 'MEASURE', 'VERIFY_DOC', 'PHOTO', 'SIGN', 'INPUT']), // NUEVO INPUT
    
    rule: z.object({
      measure: z.object({
        parameterId: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        unit: z.string().optional()
      }).optional(),
      
      doc: z.object({
        type: z.string(),
        mustBeApproved: z.boolean(),
        mustBeValid: z.boolean()
      }).optional(),
      
      photo: z.object({
        minPhotos: z.number().int().min(1),
        maxPhotos: z.number().int().optional()
      }).optional(),
      
      sign: z.object({
        role: z.enum(['OPERATOR', 'SUPERVISOR', 'QUALITY', 'MANAGER', 'HR']), // NUEVO HR
        requiresComment: z.boolean()
      }).optional(),
      
      // NUEVA REGLA
      input: z.object({
        placeholder: z.string().optional(),
        maxLength: z.number().int().optional(),
        pattern: z.string().optional(),
        multiline: z.boolean().optional()
      }).optional()
    }).optional()
  })),
  
  appliesTo: z.object({
    itemIds: z.array(z.string()).optional(),
    formulaIds: z.array(z.string()).optional(),
    lineIds: z.array(z.string()).optional(),
    orderTypes: z.array(z.enum(['STANDARD', 'REWORK', 'SAMPLE'])).optional()
  }).optional(),
  
  status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
  retiredReason: z.string().optional(),
  supersededBy: z.string().optional(),
  
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  updatedBy: z.string().optional(),
  publishedAt: z.date().optional(),
  publishedBy: z.string().optional(),
  
  schemaVersion: z.literal(1)
});
```

---

## 2. COLLECTION: complianceSchedule

Para gestionar la programación automática de PRPs:

```typescript
// Collection: complianceSchedule
interface ComplianceSchedule {
  id: string;
  
  // PROTOCOLO
  protocolId: string;
  protocolCode: string;
  protocolName: string;
  category: ProductionProtocol['category'];
  frequency: ProductionProtocol['frequency'];
  
  // PRÓXIMA EJECUCIÓN
  nextDueDate: Date;
  lastCompletedDate?: Date;
  lastRunId?: string;          // FK a productionProtocolRuns
  
  // ESTADO
  status: 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'PAUSED';
  
  // ASIGNACIÓN
  assignedToRole?: string;
  assignedToUser?: string;
  
  // RECORDATORIO
  reminderTaskId?: string;     // FK a tasks si reminder activo
  
  // AUDITORÍA
  createdAt: Date;
  updatedAt: Date;
  
  schemaVersion: 1;
}
```

**Índices:**
```javascript
{
  "indexes": [
    {
      "collectionGroup": "complianceSchedule",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "nextDueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "complianceSchedule",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "nextDueDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 3. SERVICIO: ComplianceService

```typescript
// src/services/canonical/compliance.service.ts

export class ComplianceService {
  /**
   * Crear programación para protocolo PRP
   */
  static async scheduleProtocol(
    protocolId: string
  ): Promise<string> {
    
    const protocolSnap = await db.doc(`productionProtocols/${protocolId}`).get();
    if (!protocolSnap.exists) {
      throw new Error(`Protocol ${protocolId} not found`);
    }
    
    const protocol = protocolSnap.data() as ProductionProtocol;
    
    if (!protocol.frequency) {
      throw new Error('Protocol must have frequency defined for scheduling');
    }
    
    // Calcular próxima fecha
    const nextDueDate = ComplianceService.calculateNextDueDate(
      new Date(),
      protocol.frequency
    );
    
    const scheduleRef = db.collection('complianceSchedule').doc();
    const schedule: ComplianceSchedule = {
      id: scheduleRef.id,
      protocolId: protocol.id,
      protocolCode: protocol.code,
      protocolName: protocol.name,
      category: protocol.category,
      frequency: protocol.frequency,
      nextDueDate,
      status: 'SCHEDULED',
      assignedToRole: protocol.reminder?.assignToRole,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    };
    
    await scheduleRef.set(schedule);
    
    // Crear reminder task si está habilitado
    if (protocol.reminder?.enabled) {
      await ComplianceService.createReminderTask(schedule, protocol);
    }
    
    return scheduleRef.id;
  }
  
  /**
   * Calcular próxima fecha según frecuencia
   */
  static calculateNextDueDate(
    from: Date,
    frequency: ComplianceSchedule['frequency']
  ): Date {
    
    const next = new Date(from);
    
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'ANNUAL':
        next.setFullYear(next.getFullYear() + 1);
        break;
      case 'ON_DEMAND':
        // No programar automáticamente
        break;
    }
    
    return next;
  }
  
  /**
   * Crear task de recordatorio
   */
  static async createReminderTask(
    schedule: ComplianceSchedule,
    protocol: ProductionProtocol
  ): Promise<string> {
    
    if (!protocol.reminder?.enabled) return '';
    
    const dueDate = new Date(schedule.nextDueDate);
    dueDate.setDate(dueDate.getDate() - (protocol.reminder.daysBefore || 0));
    
    const taskRef = db.collection('tasks').doc();
    const task = {
      id: taskRef.id,
      kind: 'QC',
      title: `[Recordatorio] ${protocol.name}`,
      description: `Protocolo ${protocol.code} debe ejecutarse el ${schedule.nextDueDate.toLocaleDateString()}`,
      linkedEntity: {
        type: 'protocol',
        id: protocol.id
      },
      dueAt: dueDate,
      priority: protocol.isMandatory ? 'HIGH' : 'MEDIUM',
      assignedToRole: protocol.reminder.assignToRole,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'SYSTEM',
      schemaVersion: 1
    };
    
    await taskRef.set(task);
    
    // Actualizar schedule con taskId
    await db.doc(`complianceSchedule/${schedule.id}`).update({
      reminderTaskId: taskRef.id
    });
    
    return taskRef.id;
  }
  
  /**
   * Completar protocolo y reprogramar
   */
  static async completeAndReschedule(
    scheduleId: string,
    runId: string
  ): Promise<void> {
    
    const scheduleRef = db.doc(`complianceSchedule/${scheduleId}`);
    const scheduleSnap = await scheduleRef.get();
    
    if (!scheduleSnap.exists) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    const schedule = scheduleSnap.data() as ComplianceSchedule;
    
    // Calcular próxima fecha
    const nextDueDate = ComplianceService.calculateNextDueDate(
      new Date(),
      schedule.frequency
    );
    
    // Actualizar schedule
    await scheduleRef.update({
      lastCompletedDate: new Date(),
      lastRunId: runId,
      nextDueDate,
      status: 'SCHEDULED',
      updatedAt: new Date()
    });
    
    // Cerrar task de recordatorio anterior si existe
    if (schedule.reminderTaskId) {
      await db.doc(`tasks/${schedule.reminderTaskId}`).update({
        status: 'DONE',
        completedAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Crear nuevo recordatorio
    const protocolSnap = await db.doc(`productionProtocols/${schedule.protocolId}`).get();
    const protocol = protocolSnap.data() as ProductionProtocol;
    
    if (protocol.reminder?.enabled) {
      await ComplianceService.createReminderTask(
        { ...schedule, nextDueDate },
        protocol
      );
    }
  }
  
  /**
   * Job diario: Actualizar estados y crear alertas
   */
  static async updateComplianceStatuses(): Promise<void> {
    
    const now = new Date();
    const schedulesSnap = await db.collection('complianceSchedule')
      .where('status', 'in', ['SCHEDULED', 'DUE'])
      .get();
    
    const batch = db.batch();
    const alertsToCreate: GeminiAnalysis[] = [];
    
    for (const scheduleDoc of schedulesSnap.docs) {
      const schedule = scheduleDoc.data() as ComplianceSchedule;
      const dueDate = new Date(schedule.nextDueDate);
      
      // Si ya pasó la fecha: OVERDUE
      if (dueDate < now && schedule.status !== 'OVERDUE') {
        batch.update(scheduleDoc.ref, {
          status: 'OVERDUE',
          updatedAt: now
        });
        
        // Crear alerta Gemini
        alertsToCreate.push({
          id: `ALERT_${Date.now()}_${schedule.id}`,
          phase: 'QUALITY',
          signal: 'compliance_overdue',
          severity: schedule.category === 'PLAGAS' || schedule.category === 'AGUAS' ? 'critical' : 'warning',
          detectedAt: now,
          linkedEntity: {
            type: 'protocol',
            id: schedule.protocolId
          },
          status: 'OPEN',
          autoAction: 'CREATE_TASK',
          data: {
            scheduleId: schedule.id,
            protocolCode: schedule.protocolCode,
            category: schedule.category,
            daysOverdue: Math.floor((now.getTime() - dueDate.getTime()) / (1000*60*60*24))
          },
          schemaVersion: 1
        });
      }
      
      // Si es hoy: DUE
      else if (dueDate.toDateString() === now.toDateString() && schedule.status !== 'DUE') {
        batch.update(scheduleDoc.ref, {
          status: 'DUE',
          updatedAt: now
        });
      }
    }
    
    await batch.commit();
    
    // Crear alertas
    for (const alert of alertsToCreate) {
      await db.collection('geminiAnalyses').doc(alert.id).set(alert);
    }
  }
}
```

---

## 4. PROTOCOLOS DE EJEMPLO

### 4.1 🪳 Control de Plagas

```json
{
  "code": "PROC-PLAGAS-001",
  "name": "Control de trampas y monitoreo de plagas",
  "description": "Revisión mensual de trampas físicas y registro de incidencias",
  "version": 1,
  "category": "PLAGAS",
  "frequency": "MONTHLY",
  "isMandatory": true,
  "regulatoryRef": "ISO 22000:2018 § 7.2.3 / APPCC PCC3",
  "reminder": {
    "enabled": true,
    "daysBefore": 3,
    "assignToRole": "QUALITY"
  },
  "steps": [
    {
      "id": "PL1",
      "order": 1,
      "title": "Revisar trampas físicas",
      "description": "Verificar estado de todas las trampas en planta",
      "required": true,
      "kind": "CHECK"
    },
    {
      "id": "PL2",
      "order": 2,
      "title": "Registrar incidencias",
      "description": "Documentar cualquier captura o anomalía encontrada",
      "required": false,
      "kind": "INPUT",
      "rule": {
        "input": {
          "placeholder": "Ej. trampa 3: captura mosca | trampa 7: OK",
          "maxLength": 500,
          "multiline": true
        }
      }
    },
    {
      "id": "PL3",
      "order": 3,
      "title": "Subir informe proveedor externo",
      "description": "Certificado mensual del servicio de control de plagas",
      "required": true,
      "kind": "VERIFY_DOC",
      "rule": {
        "doc": {
          "type": "CERTIFICATE",
          "mustBeApproved": true,
          "mustBeValid": true
        }
      }
    }
  ],
  "status": "ACTIVE"
}
```

---

### 4.2 💧 Control de Aguas

```json
{
  "code": "PROC-AGUAS-001",
  "name": "Control de aguas potables y de proceso",
  "description": "Verificación semanal de parámetros de agua",
  "version": 1,
  "category": "AGUAS",
  "frequency": "WEEKLY",
  "isMandatory": true,
  "regulatoryRef": "RD 140/2003 Aguas de consumo",
  "reminder": {
    "enabled": true,
    "daysBefore": 1,
    "assignToRole": "QUALITY"
  },
  "steps": [
    {
      "id": "AG1",
      "order": 1,
      "title": "Medir cloro libre residual",
      "description": "Medición con kit colorimétrico DPD",
      "required": true,
      "kind": "MEASURE",
      "rule": {
        "measure": {
          "min": 0.2,
          "max": 1.0,
          "unit": "mg/L"
        }
      }
    },
    {
      "id": "AG2",
      "order": 2,
      "title": "Adjuntar resultado laboratorio externo",
      "description": "Análisis microbiológico y físico-químico mensual",
      "required": false,
      "kind": "VERIFY_DOC",
      "rule": {
        "doc": {
          "type": "COA",
          "mustBeApproved": true,
          "mustBeValid": true
        }
      }
    }
  ],
  "status": "ACTIVE"
}
```

---

### 4.3 🧽 Limpieza de Líneas

```json
{
  "code": "PROC-LIMP-DIARIO",
  "name": "Limpieza de líneas de envasado",
  "description": "Protocolo diario de higiene y sanitización",
  "version": 1,
  "category": "LIMPIEZA",
  "frequency": "DAILY",
  "isMandatory": true,
  "regulatoryRef": "ISO 22000:2018 § 8.2 / SSOP",
  "reminder": {
    "enabled": false
  },
  "steps": [
    {
      "id": "L1",
      "order": 1,
      "title": "Confirmar limpieza externa",
      "description": "Verificar limpieza visual de superficies",
      "required": true,
      "kind": "CHECK"
    },
    {
      "id": "L2",
      "order": 2,
      "title": "Registrar detergente y concentración",
      "description": "Documentar producto y dilución utilizada",
      "required": true,
      "kind": "INPUT",
      "rule": {
        "input": {
          "placeholder": "Ej. 2% NaOH | 1.5% detergente enzimático",
          "maxLength": 100
        }
      }
    },
    {
      "id": "L3",
      "order": 3,
      "title": "Subir foto línea limpia",
      "description": "Evidencia fotográfica post-limpieza",
      "required": true,
      "kind": "PHOTO",
      "rule": {
        "photo": {
          "minPhotos": 2,
          "maxPhotos": 5
        }
      }
    },
    {
      "id": "L4",
      "order": 4,
      "title": "Firma operario",
      "description": "Confirmación de ejecución por operario",
      "required": true,
      "kind": "SIGN",
      "rule": {
        "sign": {
          "role": "OPERATOR",
          "requiresComment": false
        }
      }
    },
    {
      "id": "L5",
      "order": 5,
      "title": "Firma supervisor QC",
      "description": "Verificación por supervisor de calidad",
      "required": true,
      "kind": "SIGN",
      "rule": {
        "sign": {
          "role": "QUALITY",
          "requiresComment": false
        }
      }
    }
  ],
  "appliesTo": {
    "lineIds": ["LINE_ENV_01", "LINE_ENV_02"]
  },
  "status": "ACTIVE"
}
```

---

### 4.4 🧑‍🏫 Formación

```json
{
  "code": "PROC-FORM-001",
  "name": "Registro de formación de operarios",
  "description": "Registro anual de capacitación obligatoria",
  "version": 1,
  "category": "FORMACION",
  "frequency": "ANNUAL",
  "isMandatory": true,
  "regulatoryRef": "ISO 22000:2018 § 7.3",
  "reminder": {
    "enabled": true,
    "daysBefore": 30,
    "assignToRole": "HR"
  },
  "steps": [
    {
      "id": "F1",
      "order": 1,
      "title": "Registrar asistentes",
      "description": "Lista de trabajadores que asistieron a la formación",
      "required": true,
      "kind": "INPUT",
      "rule": {
        "input": {
          "placeholder": "Juan Pérez, María García, Pedro López...",
          "maxLength": 1000,
          "multiline": true
        }
      }
    },
    {
      "id": "F2",
      "order": 2,
      "title": "Adjuntar lista firmada",
      "description": "Documento con firmas originales de asistentes",
      "required": true,
      "kind": "VERIFY_DOC",
      "rule": {
        "doc": {
          "type": "OTHER",
          "mustBeApproved": false,
          "mustBeValid": false
        }
      }
    },
    {
      "id": "F3",
      "order": 3,
      "title": "Firma responsable de RRHH",
      "description": "Validación final por recursos humanos",
      "required": true,
      "kind": "SIGN",
      "rule": {
        "sign": {
          "role": "HR",
          "requiresComment": true
        }
      }
    }
  ],
  "status": "ACTIVE"
}
```

---

## 5. DASHBOARD DE COMPLIANCE

### 5.1 ComplianceDashboard Component

```tsx
// src/app/(app)/compliance/dashboard/ComplianceDashboardClient.tsx

export function ComplianceDashboardClient({
  schedules,
  overdueCount,
  dueToday
}: Props) {
  
  const categories = groupBy(schedules, 'category');
  
  return (
    <div className="sb-page">
      <ModuleHeader title="Compliance & PRP" icon={ShieldCheck}>
        <SBButton variant="primary" href="/compliance/protocols">
          Ver Protocolos
        </SBButton>
      </ModuleHeader>
      
      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* KPIs */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              label="Vencidos"
              value={overdueCount}
              tone="destructive"
              icon={AlertTriangle}
            />
            <KPICard
              label="Hoy"
              value={dueToday}
              tone="warning"
              icon={Clock}
            />
            <KPICard
              label="Programados"
              value={schedules.filter(s => s.status === 'SCHEDULED').length}
              tone="success"
              icon={Calendar}
            />
            <KPICard
              label="% Cumplimiento"
              value={`${calculateCompliance(schedules)}%`}
              tone="info"
              icon={Target}
            />
          </section>
          
          {/* Por Categoría */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(categories).map(([category, schedules]) => (
              <CategoryCard
                key={category}
                category={category as ComplianceSchedule['category']}
                schedules={schedules}
              />
            ))}
          </section>
          
          {/* Timeline de próximos */}
          <section className="sb-glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Próximos 30 días</h3>
            <ComplianceTimeline schedules={schedules} />
          </section>
        </div>
      </main>
    </div>
  );
}

function CategoryCard({ category, schedules }: {
  category: ComplianceSchedule['category'];
  schedules: ComplianceSchedule[];
}) {
  
  const config = {
    PLAGAS: { icon: Bug, color: 'stage-orange', label: 'Plagas' },
    AGUAS: { icon: Droplet, color: 'stage-blue', label: 'Aguas' },
    LIMPIEZA: { icon: Sparkles, color: 'stage-green', label: 'Limpieza' },
    FORMACION: { icon: GraduationCap, color: 'stage-purple', label: 'Formación' },
    TEMPERATURA: { icon: Thermometer, color: 'stage-blue', label: 'Temperatura' },
    MANTENIMIENTO: { icon: Wrench, color: 'stage-gray', label: 'Mantenimiento' },
    CALIBRACION: { icon: Gauge, color: 'stage-yellow', label: 'Calibración' },
    AUDITORIA: { icon: ClipboardCheck, color: 'stage-red', label: 'Auditorías' }
  }[category];
  
  const overdue = schedules.filter(s => s.status === 'OVERDUE').length;
  const due = schedules.filter(s => s.status === 'DUE').length;
  const total = schedules.length;
  const Icon = config.icon;
  
  return (
    <article className="sb-glass rounded-2xl border border-border/40 p-4">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl sb-badge--${config.color} grid place-items-center`}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-semibold">{config.label}</h4>
            <p className="text-xs text-muted-foreground">{total} protocolos</p>
          </div>
        </div>
        {overdue > 0 && (
          <span className="sb-badge sb-badge--destructive">{overdue} vencidos</span>
        )}
      </header>
      
      <div className="space-y-2">
        {schedules.slice(0, 3).map(schedule => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>
    </article>
  );
}
```

---

## 6. CONCLUSIÓN

**SSOT V2+ Compliance Module** unifica gestión de PRP y protocolos regulatorios:

✅ **8 categorías de compliance** (Plagas, Aguas, Limpieza, Formación, etc.)  
✅ **Programación automática** con recordatorios  
✅ **Dashboard centralizado** con KPIs en tiempo real  
✅ **Nuevo step type INPUT** para registros de texto libre  
✅ **Alertas Gemini** por incumplimiento  
✅ **Integración con rol HR** para formación  
✅ **Trazabilidad completa** de ejecución de protocolos  

**Próximos Pasos:**
1. Seed protocolos iniciales (4 protocolos PRP)
2. Programar schedules automáticos
3. Setup cron job diario
4. Implementar dashboard UI
5. Training de usuarios

**Tiempo Estimado:** 4 semanas  
**Recursos:** 1 dev backend + 1 dev frontend  

---

**Preparado por:** Cline AI Assistant  
**Fecha:** 20 de Octubre 2025  
**Versión:** 2.3.0  
**Estado:** OFICIAL - Ready for Implementation
