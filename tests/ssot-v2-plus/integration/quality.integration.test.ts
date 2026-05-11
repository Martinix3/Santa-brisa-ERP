/**
 * Quality Server Actions Integration Tests
 * Direct Firebase connection - NO EMULATOR
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { 
  processQcDecisionV2,
  getPendingLotsForQc,
  getQualityReleasesForLot,
  startQcReview,
  getQcStatistics
} from '@/server/actions/quality-v2.actions';
import { adminDb as db } from '@/server/firebase';

describe('Quality Actions Integration Tests', () => {
  const TEST_USER = 'test-integration-user';
  let testLotCode: string;
  let testItemId: string;

  beforeAll(async () => {
    // Create test lot in HOLD status for QC testing
    testLotCode = `INT-TEST-${Date.now()}`;
    testItemId = `ITEM-TEST-${Date.now()}`;
    
    const lotRef = db.doc(`lots/${testLotCode}`);
    await lotRef.set({
      lotCode: testLotCode,
      itemId: testItemId,
      skuCode: 'SKU-TEST',
      locationId: 'LOC-TEST',
      quantity: 100,
      qcStatus: 'PENDING',
      status: 'ACTIVE',
      receivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: TEST_USER,
      schemaVersion: 1
    });

    // Create test OnHand in HOLD bucket
    const onHandRef = db.collection('onHand').doc();
    await onHandRef.set({
      id: onHandRef.id,
      itemId: testItemId,
      skuCode: 'SKU-TEST',
      lotCode: testLotCode,
      locationId: 'LOC-TEST',
      HOLD: 100,
      RELEASED: 0,
      REJECTED: 0,
      RESERVED: 0,
      availableQty: 0,
      totalQty: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.doc(`lots/${testLotCode}`).delete();
    const onHandSnap = await db.collection('onHand')
      .where('lotCode', '==', testLotCode)
      .get();
    for (const doc of onHandSnap.docs) {
      await doc.ref.delete();
    }
    const releasesSnap = await db.collection('qualityReleases')
      .where('lotCode', '==', testLotCode)
      .get();
    for (const doc of releasesSnap.docs) {
      await doc.ref.delete();
    }
  });

  test('getPendingLotsForQc - retrieves pending lots', async () => {
    const result = await getPendingLotsForQc();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true);
      const testLot = result.data.find(lot => lot.lotCode === testLotCode);
      expect(testLot).toBeDefined();
      expect(testLot?.qcStatus).toBe('PENDING');
    }
  });

  test('startQcReview - marks lot as IN_PROGRESS', async () => {
    const result = await startQcReview(testLotCode, TEST_USER);
    
    expect(result.success).toBe(true);
    
    // Verify lot status changed
    const lotSnap = await db.doc(`lots/${testLotCode}`).get();
    const lot = lotSnap.data();
    expect(lot?.qcStatus).toBe('IN_PROGRESS');
  });

  test('processQcDecisionV2 - APPROVED decision creates release', async () => {
    const input = {
      lotCode: testLotCode,
      decision: 'APPROVED' as const,
      results: [{
        parameterId: 'PARAM-1',
        methodId: 'METHOD-1',
        value: 98.5,
        status: 'OK' as const,
        unit: '%',
        testedBy: TEST_USER
      }],
      observations: 'All tests passed'
    };

    const result = await processQcDecisionV2(input, TEST_USER);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.releaseId).toBeTruthy();
      expect(result.data.tasksCreated).toEqual([]);
    }

    // Verify lot updated
    const lotSnap = await db.doc(`lots/${testLotCode}`).get();
    const lot = lotSnap.data();
    expect(lot?.qcStatus).toBe('PASSED');
    expect(lot?.qcApprovedBy).toBe(TEST_USER);

    // Verify OnHand buckets moved
    const onHandSnap = await db.collection('onHand')
      .where('lotCode', '==', testLotCode)
      .limit(1)
      .get();
    
    if (!onHandSnap.empty) {
      const onHand = onHandSnap.docs[0].data();
      expect(onHand.HOLD).toBe(0);
      expect(onHand.RELEASED).toBe(100);
      expect(onHand.availableQty).toBe(100);
    }
  });

  test('getQualityReleasesForLot - retrieves release history', async () => {
    const result = await getQualityReleasesForLot(testLotCode);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].lotCode).toBe(testLotCode);
      expect(result.data[0].decision).toBe('APPROVED');
    }
  });

  test('getQcStatistics - returns dashboard stats', async () => {
    const result = await getQcStatistics();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.pending).toBe('number');
      expect(typeof result.data.inProgress).toBe('number');
      expect(typeof result.data.hold).toBe('number');
      expect(result.data.pending).toBeGreaterThanOrEqual(0);
    }
  });
});
