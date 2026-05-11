# ANEXO SSOT V2+ — Documents, Métodos/Parámetros y Protocolos
## Especificación Técnica de Extensiones Avanzadas

**Versión:** 2.2.0  
**Fecha:** 20 de Octubre 2025  
**Estado:** ANEXO OFICIAL - Extensión de SSOT V2+  
**Base:** `docs/SSOT_V2_PLUS_QUALITY_EXTENSION.md`

---

## 0. RESUMEN EJECUTIVO

Este anexo amplía **SSOT V2+** con 3 subsistemas enterprise:

### 1. **Documents 2.0** - Control Total de Documentación
- Versionado y vigencia temporal
- Workflow de aprobaciones con firma digital
- Checksum para deduplicación
- OCR integrado para COA/SPEC
- Trazabilidad origen (manual, email, API)

### 2. **Analysis Methods & Parameters** - Librería QC Reutilizable
- Catálogo centralizado de métodos de ensayo
- Parámetros tipados vinculados a métodos
- Versionado de métodos/equipos/normas
- Eliminación de parámetros inline

### 3. **Production Protocols** - Checklists Inteligentes
- Protocolos reutilizables con reglas
- Validación automática de pasos críticos
- Bloqueo de órdenes si faltan checks
- Evidencias obligatorias (docs, fotos, firmas)
- Invariantes que previenen cierre sin compliance

---

## 1. DOCUMENTS 2.0 — CONTROL TOTAL

### 1.1 Objetivos

**Problemas que resuelve:**
- ❌ Documentos sin control de versión
- ❌ No hay workflow de aprobación
- ❌ Duplicados silenciosos
- ❌ Sin trazabilidad de origen
- ❌ Vigencias no gestionadas

**Solución:**
- ✅ Versionado automático por entidad+tipo
- ✅ Estados: DRAFT → IN_REVIEW → APPROVED → RETIRED
- ✅ Checksum SHA1 para deduplicación
- ✅ Vigencia temporal con auto-retirement
- ✅ Firmas digitales opcionales
- ✅ OCR integrado para extracción de datos

---

### 1.2 Esquema Canónico

```typescript
// Collection: documents (v2)
interface Document {
  id: string;
  
  // CLASIFICACIÓN
  type: 'COA' | 'SPEC' | 'SOP' | 'PROTOCOL' | 'METHOD' | 'PHOTO' | 'CERTIFICATE' | 'OTHER';
  title: string;
  description?: string;
  tags?: string[];
  
  // ENLACE CANÓNICO (cualquier entidad)
  linkedEntity: {
    type: 'lot' | 'item' | 'order' | 'supplier' | 'protocol' | 'account' | 'none';
    id?: string;
  };
  
  // ARCHIVO
  fileUrl: string;              // Firebase Storage URL
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  sha1?: string;                // Checksum para deduplicación
  
  // VERSIONADO Y CICLO DE VIDA
  version: number;              // Auto-increment por (linkedEntity,type,title)
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RETIRED';
  supersededBy?: string;        // docId de la versión que lo reemplaza
  
  // VIGENCIA TEMPORAL
  validity?: {
    validFrom?: Date;           // Fecha desde cuando es válido
    validTo?: Date;             // Fecha de caducidad
  };
  
  // APROBACIONES Y FIRMAS
  approvals?: Array<{
    by: string;                 // userId
    at: Date;
    role?: 'QUALITY' | 'OPERATIONS' | 'ENGINEERING' | 'MANAGER';
    signatureHash?: string;     // Hash de firma digital opcional
    notes?: string;
  }>;
  
  // ORIGEN Y TRAZABILIDAD
  source: 'manual' | 'gmail' | 'upload' | 'api' | 'ocr';
  uploadedVia?: 'web' | 'mobile' | 'email_parser' | 'automation';
  
  // OCR Y EXTRACCIÓN (para COA, SPEC)
  ocr?: {
    rawText?: string;           // Texto completo extraído
    extracted?: Record<string, unknown>; // Datos estructurados
    quality?: 'low' | 'medium' | 'high';
    confidence?: number;        // 0-100
    engine?: 'tesseract' | 'google_vision' | 'aws_textract';
  };
  
  // AUDITORÍA
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  
  schemaVersion: 2;
}
```

---

### 1.3 Índices Firestore

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "documents",
      "fields": [
        { "fieldPath": "linkedEntity.type", "order": "ASCENDING" },
        { "fieldPath": "linkedEntity.id", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "validity.validTo", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "fields": [
        { "fieldPath": "sha1", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "version", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### 1.4 Reglas de Negocio

```typescript
// src/services/canonical/document.service.ts

export const DocumentInvariants = {
  /**
   * Solo puede haber un documento APPROVED por (linkedEntity, type, title)
   */
  uniqueApproved: (doc: Document, allDocs: Document[]) => {
    if (doc.status !== 'APPROVED') return true;
    
    const conflicts = allDocs.filter(d => 
      d.id !== doc.id &&
      d.status === 'APPROVED' &&
      d.linkedEntity.type === doc.linkedEntity.type &&
      d.linkedEntity.id === doc.linkedEntity.id &&
      d.type === doc.type &&
      d.title === doc.title
    );
    
    return conflicts.length === 0;
  },
  
  /**
   * Documentos expirados deben estar RETIRED
   */
  expiredMustBeRetired: (doc: Document) => {
    if (!doc.validity?.validTo) return true;
    
    const now = new Date();
    const validTo = new Date(doc.validity.validTo);
    
    if (validTo < now && doc.status === 'APPROVED') {
      return false; // Debería estar RETIRED
    }
    
    return true;
  },
  
  /**
   * APPROVED requiere al menos una aprobación
   */
  approvedNeedsApproval: (doc: Document) => {
    if (doc.status !== 'APPROVED') return true;
    return (doc.approvals?.length ?? 0) > 0;
  },
  
  /**
   * No duplicados por SHA1
   */
  noDuplicateSha1: (doc: Document, allDocs: Document[]) => {
    if (!doc.sha1) return true;
    
    const duplicates = allDocs.filter(d => 
      d.id !== doc.id && 
      d.sha1 === doc.sha1 &&
      d.status !== 'RETIRED'
    );
    
    return duplicates.length === 0;
  }
};

export class DocumentService {
  /**
   * Crear nueva versión de documento
   */
  static async createNewVersion(
    tx: FirebaseFirestore.Transaction,
    params: {
      previousDocId: string;
      fileUrl: string;
      sha1?: string;
      updatedBy: string;
    }
  ): Promise<string> {
    
    const prevRef = db.doc(`documents/${params.previousDocId}`);
    const prevSnap = await tx.get(prevRef);
    
    if (!prevSnap.exists) {
      throw new Error(`Document ${params.previousDocId} not found`);
    }
    
    const prevDoc = prevSnap.data() as Document;
    
    // Crear nueva versión
    const newDocRef = db.collection('documents').doc();
    const newDoc: Document = {
      ...prevDoc,
      id: newDocRef.id,
      version: prevDoc.version + 1,
      fileUrl: params.fileUrl,
      sha1: params.sha1,
      status: 'DRAFT',
      approvals: [],
      createdAt: new Date(),
      createdBy: params.updatedBy,
      updatedAt: new Date(),
      updatedBy: params.updatedBy,
      schemaVersion: 2
    };
    
    tx.set(newDocRef, newDoc);
    
    // Marcar anterior como superseded
    tx.update(prevRef, {
      supersededBy: newDocRef.id,
      updatedAt: new Date()
    });
    
    return newDocRef.id;
  }
  
  /**
   * Aprobar documento
   */
  static async approveDocument(
    tx: FirebaseFirestore.Transaction,
    params: {
      docId: string;
      approvedBy: string;
      role: Document['approvals'][0]['role'];
      signatureHash?: string;
      notes?: string;
    }
  ): Promise<void> {
    
    const docRef = db.doc(`documents/${params.docId}`);
    const docSnap = await tx.get(docRef);
    
    if (!docSnap.exists) {
      throw new Error(`Document ${params.docId} not found`);
    }
    
    const doc = docSnap.data() as Document;
    
    if (doc.status === 'APPROVED') {
      throw new Error('Document already approved');
    }
    
    const approval = {
      by: params.approvedBy,
      at: new Date(),
      role: params.role,
      signatureHash: params.signatureHash,
      notes: params.notes
    };
    
    const approvals = [...(doc.approvals || []), approval];
    
    tx.update(docRef, {
      status: 'APPROVED',
      approvals,
      updatedAt: new Date(),
      updatedBy: params.approvedBy
    });
    
    // Si hay vigencia, programar auto-retirement
    if (doc.validity?.validTo) {
      // TODO: Crear scheduled job
    }
  }
  
  /**
   * Buscar duplicados por SHA1
   */
  static async findDuplicateBySha1(sha1: string): Promise<Document | null> {
    const snapshot = await db.collection('documents')
      .where('sha1', '==', sha1)
      .where('status', '!=', 'RETIRED')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Document;
  }
}
```

---

### 1.5 Esquema Zod

```typescript
// src/domain/ssot-v2-schemas.ts

export const DocumentSchemaV2 = z.object({
  id: z.string(),
  type: z.enum(['COA', 'SPEC', 'SOP', 'PROTOCOL', 'METHOD', 'PHOTO', 'CERTIFICATE', 'OTHER']),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  linkedEntity: z.object({
    type: z.enum(['lot', 'item', 'order', 'supplier', 'protocol', 'account', 'none']),
    id: z.string().optional()
  }),
  
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  sha1: z.string().length(40).optional(),
  
  version: z.number().int().min(1),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'RETIRED']),
  supersededBy: z.string().optional(),
  
  validity: z.object({
    validFrom: z.date().optional(),
    validTo: z.date().optional()
  }).optional(),
  
  approvals: z.array(z.object({
    by: z.string(),
    at: z.date(),
    role: z.enum(['QUALITY', 'OPERATIONS', 'ENGINEERING', 'MANAGER']).optional(),
    signatureHash: z.string().optional(),
    notes: z.string().optional()
  })).optional(),
  
  source: z.enum(['manual', 'gmail', 'upload', 'api', 'ocr']),
  uploadedVia: z.enum(['web', 'mobile', 'email_parser', 'automation']).optional(),
  
  ocr: z.object({
    rawText: z.string().optional(),
    extracted: z.record(z.unknown()).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    confidence: z.number().min(0).max(100).optional(),
    engine: z.enum(['tesseract', 'google_vision', 'aws_textract']).optional()
  }).optional(),
  
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(2)
});
```

---

## 2. ANALYSIS METHODS & PARAMETERS — LIBRERÍA QC

### 2.1 Objetivos

**Problemas que resuelve:**
- ❌ Métodos duplicados o inconsistentes
- ❌ Parámetros inline sin trazabilidad
- ❌ No hay catálogo central
- ❌ Cambios de equipo/método no versionados
- ❌ Sin referencia a normas/SOPs

**Solución:**
- ✅ Catálogo centralizado de métodos
- ✅ Parámetros vinculados a métodos
- ✅ Versionado de métodos/equipos
- ✅ Referencias a normas y documentos
- ✅ Templates de límites reutilizables

---

### 2.2 Esquemas Canónicos

```typescript
// Collection: analysisMethods
interface AnalysisMethod {
  id: string;
  
  // IDENTIFICACIÓN
  code: string;                   // "PH-001", "VISC-BROOK-01"
  name: string;                   // "pH (Potenciómetro)"
  description?: string;
  
  // EQUIPO Y PROCEDIMIENTO
  equipment?: string;             // "Metrohm 827 pH lab"
  equipmentId?: string;           // FK a equipments (futuro)
  procedure?: string;             // Descripción breve
  
  // REFERENCIA NORMATIVA
  reference?: string;             // "ISO 9001:2015", "SOP-QC-001"
  documentId?: string;            // FK a documents (METHOD/SOP)
  
  // UNIDAD Y LÍMITES DEFAULT
  unit?: string;                  // "pH units", "cP", "°C"
  limitsTemplate?: {
    min?: number;
    max?: number;
    target?: number;
  };
  
  // CRITICIDAD
  isCriticalByDefault: boolean;   // Si parámetros que lo usan son críticos
  
  // LIFECYCLE
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'RETIRED';
  version: number;
  retiredReason?: string;
  supersededBy?: string;          // methodId que lo reemplaza
  
  // AUDITORÍA
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  
  schemaVersion: 1;
}

// Collection: analysisParameters
interface AnalysisParameter {
  id: string;
  
  // IDENTIFICACIÓN
  code: string;                   // "PH", "VISC", "COLOR_L"
  name: string;                   // "pH", "Viscosidad", "Color L*"
  description?: string;
  
  // MÉTODO ASOCIADO
  methodId: string;               // FK a analysisMethods
  
  // UNIDAD (puede override del método)
  unit?: string;                  // "pH units", "cP"
  
  // LÍMITES (pueden override del template)
  limits?: {
    min?: number;
    max?: number;
    target?: number;
  };
  
  // CRITICIDAD
  isCritical: boolean;            // Si falla, bloquea aprobación
  
  // APLICABILIDAD
  appliesToScopes?: Array<'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE'>;
  
  // LIFECYCLE
  status: 'ACTIVE' | 'RETIRED';
  version: number;
  retiredReason?: string;
  supersededBy?: string;          // parameterId que lo reemplaza
  
  // AUDITORÍA
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  
  schemaVersion: 1;
}
```

---

### 2.3 Índices Firestore

```javascript
{
  "indexes": [
    {
      "collectionGroup": "analysisMethods",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "code", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "analysisParameters",
      "fields": [
        { "fieldPath": "methodId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "analysisParameters",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "isCritical", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### 2.4 Servicios Canónicos

```typescript
// src/services/canonical/analysis-library.service.ts

export class AnalysisLibraryService {
  /**
   * Crear nuevo método de análisis
   */
  static async createMethod(
    params: {
      code: string;
      name: string;
      equipment?: string;
      reference?: string;
      unit?: string;
      limitsTemplate?: AnalysisMethod['limitsTemplate'];
      createdBy: string;
    }
  ): Promise<string> {
    
    // Verificar código único
    const existsSnap = await db.collection('analysisMethods')
      .where('code', '==', params.code)
      .where('status', '==', 'ACTIVE')
      .get();
    
    if (!existsSnap.empty) {
      throw new Error(`Method code ${params.code} already exists`);
    }
    
    const methodRef = db.collection('analysisMethods').doc();
    const method: AnalysisMethod = {
      id: methodRef.id,
      code: params.code,
      name: params.name,
      equipment: params.equipment,
      reference: params.reference,
      unit: params.unit,
      limitsTemplate: params.limitsTemplate,
      isCriticalByDefault: false,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date(),
      createdBy: params.createdBy,
      updatedAt: new Date(),
      schemaVersion: 1
    };
    
    await methodRef.set(method);
    return methodRef.id;
  }
  
  /**
   * Crear parámetro vinculado a método
   */
  static async createParameter(
    params: {
      code: string;
      name: string;
      methodId: string;
      unit?: string;
      limits?: AnalysisParameter['limits'];
      isCritical: boolean;
      createdBy: string;
    }
  ): Promise<string> {
    
    // Verificar que el método existe
    const methodSnap = await db.doc(`analysisMethods/${params.methodId}`).get();
    if (!methodSnap.exists) {
      throw new Error(`Method ${params.methodId} not found`);
    }
    
    // Verificar código único
    const existsSnap = await db.collection('analysisParameters')
      .where('code', '==', params.code)
      .where('status', '==', 'ACTIVE')
      .get();
    
    if (!existsSnap.empty) {
      throw new Error(`Parameter code ${params.code} already exists`);
    }
    
    const paramRef = db.collection('analysisParameters').doc();
    const parameter: AnalysisParameter = {
      id: paramRef.id,
      code: params.code,
      name: params.name,
      methodId: params.methodId,
      unit: params.unit,
      limits: params.limits,
      isCritical: params.isCritical,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date(),
      createdBy: params.createdBy,
      updatedAt: new Date(),
      schemaVersion: 1
    };
    
    await paramRef.set(parameter);
    return paramRef.id;
  }
  
  /**
   * Obtener parámetros activos para un plan QC
   */
  static async getParametersForPlan(
    scope: 'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE'
  ): Promise<Array<AnalysisParameter & { method: AnalysisMethod }>> {
    
    const paramsSnap = await db.collection('analysisParameters')
      .where('status', '==', 'ACTIVE')
      .where('appliesToScopes', 'array-contains', scope)
      .get();
    
    const params = paramsSnap.docs.map(doc => doc.data() as AnalysisParameter);
    
    // Enriquecer con métodos
    const enriched = await Promise.all(
      params.map(async (param) => {
        const methodSnap = await db.doc(`analysisMethods/${param.methodId}`).get();
        const method = methodSnap.data() as AnalysisMethod;
        return { ...param, method };
      })
    );
    
    return enriched;
  }
}
```

---

### 2.5 Integración con Quality Plans

**Cambio en qualityPlans:**

```typescript
// ANTES (inline parameters)
interface QualityPlan {
  parameters: Array<{
    name: string;           // ❌ Inline
    method: string;         // ❌ Inline
    // ...
  }>;
}

// DESPUÉS (referenciar librería)
interface QualityPlan {
  parameters: Array<{
    parameterId: string;    // ✅ FK a analysisParameters
    limitsOverride?: {      // ✅ Override opcional
      min?: number;
      max?: number;
      target?: number;
    };
  }>;
}
```

**Cambio en qualityReleases:**

```typescript
// DESPUÉS (con trazabilidad completa)
interface QualityRelease {
  results: Array<{
    parameterId: string;     // ✅ FK a analysisParameters
    methodId: string;        // ✅ Resuelto desde parameter
    value: number | string;
    unit?: string;
    status: 'OK' | 'FAIL' | 'NA';
    testedBy?: string;
    testedAt?: Date;
  }>;
}
```

---

## 3. PRODUCTION PROTOCOLS — CHECKLISTS INTELIGENTES

### 3.1 Objetivos

**Problemas que resuelve:**
- ❌ Checkboxes vacíos sin validación
- ❌ No hay reglas de bloqueo
- ❌ Evidencias opcionales o perdidas
- ❌ Órdenes cierran sin compliance
- ❌ Sin trazabilidad de firmas

**Solución:**
- ✅ Protocolos tipados con reglas
- ✅ Pasos obligatorios que bloquean
- ✅ Validación automática (medidas, docs, fotos)
- ✅ Firmas digitales por rol
- ✅ Invariantes que previenen cierre

---

### 3.2 Esquemas Canónicos

```typescript
// Collection: productionProtocols
interface ProductionProtocol {
  id: string;
  
  // IDENTIFICACIÓN
  code: string;                   // "PROC-BATCH-STD", "QC-INLINE-01"
  name: string;
  description?: string;
  version: number;
  
  // PASOS DEL PROTOCOLO
  steps: Array<{
    id: string;                   // UUID del paso
    order: number;                // Orden de ejecución
    title: string;
    description?: string;
    required: boolean;            // Si falla, bloquea avance
    
    // TIPO DE CHECK
    kind: 'CHECK' | 'MEASURE' | 'VERIFY_DOC' | 'PHOTO' | 'SIGN';
    
    // REGLAS DE VALIDACIÓN
    rule?: {
      // Para MEASURE: límites
      measure?: {
        parameterId?: string;     // FK a analysisParameters
        min?: number;
        max?: number;
        unit?: string;
      };
      
      // Para VERIFY_DOC: documento obligatorio
      doc?: {
        type: Document['type'];   // 'SOP', 'PROTOCOL', etc.
        mustBeApproved: boolean;
        mustBeValid: boolean;     // Vigencia checked
      };
      
      // Para PHOTO: mínimo de fotos
      photo?: {
        minPhotos: number;
        maxPhotos?: number;
      };
      
      // Para SIGN: rol requerido
      sign?: {
        role: 'OPERATOR' | 'SUPERVISOR' | 'QUALITY' | 'MANAGER';
        requiresComment: boolean;
      };
    };
  }>;
  
  // APLICABILIDAD
  appliesTo?: {
    itemIds?: string[];
    formulaIds?: string[];
    lineIds?: string[];
    orderTypes?: Array<'STANDARD' | 'REWORK' | 'SAMPLE'>;
  };
  
  // LIFECYCLE
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  retiredReason?: string;
  supersededBy?: string;          // protocolId que lo reemplaza
  
  // AUDITORÍA
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  
  schemaVersion: 1;
}

// Collection: productionProtocolRuns (instancias por orden)
interface ProductionProtocolRun {
  id: string;
  
  // REFERENCIAS
  orderId: string;                // FK a productionOrders
  protocolId: string;             // Versión del protocol usado
  protocolVersion: number;
  
  // TIMESTAMPS
  startedAt: Date;
  completedAt?: Date;
  
  // ESTADO
  status: 'OPEN' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
  blockReason?: string;           // Por qué está bloqueado
  
  // CHECKS EJECUTADOS
  checks: Array<{
    stepId: string;               // Del protocol.steps
    at: Date;
    by: string;                   // userId
    
    // VALOR según tipo
    value?: boolean | number | string;
    unit?: string;
    
    // EVIDENCIAS
    documentIds?: string[];       // Para VERIFY_DOC
    photoIds?: string[];          // Para PHOTO
    
    // FIRMA
    signature?: {
      by: string;
      role: string;
      at: Date;
      signatureHash?: string;
      comment?: string;
    };
    
    // RESULTADO
    passed: boolean;
    notes?: string;
    overrideReason?: string;      // Si se hizo override manual
  }>;
  
  // AUDITORÍA
  createdAt: Date;
  updatedAt: Date;
  
  schemaVersion: 1;
}
```

---

### 3.3 Índices Firestore

```javascript
{
  "indexes": [
    {
      "collectionGroup": "productionProtocols",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "code", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "productionProtocolRuns",
      "fields": [
        { "fieldPath": "orderId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "productionProtocolRuns",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### 3.4 Servicios e Invariantes

```typescript
// src/services/canonical/production-protocol.service.ts

export const ProductionProtocolInvariants = {
  /**
   * Orden no puede cerrar con protocolos OPEN/BLOCKED
   */
  cannotCloseWithOpenProtocols: (
    order: ProductionOrder,
    runs: ProductionProtocolRun[]
  ) => {
    const openOrBlocked = runs.filter(r => 
      r.orderId === order.id && 
      (r.status === 'OPEN' || r.status === 'BLOCKED')
    );
    
    if (order.status === 'COMPLETED' && openOrBlocked.length > 0) {
      return false;
    }
    
    return true;
  },
  
  /**
   * Todos los pasos required deben estar passed
   */
  allRequiredStepsPassed: (
    protocol: ProductionProtocol,
    run: ProductionProtocolRun
  ) => {
    const requiredSteps = protocol.steps.filter(s => s.required);
    
    for (const step of requiredSteps) {
      const check = run.checks.find(c => c.stepId === step.id);
      if (!check || !check.passed) {
        return false;
      }
    }
    
    return true;
  }
};

export class ProductionProtocolService {
  /**
   * Iniciar protocol run para una orden
   */
  static async startProtocolRun(
    tx: FirebaseFirestore.Transaction,
    params: {
      orderId: string;
      protocolId: string;
      startedBy: string;
    }
  ): Promise<string> {
    
    // Obtener protocol
    const protocolRef = db.doc(`productionProtocols/${params.protocolId}`);
    const protocolSnap = await tx.get(protocolRef);
    
    if (!protocolSnap.exists) {
      throw new Error(`Protocol ${params.protocolId} not found`);
    }
    
    const protocol = protocolSnap.data() as ProductionProtocol;
    
    if (protocol.status !== 'ACTIVE') {
      throw new Error(`Protocol ${params.protocolId} is not active`);
    }
    
    // Crear run
    const runRef = db.collection('productionProtocolRuns').doc();
    const run: ProductionProtocolRun = {
      id: runRef.id,
      orderId: params.orderId,
      protocolId: params.protocolId,
      protocolVersion: protocol.version,
      startedAt: new Date(),
      status: 'OPEN',
      checks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    };
    
    tx.set(runRef, run);
    
    return runRef.id;
  }
  
  /**
   * Registrar check de paso
   */
  static async submitCheck(
    tx: FirebaseFirestore.Transaction,
    params: {
      runId: string;
      stepId: string;
      value?: boolean | number | string;
      unit?: string;
      documentIds?: string[];
      photoIds?: string[];
      signature?: ProductionProtocolRun['checks'][0]['signature'];
      by: string;
      notes?: string;
    }
  ): Promise<void> {
    
    // Obtener run
    const runRef = db.doc(`productionProtocolRuns/${params.runId}`);
    const runSnap = await tx.get(runRef);
    
    if (!runSnap.exists) {
      throw new Error(`Protocol run ${params.runId} not found`);
    }
    
    const run = runSnap.data() as ProductionProtocolRun;
    
    if (run.status !== 'OPEN') {
      throw new Error(`Protocol run is ${run.status}, cannot submit checks`);
    }
    
    // Obtener protocol para validar
    const protocolSnap = await tx.get(db.doc(`productionProtocols/${run.protocolId}`));
    const protocol = protocolSnap.data() as ProductionProtocol;
    
    const step = protocol.steps.find(s => s.id === params.stepId);
    if (!step) {
      throw new Error(`Step ${params.stepId} not found in protocol`);
    }
    
    // Validar según tipo
    let passed = false;
    
    switch (step.kind) {
      case 'CHECK':
        passed = params.value === true;
        break;
        
      case 'MEASURE':
        if (step.rule?.measure && typeof params.value === 'number') {
          const { min, max } = step.rule.measure;
          passed = (min === undefined || params.value >= min) &&
                   (max === undefined || params.value <= max);
        }
        break;
        
      case 'VERIFY_DOC':
        if (step.rule?.doc) {
          // Validar que existan documentos APPROVED
          if (params.documentIds && params.documentIds.length > 0) {
            // TODO: Verificar status en TX
            passed = true; // Simplificado
          }
        }
        break;
        
      case 'PHOTO':
        if (step.rule?.photo) {
          const photoCount = params.photoIds?.length || 0;
          passed = photoCount >= step.rule.photo.minPhotos;
        }
        break;
        
      case 'SIGN':
        passed = !!params.signature;
        break;
    }
    
    // Añadir check
    const check = {
      stepId: params.stepId,
      at: new Date(),
      by: params.by,
      value: params.value,
      unit: params.unit,
      documentIds: params.documentIds,
      photoIds: params.photoIds,
      signature: params.signature,
      passed,
      notes: params.notes
    };
    
    const checks = [...run.checks, check];
    
    // Determinar si run está bloqueado
    let newStatus = run.status;
    if (step.required && !passed) {
      newStatus = 'BLOCKED';
    }
    
    // Verificar si se completó
    const allRequiredDone = ProductionProtocolInvariants.allRequiredStepsPassed(
      protocol,
      { ...run, checks }
    );
    
    if (allRequiredDone) {
      newStatus = 'COMPLETED';
    }
    
    tx.update(runRef, {
      checks,
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date() : null,
      updatedAt: new Date()
    });
  }
}
```

---

### 3.5 Integración con ProductionOrders

**Invariante en cierre de órdenes:**

```typescript
// src/server/actions/production.actions.ts

export async function completeProductionOrder(
  orderId: string,
  userId: string
): Promise<Result> {
  
  return await db.runTransaction(async (tx) => {
    // 1. Obtener orden
    const orderRef = db.doc(`productionOrders/${orderId}`);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as ProductionOrder;
    
    // 2. Verificar protocols
    const runsSnap = await tx.get(
      db.collection('productionProtocolRuns')
        .where('orderId', '==', orderId)
    );
    
    const runs = runsSnap.docs.map(d => d.data() as ProductionProtocolRun);
    
    // 3. Validar invariante
    const openOrBlocked = runs.filter(r => 
      r.status === 'OPEN' || r.status === 'BLOCKED'
    );
    
    if (openOrBlocked.length > 0) {
      throw new Error(
        `Cannot complete order: ${openOrBlocked.length} protocol(s) not completed. ` +
        `Please complete: ${openOrBlocked.map(r => r.protocolId).join(', ')}`
      );
    }
    
    // 4. Cerrar orden
    tx.update(orderRef, {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: userId,
      updatedAt: new Date()
    });
    
    // 5. Crear TraceEvent
    const teRef = db.collection('traceEvents').doc();
    tx.set(teRef, {
      id: teRef.id,
      kind: 'PRODUCTION_COMPLETE',
      occurredAt: new Date(),
      createdAt: new Date(),
      data: { orderId, protocolsCompleted: runs.length },
      userId,
      schemaVersion: 1
    });
  });
}
```

---

## 4. INTEGRACIÓN ENTRE MÓDULOS

### 4.1 Documents ↔ Quality

```typescript
// qualityPlans pueden importar parámetros desde SPEC
export async function importParametersFromSpec(
  planId: string,
  specDocId: string
): Promise<void> {
  
  const specSnap = await db.doc(`documents/${specDocId}`).get();
  const spec = specSnap.data() as Document;
  
  if (spec.type !== 'SPEC' || spec.status !== 'APPROVED') {
    throw new Error('Document must be approved SPEC');
  }
  
  // Extraer parámetros del OCR
  const extracted = spec.ocr?.extracted as Record<string, any>;
  
  if (extracted?.parameters) {
    // Buscar parameterId por nombre/code
    for (const param of extracted.parameters) {
      const paramSnap = await db.collection('analysisParameters')
        .where('code', '==', param.code)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      
      if (!paramSnap.empty) {
        // Añadir a plan con límites del SPEC
        await db.doc(`qualityPlans/${planId}`).update({
          parameters: FieldValue.arrayUnion({
            parameterId: paramSnap.docs[0].id,
            limitsOverride: param.limits
          })
        });
      }
    }
  }
}

// COA puede autollenar qualityReleases
export async function autofillReleaseFromCoa(
  lotCode: string,
  coaDocId: string
): Promise<void> {
  
  const coaSnap = await db.doc(`documents/${coaDocId}`).get();
  const coa = coaSnap.data() as Document;
  
  if (coa.type !== 'COA') {
    throw new Error('Document must be COA');
  }
  
  const extracted = coa.ocr?.extracted as Record<string, any>;
  
  if (extracted?.results) {
    // Buscar parameterId y crear results array
    const results = [];
    
    for (const result of extracted.results) {
      const paramSnap = await db.collection('analysisParameters')
        .where('code', '==', result.parameterCode)
        .limit(1)
        .get();
      
      if (!paramSnap.empty) {
        const param = paramSnap.docs[0].data() as AnalysisParameter;
        results.push({
          parameterId: param.id,
          methodId: param.methodId,
          value: result.value,
          unit: param.unit,
          status: result.inSpec ? 'OK' : 'FAIL'
        });
      }
    }
    
    // Pre-popular draft release
    const releaseRef = db.collection('qualityReleases').doc();
    await releaseRef.set({
      id: releaseRef.id,
      lotCode,
      results,
      decision: 'PENDING',
      status: 'DRAFT',
      createdAt: new Date(),
      schemaVersion: 1
    });
  }
}
```

---

### 4.2 Documents ↔ Production Protocols

```typescript
// Pasos VERIFY_DOC validan documento APPROVED y vigente
export async function validateProtocolDocumentStep(
  stepRule: ProductionProtocol['steps'][0]['rule'],
  documentIds: string[]
): Promise<boolean> {
  
  if (!stepRule?.doc) return true;
  
  const { type, mustBeApproved, mustBeValid } = stepRule.doc;
  
  for (const docId of documentIds) {
    const docSnap = await db.doc(`documents/${docId}`).get();
    if (!docSnap.exists) return false;
    
    const doc = docSnap.data() as Document;
    
    // Verificar tipo
    if (doc.type !== type) return false;
    
    // Verificar aprobación
    if (mustBeApproved && doc.status !== 'APPROVED') return false;
    
    // Verificar vigencia
    if (mustBeValid && doc.validity?.validTo) {
      const now = new Date();
      const validTo = new Date(doc.validity.validTo);
      if (validTo < now) return false;
    }
  }
  
  return true;
}
```

---

### 4.3 Parameters ↔ Protocols

```typescript
// protocols.steps.rule.measure puede referir parameterId
export async function resolveProtocolMeasureStep(
  stepRule: ProductionProtocol['steps'][0]['rule']
): Promise<{
  parameter: AnalysisParameter;
  method: AnalysisMethod;
}> {
  
  if (!stepRule?.measure?.parameterId) {
    throw new Error('No parameterId in measure rule');
  }
  
  const paramSnap = await db.doc(`analysisParameters/${stepRule.measure.parameterId}`).get();
  const parameter = paramSnap.data() as AnalysisParameter;
  
  const methodSnap = await db.doc(`analysisMethods/${parameter.methodId}`).get();
  const method = methodSnap.data() as AnalysisMethod;
  
  return { parameter, method };
}
```

---

## 5. UI/UX COMPONENTS

### 5.1 DocumentsManager

```tsx
// src/components/documents/DocumentsManager.tsx

export function DocumentsManager() {
  const [filter, setFilter] = useState<{
    type?: Document['type'];
    status?: Document['status'];
    linkedEntity?: string;
  }>({});
  
  return (
    <div className="sb-page">
      <ModuleHeader title="Gestión Documental" icon={FileText}>
        <SBButton variant="primary" onClick={handleUpload}>
          Subir Documento
        </SBButton>
      </ModuleHeader>
      
      {/* Filtros */}
      <div className="sb-glass p-4 rounded-2xl mb-4">
        <div className="grid grid-cols-4 gap-3">
          <Select value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}>
            <option value="">Todos los tipos</option>
            <option value="COA">COA</option>
            <option value="SPEC">Especificaciones</option>
            <option value="SOP">SOPs</option>
            <option value="PROTOCOL">Protocolos</option>
          </Select>
          
          <Select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="IN_REVIEW">En revisión</option>
            <option value="APPROVED">Aprobado</option>
            <option value="RETIRED">Retirado</option>
          </Select>
        </div>
      </div>
      
      {/* Tabla con versiones */}
      <div className="sb-glass rounded-2xl overflow-hidden">
        <DocumentsTable 
          documents={filteredDocs}
          onApprove={handleApprove}
          onNewVersion={handleNewVersion}
          onRetire={handleRetire}
        />
      </div>
    </div>
  );
}
```

---

### 5.2 MethodLibrary & ParameterLibrary

```tsx
// src/components/quality/MethodLibrary.tsx

export function MethodLibrary() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Métodos */}
      <div className="sb-glass p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Métodos de Análisis</h3>
        <SBButton variant="primary" onClick={handleCreateMethod}>
          Nuevo Método
        </SBButton>
        
        <div className="mt-4 space-y-2">
          {methods.map(method => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      </div>
      
      {/* Parámetros */}
      <div className="sb-glass p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Parámetros</h3>
