// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, QcTest, LotGenealogyEdge, ProductionOrder, GoodsReceipt, Party, Lot, ProtocolLog, OnHandView, TraceEvent, TraceEventKind, TraceEventPhase } from '@/domain/ssot.v7';
import { ActionResult, ok, fail } from '@/lib/result';

export type MaterialConsumption = {
    itemId: string;
    itemName: string;
    lotNumber: string;
    qtyUsed: number;
    uom: string;
};

export type ProductionSummary = {
    orderId: string;
    orderName?: string;
    responsible: string;
    targetQty: number;
    actualQty: number;
    deviation: number;
    deviationPct: number;
    materialsConsumed: MaterialConsumption[];
    protocols: any[];
    incidentCount: number;
};

export type QualitySummary = {
    tests: any[];
    finalDecision: string;
    decisionBy?: string;
    decisionAt?: string;
    observations?: string;
};

export type TraceData = {
    lot: Lot | null;
    events: TraceEvent[];
    onHandSummary: OnHandView[];
    receiptInfo?: { supplierPartyId: string; deliveryNote: string; receivedBy: string; };
    productionSummary?: ProductionSummary;
    qualitySummary?: QualitySummary;
    saleInfo?: { customerName: string; orderNumber: string; };
};


export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceData>> {
    if (!lotNumber) return fail("Número de lote no proporcionado.");

    try {
        let receiptInfo, saleInfo;
        let productionSummary: ProductionSummary | undefined;

        const lotSnap = await db.collection('lots').doc(lotNumber).get();
        const lot = lotSnap.exists ? { id: lotSnap.id, ...lotSnap.data() } as Lot : null;

        // ✅ Generar eventos desde stockMoves (fuente única de verdad)
        const movesSnap = await db.collection('stockMoves').where('lotNumber', '==', lotNumber).get();
        console.log(`[TRACE] Encontrados ${movesSnap.docs.length} stockMoves para ${lotNumber}`);
        
        const events: TraceEvent[] = movesSnap.docs.map(doc => {
            const move = doc.data() as StockMove;
            return {
                id: doc.id,
                at: move.occurredAt,
                kind: move.reason.toUpperCase() as TraceEventKind,
                phase: 'WAREHOUSE' as TraceEventPhase,
                title: `${move.reason}: ${move.qty} ${move.uom}`,
                details: `De ${move.fromLocationId || 'N/A'} a ${move.toLocationId || 'N/A'}`,
                data: { ...move.ref }
            } as TraceEvent;
        });
        
        // Añadir eventos de QC tests
        const testsSnap = await db.collection('qcTests').where('lotNumber', '==', lotNumber).get();
        testsSnap.docs.forEach(doc => {
            const test = doc.data() as QcTest;
            events.push({
                id: doc.id,
                at: test.testedAt,
                kind: 'QC_TEST',
                phase: 'QC',
                title: `Análisis: ${test.parameterId}`,
                details: `Resultado: ${test.valueNumeric ?? test.valueText ?? 'N/A'}`,
                data: { parameterId: test.parameterId, value: test.valueNumeric ?? test.valueText }
            } as TraceEvent);
        });
        
        // Añadir eventos de genealogía
        const genealogyParentSnap = await db.collection('lotGenealogy').where('childLotNumber', '==', lotNumber).get();
        genealogyParentSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            events.push({
                id: `gen-parent-${doc.id}`,
                at: edge.createdAt,
                kind: 'GENEALOGY_PARENT',
                phase: 'PRODUCTION',
                title: `Producido desde: ${edge.parentLotNumber}`,
                details: `Cantidad: ${edge.qty} ${edge.uom}`,
                data: {}
            } as TraceEvent);
        });
        
        const genealogyChildSnap = await db.collection('lotGenealogy').where('parentLotNumber', '==', lotNumber).get();
        genealogyChildSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            events.push({
                id: `gen-child-${doc.id}`,
                at: edge.createdAt,
                kind: 'GENEALOGY_CHILD',
                phase: 'PRODUCTION',
                title: `Usado para: ${edge.childLotNumber}`,
                details: `Cantidad: ${edge.qty} ${edge.uom}`,
                data: {}
            } as TraceEvent);
        });

        // Extraer información de contexto de los eventos
        let prodOrderId: string | undefined;
        
        events.forEach(event => {
            if (event.kind === 'RECEIPT' && event.data) {
                receiptInfo = {
                    supplierPartyId: event.data.supplierId || event.data.supplierPartyId || '',
                    deliveryNote: event.data.deliveryNote || 'N/A',
                    receivedBy: event.data.receivedBy || 'N/A',
                };
            }
            if ((event.kind === 'PRODUCTION_IN' || event.kind === 'PRODUCTION_OUT') && event.data) {
                prodOrderId = event.data.orderId || event.data.prodOrderId;
            }
            // Ventas se detectan por el campo customerName en data
            if (event.data?.customerName) {
                saleInfo = {
                    customerName: event.data.customerName || 'N/A',
                    orderNumber: event.data.orderNumber || '',
                };
            }
        });

        // 🏭 Construir ProductionSummary si hay orden de producción
        if (prodOrderId || lot?.producedByOrderId) {
            const orderId = prodOrderId || lot!.producedByOrderId!;
            const orderSnap = await db.collection('productionOrders').doc(orderId).get();
            
            if (orderSnap.exists) {
                const order = orderSnap.data() as ProductionOrder;
                
                // Obtener materiales consumidos desde lotGenealogy
                const genealogySnap = await db.collection('lotGenealogy')
                    .where('childLotNumber', '==', lotNumber)
                    .get();
                
                const materialsConsumed: MaterialConsumption[] = [];
                
                for (const doc of genealogySnap.docs) {
                    const edge = doc.data() as LotGenealogyEdge;
                    // Obtener info del item
                    const parentLotSnap = await db.collection('lots').doc(edge.parentLotNumber).get();
                    if (parentLotSnap.exists) {
                        const parentLot = parentLotSnap.data() as Lot;
                        const itemSnap = await db.collection('items').doc(parentLot.itemId).get();
                        const itemName = itemSnap.exists ? itemSnap.data()?.name : parentLot.itemId;
                        
                        materialsConsumed.push({
                            itemId: parentLot.itemId,
                            itemName: itemName || parentLot.itemId,
                            lotNumber: edge.parentLotNumber,
                            qtyUsed: edge.qty,
                            uom: edge.uom
                        });
                    }
                }
                
                // Calcular cantidades y desviaciones
                const targetQty = order.targetQuantity || 0;
                const actualQty = lot?.quantity || 0;
                const deviation = actualQty - targetQty;
                const deviationPct = targetQty > 0 ? (deviation / targetQty) * 100 : 0;
                
                productionSummary = {
                    orderId: orderId,
                    orderName: `Orden ${orderId}`,
                    responsible: order.responsibleId || 'N/A',
                    targetQty,
                    actualQty,
                    deviation,
                    deviationPct,
                    materialsConsumed,
                    protocols: order.checks || [],
                    incidentCount: order.incidents?.length || 0
                };
            }
        }

        // ✨ Construir QualitySummary
        const qcTestsForSummary = events
            .filter(e => e.kind === 'QC_TEST')
            .map(e => e.data);
            
        const qcDecisionEvent = events.find(e => e.data && ('decision' in e.data || 'results' in e.data));
        
        const qualitySummary: QualitySummary = {
            tests: qcTestsForSummary,
            finalDecision: qcDecisionEvent?.data?.decision || lot?.qcStatus || 'PENDING',
            decisionBy: qcDecisionEvent?.data?.reviewer || qcDecisionEvent?.data?.approvedBy || qcDecisionEvent?.data?.rejectedBy,
            decisionAt: qcDecisionEvent?.at,
            observations: qcDecisionEvent?.data?.observations || qcDecisionEvent?.data?.notes,
        };

        const onHandSnap = await db.collection('onHand').where('lotNumber', '==', lotNumber).get();
        const onHandSummary = onHandSnap.docs.map(d => d.data() as OnHandView);
        
        events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        console.log(`[TRACE] Total eventos generados: ${events.length}`);

        return ok({ lot, events, onHandSummary, receiptInfo, productionSummary, qualitySummary, saleInfo });

    } catch (error: any) {
        return fail(error.message || "Error al obtener la trazabilidad.");
    }
}
