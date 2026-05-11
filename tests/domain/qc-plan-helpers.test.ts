// tests/domain/qc-plan-helpers.test.ts
/**
 * Tests para helpers de QcPlan
 * Verifica migración y normalización de planes QC
 */

import { describe, test, expect } from 'vitest';
import {
  normalizeTriggerOn,
  normalizeParameter,
  normalizeParameters,
  normalizeAutoApproveRules,
  migrateQcPlan,
  hasModuleIntegration,
  getTriggerLabel,
} from '@/domain/qc-plan-helpers';
import type { QcPlanTrigger, QcParameter, QcPlan } from '@/domain/ssot';

describe('QC Plan Helpers', () => {
  describe('normalizeTriggerOn', () => {
    test('convierte formato legacy a array', () => {
      expect(normalizeTriggerOn('RECEIPT')).toEqual(['RECEIPT']);
      expect(normalizeTriggerOn('PRODUCTION')).toEqual(['PRODUCTION']);
      expect(normalizeTriggerOn('BOTH')).toEqual(['RECEIPT', 'PRODUCTION']);
    });

    test('mantiene arrays ya normalizados', () => {
      const triggers: QcPlanTrigger[] = ['RECEIPT', 'SHIPMENT'];
      expect(normalizeTriggerOn(triggers)).toEqual(triggers);
    });

    test('maneja undefined retornando default', () => {
      expect(normalizeTriggerOn(undefined)).toEqual(['RECEIPT']);
    });

    test('normaliza case sensitivity', () => {
      expect(normalizeTriggerOn('receipt')).toEqual(['RECEIPT']);
      expect(normalizeTriggerOn('Production')).toEqual(['PRODUCTION']);
    });
  });

  describe('normalizeParameter', () => {
    test('migra parámetro legacy a formato nuevo', () => {
      const legacyParam = {
        parameterId: 'temp-001',
        min: 18,
        max: 25,
        target: 22,
        unit: '°C',
        required: true,
      };

      const normalized = normalizeParameter(legacyParam);

      expect(normalized.id).toBe('temp-001');
      expect(normalized.type).toBe('NUMERIC'); // Inferido por min/max
      expect(normalized.min).toBe(18);
      expect(normalized.max).toBe(25);
      expect(normalized.target).toBe(22);
      expect(normalized.unit).toBe('°C');
      expect(normalized.required).toBe(true);
    });

    test('infiere tipo NUMERIC si tiene min/max/target', () => {
      expect(normalizeParameter({ id: 'p1', min: 0 }).type).toBe('NUMERIC');
      expect(normalizeParameter({ id: 'p2', max: 100 }).type).toBe('NUMERIC');
      expect(normalizeParameter({ id: 'p3', target: 50 }).type).toBe('NUMERIC');
    });

    test('infiere tipo SELECT si tiene options', () => {
      const param = normalizeParameter({
        id: 'p1',
        options: ['A', 'B', 'C']
      });
      expect(param.type).toBe('SELECT');
      expect(param.options).toEqual(['A', 'B', 'C']);
    });

    test('infiere tipo FILE si tiene acceptedFormats', () => {
      const param = normalizeParameter({
        id: 'p1',
        acceptedFormats: ['pdf', 'jpg']
      });
      expect(param.type).toBe('FILE');
      expect(param.acceptedFormats).toEqual(['pdf', 'jpg']);
    });

    test('usa TEXT como tipo por defecto', () => {
      const param = normalizeParameter({
        id: 'p1',
        name: 'Observaciones'
      });
      expect(param.type).toBe('TEXT');
    });

    test('genera ID si no existe', () => {
      const param = normalizeParameter({
        parameterId: 'test-id',
        name: 'Test'
      });
      expect(param.id).toBe('test-id');
    });

    test('retorna parámetro ya normalizado sin cambios', () => {
      const normalizedParam: QcParameter = {
        id: 'p1',
        name: 'Test Param',
        type: 'NUMERIC',
        min: 0,
        max: 100,
      };

      const result = normalizeParameter(normalizedParam);
      expect(result).toEqual(normalizedParam);
    });
  });

  describe('normalizeParameters', () => {
    test('normaliza array de parámetros', () => {
      const legacyParams = [
        { parameterId: 'p1', min: 0, max: 10 },
        { parameterId: 'p2', options: ['A', 'B'] },
      ];

      const normalized = normalizeParameters(legacyParams);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].type).toBe('NUMERIC');
      expect(normalized[1].type).toBe('SELECT');
    });

    test('maneja array vacío', () => {
      expect(normalizeParameters([])).toEqual([]);
    });

    test('maneja undefined', () => {
      expect(normalizeParameters(undefined)).toEqual([]);
    });
  });

  describe('normalizeAutoApproveRules', () => {
    test('convierte reglas legacy a formato nuevo', () => {
      const legacyRules = {
        enabled: true,
        conditions: {
          allTestsPass: true,
          trustedSuppliers: ['SUP-001'],
          maxLotSize: 1000,
        },
      };

      const normalized = normalizeAutoApproveRules(legacyRules);

      expect(normalized?.enabled).toBe(true);
      expect(normalized?.conditions).toBeDefined();
      expect(normalized?.conditions).toBeDefined();
      expect(normalized?.conditions?.allTestsPass).toBe(true);
    });

    test('mantiene reglas ya normalizadas', () => {
      const newRules = {
        enabled: true,
        conditions: [{
          type: 'ALL_PARAMS_IN_SPEC' as const,
          action: 'AUTO_APPROVE' as const,
        }],
      };

      const normalized = normalizeAutoApproveRules(newRules);
      expect(normalized).toEqual(newRules);
    });

    test('maneja undefined', () => {
      expect(normalizeAutoApproveRules(undefined)).toBeUndefined();
    });
  });

  describe('hasModuleIntegration', () => {
    test('detecta integración activa en producción', () => {
      const plan: QcPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        triggerOn: 'PRODUCTION',
        active: true,
        integrations: {
          production: {
            enforceInOrders: true,
            blockIfFailed: false,
          },
        },
      };

      expect(hasModuleIntegration(plan, 'production')).toBe(true);
    });

    test('retorna false si no hay integraciones', () => {
      const plan: QcPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        triggerOn: 'RECEIPT',
        active: true,
      };

      expect(hasModuleIntegration(plan, 'production')).toBe(false);
    });

    test('retorna false si módulo no existe en integraciones', () => {
      const plan: QcPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        triggerOn: 'RECEIPT',
        active: true,
        integrations: {
          production: {
            enforceInOrders: true,
            blockIfFailed: false,
          },
        },
      };

      expect(hasModuleIntegration(plan, 'logistics')).toBe(false);
    });

    test('retorna false si todas las opciones están en false', () => {
      const plan: QcPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        triggerOn: 'PRODUCTION',
        active: true,
        integrations: {
          production: {
            enforceInOrders: false,
            blockIfFailed: false,
          },
        },
      };

      expect(hasModuleIntegration(plan, 'production')).toBe(false);
    });
  });

  describe('getTriggerLabel', () => {
    test('retorna labels en español', () => {
      expect(getTriggerLabel('RECEIPT')).toBe('Recepción');
      expect(getTriggerLabel('PRODUCTION')).toBe('Producción');
      expect(getTriggerLabel('TRANSFER')).toBe('Transferencia');
      expect(getTriggerLabel('SHIPMENT')).toBe('Envío');
      expect(getTriggerLabel('PERIODIC')).toBe('Periódico');
      expect(getTriggerLabel('ON_DEMAND')).toBe('Bajo demanda');
      expect(getTriggerLabel('CONDITIONAL')).toBe('Condicional');
    });
  });

  describe('migrateQcPlan', () => {
    test('migra plan completo de formato legacy', () => {
      const legacyPlan = {
        id: 'plan-001',
        name: 'Test Plan',
        triggerOn: 'BOTH',
        parameters: [
          { parameterId: 'temp', min: 18, max: 25 },
          { parameterId: 'ph', options: ['A', 'B'] },
        ],
        autoApproveRules: {
          enabled: true,
          conditions: {
            allTestsPass: true,
          },
        },
        active: true,
      };

      const migrated = migrateQcPlan(legacyPlan);

      expect(migrated.triggerOn).toEqual(['RECEIPT', 'PRODUCTION']);
      expect(migrated.parameters).toHaveLength(2);
      expect(migrated.parameters?.[0].type).toBe('NUMERIC');
      expect(migrated.parameters?.[1].type).toBe('SELECT');
      expect(migrated.autoApproveRules?.enabled).toBe(true);
    });
  });
});
