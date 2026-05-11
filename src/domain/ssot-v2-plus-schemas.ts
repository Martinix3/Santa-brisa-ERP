/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/domain/ssot-v2-plus-schemas.ts
// SSOT V2+ Zod Schemas - Enterprise-Grade Validation
// Greenfield Implementation - Production-Ready with 12 Hardening Improvements

import { z } from 'zod';

// ============================================================================
// REUSABLE PRIMITIVES (Improvement #11 - DRY)
// ============================================================================

/** Coerce dates from string/Firestore Timestamp (Improvement #4) */
export const zDate = z.coerce.date();

/** Canonical lotCode pattern - supports multi-segment plant/line (Improvement #2) */
export const LotCodePattern = /^\d{5}-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d{3}$/;

/** OnHand composite ID pattern */
export const OnHandIdPattern = /^[^:]+::[^:]+::[^:]+$/;

/** Validated lotCode string */
export const LotCode = z.string().regex(LotCodePattern, 'Invalid lotCode format');

/** Generic ID */
export const Id = z.string().min(1);

/** Strict enum helper */
export const StrictEnum = <T extends [string, ...string[]]>(...values: T) => z.enum(values);

/** Coerce number from string/any (Improvement #1 - numeric coercion) */
export const zNum = z.coerce.number();

/** Text size limits (Improvement #8 - bounds for audit/performance) */
export const SmallText = z.string().max(120);
export const MedText = z.string().max(500);
export const BigText = z.string().max(5_000);

// Branded types to prevent ID mixing (Improvement #2)
type Brand<T, B extends string> = T & { __brand: B };
export type ItemId = Brand<string, 'ItemId'>;
export type LotId = Brand<string, 'LotId'>;
export type ProtocolId = Brand<string, 'ProtocolId'>;
export type DocumentId = Brand<string, 'DocumentId'>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse lotCode into components (Improvement #3)
 */
export function parseLotCode(lotCode: string): {
  yjjj: string;
  plant: string;
  line?: string;
  seq: string;
} {
  const parts = lotCode.split('-');
  return {
    yjjj: parts[0],
    plant: parts[1],
    line: parts.length === 4 ? parts[2] : undefined,
    seq: parts[parts.length - 1]
  };
}

/**
 * Build OnHand composite ID (Improvement #3)
 */
export function buildOnHandId(itemId: string, lotCode: string, locationId: string): string {
  return `${itemId}::${lotCode}::${locationId}`;
}

/**
 * QC Status Transitions Matrix (Improvement #6)
 */
export const QcTransitions: Record<QcStatus, QcStatus[]> = {
  PENDING: ['IN_PROGRESS', 'HOLD', 'PASSED', 'FAILED', 'CONDITIONAL'],
  IN_PROGRESS: ['HOLD', 'PASSED', 'FAILED', 'CONDITIONAL'],
  HOLD: ['PASSED', 'FAILED', 'CONDITIONAL'],
  CONDITIONAL: ['PASSED', 'FAILED'],
  PASSED: [],
  FAILED: []
};

export function canTransitionQcStatus(from: QcStatus, to: QcStatus): boolean {
  return QcTransitions[from].includes(to);
}

/**
 * Compute audit hash for hash chain (Improvement #11)
 */
export function computeAuditHash(prevHash: string | undefined, payload: unknown): string {
  const data = JSON.stringify({ prevHash, payload });
  // Will be implemented with Node crypto in service
  // For now, return placeholder
  return `HASH_${data.length}_${Date.now()}`;
}

// ============================================================================
// SALES & ORDERS (SSOT V2.1)
// ============================================================================

/**
 * Address Schema - Reusable for billing/shipping
 */
export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  province: z.string().optional(),
  country: z.string().min(2),
  countryCode: z.string().length(2).optional()
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * Order Line Schema
 */
export const OrderLineSchema = z.object({
  itemId: Id,
  name: z.string().optional(),
  qty: z.number().positive(),
  uom: z.enum(['unit', 'bottle', 'case', 'pallet']),
  priceUnit: z.number().min(0),
  discountPct: z.number().min(0).max(100).optional()
});

export type OrderLine = z.infer<typeof OrderLineSchema>;

/**
 * OrderSellOut V2.1 - Extended with Customer & Commercial Data
 * 
 * SSOT V2.1 Extensions:
 * - Real business channels (PRIVATE, HORECA, CATERING, etc.)
 * - Owner/commercial responsible tracking
 * - Unified customer data (single source of truth)
 */
export const OrderSellOutSchema = z.object({
  id: Id,
  docNumber: z.string().optional(),
  
  // CUSTOMER REFERENCES
  accountId: Id,
  partyId: Id.optional(),
  
  // COMMERCIAL FLOW
  flow: z.enum(['PLACEMENT', 'DIRECT']).optional(),
  distributorPartyId: Id.optional(),
  isSellOutReported: z.boolean().optional(),
  
  // STATUS
  status: z.enum(['open', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled', 'lost']),
  billingStatus: z.enum(['pending', 'invoiced', 'paid', 'void']).optional(),
  
  // LINES
  lines: z.array(OrderLineSchema).min(1),
  
  // FINANCIAL
  totalAmount: z.number().min(0).optional(),
  currency: z.enum(['EUR']),
  
  // SOURCE
  source: z.enum(['SHOPIFY', 'B2B', 'Direct', 'CRM', 'MANUAL', 'HOLDED']).optional(),
  
  // === SSOT V2.1: EXTENDED CUSTOMER & COMMERCIAL DATA ===
  
  // Canal de venta (valores reales del negocio)
  channel: z.enum(['PRIVATE', 'DISTRIBUTOR', 'ONLINE', 'HORECA', 'CATERING']).optional(),
  
  // Responsable comercial (owner)
  ownerId: Id.optional(),
  ownerName: SmallText.optional(),
  
  // Datos del cliente unificados (single source of truth)
  customerVat: z.string().optional(),
  customerName: SmallText.optional(),
  contactPerson: SmallText.optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  bankAccount: z.string().optional(),
  
  // === END SSOT V2.1 ===
  
  // METADATA
  notes: MedText.optional(),
  external: z.object({
    shopifyOrderId: z.string().optional(),
    holdedEstimateId: z.string().optional(),
    holdedInvoiceId: z.string().optional()
  }).optional(),
  
  // HOLDED SYNC
  holdedOrderId: Id.optional(),
  syncedToHolded: z.boolean().optional(),
  lastSyncAt: zDate.optional(),
  syncError: z.string().optional(),
  
  // DATES
  createdAt: zDate,
  updatedAt: zDate,
  createdById: Id.optional(),
  orderDate: zDate.optional(),
  
  // ADDITIONAL
  linkedPromotions: z.array(Id).optional(),
  region: z.enum(['ES', 'USA', 'MX', 'OTHER']).optional(),
  
  schemaVersion: z.literal(1)
})
.refine(
  order => !order.channel || ['PRIVATE', 'DISTRIBUTOR', 'ONLINE', 'HORECA', 'CATERING'].includes(order.channel),
  'channel must be a valid business channel'
)
.refine(
  order => order.flow !== 'PLACEMENT' || order.distributorPartyId,
  'PLACEMENT flow requires distributorPartyId'
)
.refine(
  order => order.status !== 'paid' || order.billingStatus === 'paid',
  'paid status requires billingStatus=paid'
);

export type OrderSellOut = z.infer<typeof OrderSellOutSchema>;

// ============================================================================
// CORE SCHEMAS
// ============================================================================

/**
 * OnHand with QC Buckets (Improvement #3 - safe defaults)
 */
export const OnHandSchema = z.object({
  id: z.string().regex(OnHandIdPattern, 'Must follow itemId::lotCode::locationId pattern'),
  itemId: Id,
  lotCode: LotCode,
  locationId: Id,
  
  // QC BUCKETS with safe defaults
  qty: z.object({
    RELEASED: z.number().min(0).default(0),
    HOLD: z.number().min(0).default(0),
    REJECTED: z.number().min(0).default(0)
  }),
  
  reservedQty: z.object({
    RELEASED: z.number().min(0).default(0)
  }).default({ RELEASED: 0 }).optional(),
  
  // DERIVED FIELDS
  totalQty: z.number().min(0),
  availableQty: z.number().min(0),
  
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(1)
}).refine(data => {
  // Invariant: totalQty = sum of buckets
  return data.totalQty === data.qty.RELEASED + data.qty.HOLD + data.qty.REJECTED;
}, 'totalQty must equal sum of all buckets').refine(data => {
  // Invariant: availableQty = RELEASED - reserved
  const reserved = data.reservedQty?.RELEASED || 0;
  return data.availableQty === data.qty.RELEASED - reserved;
}, 'availableQty must equal RELEASED minus reserved').refine(data => {
  // Invariant: reserved cannot exceed RELEASED (Improvement #12)
  const reserved = data.reservedQty?.RELEASED || 0;
  return reserved <= data.qty.RELEASED;
}, 'reserved quantity cannot exceed RELEASED quantity');

export type OnHand = z.infer<typeof OnHandSchema>;

/**
 * Lot with canonical lotCode
 */
export const LotSchema = z.object({
  id: Id,
  lotCode: LotCode,  // Uses improved pattern
  itemId: Id,
  locationId: Id,
  quantity: z.number().positive(),
  uom: z.string().min(1),
  
  // QC STATUS
  qcStatus: z.enum(['PENDING', 'IN_PROGRESS', 'HOLD', 'PASSED', 'FAILED', 'CONDITIONAL']),
  qcPlanId: z.string().optional(),
  qcApprovedBy: z.string().optional(),
  qcApprovedAt: zDate.optional(),
  qcRejectedBy: z.string().optional(),
  qcRejectedAt: zDate.optional(),
  qcRejectionReason: z.string().optional(),
  qcConditions: z.array(z.string()).optional(),
  
  // SUPPLIER
  supplierId: z.string().optional(),
  externalLot: z.string().optional(),
  
  // DATES
  receivedAt: zDate.optional(),
  expDate: zDate.optional(),
  
  createdAt: zDate,
  createdBy: z.string(),
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(1)
});

export type Lot = z.infer<typeof LotSchema>;

/**
 * Item Schema
 */
export const ItemSchema = z.object({
  id: Id,
  sku: z.string(),
  name: z.string(),
  category: z.enum(['fg', 'raw', 'pack', 'label', 'intermediate', 'consumable', 'merch']),
  uom: z.string(),
  active: z.boolean(),
  stdCost: z.number().optional(),
  bottleMl: z.number().optional(),
  caseUnits: z.number().optional(),
  unitsPerCase: z.number().optional(),
  priceBase: z.number().optional(),
  priceUnit: z.number().optional(),
  costUnit: z.number().optional(),
  weightPerUnit: z.number().optional(),
  volumePerUnit: z.number().optional(),
  casesPerPallet: z.number().optional(),
  createdAt: zDate.optional(),
  updatedAt: zDate.optional(),
});

export type Item = z.infer<typeof ItemSchema>;

// ============================================================================
// QUALITY SCHEMAS
// ============================================================================

/**
 * Quality Plan with Parameter References
 */
export const QualityPlanSchema = z.object({
  id: Id,
  scope: z.enum(['RAW', 'FG', 'PACK', 'INTERMEDIATE', 'LABEL', 'MERCH']),
  name: z.string().min(1).transform(s => s.trim()),  // Trim whitespace
  description: z.string().optional(),
  
  // PARAMETERS (from library, NO inline)
  parameters: z.array(z.object({
    parameterId: Id,
    limitsOverride: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      target: z.number().optional()
    }).optional()
  })),
  
  frequency: z.enum(['EACH_BATCH', 'DAILY', 'WEEKLY', 'MONTHLY']),
  
  appliesToItems: z.array(Id).optional(),
  appliesToSuppliers: z.array(Id).optional(),
  
  createdBy: z.string(),
  createdAt: zDate,
  updatedAt: zDate,
  isActive: z.boolean(),
  
  schemaVersion: z.literal(1)
});

export type QualityPlan = z.infer<typeof QualityPlanSchema>;

/**
 * Quality Release with Results
 */
export const QualityReleaseSchema = z.object({
  id: Id,
  lotCode: LotCode,
  itemId: Id,
  planId: z.string().optional(),
  
  // RESULTS (with parameter references)
  results: z.array(z.object({
    parameterId: Id,
    methodId: Id,
    value: z.union([z.number(), z.string()]),
    unit: z.string().optional(),
    status: z.enum(['OK', 'FAIL', 'NA']),
    testedBy: z.string().optional(),
    testedAt: zDate.optional()
  })),
  
  // DECISION
  decision: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
  reviewedBy: z.string(),
  reviewedAt: zDate,
  
  observations: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  rejectionReason: z.string().optional(),
  
  // DOCUMENTS
  documents: z.array(z.object({
    type: z.enum(['COA', 'PHOTO', 'CERTIFICATE', 'OTHER']),
    url: z.string().url(),
    name: z.string().optional()
  })).optional(),
  
  createdAt: zDate,
  updatedAt: zDate,
  
  schemaVersion: z.literal(1)
});

export type QualityRelease = z.infer<typeof QualityReleaseSchema>;

/**
 * Non-Conformance
 */
export const NonConformanceSchema = z.object({
  id: Id,
  lotCode: LotCode.optional(),
  itemId: Id.optional(),
  orderId: Id.optional(),
  
  category: z.enum(['PROCESS', 'MATERIAL', 'PACKAGING', 'EQUIPMENT', 'OTHER']),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  
  description: z.string().min(10),
  detectedBy: z.string(),
  detectedAt: zDate,
  
  correctiveAction: z.string().optional(),
  responsibleForAction: z.string().optional(),
  actionCompletedAt: zDate.optional(),
  
  status: z.enum(['OPEN', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED']),
  
  affectedQuantity: z.number().optional(),
  financialImpact: z.number().int().optional(), // En céntimos (Improvement #9 ✅)
  
  createdAt: zDate,
  updatedAt: zDate,
  createdBy: z.string(),
  
  schemaVersion: z.literal(1)
});

export type NonConformance = z.infer<typeof NonConformanceSchema>;

// ============================================================================
// DOCUMENTS V2 (Improvement #5 - Cross-field validations)
// ============================================================================

/**
 * Document with Versioning, Approvals, OCR
 */
export const DocumentSchemaV2 = z.object({
  id: Id,
  type: z.enum(['COA', 'SPEC', 'SOP', 'PROTOCOL', 'METHOD', 'PHOTO', 'CERTIFICATE', 'APPCC', 'OTHER']),
  title: z.string().min(2).max(200).transform(s => s.trim()),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  linkedEntity: z.object({
    type: z.enum(['lot', 'item', 'order', 'supplier', 'protocol', 'protocolRun', 'account', 'none']),
    id: z.string().optional()
  }),
  
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  sha1: z.string().length(40).optional(),  // SHA1 for deduplication
  
  version: z.number().int().min(1),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'RETIRED']),
  supersededBy: z.string().optional(),
  
  validity: z.object({
    validFrom: zDate.optional(),
    validTo: zDate.optional()
  }).optional(),
  
  approvals: z.array(z.object({
    by: z.string(),
    at: zDate,
    role: z.enum(['QUALITY', 'OPERATIONS', 'ENGINEERING', 'MANAGER', 'HR']).optional(),
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
  
  createdAt: zDate,
  createdBy: z.string(),
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(2)
})
.refine(d => d.status !== 'APPROVED' || (d.approvals && d.approvals.length > 0),
        'APPROVED documents must include at least one approval')
.refine(d => !d.validity || !d.validity.validFrom || !d.validity.validTo || d.validity.validFrom <= d.validity.validTo,
        'validFrom must be <= validTo')
.refine(d => !d.supersededBy || d.status === 'RETIRED',
        'supersededBy allowed only when status=RETIRED');

export type Document = z.infer<typeof DocumentSchemaV2>;

// ============================================================================
// ANALYSIS LIBRARY (Improvement #8 - Retirement validation)
// ============================================================================

/**
 * Analysis Method
 */
export const AnalysisMethodSchema = z.object({
  id: Id,
  code: z.string().min(2).transform(s => s.trim().toUpperCase()),
  name: z.string().min(2).transform(s => s.trim()),
  description: z.string().optional(),
  equipment: z.string().optional(),
  equipmentId: z.string().optional(),
  procedure: z.string().optional(),
  reference: z.string().optional(),
  documentId: z.string().optional(),
  
  unit: z.string().optional(),
  limitsTemplate: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    target: z.number().optional()
  }).optional(),
  
  isCriticalByDefault: z.boolean(),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'RETIRED']),
  version: z.number().int().min(1),
  retiredReason: z.string().optional(),
  supersededBy: z.string().optional(),
  
  createdAt: zDate,
  createdBy: z.string(),
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(1)
})
.refine(m => !m.supersededBy || m.status === 'RETIRED',
        'Method with supersededBy must be RETIRED');

export type AnalysisMethod = z.infer<typeof AnalysisMethodSchema>;

/**
 * Analysis Parameter
 */
export const AnalysisParameterSchema = z.object({
  id: Id,
  code: z.string().min(1).transform(s => s.trim().toUpperCase()),
  name: z.string().min(2).transform(s => s.trim()),
  description: z.string().optional(),
  
  methodId: Id,
  
  unit: z.string().optional(),
  limits: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    target: z.number().optional()
  }).optional(),
  
  isCritical: z.boolean(),
  appliesToScopes: z.array(z.enum(['RAW', 'FG', 'PACK', 'INTERMEDIATE'])).optional(),
  
  status: z.enum(['ACTIVE', 'RETIRED']),
  version: z.number().int().min(1),
  retiredReason: z.string().optional(),
  supersededBy: z.string().optional(),
  
  createdAt: zDate,
  createdBy: z.string(),
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  
  schemaVersion: z.literal(1)
})
.refine(p => !p.supersededBy || p.status === 'RETIRED',
        'Parameter with supersededBy must be RETIRED');

export type AnalysisParameter = z.infer<typeof AnalysisParameterSchema>;

// ============================================================================
// PRODUCTION PROTOCOLS (Improvement #1 - Add RND, #6 - Discriminated Union)
// ============================================================================

/** Protocol Step - Discriminated Union by kind (Improvement #6) */
const BaseStep = z.object({
  id: Id,
  order: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean()
});

const StepCheck = BaseStep.extend({
  kind: z.literal('CHECK'),
  rule: z.object({}).optional()
});

const StepMeasure = BaseStep.extend({
  kind: z.literal('MEASURE'),
  rule: z.object({
    measure: z.object({
      parameterId: Id.optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.string().optional()
    })
  })
});

const StepVerifyDoc = BaseStep.extend({
  kind: z.literal('VERIFY_DOC'),
  rule: z.object({
    doc: z.object({
      type: z.string(),
      mustBeApproved: z.boolean(),
      mustBeValid: z.boolean()
    })
  })
});

const StepPhoto = BaseStep.extend({
  kind: z.literal('PHOTO'),
  rule: z.object({
    photo: z.object({
      minPhotos: z.number().int().min(1),
      maxPhotos: z.number().int().optional()
    })
  })
});

const StepSign = BaseStep.extend({
  kind: z.literal('SIGN'),
  rule: z.object({
    sign: z.object({
      role: z.enum(['OPERATOR', 'SUPERVISOR', 'QUALITY', 'MANAGER', 'HR']),
      requiresComment: z.boolean()
    })
  })
});

const StepInput = BaseStep.extend({
  kind: z.literal('INPUT'),
  rule: z.object({
    input: z.object({
      placeholder: z.string().optional(),
      maxLength: z.number().int().optional(),
      pattern: z.string().optional(),
      multiline: z.boolean().optional()
    })
  }).optional()
});

export const ProtocolStepSchema = z.discriminatedUnion('kind', [
  StepCheck,
  StepMeasure,
  StepVerifyDoc,
  StepPhoto,
  StepSign,
  StepInput
]);

export type ProtocolStep = z.infer<typeof ProtocolStepSchema>;

/**
 * Production Protocol v2 (Improvement #1 - Added RND category)
 */
export const ProductionProtocolSchemaV2 = z.object({
  id: Id,
  code: z.string().min(2).transform(s => s.trim().toUpperCase()),
  name: z.string().min(2).transform(s => s.trim()),
  description: MedText.optional(),  // Bounded text
  version: z.number().int().min(1),
  
  // COMPLIANCE (Added RND)
  category: z.enum([
    'PRODUCCION', 'PLAGAS', 'AGUAS', 'LIMPIEZA', 'FORMACION',
    'TEMPERATURA', 'MANTENIMIENTO', 'CALIBRACION', 'AUDITORIA', 'RND'
  ]),
  frequency: z.enum([
    'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_BATCH', 'ON_DEMAND'
  ]).optional(),
  
  reminder: z.object({
    enabled: z.boolean(),
    daysBefore: z.number().int().min(0),
    assignToRole: z.enum(['QUALITY', 'OPERATIONS', 'MAINTENANCE', 'HR']).optional()
  }).optional(),
  
  regulatoryRef: z.string().optional(),
  isMandatory: z.boolean(),
  
  // STEPS - Uses discriminated union
  steps: z.array(ProtocolStepSchema),
  
  appliesTo: z.object({
    itemIds: z.array(Id).optional(),
    formulaIds: z.array(Id).optional(),
    lineIds: z.array(Id).optional(),
    orderTypes: z.array(z.enum(['STANDARD', 'REWORK', 'SAMPLE'])).optional()
  }).optional(),
  
  status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
  retiredReason: z.string().optional(),
  supersededBy: z.string().optional(),
  
  createdAt: zDate,
  createdBy: z.string(),
  updatedAt: zDate,
  updatedBy: z.string().optional(),
  publishedAt: zDate.optional(),
  publishedBy: z.string().optional(),
  
  schemaVersion: z.literal(2)
});

export type ProductionProtocol = z.infer<typeof ProductionProtocolSchemaV2>;

/**
 * Production Protocol Run (Improvement #7 - Completion validation)
 */
export const ProductionProtocolRunSchema = z.object({
  id: Id,
  orderId: Id.optional(),
  protocolId: Id,
  protocolVersion: z.number().int(),
  
  startedAt: zDate,
  completedAt: zDate.optional(),
  
  status: z.enum(['OPEN', 'BLOCKED', 'COMPLETED', 'CANCELLED']),
  blockReason: z.string().optional(),
  
  checks: z.array(z.object({
    stepId: Id,
    at: zDate,
    by: z.string(),
    
    value: z.union([z.boolean(), z.number(), z.string()]).optional(),
    unit: z.string().optional(),
    
    documentIds: z.array(Id).optional(),
    photoIds: z.array(Id).optional(),
    
    signature: z.object({
      by: z.string(),
      role: z.string(),
      at: zDate,
      signatureHash: z.string().optional(),
      comment: z.string().optional()
    }).optional(),
    
    passed: z.boolean(),
    notes: z.string().optional(),
    overrideReason: z.string().optional()
  })),
  
  createdAt: zDate,
  updatedAt: zDate,
  
  schemaVersion: z.literal(1)
})
.refine(run => run.status !== 'COMPLETED' || run.completedAt,
        'COMPLETED status requires completedAt');

export type ProductionProtocolRun = z.infer<typeof ProductionProtocolRunSchema>;

/**
 * Compliance Schedule
 */
export const ComplianceScheduleSchema = z.object({
  id: Id,
  protocolId: Id,
  protocolCode: z.string(),
  protocolName: z.string(),
  category: ProductionProtocolSchemaV2.shape.category,
  frequency: ProductionProtocolSchemaV2.shape.frequency,
  
  nextDueDate: zDate,
  lastCompletedDate: zDate.optional(),
  lastRunId: Id.optional(),
  
  status: z.enum(['SCHEDULED', 'DUE', 'OVERDUE', 'PAUSED']),
  
  assignedToRole: z.string().optional(),
  assignedToUser: z.string().optional(),
  
  reminderTaskId: Id.optional(),
  
  createdAt: zDate,
  updatedAt: zDate,
  
  schemaVersion: z.literal(1)
});

export type ComplianceSchedule = z.infer<typeof ComplianceScheduleSchema>;

// ============================================================================
// GEMINI & TASKS (Improvement #10 - assignedToRole)
// ============================================================================

/**
 * Gemini Analysis
 */
export const GeminiAnalysisSchema = z.object({
  id: Id,
  phase: z.enum(['QUALITY', 'PRODUCTION', 'LOGISTICS', 'SALES', 'INVENTORY']),
  signal: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  
  detectedAt: zDate,
  resolvedAt: zDate.optional(),
  
  linkedEntity: z.object({
    type: z.enum(['lot', 'item', 'order', 'account', 'shipment', 'location', 'protocol']),
    id: Id
  }).optional(),
  
  status: z.enum(['OPEN', 'RESOLVED', 'IGNORED']),
  
  autoAction: z.enum(['CREATE_TASK', 'SEND_EMAIL', 'OPEN_DRAWER', 'NONE']).optional(),
  actionTaken: z.boolean().optional(),
  
  data: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  
  schemaVersion: z.literal(1)
});

export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;

/**
 * Task (Improvement #10 - Added assignedToRole)
 */
export const TaskSchema = z.object({
  id: Id,
  kind: z.enum(['QC', 'VISITA', 'PRODUCCION', 'LOGISTICA', 'ADMIN', 'FOLLOWUP']),
  title: z.string().min(1),
  description: z.string().optional(),
  
  linkedEntity: z.object({
    type: z.string(),
    id: Id
  }).optional(),
  
  dueAt: zDate.optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  
  assignedTo: z.string().optional(),
  assignedToRole: z.enum(['QUALITY', 'OPERATIONS', 'MAINTENANCE', 'HR']).optional(),  // NEW
  assignedBy: z.string().optional(),
  
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
  completedAt: zDate.optional(),
  completedBy: z.string().optional(),
  
  notes: z.string().optional(),
  
  createdAt: zDate,
  updatedAt: zDate,
  createdBy: z.string(),
  
  schemaVersion: z.literal(1)
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================================
// AUDIT & OBSERVABILITY
// ============================================================================

/**
 * Audit Log - Immutable with Hash Chain
 */
export const AuditLogSchema = z.object({
  id: Id,
  
  entity: z.object({
    type: z.enum(['lot', 'qualityRelease', 'document', 'protocolRun', 'onHand', 'task']),
    id: Id
  }),
  
  action: z.enum(['CREATE', 'UPDATE', 'APPROVE', 'SIGN', 'TRANSFER_BUCKET', 'RETIRE', 'DELETE']),
  
  by: z.string(),
  at: zDate,
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  
  diff: z.object({
    before: z.record(z.unknown()).optional(),
    after: z.record(z.unknown()).optional()
  }).optional(),
  
  // HASH CHAIN for immutability
  prevHash: z.string().optional(),
  hash: z.string().length(64), // SHA256
  
  correlationId: z.string().optional(),
  
  schemaVersion: z.literal(1)
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============================================================================
// HELPER TYPES
// ============================================================================

export type QcBucket = 'RELEASED' | 'HOLD' | 'REJECTED';
export type QcStatus = 'PENDING' | 'IN_PROGRESS' | 'HOLD' | 'PASSED' | 'FAILED' | 'CONDITIONAL';
export type ProtocolStepKind = 'CHECK' | 'MEASURE' | 'VERIFY_DOC' | 'PHOTO' | 'SIGN' | 'INPUT';
export type ProtocolCategory = 'PRODUCCION' | 'PLAGAS' | 'AGUAS' | 'LIMPIEZA' | 'FORMACION' | 
                                'TEMPERATURA' | 'MANTENIMIENTO' | 'CALIBRACION' | 'AUDITORIA' | 'RND';

// ============================================================================
// BUSINESS INVARIANTS (Improvement #12 - Cross-entity validation)
// ============================================================================

export const Invariants = {
  /**
   * Validate OnHand bucket consistency
   */
  onHand: (oh: OnHand): string | null => {
    const reserved = oh.reservedQty?.RELEASED ?? 0;
    
    if (oh.totalQty !== oh.qty.RELEASED + oh.qty.HOLD + oh.qty.REJECTED) {
      return 'totalQty mismatch: expected sum of buckets';
    }
    
    if (oh.availableQty !== oh.qty.RELEASED - reserved) {
      return 'availableQty mismatch: expected RELEASED - reserved';
    }
    
    if (reserved > oh.qty.RELEASED) {
      return 'reserved quantity exceeds RELEASED';
    }
    
    return null;
  },
  
  /**
   * Validate Document approval and validity
   */
  docApprovedAndValid: (doc: Document, atDate: Date = new Date()): string | null => {
    if (doc.status === 'APPROVED' && (!doc.approvals || doc.approvals.length === 0)) {
      return 'APPROVED document without approvals';
    }
    
    if (doc.validity?.validTo && atDate > doc.validity.validTo) {
      return `Document expired on ${doc.validity.validTo.toISOString()}`;
    }
    
    if (doc.validity?.validFrom && atDate < doc.validity.validFrom) {
      return `Document not yet valid until ${doc.validity.validFrom.toISOString()}`;
    }
    
    return null;
  },
  
  /**
   * Validate Quality/OnHand consistency
   */
  qcStatusMatchesBuckets: (lot: Lot, onHand: OnHand): string | null => {
    if (lot.qcStatus === 'PENDING' && onHand.qty.RELEASED > 0) {
      return 'PENDING lot cannot have RELEASED stock';
    }
    
    if (lot.qcStatus === 'FAILED' && (onHand.qty.RELEASED + onHand.qty.HOLD) > 0) {
      return 'FAILED lot must have all stock in REJECTED';
    }
    
    if (lot.qcStatus === 'PASSED' && (onHand.qty.HOLD + onHand.qty.REJECTED) > 0) {
      return 'PASSED lot must have all stock in RELEASED';
    }
    
    return null;
  },
  
  /**
   * Validate Protocol Run completion
   */
  protocolRunComplete: (protocol: ProductionProtocol, run: ProductionProtocolRun): string | null => {
    if (run.status !== 'COMPLETED') return null;
    
    const requiredSteps = protocol.steps.filter(s => s.required);
    
    for (const step of requiredSteps) {
      const check = run.checks.find(c => c.stepId === step.id);
      if (!check || !check.passed) {
        return `Required step "${step.title}" not passed`;
      }
    }
    
    return null;
  }
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate any schema with detailed error messages
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return `${context ? `${context}.` : ''}${path}: ${err.message}`;
  });
  
  return { success: false, errors };
}

/**
 * Assert schema or throw
 */
export function assertSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = validateSchema(schema, data, context);
  
  if (!result.success) {
    throw new Error(`Schema validation failed:\n${result.errors.join('\n')}`);
  }
  
  return result.data;
}

// ============================================================================
// ORDERSELLOUT V2.1 BUSINESS RULES & HELPERS
// ============================================================================

/**
 * Business Rules for OrderSellOut V2.1
 * Works with SSOT OrderSellOut type (not Zod-inferred type)
 */
export const OrderSellOutRules = {
  /**
   * Validate channel matches account segment
   */
  channelMatchesSegment: (order: import('@/domain/ssot').OrderSellOut, accountSegment?: string): string | null => {
    if (!order.channel || !accountSegment) return null;
    
    const validMappings: Record<string, string[]> = {
      'HORECA': ['HORECA', 'ONLINE'],
      'RETAIL': ['ONLINE', 'DISTRIBUTOR'],
      'ONLINE': ['ONLINE'],
      'PRIVADA': ['PRIVATE'],
      'DISTRIBUIDOR': ['DISTRIBUTOR']
    };
    
    const validChannels = validMappings[accountSegment];
    if (validChannels && !validChannels.includes(order.channel)) {
      return `Channel ${order.channel} not valid for segment ${accountSegment}`;
    }
    
    return null;
  },
  
  /**
   * Validate owner is assigned for non-online orders
   */
  ownerRequired: (order: import('@/domain/ssot').OrderSellOut): string | null => {
    if (order.channel === 'ONLINE') return null;
    
    if (!order.ownerId) {
      return 'Non-ONLINE orders require ownerId (commercial responsible)';
    }
    
    return null;
  },
  
  /**
   * Validate customer data completeness based on channel
   */
  customerDataComplete: (order: import('@/domain/ssot').OrderSellOut): string | null => {
    const errors: string[] = [];
    
    // VAT required for all B2B channels
    if (['HORECA', 'DISTRIBUTOR', 'CATERING'].includes(order.channel || '')) {
      if (!order.customerVat) {
        errors.push('customerVat required for B2B channels');
      }
    }
    
    // Billing address required for invoiced orders
    if (order.billingStatus === 'invoiced' || order.billingStatus === 'paid') {
      if (!order.billingAddress) {
        errors.push('billingAddress required for invoiced orders');
      }
    }
    
    // Shipping address required for shipped orders
    if (['shipped', 'invoiced', 'paid'].includes(order.status)) {
      if (!order.shippingAddress) {
        errors.push('shippingAddress required for shipped orders');
      }
    }
    
    return errors.length > 0 ? errors.join('; ') : null;
  },
  
  /**
   * Validate distributor flow consistency
   */
  distributorFlowConsistent: (order: import('@/domain/ssot').OrderSellOut): string | null => {
    if (order.flow === 'PLACEMENT') {
      if (!order.distributorPartyId) {
        return 'PLACEMENT flow requires distributorPartyId';
      }
      if (order.channel !== 'DISTRIBUTOR') {
        return 'PLACEMENT flow should use DISTRIBUTOR channel';
      }
    }
    
    if (order.channel === 'DISTRIBUTOR' && order.flow !== 'PLACEMENT') {
      return 'DISTRIBUTOR channel should use PLACEMENT flow';
    }
    
    return null;
  },
  
  /**
   * Validate all business rules for an order
   */
  validateAll: (order: import('@/domain/ssot').OrderSellOut, accountSegment?: string): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const channelError = OrderSellOutRules.channelMatchesSegment(order, accountSegment);
    if (channelError) errors.push(channelError);
    
    const ownerError = OrderSellOutRules.ownerRequired(order);
    if (ownerError) warnings.push(ownerError); // Owner is a warning, not error
    
    const customerDataError = OrderSellOutRules.customerDataComplete(order);
    if (customerDataError) errors.push(customerDataError);
    
    const distributorError = OrderSellOutRules.distributorFlowConsistent(order);
    if (distributorError) errors.push(distributorError);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Helper to populate customer data from Contact/Party
 * Works with SSOT types (string timestamps), not Zod-inferred types
 */
export function populateOrderCustomerData(
  order: Partial<import('@/domain/ssot').OrderSellOut>,
  contact?: { vat?: string; displayName?: string; billingAddress?: Address; shippingAddress?: Address } | null,
  party?: { vat?: string; legalName?: string; billingAddress?: Address; shippingAddress?: Address } | null
): Partial<import('@/domain/ssot').OrderSellOut> {
  return {
    ...order,
    customerVat: order.customerVat || contact?.vat || party?.vat,
    customerName: order.customerName || contact?.displayName || party?.legalName,
    billingAddress: order.billingAddress || contact?.billingAddress || party?.billingAddress,
    shippingAddress: order.shippingAddress || contact?.shippingAddress || party?.shippingAddress,
  };
}

/**
 * Helper to infer channel from account segment
 */
export function inferChannelFromSegment(segment: string): import('@/domain/ssot').OrderSellOut['channel'] {
  const mapping: Record<string, import('@/domain/ssot').OrderSellOut['channel']> = {
    'HORECA': 'HORECA',
    'RETAIL': 'ONLINE',
    'ONLINE': 'ONLINE',
    'PRIVADA': 'PRIVATE',
    'DISTRIBUIDOR': 'DISTRIBUTOR'
  };
  
  return mapping[segment];
}

/**
 * Calculate order total from lines
 */
export function calculateOrderTotal(lines: OrderLine[]): number {
  return lines.reduce((total, line) => {
    const lineTotal = line.qty * line.priceUnit;
    const discount = line.discountPct ? (lineTotal * line.discountPct) / 100 : 0;
    return total + (lineTotal - discount);
  }, 0);
}
