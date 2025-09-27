// src/app/(app)/warehouse/inventory/actions.ts

'use server';

const runtime = 'nodejs'; // 🔧 Asegura que use Node (no edge)

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import type { StockMove, OnHandView, Uom, SantaData } from '@/domain/ssot';
import { rebuildOnHand } from '../actions';


// 🔍 Utilidad para inspeccionar lo que quedó escrito
export async function peekOnHand(limit = 10) {
  const snap = await db.collection('onHand').limit(limit).get();
  return {
    count: snap.size,
    docs: snap.docs.map(d => d.data()),
  };
}
