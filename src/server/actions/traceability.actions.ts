// src/server/actions/traceability.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove } from '@/domain/ssot';

export type EnrichedStockMove = StockMove & {
  itemName?: string;
  userName?: string;
  fromLocationName?: string;
  toLocationName?: string;
};

/**
 * Obtiene todos los movimientos de stock para un lote específico
 * Usa la colección stockMoves (igual que warehouse/inventory)
 */
export async function getTraceEventsForLot(lotCode: string): Promise<{
  success: boolean;
  events?: EnrichedStockMove[];
  error?: string;
}> {
  try {
    // Validar que lotCode no sea undefined/null/empty
    if (!lotCode || lotCode.trim() === '') {
      return {
        success: false,
        error: 'lotCode is required'
      };
    }

    // 1. Obtener movimientos del lote desde stockMoves
    const movesSnap = await db.collection('stockMoves')
      .where('lotCode', '==', lotCode)
      .orderBy('occurredAt', 'desc')
      .get();

    if (movesSnap.empty) {
      return { success: true, events: [] };
    }

    const moves = movesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        occurredAt: data.occurredAt?.toDate?.() || new Date(data.occurredAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      };
    }) as StockMove[];

    // 2. Obtener IDs únicos para enriquecimiento (filtrar undefined/null)
    const itemIds = [...new Set(moves.map(m => m.itemId).filter(Boolean))];
    const userIds = [...new Set(moves.map(m => (m as any).userId).filter(Boolean))];
    const locationIds = [
      ...new Set([
        ...moves.map(m => m.fromLocationId).filter(Boolean),
        ...moves.map(m => m.toLocationId).filter(Boolean)
      ])
    ];

    // 3. Obtener datos de enriquecimiento en paralelo
    const [itemsSnap, usersSnap, locationsSnap] = await Promise.all([
      itemIds.length > 0
        ? db.collection('items').where('__name__', 'in', itemIds.slice(0, 30)).get()
        : Promise.resolve({ docs: [] }),
      userIds.length > 0
        ? db.collection('users').where('__name__', 'in', userIds.slice(0, 30)).get()
        : Promise.resolve({ docs: [] }),
      locationIds.length > 0
        ? db.collection('locations').where('__name__', 'in', locationIds.slice(0, 30)).get()
        : Promise.resolve({ docs: [] })
    ]);

    // 4. Crear mapas de enriquecimiento
    const itemMap = new Map(
      itemsSnap.docs.map(d => [d.id, d.data().name || d.data().description || d.id])
    );
    const userMap = new Map(
      usersSnap.docs.map(d => [d.id, d.data().displayName || d.data().email || d.id])
    );
    const locationMap = new Map(
      locationsSnap.docs.map(d => [d.id, d.data().name || d.data().code || d.id])
    );

    // 5. Enriquecer movimientos
    const enrichedMoves: EnrichedStockMove[] = moves.map(move => {
      const moveAny = move as any;
      return {
        ...move,
        itemName: (move.itemId ? itemMap.get(move.itemId) : undefined) || move.sku,
        userName: moveAny.userId ? userMap.get(moveAny.userId) : undefined,
        fromLocationName: move.fromLocationId
          ? (locationMap.get(move.fromLocationId) || move.fromLocationId)
          : undefined,
        toLocationName: move.toLocationId
          ? (locationMap.get(move.toLocationId) || move.toLocationId)
          : undefined,
      };
    });

    return { success: true, events: enrichedMoves };
  } catch (error: any) {
    console.error('[getTraceEventsForLot] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener eventos de trazabilidad'
    };
  }
}
