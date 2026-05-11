/**
 * Tests for Inventory Validation Module
 * 
 * Tests críticos para validateLotConsumption y helpers FEFO
 */

import { describe, it, expect } from 'vitest';
import {
  validateLotConsumption,
  checkLotConsumptionEligibility,
  filterConsumableLots,
  sortLotsByFEFO,
  selectBestLotFEFO,
  analyzeNonConsumableLots,
  LotNotApprovedException,
  LotExpiredException,
  APPROVED_QC_STATUSES,
} from '@/lib/inventory-validation';
import type { Lot, QcStatus } from '@/domain/ssot';

// Helper para crear lotes de prueba
function createTestLot(overrides: Partial<Lot> = {}): Lot {
  const now = new Date().toISOString();
  return {
    id: 'TEST-LOT-001',
    lotNumber: 'TEST-LOT-001',
    itemId: 'TEST-ITEM',
    itemName: 'Test Item',
    quantity: 100,
    uom: 'kg',
    qcStatus: 'PASSED',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('inventory-validation', () => {
  describe('APPROVED_QC_STATUSES', () => {
    it('debe contener exactamente los estados aprobados', () => {
      expect(APPROVED_QC_STATUSES).toEqual(['PASSED', 'CONDITIONAL', 'WAIVED']);
    });
  });

  describe('validateLotConsumption', () => {
    describe('Estados QC Aprobados', () => {
      it('debe permitir consumo de lote PASSED', () => {
        const lot = createTestLot({ qcStatus: 'PASSED' });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });

      it('debe permitir consumo de lote CONDITIONAL', () => {
        const lot = createTestLot({ qcStatus: 'CONDITIONAL' });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });

      it('debe permitir consumo de lote WAIVED', () => {
        const lot = createTestLot({ qcStatus: 'WAIVED' });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });
    });

    describe('Estados QC No Aprobados', () => {
      it('debe bloquear consumo de lote PENDING', () => {
        const lot = createTestLot({ qcStatus: 'PENDING' });
        expect(() => validateLotConsumption(lot)).toThrow(LotNotApprovedException);
      });

      it('debe bloquear consumo de lote IN_PROGRESS', () => {
        const lot = createTestLot({ qcStatus: 'IN_PROGRESS' });
        expect(() => validateLotConsumption(lot)).toThrow(LotNotApprovedException);
      });

      it('debe bloquear consumo de lote HOLD', () => {
        const lot = createTestLot({ qcStatus: 'HOLD' });
        expect(() => validateLotConsumption(lot)).toThrow(LotNotApprovedException);
      });

      it('debe bloquear consumo de lote FAILED', () => {
        const lot = createTestLot({ qcStatus: 'FAILED' });
        expect(() => validateLotConsumption(lot)).toThrow(LotNotApprovedException);
      });
    });

    describe('Validación de Caducidad', () => {
      it('debe permitir lote sin fecha de caducidad', () => {
        const lot = createTestLot({ qcStatus: 'PASSED', expDate: undefined });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });

      it('debe permitir lote con caducidad futura', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const lot = createTestLot({ 
          qcStatus: 'PASSED', 
          expDate: futureDate.toISOString() 
        });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });

      it('debe bloquear lote caducado', () => {
        const pastDate = new Date('2020-01-01').toISOString();
        const lot = createTestLot({ qcStatus: 'PASSED', expDate: pastDate });
        expect(() => validateLotConsumption(lot)).toThrow(LotExpiredException);
      });

      it('debe lanzar excepción con lotNumber y expDate correctos', () => {
        const pastDate = '2020-01-01';
        const lot = createTestLot({ 
          lotNumber: 'LOT-EXPIRED-001',
          qcStatus: 'PASSED', 
          expDate: pastDate 
        });
        
        try {
          validateLotConsumption(lot);
          throw new Error('Debería haber lanzado excepción');
        } catch (error) {
          expect(error).toBeInstanceOf(LotExpiredException);
          if (error instanceof LotExpiredException) {
            expect(error.lotNumber).toBe('LOT-EXPIRED-001');
            expect(error.expDate).toBe(pastDate);
          }
        }
      });
    });

    describe('Validación de Cantidad', () => {
      it('debe bloquear lote sin stock', () => {
        const lot = createTestLot({ qcStatus: 'PASSED', quantity: 0 });
        expect(() => validateLotConsumption(lot)).toThrow('no tiene stock disponible');
      });

      it('debe permitir lote con stock positivo', () => {
        const lot = createTestLot({ qcStatus: 'PASSED', quantity: 100 });
        expect(() => validateLotConsumption(lot)).not.toThrow();
      });
    });

    describe('Excepciones Personalizadas', () => {
      it('LotNotApprovedException debe incluir lotNumber y currentStatus', () => {
        const lot = createTestLot({ 
          lotNumber: 'LOT-PENDING-001',
          qcStatus: 'PENDING' 
        });
        
        try {
          validateLotConsumption(lot);
          throw new Error('Debería haber lanzado excepción');
        } catch (error) {
          expect(error).toBeInstanceOf(LotNotApprovedException);
          if (error instanceof LotNotApprovedException) {
            expect(error.lotNumber).toBe('LOT-PENDING-001');
            expect(error.currentStatus).toBe('PENDING');
            expect(error.message).toContain('PENDIENTE DE QC');
          }
        }
      });

      it('Mensaje de error debe incluir estados permitidos', () => {
        const lot = createTestLot({ qcStatus: 'HOLD' });
        
        try {
          validateLotConsumption(lot);
        } catch (error: any) {
          expect(error.message).toContain('PASSED');
          expect(error.message).toContain('CONDITIONAL');
          expect(error.message).toContain('WAIVED');
        }
      });
    });
  });

  describe('checkLotConsumptionEligibility', () => {
    it('debe retornar valid=true para lote aprobado', () => {
      const lot = createTestLot({ qcStatus: 'PASSED' });
      const result = checkLotConsumptionEligibility(lot);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe retornar valid=false con errors para lote PENDING', () => {
      const lot = createTestLot({ qcStatus: 'PENDING' });
      const result = checkLotConsumptionEligibility(lot);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('no aprobado');
    });

    it('debe incluir warnings para lote próximo a caducar', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 5); // 5 días
      
      const lot = createTestLot({ 
        qcStatus: 'PASSED', 
        expDate: soonDate.toISOString() 
      });
      const result = checkLotConsumptionEligibility(lot);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('caduca en 5 días');
    });
  });

  describe('filterConsumableLots', () => {
    it('debe filtrar solo lotes consumibles', () => {
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED' }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PENDING' }),
        createTestLot({ lotNumber: 'LOT-003', qcStatus: 'FAILED' }),
        createTestLot({ lotNumber: 'LOT-004', qcStatus: 'CONDITIONAL' }),
      ];
      
      const consumable = filterConsumableLots(lots);
      
      expect(consumable).toHaveLength(2);
      expect(consumable.map(l => l.lotNumber)).toContain('LOT-001');
      expect(consumable.map(l => l.lotNumber)).toContain('LOT-004');
    });

    it('debe excluir lotes caducados', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED' }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PASSED', expDate: pastDate }),
      ];
      
      const consumable = filterConsumableLots(lots);
      
      expect(consumable).toHaveLength(1);
      expect(consumable[0].lotNumber).toBe('LOT-001');
    });
  });

  describe('sortLotsByFEFO', () => {
    it('debe ordenar por fecha de caducidad ascendente (FEFO)', () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() + 10);
      
      const date2 = new Date();
      date2.setDate(date2.getDate() + 5);
      
      const date3 = new Date();
      date3.setDate(date3.getDate() + 15);
      
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED', expDate: date1.toISOString() }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PASSED', expDate: date2.toISOString() }),
        createTestLot({ lotNumber: 'LOT-003', qcStatus: 'PASSED', expDate: date3.toISOString() }),
      ];
      
      const sorted = sortLotsByFEFO(lots);
      
      expect(sorted[0].lotNumber).toBe('LOT-002'); // Caduca primero
      expect(sorted[1].lotNumber).toBe('LOT-001');
      expect(sorted[2].lotNumber).toBe('LOT-003'); // Caduca último
    });

    it('debe poner lotes sin caducidad al final', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED', expDate: undefined }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PASSED', expDate: futureDate.toISOString() }),
      ];
      
      const sorted = sortLotsByFEFO(lots);
      
      expect(sorted[0].lotNumber).toBe('LOT-002'); // Con fecha primero
      expect(sorted[1].lotNumber).toBe('LOT-001'); // Sin fecha al final
    });

    it('debe excluir lotes no consumibles', () => {
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED' }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PENDING' }),
        createTestLot({ lotNumber: 'LOT-003', qcStatus: 'PASSED' }),
      ];
      
      const sorted = sortLotsByFEFO(lots);
      
      expect(sorted).toHaveLength(2);
      expect(sorted.map(l => l.lotNumber)).not.toContain('LOT-002');
    });
  });

  describe('selectBestLotFEFO', () => {
    it('debe seleccionar el lote con cantidad suficiente que caduca primero', () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() + 10);
      
      const date2 = new Date();
      date2.setDate(date2.getDate() + 5);
      
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED', quantity: 200, expDate: date1.toISOString() }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PASSED', quantity: 150, expDate: date2.toISOString() }),
      ];
      
      const best = selectBestLotFEFO(lots, 100);
      
      expect(best?.lotNumber).toBe('LOT-002'); // Caduca primero y tiene cantidad suficiente
    });

    it('debe retornar null si no hay lotes disponibles', () => {
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PENDING', quantity: 100 }),
      ];
      
      const best = selectBestLotFEFO(lots, 50);
      
      expect(best).toBeNull();
    });

    it('debe retornar el primer lote si ninguno tiene cantidad suficiente', () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() + 10);
      
      const date2 = new Date();
      date2.setDate(date2.getDate() + 5);
      
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED', quantity: 30, expDate: date1.toISOString() }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PASSED', quantity: 40, expDate: date2.toISOString() }),
      ];
      
      const best = selectBestLotFEFO(lots, 100);
      
      expect(best?.lotNumber).toBe('LOT-002'); // El que caduca primero (FEFO)
    });
  });

  describe('analyzeNonConsumableLots', () => {
    it('debe identificar lotes no consumibles con razones', () => {
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED' }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PENDING' }),
        createTestLot({ lotNumber: 'LOT-003', qcStatus: 'FAILED' }),
      ];
      
      const analysis = analyzeNonConsumableLots(lots);
      
      expect(analysis).toHaveLength(2);
      expect(analysis.find(a => a.lot.lotNumber === 'LOT-002')?.canBeResolved).toBe(true);
      expect(analysis.find(a => a.lot.lotNumber === 'LOT-003')?.canBeResolved).toBe(false);
    });

    it('debe sugerir acciones para lotes bloqueados', () => {
      const lots = [
        createTestLot({ lotNumber: 'LOT-PENDING', qcStatus: 'PENDING' }),
        createTestLot({ lotNumber: 'LOT-HOLD', qcStatus: 'HOLD' }),
        createTestLot({ lotNumber: 'LOT-FAILED', qcStatus: 'FAILED' }),
      ];
      
      const analysis = analyzeNonConsumableLots(lots);
      
      const pendingAnalysis = analysis.find(a => a.lot.lotNumber === 'LOT-PENDING');
      expect(pendingAnalysis?.suggestedAction).toBe('Completar proceso de QC');
      
      const holdAnalysis = analysis.find(a => a.lot.lotNumber === 'LOT-HOLD');
      expect(holdAnalysis?.suggestedAction).toBe('Resolver investigación de Calidad');
      
      const failedAnalysis = analysis.find(a => a.lot.lotNumber === 'LOT-FAILED');
      expect(failedAnalysis?.suggestedAction).toBe('Gestionar devolución o descarte');
    });
  });

  describe('Edge Cases', () => {
    it('validateLotConsumption debe manejar lote null/undefined', () => {
      expect(() => validateLotConsumption(null as any)).toThrow('Lote no proporcionado');
      expect(() => validateLotConsumption(undefined as any)).toThrow('Lote no proporcionado');
    });

    it('debe manejar lote con quantity negativa', () => {
      const lot = createTestLot({ qcStatus: 'PASSED', quantity: -10 });
      expect(() => validateLotConsumption(lot)).toThrow('no tiene stock disponible');
    });

    it('filterConsumableLots debe manejar array vacío', () => {
      const result = filterConsumableLots([]);
      expect(result).toEqual([]);
    });

    it('sortLotsByFEFO debe manejar array vacío', () => {
      const result = sortLotsByFEFO([]);
      expect(result).toEqual([]);
    });

    it('selectBestLotFEFO debe retornar null con array vacío', () => {
      const result = selectBestLotFEFO([], 100);
      expect(result).toBeNull();
    });
  });

  describe('Integración - Escenarios Reales', () => {
    it('Escenario: Preparar producción con múltiples lotes mixtos', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      
      const lots = [
        createTestLot({ lotNumber: 'LOT-001', qcStatus: 'PASSED', quantity: 50, expDate: nextMonth.toISOString() }),
        createTestLot({ lotNumber: 'LOT-002', qcStatus: 'PENDING', quantity: 100 }), // No consumible
        createTestLot({ lotNumber: 'LOT-003', qcStatus: 'PASSED', quantity: 80, expDate: nextWeek.toISOString() }),
        createTestLot({ lotNumber: 'LOT-004', qcStatus: 'PASSED', quantity: 30, expDate: tomorrow.toISOString() }),
        createTestLot({ lotNumber: 'LOT-005', qcStatus: 'HOLD', quantity: 200 }), // No consumible
      ];
      
      const consumable = filterConsumableLots(lots);
      const sorted = sortLotsByFEFO(consumable);
      const best = selectBestLotFEFO(consumable, 60);
      
      expect(consumable).toHaveLength(3); // Solo PASSED
      expect(sorted[0].lotNumber).toBe('LOT-004'); // Caduca mañana (FEFO)
      expect(best?.lotNumber).toBe('LOT-003'); // Primer lote con qty suficiente (>= 60)
    });
  });
});
