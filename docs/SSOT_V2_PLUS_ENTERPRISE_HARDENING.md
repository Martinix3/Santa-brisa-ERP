# SSOT V2+ — ENTERPRISE HARDENING
## 15 Bloques para Sistema Audit-Proof y Ops-Ready

**Versión:** 2.6.0 ENTERPRISE  
**Fecha:** 20 de Octubre 2025  
**Añade a:** Plan Greenfield (4 semanas → 5 semanas)  

---

## 0. FILOSOFÍA

Convertir SSOT V2+ de "funcional" a **"enterprise-grade production-ready"** con:

✅ **Seguridad por diseño** (RBAC/ABAC, audit logs inmutables)  
✅ **Observabilidad total** (logs, métricas, trazas, SLOs)  
✅ **Resiliencia** (DR, idempotencia, outbox pattern)  
✅ **Performance** (cache, índices optimizados, cost control)  
✅ **Compliance** (WCAG AA, GDPR, ISO 22000, i18n)  

**Tiempo adicional:** +1 semana  
**Costo adicional:** +€7,000  
**Valor:** Sistema nivel Fortune 500  

---

## 1. SEGURIDAD DE DATOS & PERMISOS (RBAC/ABAC)

### 1.1 Roles Definidos

```typescript
// src/domain/roles.ts
export const ROLES = {
  // Quality
  QUALITY_OPERATOR: 'QUALITY_OPERATOR',     // Ejecuta tests
  QUALITY_MANAGER: 'QUALITY_MANAGER',       // Aprueba/rechaza
  QUALITY_AUDITOR: 'QUALITY_AUDITOR',       // Solo lectura
  
  // Operations
  OPS_OPERATOR: 'OPS_OPERATOR',             // Ejecuta protocolos
  OPS_SUPERVISOR: 'OPS_SUPERVISOR',         // Supervisa
  OPS_MANAGER: 'OPS_MANAGER',               // Gestiona
  
  // Specialized
  MAINTENANCE: 'MAINTENANCE',               // Mantenimiento
  HR: 'HR',                                 // RRHH/Formación
  AUDITOR: 'AUDITOR',                       // Auditorías externas
  
  // Admin
  ADMIN: 'ADMIN'                            // Full access
} as const;

export interface UserProfile {
  uid: string;
  roles: Array<keyof typeof ROLES>;
  attributes: {
    plants?: string[];        // ['SB', 'MAD']
    lines?: string[];         // ['LINE_ENV_01']
    shift?: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  };
}
```

### 1.2 Firestore Rules (RBAC/ABAC)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function hasRole(role) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([role]);
    }
    
    function hasAnyRole(roles) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(roles);
    }
    
    function getUserPlants() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.attributes.plants;
    }
    
    // Quality Plans - Solo QUALITY_MANAGER puede modificar
    match /qualityPlans/{planId} {
      allow read: if hasAnyRole(['QUALITY_OPERATOR', 'QUALITY_MANAGER', 'QUALITY_AUDITOR']);
      allow create, update: if hasRole('QUALITY_MANAGER');
      allow delete: if hasRole('ADMIN');
    }
    
    // Quality Releases - ABAC por locationId
    match /qualityReleases/{releaseId} {
      allow read: if hasAnyRole(['QUALITY_OPERATOR', 'QUALITY_MANAGER', 'QUALITY_AUDITOR', 'AUDITOR']);
      allow create: if hasAnyRole(['QUALITY_OPERATOR', 'QUALITY_MANAGER']) &&
                       request.resource.data.schemaVersion >= 1;
      allow update: if hasRole('QUALITY_MANAGER');
      allow delete: if false; // Immutable
    }
    
    // Documents - Control estricto
    match /documents/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       request.resource.data.createdBy == request.auth.uid &&
                       request.resource.data.schemaVersion == 2;
      allow update: if hasAnyRole(['QUALITY_MANAGER', 'OPS_MANAGER', 'HR']) &&
                       // Solo cambiar status si hay approval
                       (request.resource.data.status != 'APPROVED' || 
                        request.resource.data.approvals.size() > resource.data.approvals.size());
      allow delete: if false; // Solo RETIRED, no delete
    }
    
    // Production Protocols - Solo managers publican
    match /productionProtocols/{protocolId} {
      allow read: if request.auth != null;
      allow create, update: if hasAnyRole(['QUALITY_MANAGER', 'OPS_MANAGER']);
      allow delete: if hasRole('ADMIN');
    }
    
    // Protocol Runs - ABAC por locationId/orderId
    match /productionProtocolRuns/{runId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       request.resource.data.status == 'OPEN';
      allow update: if request.auth != null &&
                       (resource.data.status == 'OPEN' || resource.data.status == 'BLOCKED');
      allow delete: if false;
    }
    
    // Analysis Methods/Parameters - Solo QUALITY_MANAGER
    match /analysisMethods/{methodId} {
      allow read: if request.auth != null;
      allow write: if hasRole('QUALITY_MANAGER');
    }
    
    match /analysisParameters/{paramId} {
      allow read: if request.auth != null;
      allow write: if hasRole('QUALITY_MANAGER');
    }
    
    // Gemini Analyses - Read-only excepto resolver
    match /geminiAnalyses/{analysisId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid != null; // System can create
      allow update: if hasAnyRole(['QUALITY_MANAGER', 'OPS_MANAGER']) &&
                       // Solo cambiar status a RESOLVED
                       request.resource.data.status == 'RESOLVED';
      allow delete: if false;
    }
    
    // Tasks - ABAC por assignedTo
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.assignedTo ||
                       hasAnyRole(['QUALITY_MANAGER', 'OPS_MANAGER']);
      allow delete: if false;
    }
    
    // Audit Logs - Immutable, read-only
    match /auditLogs/{logId} {
      allow read: if hasAnyRole(['QUALITY_MANAGER', 'OPS_MANAGER', 'AUDITOR', 'ADMIN']);
      allow write: if false; // Solo server-side
    }
  }
}
```

---

## 2. AUDITORÍA INMUTABLE (Audit Logs + Hash Chain)

### 2.1 Collection: auditLogs

```typescript
interface AuditLog {
  id: string;
  
  // ENTIDAD AUDITADA
  entity: {
    type: 'lot' | 'qualityRelease' | 'document' | 'protocolRun' | 'onHand';
    id: string;
  };
  
  // ACCIÓN
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SIGN' | 'TRANSFER_BUCKET' | 'RETIRE';
  
  // USUARIO Y CONTEXTO
  by: string;                 // userId
  at: Date;
  ip?: string;
  userAgent?: string;
  
  // CAMBIOS
  diff?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  
  // HASH CHAIN (inmutabilidad)
  prevHash?: string;          // Hash del log anterior
  hash: string;               // SHA256(prevHash + entity + action + by + at + diff)
  
  // METADATOS
  correlationId?: string;     // Para agrupar transacción
  
  schemaVersion: 1;
}
```

### 2.2 AuditService

```typescript
// src/services/canonical/audit.service.ts

import crypto from 'crypto';

export class AuditService {
  /**
   * Crear audit log con hash chain
   * DEBE llamarse dentro de cada transacción crítica
   */
  static async createAuditLog(
    tx: FirebaseFirestore.Transaction,
    params: {
      entity: AuditLog['entity'];
      action: AuditLog['action'];
      by: string;
      diff?: AuditLog['diff'];
      ip?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Promise<string> {
    
    // Obtener último hash
    const lastLogSnap = await tx.get(
      db.collection('auditLogs')
        .orderBy('at', 'desc')
        .limit(1)
    );
    
    const prevHash = lastLogSnap.empty ? null : lastLogSnap.docs[0].data().hash;
    
    // Calcular nuevo hash
    const payload = JSON.stringify({
      prevHash,
      entity: params.entity,
      action: params.action,
      by: params.by,
      at: new Date().toISOString(),
      diff: params.diff
    });
    
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    
    // Crear log
    const logRef = db.collection('auditLogs').doc();
    const log: AuditLog = {
      id: logRef.id,
      entity: params.entity,
      action: params.action,
      by: params.by,
      at: new Date(),
      ip: params.ip,
      userAgent: params.userAgent,
      diff: params.diff,
      prevHash,
      hash,
      correlationId: params.correlationId,
      schemaVersion: 1
    };
    
    tx.set(logRef, log);
    
    return logRef.id;
  }
  
  /**
   * Verificar integridad de hash chain
   */
  static async verifyHashChain(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ valid: boolean; brokenAt?: string }> {
    
    let query = db.collection('auditLogs').orderBy('at', 'asc');
    
    if (startDate) query = query.where('at', '>=', startDate);
    if (endDate) query = query.where('at', '<=', endDate);
    
    const logsSnap = await query.get();
    const logs = logsSnap.docs.map(d => d.data() as AuditLog);
    
    for (let i = 1; i < logs.length; i++) {
      const current = logs[i];
      const previous = logs[i - 1];
      
      if (current.prevHash !== previous.hash) {
        return {
          valid: false,
          brokenAt: current.id
        };
      }
    }
    
    return { valid: true };
  }
}
```

---

## 3. PROTECCIÓN DE DOCUMENTOS

### 3.1 Document Integrity

```typescript
// src/services/canonical/document.service.ts (EXTENDER)

export class DocumentService {
  /**
   * Validar documento aprobado y vigente
   */
  static async validateApprovedAndValid(
    docId: string,
    atDate: Date = new Date()
  ): Promise<{ valid: boolean; reason?: string }> {
    
    const docSnap = await db.doc(`documents/${docId}`).get();
    if (!docSnap.exists) {
      return { valid: false, reason: 'Document not found' };
    }
    
    const doc = docSnap.data() as Document;
    
    // Verificar status
    if (doc.status !== 'APPROVED') {
      return { valid: false, reason: `Document status is ${doc.status}, not APPROVED` };
    }
    
    // Verificar vigencia
    if (doc.validity?.validTo) {
      const validTo = new Date(doc.validity.validTo);
      if (validTo < atDate) {
        return { valid: false, reason: `Document expired on ${validTo.toISOString()}` };
      }
    }
    
    if (doc.validity?.validFrom) {
      const validFrom = new Date(doc.validity.validFrom);
      if (validFrom > atDate) {
        return { valid: false, reason: `Document not yet valid until ${validFrom.toISOString()}` };
      }
    }
    
    // Verificar checksum si existe
    if (doc.sha1) {
      // TODO: Re-calcular SHA1 del archivo y comparar
    }
    
    return { valid: true };
  }
  
  /**
   * Política de retención (auto-purga)
   */
  static async purgeRetiredDocuments(
    retentionYears: number = 5
  ): Promise<{ purged: number }> {
    
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);
    
    const
