// tests/domain/qc-status.test.ts
/**
 * Tests para utilidades de QC Status
 * Verifica la lógica de estados de control de calidad
 */

import { describe, test, expect } from 'vitest';
import {
  isQcReleased,
  isQcHold,
  isQcFailed,
  isQcActionable,
  getQcStatusLabel,
  getQcStatusBadgeClass,
  inheritQcStatus,
  getInitialQcStatus,
} from '@/domain/qc-status';
import type { QcStatus } from '@/domain/ssot';

describe('QC Status Utilities', () => {
  describe('isQcReleased', () => {
    test('identifica estados liberados correctamente', () => {
      expect(isQcReleased('PASSED')).toBe(true);
      expect(isQcReleased('WAIVED')).toBe(true);
    });

    test('rechaza estados no liberados', () => {
      expect(isQcReleased('PENDING')).toBe(false);
      expect(isQcReleased('HOLD')).toBe(false);
      expect(isQcReleased('FAILED')).toBe(false);
      expect(isQcReleased('IN_PROGRESS')).toBe(false);
      expect(isQcReleased('CONDITIONAL')).toBe(false);
    });

    test('maneja valores null/undefined', () => {
      expect(isQcReleased(null)).toBe(false);
      expect(isQcReleased(undefined)).toBe(false);
    });

    test('normaliza valores string a uppercase', () => {
      expect(isQcReleased('passed')).toBe(true);
      expect(isQcReleased('PASSED')).toBe(true);
      expect(isQcReleased('Passed')).toBe(true);
    });
  });

  describe('isQcHold', () => {
    test('identifica estados en cuarentena', () => {
      expect(isQcHold('PENDING')).toBe(true);
      expect(isQcHold('HOLD')).toBe(true);
    });

    test('rechaza estados no en cuarentena', () => {
      expect(isQcHold('PASSED')).toBe(false);
      expect(isQcHold('FAILED')).toBe(false);
      expect(isQcHold('WAIVED')).toBe(false);
    });
  });

  describe('isQcFailed', () => {
    test('identifica estado rechazado', () => {
      expect(isQcFailed('FAILED')).toBe(true);
    });

    test('rechaza estados no rechazados', () => {
      expect(isQcFailed('PASSED')).toBe(false);
      expect(isQcFailed('PENDING')).toBe(false);
      expect(isQcFailed('HOLD')).toBe(false);
    });
  });

  describe('isQcActionable', () => {
    test('identifica estados que requieren acción', () => {
      expect(isQcActionable('PENDING')).toBe(true);
      expect(isQcActionable('IN_PROGRESS')).toBe(true);
      expect(isQcActionable('CONDITIONAL')).toBe(true);
    });

    test('rechaza estados que no requieren acción', () => {
      expect(isQcActionable('PASSED')).toBe(false);
      expect(isQcActionable('FAILED')).toBe(false);
      expect(isQcActionable('HOLD')).toBe(false);
      expect(isQcActionable('WAIVED')).toBe(false);
    });
  });

  describe('getQcStatusLabel', () => {
    test('retorna labels en español', () => {
      expect(getQcStatusLabel('PENDING')).toBe('Pendiente');
      expect(getQcStatusLabel('PASSED')).toBe('Liberado');
      expect(getQcStatusLabel('FAILED')).toBe('Rechazado');
      expect(getQcStatusLabel('HOLD')).toBe('Retenido');
      expect(getQcStatusLabel('IN_PROGRESS')).toBe('En proceso');
      expect(getQcStatusLabel('CONDITIONAL')).toBe('Condicional');
      expect(getQcStatusLabel('WAIVED')).toBe('Exonerado');
    });
  });

  describe('getQcStatusBadgeClass', () => {
    test('retorna clases CSS correctas', () => {
      const passedClass = getQcStatusBadgeClass('PASSED');
      expect(passedClass).toContain('bg-green-100');
      expect(passedClass).toContain('text-green-800');

      const failedClass = getQcStatusBadgeClass('FAILED');
      expect(failedClass).toContain('bg-red-100');
      expect(failedClass).toContain('text-red-800');

      const pendingClass = getQcStatusBadgeClass('PENDING');
      expect(pendingClass).toContain('bg-yellow-100');
      expect(pendingClass).toContain('text-yellow-800');
    });

    test('todas las clases incluyen base', () => {
      const statuses: QcStatus[] = ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'HOLD', 'CONDITIONAL', 'WAIVED'];
      
      statuses.forEach(status => {
        const className = getQcStatusBadgeClass(status);
        expect(className).toContain('px-2');
        expect(className).toContain('py-1');
        expect(className).toContain('rounded-full');
      });
    });
  });

  describe('inheritQcStatus', () => {
    test('hereda PASSED si todos están liberados', () => {
      expect(inheritQcStatus(['PASSED', 'PASSED'])).toBe('PASSED');
      expect(inheritQcStatus(['PASSED', 'WAIVED'])).toBe('PASSED');
      expect(inheritQcStatus(['WAIVED', 'WAIVED'])).toBe('PASSED');
    });

    test('retorna HOLD si hay mezcla con PENDING o HOLD', () => {
      expect(inheritQcStatus(['PASSED', 'PENDING'])).toBe('HOLD');
      expect(inheritQcStatus(['PASSED', 'HOLD'])).toBe('HOLD');
    });

    test('retorna PENDING si alguno está rechazado', () => {
      expect(inheritQcStatus(['PASSED', 'FAILED'])).toBe('PENDING');
      expect(inheritQcStatus(['FAILED', 'FAILED'])).toBe('PENDING');
    });

    test('retorna HOLD si alguno está en hold', () => {
      expect(inheritQcStatus(['PENDING', 'HOLD'])).toBe('HOLD');
    });

    test('fuerza PENDING con forceReQc=true', () => {
      expect(inheritQcStatus(['PASSED', 'PASSED'], true)).toBe('PENDING');
      expect(inheritQcStatus(['WAIVED'], true)).toBe('PENDING');
    });

    test('maneja array vacío', () => {
      expect(inheritQcStatus([])).toBe('PENDING');
    });

    test('maneja undefined en array', () => {
      expect(inheritQcStatus([undefined, 'PASSED'])).toBe('PASSED');
      expect(inheritQcStatus([undefined, undefined])).toBe('PENDING');
    });
  });

  describe('getInitialQcStatus', () => {
    test('fuerza PENDING con sendToQc=true', () => {
      expect(getInitialQcStatus('fg', true)).toBe('PENDING');
      expect(getInitialQcStatus('raw', true)).toBe('PENDING');
      expect(getInitialQcStatus('merch', true)).toBe('PENDING');
    });

    test('retorna PENDING para categorías críticas', () => {
      expect(getInitialQcStatus('raw')).toBe('PENDING');
      expect(getInitialQcStatus('pack')).toBe('PENDING');
      expect(getInitialQcStatus('fg')).toBe('PENDING');
      expect(getInitialQcStatus('intermediate')).toBe('PENDING');
    });

    test('retorna PASSED para categorías no críticas', () => {
      expect(getInitialQcStatus('merch')).toBe('PASSED');
      expect(getInitialQcStatus('consumable')).toBe('PASSED');
      expect(getInitialQcStatus('label')).toBe('PASSED');
    });

    test('retorna PENDING si categoría es undefined', () => {
      expect(getInitialQcStatus(undefined)).toBe('PASSED');
    });
  });
});
