// tests/ssot-v2/onhand.invariants.test.ts
import { describe, test, expect } from 'vitest';
import { OnHandService, OnHandInvariants } from '../../src/services/canonical/onhand.service';
import type { OnHand, QcBucket } from '../../src/services/canonical/onhand.service';

describe('OnHand Service - Invariants', () => {
  
  describe('ID Generation', () => {
    test('should build canonical OnHand ID', () => {
      const id = OnHandService.buildOnHandId('ITEM_123', '25001-SB-001', 'MAIN');
      expect(id).toBe('ITEM_123::25001-SB-001::MAIN');
    });
  });

  describe('Invariants Validation', () => {
    test('totalQty invariant - valid case', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 175,  // 100 + 50 + 25
        availableQty: 90,  // 100 - 10 (reserved)
        reservedQty: { RELEASED: 10 },
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.totalQty(onHand)).toBe(true);
    });

    test('totalQty invariant - invalid case', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 200,  // ❌ Incorrecto: debería ser 175
        availableQty: 90,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.totalQty(onHand)).toBe(false);
    });

    test('availableQty invariant - valid case', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 175,
        availableQty: 90,  // 100 - 10 (reserved)
        reservedQty: { RELEASED: 10 },
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.availableQty(onHand)).toBe(true);
    });

    test('noNegatives invariant - all positive', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 175,
        availableQty: 90,
        reservedQty: { RELEASED: 10 },
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.noNegatives(onHand)).toBe(true);
    });

    test('noNegatives invariant - fails with negative HOLD', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: -10, REJECTED: 25 }, // ❌ Negativo
        totalQty: 115,
        availableQty: 90,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.noNegatives(onHand)).toBe(false);
    });

    test('validReservations invariant - valid case', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 175,
        availableQty: 80,
        reservedQty: { RELEASED: 20 },  // ✅ 20 <= 100 (RELEASED)
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.validReservations(onHand)).toBe(true);
    });

    test('validReservations invariant - fails when reserved > released', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 50, REJECTED: 25 },
        totalQty: 175,
        availableQty: -50,  // ❌ Negativo debido a over-reservation
        reservedQty: { RELEASED: 150 },  // ❌ 150 > 100 (RELEASED)
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      expect(OnHandInvariants.validReservations(onHand)).toBe(false);
    });

    test('validateInvariants method - returns violations', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: -10, REJECTED: 25 }, // ❌ HOLD negativo
        totalQty: 200,  // ❌ Incorrecto
        availableQty: 90,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandService.validateInvariants(onHand);
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('totalQty');
      expect(result.violations).toContain('noNegatives');
    });
  });

  describe('Business Logic Edge Cases', () => {
    test('empty OnHand should be valid', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 0, HOLD: 0, REJECTED: 0 },
        totalQty: 0,
        availableQty: 0,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandService.validateInvariants(onHand);
      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    test('OnHand with only REJECTED stock should be valid', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 0, HOLD: 0, REJECTED: 100 },
        totalQty: 100,
        availableQty: 0,
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandService.validateInvariants(onHand);
      expect(result.valid).toBe(true);
    });

    test('OnHand with 100% reserved stock should be valid', () => {
      const onHand: OnHand = {
        id: 'test::test::test',
        itemId: 'ITEM_123',
        lotCode: '25001-SB-001',
        locationId: 'MAIN',
        qty: { RELEASED: 100, HOLD: 0, REJECTED: 0 },
        totalQty: 100,
        availableQty: 0,        // Totalmente reservado
        reservedQty: { RELEASED: 100 },
        updatedAt: new Date(),
        schemaVersion: 1
      };
      
      const result = OnHandService.validateInvariants(onHand);
      expect(result.valid).toBe(true);
    });
  });
});
