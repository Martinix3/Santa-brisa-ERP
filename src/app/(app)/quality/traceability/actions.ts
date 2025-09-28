// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, QcTest, LotGenealogyEdge, ProductionOrder, GoodsReceipt, Party, Lot, ProtocolLog, OnHandView } from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';

export type TraceEvent = {
    id: string;
    at: string;
    kind: string; // 'RECEIPT', 'PRODUCTION_OUT', etc.
    title: string;
    details: string; // Un resumen simple de texto
    data?: Record<string, any>; // <-- AQUÍ ESTÁ LA MAGIA: un objeto para datos extra
};


export type TraceData = {
    lot: Lot | null;
    events: TraceEvent[];
    onHandSummary: OnHandView[];
    receiptInfo?: { supplierPartyId: string; deliveryNote: string; receivedBy: string; };
    productionInfo?: { orderId: string; orderName?: string; responsible: string; incidentCount: number; protocols: any[] };
    saleInfo?: { customerName: string; orderNumber: string; };
};


export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceData>> {
    if (!lotNumber) return fail("Número de lote no proporcionado.");

    try {
        const events: TraceEvent[] = [];
        let receiptInfo, productionInfo, saleInfo;

        const lotSnap = await db.collection('lots').doc(lotNumber).get();
        const lot = lotSnap.exists ? { id: lotSnap.id, ...lotSnap.data() } as Lot : null;

        const movesSnap = await db.collection('stockMoves').where('lotNumber', '==', lotNumber).get();
        
        const partyCache = new Map<string, Party>();
        const getPartyName = async (id: string) => {
            if (!id) return '';
            if (partyCache.has(id)) return partyCache.get(id)?.name || id;
            const snap = await db.collection('parties').doc(id).get();
            if (snap.exists) {
                const party = snap.data() as Party;
                partyCache.set(id, party);
                return party.name;
            }
            return id;
        };

        for (const doc of movesSnap.docs) {
            const move = doc.data() as StockMove;
            let title = `Movimiento: ${move.reason}`;
            let details = `Cantidad: ${move.qty} ${move.uom}. De: ${move.fromLocationId || 'N/A'} a ${move.toLocationId || 'N/A'}.`;
            let data: Record<string, any> = {};

            if (move.reason === 'receipt' && move.ref?.goodsReceiptId) {
                const rSnap = await db.collection('goodsReceipts').doc(move.ref.goodsReceiptId).get();
                if (rSnap.exists) {
                    const r = rSnap.data() as GoodsReceipt;
                    const receivedBy = (r as any).userId || '';
                    receiptInfo = {
                        supplierPartyId: r.supplierPartyId,
                        deliveryNote: r.deliveryNote || 'N/A',
                        receivedBy: await getPartyName(receivedBy),
                    };
                    title = 'Recepción de Mercancía';
                    details = `Recibido de ${await getPartyName(r.supplierPartyId)} con albarán ${r.deliveryNote}.`;
                    data = { goodsReceiptId: r.id, supplierId: r.supplierPartyId, deliveryNote: r.deliveryNote };
                }
            }
            if (move.ref?.prodOrderId) {
                const poSnap = await db.collection('productionOrders').doc(move.ref.prodOrderId).get();
                if (poSnap.exists) {
                    const po = poSnap.data() as ProductionOrder;
                    const logsSnap = await db.collection('protocolLogs').where('productionOrderId', '==', po.id).get();
                    productionInfo = {
                        orderId: po.id,
                        orderName: po.orderNumber || po.name,
                        responsible: await getPartyName((po as any).responsibleId || ''),
                        incidentCount: (po.incidents || []).length,
                        protocols: logsSnap.docs.map(d => d.data() as ProtocolLog),
                    };
                     if (move.reason === 'production_out') {
                       title = 'Consumo en Producción';
                       details = `Usado en la orden ${productionInfo.orderName || productionInfo.orderId}`;
                    } else if (move.reason === 'production_in') {
                       title = 'Salida de Producción';
                       details = `Producido en la orden ${productionInfo.orderName || productionInfo.orderId}`;
                    }
                    data = { ...productionInfo };
                }
            }
             if (move.reason === 'sale' && move.ref?.orderId) {
                const orderSnap = await db.collection('ordersSellOut').doc(move.ref.orderId).get();
                if (orderSnap.exists) {
                    const order = orderSnap.data() as any;
                    const accountSnap = await db.collection('accounts').doc(order.accountId).get();
                    const account = accountSnap.data() as any;
                    saleInfo = {
                        customerName: account?.name || 'N/A',
                        orderNumber: order.docNumber || order.id,
                    };
                    title = 'Venta a Cliente';
                    details = `Vendido a ${saleInfo.customerName} en pedido ${saleInfo.orderNumber}`;
                    data = { ...saleInfo, orderId: order.id };
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

        const onHandSnap = await db.collection('onHand').where('lotNumber', '==', lotNumber).get();
        const onHandSummary = onHandSnap.docs.map(d => d.data() as OnHandView);
        
        events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        return ok({ lot, events, onHandSummary, receiptInfo, productionInfo, saleInfo });

    } catch (error: any) {
        return fail(error.message || "Error al obtener la trazabilidad.");
    }
}
