'use server';
import { revalidatePath } from 'next/cache';
import { ok, fail, type ActionResult } from '@/lib/result';
import { upsertMany } from '@/lib/dataprovider/actions'; // usa tus helpers reales
import { getServerData } from '@/lib/dataprovider/server';
import type { StockMove, OnHandView } from '@/domain/ssot';
import { deriveOnHand } from '@/domain/onhand.recalc';

async function getCollection<T>(collectionName: keyof SantaData): Promise<T[]> {
    const data = await getServerData();
    return (data[collectionName] as T[]) || [];
}

export async function rebuildOnHand(): Promise<ActionResult<{rows:number}>> {
  try {
    const moves = await getCollection<StockMove>('stockMoves'); // ajusta a tu API real
    const onHand = deriveOnHand(moves || []);
    await upsertMany('onHand', onHand);
    revalidatePath('/warehouse/inventory');
    return ok({ rows: onHand.length });
  } catch (e:any) {
    return fail('No se pudo recalcular inventario', { detail: e?.message });
  }
}
