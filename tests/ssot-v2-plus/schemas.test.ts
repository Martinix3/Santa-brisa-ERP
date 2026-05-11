// tests/ssot-v2-plus/schemas.test.ts
// SSOT V2+ Schema Tests
// Validates all Zod schemas with valid and invalid data

import { describe, test, expect } from 'vitest';
import {
  OnHandSchema,
  LotSchema,
  QualityPlanSchema,
  QualityReleaseSchema,
  NonConformanceSchema,
  DocumentSchemaV2,
  AnalysisMethodSchema,
  AnalysisParameterSchema,
  ProductionProtocolSchemaV2,
  ProductionProtocolRunSchema,
  ComplianceScheduleSchema,
  GeminiAnalysisSchema,
  TaskSchema,
  AuditLogSchema,
  validateSchema,
  assertSchema
} from '@/domain/ssot-v2-plus-schemas';

describe('SSOT V2+ Schemas', () => {
  
  describe('OnHandSchema', () => {
    test('validates correct onHand with buckets', () => {
      const validData = {
        id: 'ITEM123::25020-SB-001::MAIN',
        itemId: 'ITEM123',
        lotCode: '25020-SB-001',
        locationId: 'MAIN',
        qty: {
          RELEASED: 100,
          HOLD: 50,
          REJECTED: 10
        },
        reservedQty: {
          RELEASED: 20
        },
        totalQty: 160,
        availableQty: 80,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    test('rejects negative quantities', () => {
      const invalidData = {
        id: 'ITEM123::25020-SB-001::MAIN',
        itemId: 'ITEM123',
        lotCode: '25020-SB-001',
        locationId: 'MAIN',
        qty: {
          RELEASED: -10,  // ❌ Negative
          HOLD: 50,
          REJECTED: 10
        },
        totalQty: 50,
        availableQty: -10,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    test('validates totalQty invariant', () => {
      const invalidData = {
        id: 'ITEM123::25020-SB-001::MAIN',
        itemId: 'ITEM123',
        lotCode: '25020-SB-001',
        locationId: 'MAIN',
        qty: {
          RELEASED: 100,
          HOLD: 50,
          REJECTED: 10
        },
        totalQty: 999,  // ❌ Should be 160
        availableQty: 100,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('totalQty must equal sum of all buckets');
      }
    });
  });
  
  describe('LotSchema', () => {
    test('validates correct lot with lotCode', () => {
      const validData = {
        id: 'LOT123',
        lotCode: '25020-SB-001',
        itemId: 'ITEM123',
        locationId: 'MAIN',
        quantity: 1000,
        uom: 'kg',
        qcStatus: 'PENDING',
        createdAt: new Date(),
        createdBy: 'USER123',
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = LotSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    test('rejects invalid lotCode format', () => {
      const invalidData = {
        id: 'LOT123',
        lotCode: 'INVALID-FORMAT',  // ❌ No sigue YYJJJ-PL-SEQ
        itemId: 'ITEM123',
        locationId: 'MAIN',
        quantity: 1000,
        uom: 'kg',
        qcStatus: 'PENDING',
        createdAt: new Date(),
        createdBy: 'USER123',
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = LotSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('QualityPlanSchema', () => {
    test('validates plan with parameter references', () => {
      const validData = {
        id: 'PLAN123',
        scope: 'RAW',
        name: 'Control Materias Primas',
        parameters: [
          {
            parameterId: 'PARAM_PH',
            limitsOverride: {
              min: 6.5,
              max: 7.5
            }
          }
        ],
        frequency: 'EACH_BATCH',
        createdBy: 'USER123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        schemaVersion: 1
      };
      
      const result = QualityPlanSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('QualityReleaseSchema', () => {
    test('validates release with results', () => {
      const validData = {
        id: 'RELEASE123',
        lotCode: '25020-SB-001',
        itemId: 'ITEM123',
        results: [
          {
            parameterId: 'PARAM_PH',
            methodId: 'METHOD_PH_001',
            value: 7.2,
            unit: 'pH',
            status: 'OK'
          }
        ],
        decision: 'APPROVED',
        reviewedBy: 'USER_QC',
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = QualityReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('ProductionProtocolSchemaV2', () => {
    test('validates protocol with all step types', () => {
      const validData = {
        id: 'PROTO123',
        code: 'PROC-PLAGAS-001',
        name: 'Control de Plagas',
        version: 1,
        category: 'PLAGAS',
        frequency: 'MONTHLY',
        isMandatory: true,
        steps: [
          {
            id: 'STEP1',
            order: 1,
            title: 'Revisar trampas',
            required: true,
            kind: 'CHECK'
          },
          {
            id: 'STEP2',
            order: 2,
            title: 'Registrar incidencias',
            required: false,
            kind: 'INPUT',
            rule: {
              input: {
                placeholder: 'Ej. trampa 3: mosca capturada',
                multiline: true
              }
            }
          }
        ],
        status: 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'USER123',
        updatedAt: new Date(),
        schemaVersion: 2
      };
      
      const result = ProductionProtocolSchemaV2.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('DocumentSchemaV2', () => {
    test('validates document with versioning', () => {
      const validData = {
        id: 'DOC123',
        type: 'COA',
        title: 'Certificado de Análisis Lote 25020-SB-001',
        linkedEntity: {
          type: 'lot',
          id: '25020-SB-001'
        },
        fileUrl: 'https://storage.example.com/doc123.pdf',
        version: 1,
        status: 'APPROVED',
        approvals: [
          {
            by: 'USER_QC_MANAGER',
            at: new Date(),
            role: 'QUALITY'
          }
        ],
        source: 'upload',
        createdAt: new Date(),
        createdBy: 'USER123',
        updatedAt: new Date(),
        schemaVersion: 2
      };
      
      const result = DocumentSchemaV2.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('GeminiAnalysisSchema', () => {
    test('validates Gemini analysis', () => {
      const validData = {
        id: 'ANALYSIS123',
        phase: 'QUALITY',
        signal: 'high_rejection_rate',
        severity: 'warning',
        detectedAt: new Date(),
        linkedEntity: {
          type: 'lot',
          id: 'LOT123'
        },
        status: 'OPEN',
        autoAction: 'CREATE_TASK',
        schemaVersion: 1
      };
      
      const result = GeminiAnalysisSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('TaskSchema', () => {
    test('validates task', () => {
      const validData = {
        id: 'TASK123',
        kind: 'QC',
        title: 'Revisar lote rechazado',
        linkedEntity: {
          type: 'lot',
          id: 'LOT123'
        },
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'SYSTEM',
        schemaVersion: 1
      };
      
      const result = TaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('AuditLogSchema', () => {
    test('validates audit log with hash chain', () => {
      const validData = {
        id: 'AUDIT123',
        entity: {
          type: 'qualityRelease',
          id: 'RELEASE123'
        },
        action: 'APPROVE',
        by: 'USER_QC_MANAGER',
        at: new Date(),
        hash: 'a'.repeat(64), // SHA256
        correlationId: 'TX_12345',
        schemaVersion: 1
      };
      
      const result = AuditLogSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    test('rejects invalid hash length', () => {
      const invalidData = {
        id: 'AUDIT123',
        entity: { type: 'lot', id: 'LOT123' },
        action: 'CREATE',
        by: 'USER123',
        at: new Date(),
        hash: 'short',  // ❌ Should be 64 chars
        schemaVersion: 1
      };
      
      const result = AuditLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Helper Functions', () => {
    test('validateSchema returns detailed errors', () => {
      const invalidData = {
        id: 'TEST',
        // Missing required fields
      };
      
      const result = validateSchema(LotSchema, invalidData, 'TestLot');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('TestLot');
      }
    });
    
    test('assertSchema throws on invalid data', () => {
      const invalidData = {
        id: 'TEST'
      };
      
      expect(() => {
        assertSchema(LotSchema, invalidData, 'TestLot');
      }).toThrow('Schema validation failed');
    });
    
    test('assertSchema returns typed data on success', () => {
      const validData = {
        id: 'LOT123',
        lotCode: '25020-SB-001',
        itemId: 'ITEM123',
        locationId: 'MAIN',
        quantity: 1000,
        uom: 'kg',
        qcStatus: 'PENDING',
        createdAt: new Date(),
        createdBy: 'USER123',
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const lot = assertSchema(LotSchema, validData);
      expect(lot.lotCode).toBe('25020-SB-001');
      expect(lot.quantity).toBe(1000);
    });
  });
});
