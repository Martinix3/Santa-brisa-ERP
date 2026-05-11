/**
 * QualityService Integration Test
 * Tests the complete flow: QC decision → bucket transfer → lot update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityService } from '@/services/canonical/quality.service';
import { OnHandService } from '@/services/canonical/onhand.service';
import type { Lot } from '@/domain/ssot-v2-plus-schemas';

// Mock Firestore transaction
const mockTx = {
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
} as any;

// Mock lot data
const mockLot: Lot = {
  id: '24123-PL-001',
  lotCode: '24123-PL-001',
  itemId: 'ITEM-TEST',
  locationId: 'MAIN',
  quantity: 100,
  uom: 'KG',
  qcStatus: 'HOLD',
  receivedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test-user',
  schemaVersion: 1
};

describe('QualityService.processQualityDecisionV2 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockTx.get.mockResolvedValue({
      exists: true,
      data: () => mockLot
    });
  });

  it('APPROVED → moves HOLD → RELEASED and marks lot PASSED', async () => {
    const result = await QualityService.processQualityDecisionV2(mockTx, {
      lotCode: '24123-PL-001',
      decision: 'APPROVED',
      results: [{
        parameterId: 'PH-001',
        methodId: 'PH-M001',
        value: 7.1,
        status: 'OK',
        unit: 'pH'
      }],
      reviewedBy: 'user_qc_1',
    });

    // Verify OnHand transfer was called correctly
    expect(OnHandService.transferBetweenBuckets).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        lotCode: '24123-PL-001',
        fromBucket: 'HOLD',
        toBucket: 'RELEASED',
        qty: 100,
        userId: 'user_qc_1'
      })
    );

    // Verify lot was updated
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        qcStatus: 'PASSED',
        qcApprovedBy: 'user_qc_1'
      })
    );

    // Verify release was created
    expect(result.releaseId).toBeTruthy();
    expect(result.tasksCreated).toEqual([]);
  });

  it('REJECTED → moves HOLD → REJECTED and marks lot FAILED', async () => {
    const result = await QualityService.processQualityDecisionV2(mockTx, {
      lotCode: '24123-PL-001',
      decision: 'REJECTED',
      results: [{
        parameterId: 'COLOR-001',
        methodId: 'COLOR-M001',
        value: 'L* 80',
        status: 'FAIL',
        unit: 'L*'
      }],
      reviewedBy: 'user_qc_1',
      rejectionReason: 'Color fuera de especificación'
    });

    // Verify OnHand transfer to REJECTED
    expect(OnHandService.transferBetweenBuckets).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        lotCode: '24123-PL-001',
        fromBucket: 'HOLD',
        toBucket: 'REJECTED',
        qty: 100,
      })
    );

    // Verify lot marked as FAILED
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        qcStatus: 'FAILED',
        qcRejectedBy: 'user_qc_1',
        qcRejectionReason: 'Color fuera de especificación'
      })
    );

    // Verify follow-up task was created
    expect(result.tasksCreated.length).toBeGreaterThan(0);
  });

  it('CONDITIONAL → keeps in HOLD and adds conditions', async () => {
    const result = await QualityService.processQualityDecisionV2(mockTx, {
      lotCode: '24123-PL-001',
      decision: 'CONDITIONAL',
      results: [{
        parameterId: 'BRIX-001',
        methodId: 'BRIX-M001',
        value: 11.5,
        status: 'OK',
        unit: '°Brix'
      }],
      reviewedBy: 'user_qc_1',
      conditions: ['Uso exclusivo para producto X', 'Vender antes de 30 días']
    });

    // Verify stays in HOLD
    expect(OnHandService.transferBetweenBuckets).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        toBucket: 'HOLD'
      })
    );

    // Verify conditions were added
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        qcStatus: 'CONDITIONAL',
        qcConditions: expect.arrayContaining([
          'Uso exclusivo para producto X',
          'Vender antes de 30 días'
        ])
      })
    );

    expect(result.releaseId).toBeTruthy();
  });

  it('throws error if lot not found', async () => {
    mockTx.get.mockResolvedValueOnce({ exists: false });

    await expect(
      QualityService.processQualityDecisionV2(mockTx, {
        lotCode: 'NONEXISTENT',
        decision: 'APPROVED',
        results: [],
        reviewedBy: 'user_qc_1'
      })
    ).rejects.toThrow('Lot not found: NONEXISTENT');
  });
});
