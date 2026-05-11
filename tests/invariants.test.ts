import { Invariants } from '../src/domain/ssot-v2-plus-schemas';
import { Lot, OnHand } from '../src/domain/ssot-v2-plus-schemas';

describe('SSOT Invariants', () => {
  describe('qcStatusMatchesBuckets', () => {
    it('should pass when lot is PENDING and no stock is RELEASED', () => {
      const lot: Lot = { qcStatus: 'PENDING' } as any;
      const onHand: OnHand = { qty: { RELEASED: 0, HOLD: 10, REJECTED: 0 } } as any;
      expect(Invariants.qcStatusMatchesBuckets(lot, onHand)).toBeNull();
    });

    it('should fail when lot is PENDING and stock is RELEASED', () => {
      const lot: Lot = { qcStatus: 'PENDING' } as any;
      const onHand: OnHand = { qty: { RELEASED: 1, HOLD: 9, REJECTED: 0 } } as any;
      expect(Invariants.qcStatusMatchesBuckets(lot, onHand)).toBe('PENDING lot cannot have RELEASED stock');
    });

    it('should pass when lot is FAILED and all stock is REJECTED', () => {
      const lot: Lot = { qcStatus: 'FAILED' } as any;
      const onHand: OnHand = { qty: { RELEASED: 0, HOLD: 0, REJECTED: 10 } } as any;
      expect(Invariants.qcStatusMatchesBuckets(lot, onHand)).toBeNull();
    });

    it('should fail when lot is FAILED and stock is not all REJECTED', () => {
      const lot: Lot = { qcStatus: 'FAILED' } as any;
      const onHand: OnHand = { qty: { RELEASED: 1, HOLD: 1, REJECTED: 8 } } as any;
      expect(Invariants.qcStatusMatchesBuckets(lot, onHand)).toBe('FAILED lot must have all stock in REJECTED');
    });
  });

  describe('onHand totals', () => {
    it('should pass when totals are consistent', () => {
      const onHand: OnHand = {
        qty: { RELEASED: 10, HOLD: 5, REJECTED: 2 },
        reservedQty: { RELEASED: 3 },
        totalQty: 17,
        availableQty: 7,
      } as any;
      expect(Invariants.onHand(onHand)).toBeNull();
    });

    it('should fail when totalQty is inconsistent', () => {
      const onHand: OnHand = {
        qty: { RELEASED: 10, HOLD: 5, REJECTED: 2 },
        reservedQty: { RELEASED: 3 },
        totalQty: 10, // Incorrect total
        availableQty: 7,
      } as any;
      expect(Invariants.onHand(onHand)).toBe('totalQty mismatch: expected sum of buckets');
    });

    it('should fail when availableQty is inconsistent', () => {
      const onHand: OnHand = {
        qty: { RELEASED: 10, HOLD: 5, REJECTED: 2 },
        reservedQty: { RELEASED: 3 },
        totalQty: 17,
        availableQty: 10, // Incorrect available
      } as any;
      expect(Invariants.onHand(onHand)).toBe('availableQty mismatch: expected RELEASED - reserved');
    });
  });
});
