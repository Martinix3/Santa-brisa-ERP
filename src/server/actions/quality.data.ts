// src/server/actions/quality.data.ts
// Server-side utilities to retrieve Quality Control snapshots with SSOT-compliant serialization.

"use server";

import { adminDb as db } from '@/server/firebase';
import type {
  Item,
  Lot,
  QcPlan,
  QualityRelease,
  TraceEvent,
} from '@/domain/ssot';
import type { PredictiveAlert } from '@/server/gemini/analyzers/quality-analyzer';
import { toIso, toNumber } from '@/server/utils/firestore';
import { getQualityPredictiveAlerts } from '@/server/actions/quality-gemini';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

type FirestoreDoc<T> = QueryDocumentSnapshot<T>;

type SerializedLot = ReturnType<typeof serializeLotDoc>;
type SerializedRelease = ReturnType<typeof serializeReleaseDoc>;
type SerializedPlan = ReturnType<typeof serializePlanDoc>;
type SerializedTraceEvent = ReturnType<typeof serializeTraceEventDoc>;

function serializeLotDoc(doc: FirestoreDoc<Lot>): Lot {
  const data = doc.data();
  const createdAt = toIso(data.createdAt) ?? new Date().toISOString();
  const updatedAt = toIso(data.updatedAt) ?? createdAt;

  return {
    ...data,
    id: data.id ?? doc.id,
    lotNumber: data.lotNumber ?? doc.id,
    itemId: data.itemId,
    sku: data.sku ?? data.itemId,
    itemName: data.itemName,
    quantity: toNumber(data.quantity ?? (data as any).qtyMade),
    qtyMade: toNumber((data as any).qtyMade ?? data.quantity),
    uom: data.uom,
    qcStatus: data.qcStatus,
    status: data.status,
    qcPlanId: data.qcPlanId,
    producedByOrderId: data.producedByOrderId,
    createdByGoodsReceiptId: data.createdByGoodsReceiptId,
    parentLotNumber: data.parentLotNumber,
    genealogy: data.genealogy,
    expDate: toIso(data.expDate),
    createdAt,
    updatedAt,
    receivedAt: toIso(data.receivedAt),
    externalLot: data.externalLot,
    supplierId: data.supplierId,
    deliveryNote: data.deliveryNote,
    qcCoa: data.qcCoa,
    qcCoaUrl: data.qcCoaUrl ?? data.qcCoa,
    qcDocuments: Array.isArray(data.qcDocuments) ? data.qcDocuments : undefined,
    qcApprovedBy: data.qcApprovedBy,
    qcApprovedByName: data.qcApprovedByName,
    qcApprovedAt: toIso(data.qcApprovedAt),
    qcApprovalNotes: data.qcApprovalNotes,
    qcConditions: data.qcConditions,
    qcRejectedBy: data.qcRejectedBy,
    qcRejectedByName: data.qcRejectedByName,
    qcRejectedAt: toIso(data.qcRejectedAt),
    qcRejectionReason: data.qcRejectionReason,
    qcReviewStartedAt: toIso(data.qcReviewStartedAt),
    qcReviewDuration: data.qcReviewDuration,
    qcReviewOwnerId: data.qcReviewOwnerId,
    qcReviewOwnerName: data.qcReviewOwnerName,
    qcHoldBy: data.qcHoldBy,
    qcHoldByName: data.qcHoldByName,
  };
}

function serializeReleaseDoc(doc: FirestoreDoc<QualityRelease>): QualityRelease {
  const data = doc.data();
  const createdAt = toIso((data as any).createdAt) ?? new Date().toISOString();
  const updatedAt = toIso((data as any).updatedAt) ?? createdAt;

  return {
    ...data,
    id: data.id ?? doc.id,
    decisionAt: toIso((data as any).decisionAt) ?? createdAt,
    decisionBy: (data as any).decisionBy ?? '',
    lotCode: data.lotCode,
    itemId: data.itemId ?? (data as any).sku,
    itemName: (data as any).itemName,
    reason: (data as any).reason,
    conditions: (data as any).conditions,
    observations: (data as any).observations,
    testsPerformed: data.testsPerformed,
    reviewDuration: data.reviewDuration,
    correctiveActions: (data as any).correctiveActions,
    department: (data as any).department,
    createdAt,
    updatedAt,
    attachments: (data as any).attachments,
    coaUrl: (data as any).coaUrl,
    photosUrls: (data as any).photosUrls,
  };
}

function serializePlanDoc(doc: FirestoreDoc<QcPlan>): QcPlan {
  const data = doc.data();
  const createdAt = toIso((data as any).createdAt) ?? new Date().toISOString();
  const updatedAt = toIso((data as any).updatedAt) ?? createdAt;

  return {
    ...data,
    id: data.id ?? doc.id,
    createdAt,
    updatedAt,
  };
}

function serializeItemDoc(doc: FirestoreDoc<Item>): Item {
  const data = doc.data();
  const createdAt = toIso((data as any).createdAt) ?? new Date().toISOString();
  const updatedAt = toIso((data as any).updatedAt) ?? createdAt;

  return {
    ...data,
    id: data.id ?? doc.id,
  };
}

function serializeTraceEventDoc(doc: FirestoreDoc<TraceEvent>): TraceEvent {
  const data = doc.data();
  return {
    ...data,
    id: data.id ?? doc.id,
    at: toIso(data.at) ?? new Date().toISOString(),
  };
}

type SupplierRecord = {
  id: string;
  name: string;
  taxId?: string;
};

type UserRecord = {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
};

type AccountRecord = {
  id: string;
  name: string;
  taxId?: string;
  channel?: string;
};

export type QualityLotsSnapshot = {
  lots: SerializedLot[];
  items: Item[];
  plans: QcPlan[];
  suppliers: SupplierRecord[];
  users: UserRecord[];
  predictiveAlerts: PredictiveAlert[];
};

export async function getQualityLotsSnapshot(): Promise<QualityLotsSnapshot> {
  const [
    lotsSnap,
    itemsSnap,
    plansSnap,
    suppliersSnap,
    usersSnap,
    alertsResult,
  ] = await Promise.all([
    db.collection('lots').get(),
    db.collection('items').get(),
    db.collection('qcPlansNew').get(),
    db.collection('warehouseSuppliers').get().catch(() => null),
    db.collection('users').get().catch(() => null),
    getQualityPredictiveAlerts({ severityFilter: ['critical', 'warning'], limit: 10 }).catch(
      error => {
        console.warn("[getQualityLotsSnapshot] predictive alerts unavailable", error);
        return { success: false } as const;
      }
    ),
  ]);

  const lots = lotsSnap.docs.map(doc => serializeLotDoc(doc as FirestoreDoc<Lot>));
  const items = itemsSnap.docs.map(doc => serializeItemDoc(doc as FirestoreDoc<Item>));
  const plans = plansSnap.docs.map(doc => serializePlanDoc(doc as FirestoreDoc<QcPlan>));

  const suppliers: SupplierRecord[] = suppliersSnap
    ? suppliersSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: data.id ?? doc.id,
        name: data.name ?? 'Proveedor',
        taxId: data.taxId,
      };
    })
    : [];

  const users: UserRecord[] = usersSnap
    ? usersSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: data.id ?? doc.id,
        displayName: data.displayName ?? data.name ?? data.email,
        email: data.email,
        role: data.role,
      };
    })
    : [];

  const predictiveAlerts = alertsResult.success && alertsResult.data ? alertsResult.data : [];

  return {
    lots,
    items,
    plans,
    suppliers,
    users,
    predictiveAlerts,
  };
}

export type QualityReleasesSnapshot = {
  releases: SerializedRelease[];
  items: Item[];
  users: UserRecord[];
};

export async function getQualityReleasesSnapshot(): Promise<QualityReleasesSnapshot> {
  const [releasesSnap, itemsSnap, usersSnap] = await Promise.all([
    db.collection('qualityReleases').orderBy('decisionAt', 'desc').limit(500).get(),
    db.collection('items').get(),
    db.collection('users').get().catch(() => null),
  ]);

  const releases = releasesSnap.docs.map(doc =>
    serializeReleaseDoc(doc as FirestoreDoc<QualityRelease>)
  );
  const items = itemsSnap.docs.map(doc => serializeItemDoc(doc as FirestoreDoc<Item>));
  const users: UserRecord[] = usersSnap
    ? usersSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: data.id ?? doc.id,
        displayName: data.displayName ?? data.name ?? data.email,
        email: data.email,
        role: data.role,
      };
    })
    : [];

  return {
    releases,
    items,
    users,
  };
}

export type QualityPlansSnapshot = {
  plans: SerializedPlan[];
  items: Item[];
  predictiveAlerts: PredictiveAlert[];
};

export async function getQualityPlansSnapshot(): Promise<QualityPlansSnapshot> {
  const [plansSnap, itemsSnap, alertsResult] = await Promise.all([
    db.collection('qcPlansNew').get(),
    db.collection('items').get(),
    getQualityPredictiveAlerts({ severityFilter: ['critical', 'warning'], limit: 5 }).catch(
      error => {
        console.warn("[getQualityPlansSnapshot] predictive alerts unavailable", error);
        return { success: false } as const;
      }
    ),
  ]);

  const plans = plansSnap.docs.map(doc => serializePlanDoc(doc as FirestoreDoc<QcPlan>));
  const items = itemsSnap.docs.map(doc => serializeItemDoc(doc as FirestoreDoc<Item>));
  const predictiveAlerts = alertsResult.success && alertsResult.data ? alertsResult.data : [];

  return { plans, items, predictiveAlerts };
}

export type QualityTraceabilitySnapshot = {
  events: SerializedTraceEvent[];
  lots: SerializedLot[];
  items: Item[];
  accounts: AccountRecord[];
  predictiveAlerts: PredictiveAlert[];
};

export async function getQualityTraceabilitySnapshot(): Promise<QualityTraceabilitySnapshot> {
  const [eventsSnap, lotsSnap, itemsSnap, accountsSnap, alertsResult] = await Promise.all([
    db
      .collection('traceEvents')
      .where('phase', '==', 'QC')
      .orderBy('at', 'desc')
      .limit(500)
      .get(),
    db.collection('lots').get(),
    db.collection('items').get(),
    db.collection('accounts').get().catch(() => null),
    getQualityPredictiveAlerts({ severityFilter: ['critical', 'warning'], limit: 5 }).catch(
      error => {
        console.warn("[getQualityTraceabilitySnapshot] predictive alerts unavailable", error);
        return { success: false } as const;
      }
    ),
  ]);

  const events = eventsSnap.docs.map(doc =>
    serializeTraceEventDoc(doc as FirestoreDoc<TraceEvent>)
  );
  const lots = lotsSnap.docs.map(doc => serializeLotDoc(doc as FirestoreDoc<Lot>));
  const items = itemsSnap.docs.map(doc => serializeItemDoc(doc as FirestoreDoc<Item>));
  const accounts: AccountRecord[] = accountsSnap
    ? accountsSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: data.id ?? doc.id,
        name: data.name ?? data.businessName ?? 'Cuenta sin nombre',
        taxId: data.taxId,
        channel: data.channel,
      };
    })
    : [];
  const predictiveAlerts = alertsResult.success && alertsResult.data ? alertsResult.data : [];

  return { events, lots, items, accounts, predictiveAlerts };
}
