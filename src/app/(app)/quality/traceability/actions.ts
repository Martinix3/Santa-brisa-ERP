// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { ActionResult, ok, fail } from '@/lib/result';
import type { StockMove } from '@/domain/ssot';

// Define un tipo de evento de trazabilidad más estructurado
export type TraceEvent = {
    id: string;
    kind: StockMove['reason'];
    title: string;
    details: string;
    at: string;
    qty?: number;
    uom?: string;
};

// Esta server action busca y normaliza el historial de un lote
export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceEvent[]>> {
    if (!lotNumber) {
        return fail("Se requiere un número de lote.");
    }

    try {
        const movesSnap = await db.collection('stockMoves')
            .where('lotNumber', '==', lotNumber)
            .orderBy('occurredAt', 'asc')
            .get();
        
        if (movesSnap.empty) {
            return ok([]);
        }

        const events: TraceEvent[] = movesSnap.docs.map(doc => {
            const move = doc.data() as StockMove;
            let title = `Movimiento: ${move.reason}`;
            let details = '';

            switch(move.reason) {
                case 'receipt':
                    title = 'Recepción de Mercancía';
                    details = `Recibido en ${move.toLocationId || 'ubicación desconocida'}.`;
                    break;
                case 'production_in':
                    title = 'Entrada desde Producción';
                    details = `Producido y movido a ${move.toLocationId || 'almacén'}.`;
                    break;
                case 'transfer':
                    title = 'Transferencia Interna';
                    details = `Movido de ${move.fromLocationId} a ${move.toLocationId}.`;
                    break;
                case 'ship':
                case 'sale':
                    title = 'Salida por Venta/Envío';
                    details = `Enviado desde ${move.fromLocationId} para el pedido ${move.ref?.orderId || 'N/A'}.`;
                    break;
                case 'production_out':
                    title = 'Consumo en Producción';
                    details = `Consumido desde ${move.fromLocationId} para la orden ${move.ref?.prodOrderId || 'N/A'}.`;
                    break;
                case 'adjustment':
                    title = 'Ajuste de Inventario';
                    details = `Ajuste de ${move.qty} ${move.uom} en ${move.toLocationId || move.fromLocationId}.`;
                    break;
            }

            return {
                id: move.id,
                kind: move.reason,
                title,
                details,
                at: move.occurredAt,
                qty: move.qty,
                uom: move.uom,
            };
        });

        return ok(events);

    } catch (error: any) {
        console.error(`Error fetching traceability for lot ${lotNumber}:`, error);
        return fail("No se pudo obtener el historial del lote.");
    }
}
