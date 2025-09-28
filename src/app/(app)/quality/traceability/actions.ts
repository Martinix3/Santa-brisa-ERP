// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, QcTest, LotGenealogyEdge, ProductionOrder } from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';

export type TraceEvent = {
    id: string;
    at: string;
    kind: string; // 'RECEIPT', 'PRODUCTION_OUT', etc.
    title: string;
    details: string; // Un resumen simple de texto
    data?: Record<string, any>; // <-- AQUÍ ESTÁ LA MAGIA: un objeto para datos extra
};


const PRETTY_LOCATIONS: Record<string, string> = {
    'WH-FG-MAIN': 'Producto Terminado',
    'ALMACEN_TERMINADO': 'Producto Terminado',
    'WH-RM-MAIN': 'Materias Primas',
    'ALMACEN_MATERIAS_PRIMAS': 'Materias Primas',
    'WH-PKG-MAIN': 'Packaging',
    'ALMACEN_PACKAGING': 'Packaging',
    'QC-AREA-MAIN': 'Área de Calidad',
};

const prettyLocation = (locId?: string | null) => locId ? (PRETTY_LOCATIONS[locId] || locId) : 'N/A';


export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceEvent[]>> {
    if (!lotNumber) return fail("Número de lote no proporcionado.");

    try {
        const events: TraceEvent[] = [];

        // 1. Buscar movimientos de stock
        const movesSnap = await db.collection('stockMoves').where('lotNumber', '==', lotNumber).get();
        for (const doc of movesSnap.docs) {
            const move = doc.data() as StockMove;
            let title = `Movimiento: ${move.reason}`;
            let details = `Cantidad: ${move.qty} ${move.uom}. De: ${prettyLocation(move.fromLocationId)} a ${prettyLocation(move.toLocationId)}.`;
            let data: Record<string, any> = {};

            if (move.reason === 'production_out' && move.ref?.prodOrderId) {
                const poSnap = await db.collection('productionOrders').doc(move.ref.prodOrderId).get();
                if (poSnap.exists) {
                    const po = poSnap.data() as ProductionOrder;
                    title = 'Consumo en Producción';
                    details = `Usado en la orden ${po.orderNumber || po.name}`;
                    data = {
                        orderId: po.id,
                        orderName: po.orderNumber || po.name,
                        responsibleId: (po as any).responsibleId,
                        incidents: po.incidents || [],
                    };
                }
            }
             if (move.reason === 'receipt' && move.ref?.goodsReceiptId) {
                const grSnap = await db.collection('goodsReceipts').doc(move.ref.goodsReceiptId).get();
                if (grSnap.exists) {
                    const gr = grSnap.data() as any;
                    const supplierSnap = await db.collection('parties').doc(gr.supplierPartyId).get();
                    title = 'Recepción de Mercancía';
                    details = `Recibido de ${supplierSnap.data()?.name || 'proveedor desconocido'} con albarán ${gr.deliveryNote}.`;
                    data = {
                        goodsReceiptId: gr.id,
                        supplierName: supplierSnap.data()?.name,
                        deliveryNote: gr.deliveryNote,
                    };
                }
            }


            events.push({
                id: move.id,
                at: move.occurredAt,
                kind: move.reason.toUpperCase() as any,
                title,
                details,
                data
            });
        };

        // 2. Buscar análisis de calidad (se ejecuta siempre)
        const testsSnap = await db.collection('qcTests').where('lotNumber', '==', lotNumber).get();
        testsSnap.docs.forEach(doc => {
            const test = doc.data() as QcTest;
            const value = test.valueNumeric?.toFixed(2) ?? test.valueText ?? 'N/A';
            events.push({
                id: test.id,
                at: test.testedAt,
                kind: 'QC_TEST',
                title: `Análisis: ${test.parameterId}`,
                details: `Resultado: ${value}`,
                data: {
                    parameterId: test.parameterId,
                    value: value,
                    inSpec: (test as any).inSpec,
                    testedBy: test.testedBy,
                }
            });
        });
        
        // 3. Buscar la genealogía (se ejecuta siempre)
        const childOfSnap = await db.collection('lotGenealogy').where('parentLotNumber', '==', lotNumber).get();
        childOfSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            const qty = (edge as any).quantityUsed || edge.qty;

            events.push({
                id: `gen-child-${edge.id}`, at: edge.createdAt, kind: 'GENEALOGY_CHILD',
                title: `Usado para producir Lote: ${edge.childLotNumber}`,
                details: `Cantidad usada: ${qty} ${edge.uom}`
            });
        });

        const parentOfSnap = await db.collection('lotGenealogy').where('childLotNumber', '==', lotNumber).get();
        parentOfSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            const qty = (edge as any).quantityUsed || edge.qty;
            events.push({
                id: `gen-parent-${edge.id}`, at: edge.createdAt, kind: 'GENEALOGY_PARENT',
                title: `Producido a partir de Lote: ${edge.parentLotNumber}`,
                details: `Cantidad usada: ${qty} ${edge.uom}`
            });
        });
        
        if (events.length === 0) {
            return ok([]); // Si después de buscar en TODAS partes no hay nada, devolvemos vacío.
        }

        // 4. Ordenar todos los eventos juntos al final
        events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        return ok(events);

    } catch (error: any) {
        return fail(error.message || "Error al obtener la trazabilidad.");
    }
}
