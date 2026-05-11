# SSOT V2+ MASTER SPECIFICATION
## Sistema Unificado: Inventario + Quality + Production + Compliance + Gemini

**Versión:** 2.5.0 MASTER  
**Fecha:** 20 de Octubre 2025  
**Estado:** ESPECIFICACIÓN OFICIAL CONSOLIDADA  

**Documentos Base:**
- `SSOT_V2.md` (core)
- `SSOT_V2_PLUS_QUALITY_EXTENSION.md` (v2.1.0)
- `SSOT_V2_PLUS_ANNEXE_DOCUMENTS_METHODS_PROTOCOLS.md` (v2.2.0)
- `SSOT_V2_PLUS_COMPLIANCE_MODULE.md` (v2.3.0)

---

## 0. ARQUITECTURA SSOT V2+ COMPLETA

### 0.1 Colecciones Canónicas (17 Total)

**CORE INVENTORY (SSOT V2 Base):**
1. `onHand` - Saldos con buckets QC (RELEASED/HOLD/REJECTED)
2. `lots` - Lotes con lotCode race-free
3. `items` - Productos (itemId canónico)
4. `locations` - Ubicaciones físicas
5. `stockMoves` - Movimientos de inventario
6. `traceEvents` - Eventos de dominio (trazabilidad)

**QUALITY EXTENSION:**
7. `qualityPlans` - Planes QC por scope
8. `qualityReleases` - Decisiones QC con resultados
9. `nonConformances` - NC como entidad de dominio
10. `qcTests` - Tests individuales (legacy, migrar a qualityReleases.results)

**GEMINI & TASKS:**
11. `geminiAnalyses` - Monitorización/IA (reemplaza alertEvents)
12. `tasks` - Pegamento de acciones entre módulos

**DOCUMENTS & METHODS:**
13. `documents` (v2) - Versionado, vigencia, aprobaciones, OCR
14. `analysisMethods` - Catálogo de métodos de ensayo
15. `analysisParameters` - Parámetros medibles vinculados a métodos

**PRODUCTION PROTOCOLS & COMPLIANCE:**
16. `productionProtocols` - Definición de checklists
17. `productionProtocolRuns` - Instancias por orden/ejecución
18. `complianceSchedule` - Programación automática PRP

---

### 0.2 Referencias Canónicas (ESTRICTAS)

```typescript
// FK CANÓNICAS - NO USAR ALTERNATIVAS
itemId     // ✅ (NO sku directo)
lotCode    // ✅ (NO lotNumber)
locationId // ✅ (NO warehouseId)
parameterId // ✅ (NO inline parameters)
methodId   // ✅ (NO inline methods)
protocolId // ✅ (NO checkboxes sueltos)
```

---

### 0.3 Separación Conceptual

```typescript
// DOMINIO (trazabilidad)
traceEvents: {
  kind: 'QC_RELEASED' | 'PRODUCTION_IN' | 'STOCK_IN' | ...
}

// MONITORIZACIÓN/IA (alertas, insights)
geminiAnalyses: {
  signal: 'high_rejection_rate' | 'stock_below_min' | 'compliance_overdue'
  phase: 'QUALITY' | 'PRODUCTION' | 'LOGISTICS'
}
```

---

## 1. DOCUMENTS V2 — CONTROL TOTAL

### 1.1 Esquema Completo

```typescript
interface Document {
  id: string;
  
  // CLASIFICACIÓN
  type: 'COA' | 'SPEC' | 'SOP' | 'PROTOCOL' | 'METHOD' | 'PHOTO' | 'CERTIFICATE' | 'OTHER';
  title: string;
  description?: string;
  tags?: string[];
  
  // ENLACE CANÓNICO
  linkedEntity: {
    type: 'lot' | 'item' | 'order' | 'supplier' | 'protocol' | 'protocolRun' | 'account' | 'none';
    id?: string;
  };
  
  // ARCHIVO
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  sha1?: string;                // Deduplicación
  
  // VERSIONADO
  version: number;              // Auto-increment por (linkedEntity, type, title)
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RETIRED';
  supersededBy?: string;        // docId de versión siguiente
  
  // VIGENCIA
  validity?: {
    validFrom?: Date;
    validTo?: Date;
  };
  
  // APROBACIONES
  approvals?: Array<{
    by: string;                 // userId
    at: Date;
    role?: 'QUALITY' | 'OPERATIONS' | 'ENGINEERING' | 'MANAGER' | 'HR';
    signatureHash?: string;     // Firma digital opcional
    notes?: string;
  }>;
  
  // ORIGEN
  source: 'manual' | 'gmail' | 'upload' | 'api' | 'ocr';
  uploadedVia?: 'web' | 'mobile' | 'email_parser' | 'automation';
  
  // OCR (para COA, SPEC)
  ocr?: {
    rawText?: string;
    extracted?: Record<string, unknown>;
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

### 1.2 Invariantes Documents

```typescript
export const DocumentInvariants = {
  // Solo un APPROVED por (linkedEntity, type, title)
  uniqueApproved: (doc: Document, allDocs: Document[]) => boolean;
  
  // Expirados deben estar RETIRED
  expiredMustBeRetired: (doc: Document) => boolean;
  
  // APPROVED requiere aprobación
  approvedNeedsApproval: (doc: Document) => boolean;
  
  // No duplicados SHA1
  noDuplicateSha1: (doc: Document, allDocs: Document[]) => boolean;
};
```

---

## 2. ANALYSIS METHODS & PARAMETERS

### 2.1 Catálogo de Métodos

```typescript
interface AnalysisMethod {
  id: string;
  code: string;                   // "PH-001", "VISC-BROOK-01"
  name: string;                   // "pH (Potenciómetro)"
  description?: string;
  equipment?: string;             // "Metrohm 827"
  equipmentId?: string;           // FK futuro
  procedure?: string;
  reference?: string;             // "ISO 9001:2015"
  documentId?: string;            // FK a documents (METHOD/SOP)
  unit?: string;
  limitsTemplate?: {
    min?: number;
    max?: number;
    target?: number;
  };
  isCriticalByDefault: boolean;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'RETIRED';
  version: number;
  retiredReason?: string;
  supersededBy?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  schemaVersion: 1;
}
```

### 2.2 Parámetros Medibles

```typescript
interface AnalysisParameter {
  id: string;
  code: string;                   // "PH", "VISC", "COLOR_L"
  name: string;
  description?: string;
  methodId: string;               // FK a analysisMethods
  unit?: string;                  // Override del método
  limits?: {
    min?: number;
    max?: number;
    target?: number;
  };
  isCritical: boolean;
  appliesToScopes?: Array<'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE'>;
  status: 'ACTIVE' | 'RETIRED';
  version: number;
  retiredReason?: string;
  supersededBy?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  schemaVersion: 1;
}
```

### 2.3 Integración con Quality

**qualityPlans (ACTUALIZADO):**
```typescript
interface QualityPlan {
  // ... campos existentes ...
  parameters: Array<{
    parameterId: string;        // ✅ FK a analysisParameters (NO inline)
    limitsOverride?: {          // Override opcional
      min?: number;
      max?: number;
      target?: number;
    };
  }>;
}
```

**qualityReleases (ACTUALIZADO):**
```typescript
interface QualityRelease {
  // ... campos existentes ...
  results: Array<{
    parameterId: string;         // ✅ FK a analysisParameters
    methodId: string;            // ✅ Resuelto desde parameter
    value: number | string;
    unit?: string;
    status: 'OK' | 'FAIL' | 'NA';
    testedBy?: string;
    testedAt?: Date;
  }>;
}
```

---

## 3. PRODUCTION PROTOCOLS & COMPLIANCE

### 3.1 ProductionProtocol (EXTENDIDO)

```typescript
interface ProductionProtocol {
  id: string;
  code: string;                   // "PROC-BATCH-STD", "PROC-PLAGAS-001"
  name: string;
  description?: string;
  version: number;
  
  // CLASIFICACIÓN
  category: 'PRODUCCION' | 'PLAGAS' | 'AGUAS' | 'LIMPIEZA' | 'FORMACION' | 
            'TEMPERATURA' | 'MANTENIMIENTO' | 'CALIBRACION' | 'AUDITORIA';
  
  // PROGRAMACIÓN (para PRP)
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'PER_BATCH' | 'ON_DEMAND';
  
  // RECORDATORIOS
  reminder?: {
    enabled: boolean;
    daysBefore: number;
    assignToRole?: 'QUALITY' | 'OPERATIONS' | 'MAINTENANCE' | 'HR';
  };
  
  // REGULATORIO
  regulatoryRef?: string;         // "ISO 22000:2018 § 7.2.1"
  isMandatory: boolean;
  
  // PASOS
  steps: Array<{
    id: string;
    order: number;
    title: string;
    description?: string;
    required: boolean;
    
    // 6 TIPOS DE CHECKS
    kind: 'CHECK' | 'MEASURE' | 'VERIFY_DOC' | 'PHOTO' | 'SIGN
