// src/lib/onhand_view.ts
import type { QcStatus, Uom, OnHandView as OnHandViewType } from '@/domain/ssot';
import { adminDb } from '@/server/firebase';

// Vista unificada de disponibilidad por LOTE
export type OnHandView = OnHandViewType;

async function getAll<T>(coll: keyof SantaData): Promise<T[]> {
  try {
    const querySnapshot = await adminDb.collection(coll as string).get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (e) {
    console.error(`Error loading collection ${coll}:`, e);
    return [];
  }
}

// Builder (ajusta tus getters reales)
export async function buildOnHandView(): Promise<OnHandView[]> {
  const [onhand, lots, reservations] = await Promise.all([
    getAll<{ id: string; sku:string; itemId?:string; lotNumber:string; locationId:string; qty:number; uom:string; updatedAt?:string }>('onHand'),
    getAll<{ id: string; lotNumber:string; qcStatus:QcStatus|null; expiryAt?:string|null }>('lots'),
    getAll<{ id: string; sku:string; lotNumber:string; locationId:string; qty:number }>('reservations').catch(()=>[]),
  ]);

  const lotByNo = new Map(lots.map(l => [l.lotNumber, l]));
  const resKey = (r:any) => `${r.sku || r.itemId}|${r.lotNumber}|${r.locationId}`;
  const resMap = new Map<string, number>();
  for (const r of reservations ?? []) {
    resMap.set(resKey(r), (resMap.get(resKey(r)) ?? 0) + r.qty);
  }

  return onhand.map(r => {
    if (!r.lotNumber) return null; // Skip records without a lot number
    const lot = lotByNo.get(r.lotNumber);
    const id = `${r.sku || r.itemId}|${r.lotNumber}|${r.locationId}`;
    return {
      id,
      itemId: r.sku || r.itemId,
      sku: r.sku || r.itemId,
      lotNumber: r.lotNumber,
      locationId: r.locationId,
      qty: r.qty,
      uom: r.uom as any,
      qcStatus: lot?.qcStatus ?? 'PENDING',
      expiryAt: lot?.expiryAt ?? null,
      reservedQty: resMap.get(id) ?? 0,
      updatedAt: r.updatedAt,
    };
  }).filter(Boolean) as OnHandView[];
}
