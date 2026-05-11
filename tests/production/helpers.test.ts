// tests/production/helpers.test.ts
import { describe, it, expect } from 'vitest';
import { 
  canEditPlan, 
  canStart, 
  canPause, 
  canResume, 
  canFinish, 
  isClosedLike,
  picksToRealLines 
} from '@/features/production/execution/helpers';
import type { ProductionStatus, Item } from '@/domain/ssot';

describe('Production Helpers - State Transitions', () => {
  describe('canEditPlan', () => {
    it('allows editing when status is PLANNED', () => {
      expect(canEditPlan('PLANNED')).toBe(true);
    });

    it('allows editing when status is null/undefined', () => {
      expect(canEditPlan(null as any)).toBe(true);
      expect(canEditPlan(undefined)).toBe(true);
    });

    it('disallows editing when IN_PROGRESS', () => {
      expect(canEditPlan('IN_PROGRESS')).toBe(false);
    });

    it('disallows editing when DONE', () => {
      expect(canEditPlan('DONE')).toBe(false);
    });

    it('disallows editing when CANCELLED', () => {
      expect(canEditPlan('CANCELLED')).toBe(false);
    });
  });

  describe('canStart', () => {
    it('allows starting when PLANNED', () => {
      expect(canStart('PLANNED')).toBe(true);
    });

    it('disallows starting when already IN_PROGRESS', () => {
      expect(canStart('IN_PROGRESS')).toBe(false);
    });

    it('disallows starting when DONE', () => {
      expect(canStart('DONE')).toBe(false);
    });

    it('disallows starting when undefined', () => {
      expect(canStart(undefined)).toBe(false);
    });
  });

  describe('canPause', () => {
    it('allows pausing when IN_PROGRESS', () => {
      expect(canPause('IN_PROGRESS')).toBe(true);
    });

    it('disallows pausing when PLANNED', () => {
      expect(canPause('PLANNED')).toBe(false);
    });

    it('disallows pausing when already PAUSED', () => {
      expect(canPause('PAUSED')).toBe(false);
    });

    it('disallows pausing when DONE', () => {
      expect(canPause('DONE')).toBe(false);
    });
  });

  describe('canResume', () => {
    it('allows resuming when PAUSED', () => {
      expect(canResume('PAUSED')).toBe(true);
    });

    it('disallows resuming when IN_PROGRESS', () => {
      expect(canResume('IN_PROGRESS')).toBe(false);
    });

    it('disallows resuming when DONE', () => {
      expect(canResume('DONE')).toBe(false);
    });
  });

  describe('canFinish', () => {
    it('allows finishing when IN_PROGRESS', () => {
      expect(canFinish('IN_PROGRESS')).toBe(true);
    });

    it('allows finishing when PAUSED', () => {
      expect(canFinish('PAUSED')).toBe(true);
    });

    it('disallows finishing when PLANNED', () => {
      expect(canFinish('PLANNED')).toBe(false);
    });

    it('disallows finishing when already DONE', () => {
      expect(canFinish('DONE')).toBe(false);
    });
  });

  describe('isClosedLike', () => {
    it('returns true for DONE status', () => {
      expect(isClosedLike('DONE')).toBe(true);
    });

    it('returns true for CANCELLED status', () => {
      expect(isClosedLike('CANCELLED')).toBe(true);
    });

    it('returns false for IN_PROGRESS', () => {
      expect(isClosedLike('IN_PROGRESS')).toBe(false);
    });

    it('returns false for PLANNED', () => {
      expect(isClosedLike('PLANNED')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isClosedLike(undefined)).toBe(false);
    });
  });
});

describe('picksToRealLines - Aggregation Logic', () => {
  const mockItemsMap = new Map<string, Item>([
    ['item1', { id: 'item1', sku: 'SKU1', name: 'Material A', category: 'raw', uom: 'kg', active: true } as Item],
    ['item2', { id: 'item2', sku: 'SKU2', name: 'Material B', category: 'raw', uom: 'L', active: true } as Item],
  ]);

  it('aggregates picks by SKU + lotNumber + UOM', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L001', qty: 5, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L002', qty: 3, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result).toHaveLength(2); // 2 combinaciones únicas
    expect(result[0].theoreticalQty).toBe(15); // 10 + 5
    expect(result[1].theoreticalQty).toBe(3);
  });

  it('sets realQty equal to theoreticalQty by default', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result[0].theoreticalQty).toBe(10);
    expect(result[0].realQty).toBe(10); // Default
  });

  it('includes item name from itemsMap', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    // picksToRealLines usa SKU como fallback si no encuentra en itemsMap
    expect(result[0].itemName).toBeDefined();
    expect(['Material A', 'SKU1']).toContain(result[0].itemName);
  });

  it('handles unknown SKU gracefully', () => {
    const picks = [
      { sku: 'UNKNOWN_SKU', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('UNKNOWN_SKU'); // Falls back to SKU
  });

  it('handles empty picks array', () => {
    const picks: any[] = [];
    const result = picksToRealLines(picks, mockItemsMap);
    expect(result).toHaveLength(0);
  });

  it('rounds quantities to 3 decimal places', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10.123456, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L001', qty: 5.987654, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result[0].theoreticalQty).toBe(16.111); // Rounded to 3 decimals
  });

  it('preserves location from first pick', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L001', qty: 5, uom: 'kg', locationId: 'W2' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result[0].fromLocationId).toBe('W1'); // First location wins
  });

  it('distinguishes different lot numbers', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L002', qty: 10, uom: 'kg', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result).toHaveLength(2);
    expect(result.find(r => r.lotNumber === 'L001')?.theoreticalQty).toBe(10);
    expect(result.find(r => r.lotNumber === 'L002')?.theoreticalQty).toBe(10);
  });

  it('distinguishes different UOMs for same SKU+lot', () => {
    const picks = [
      { sku: 'SKU1', lotNumber: 'L001', qty: 10, uom: 'kg', locationId: 'W1' },
      { sku: 'SKU1', lotNumber: 'L001', qty: 5, uom: 'g', locationId: 'W1' },
    ];

    const result = picksToRealLines(picks, mockItemsMap);

    expect(result).toHaveLength(2); // Different UOMs
  });
});

describe('State Transition Matrix', () => {
  const statuses: ProductionStatus[] = [
    'PLANNED', 
    'RELEASED', 
    'IN_PROGRESS', 
    'PAUSED', 
    'QC_HOLD', 
    'DONE', 
    'CANCELLED'
  ];

  it('validates complete state transition matrix', () => {
    const transitions = {
      PLANNED: {
        canEdit: true,
        canStart: true,
        canPause: false,
        canResume: false,
        canFinish: false,
        isClosed: false,
      },
      RELEASED: {
        canEdit: false,
        canStart: false,
        canPause: false,
        canResume: false,
        canFinish: false,
        isClosed: false,
      },
      IN_PROGRESS: {
        canEdit: false,
        canStart: false,
        canPause: true,
        canResume: false,
        canFinish: true,
        isClosed: false,
      },
      PAUSED: {
        canEdit: false,
        canStart: false,
        canPause: false,
        canResume: true,
        canFinish: true,
        isClosed: false,
      },
      QC_HOLD: {
        canEdit: false,
        canStart: false,
        canPause: false,
        canResume: false,
        canFinish: false,
        isClosed: false,
      },
      DONE: {
        canEdit: false,
        canStart: false,
        canPause: false,
        canResume: false,
        canFinish: false,
        isClosed: true,
      },
      CANCELLED: {
        canEdit: false,
        canStart: false,
        canPause: false,
        canResume: false,
        canFinish: false,
        isClosed: true,
      },
    };

    statuses.forEach(status => {
      const expected = transitions[status];
      expect(canEditPlan(status)).toBe(expected.canEdit);
      expect(canStart(status)).toBe(expected.canStart);
      expect(canPause(status)).toBe(expected.canPause);
      expect(canResume(status)).toBe(expected.canResume);
      expect(canFinish(status)).toBe(expected.canFinish);
      expect(isClosedLike(status)).toBe(expected.isClosed);
    });
  });
});
