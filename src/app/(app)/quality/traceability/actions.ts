// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, QcTest, ProductionOrder, Lot, OnHand } from '@/domain/ssot';

type TraceEventKind = 'RECEIPT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'QC_TEST' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD' | 'SALE' | 'TRANSFER';
type TraceEventPhase = 'WAREHOUSE' | 'PRODUCTION' | 'QC' | 'SALE';

type TraceEvent = {
    id: string;
    at: string;
    kind: TraceEventKind;
    phase: TraceEventPhase;
    title: string;
    details?: string;
    data?: any;
};
import { ActionResult, ok, fail } from '@/lib/result';

export type MaterialConsumption = {
    sku: string;
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
    onHandSummary: OnHand[];
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
            const reason = (move.reason || '').toUpperCase();
            const kind = reason as TraceEventKind;
            return {
                id: doc.id,
                at: move.date,
                kind,
                phase: 'WAREHOUSE' as TraceEventPhase,
                title: `${move.reason}: ${move.items?.[0]?.quantity || 0}`,
                details: `De ${move.warehouseId || 'N/A'} a ${move.toWarehouseId || 'N/A'}`,
                data: move.documentRef || {}
            } as TraceEvent;
        });
        
        // Añadir eventos de QC tests
        const testsSnap = await db.collection('qcTests').where('lotNumber', '==', lotNumber).get();
        testsSnap.docs.forEach(doc => {
            const test = doc.data() as QcTest;
            events.push({
                id: doc.id,
                at: test.takenAt,
                kind: 'QC_TEST',
                phase: 'QC',
                title: `Análisis: ${test.kind}`,
                details: `Resultado: ${test.result}${test.value ? ` - ${test.value}` : ''}`,
                data: { kind: test.kind, result: test.result, value: test.value }
            } as TraceEvent);
        });
        
        // Genealogía desde lots.genealogy
        if (lot?.genealogy?.parents) {
            lot.genealogy.parents.forEach((parentLot: string) => {
                events.push({
                    id: `gen-parent-${parentLot}`,
                    at: lot.createdAt,
                    kind: 'GENEALOGY_PARENT',
                    phase: 'PRODUCTION',
                    title: `Producido desde: ${parentLot}`,
                    details: '',
                    data: {}
                } as TraceEvent);
            });
        }
        
        if (lot?.genealogy?.children) {
            lot.genealogy.children.forEach((childLot: string) => {
                events.push({
                    id: `gen-child-${childLot}`,
                    at: lot.createdAt,
                    kind: 'GENEALOGY_CHILD',
                    phase: 'PRODUCTION',
                    title: `Usado para: ${childLot}`,
                    details: '',
                    data: {}
                } as TraceEvent);
            });
        }

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
        if (prodOrderId) {
            const orderId = prodOrderId;
            const orderSnap = await db.collection('productionOrders').doc(orderId).get();
            
            if (orderSnap.exists) {
                const order = orderSnap.data() as ProductionOrder;
                
                // Materiales desde lot.genealogy
                const materialsConsumed: MaterialConsumption[] = [];
                
                if (lot?.genealogy?.parents) {
                    for (const parentLotNum of lot.genealogy.parents) {
                        const parentLotSnap = await db.collection('lots').doc(parentLotNum).get();
                        if (parentLotSnap.exists) {
                            const parentLot = parentLotSnap.data() as Lot;
                            const itemsSnap = await db.collection('items').where('sku', '==', parentLot.sku).limit(1).get();
                            const itemName = itemsSnap.empty ? parentLot.sku : itemsSnap.docs[0].data()?.name;
                            
                            materialsConsumed.push({
                                sku: parentLot.sku,
                                itemName: itemName || parentLot.sku,
                                lotNumber: parentLotNum,
                                qtyUsed: 0, // No tenemos qty en genealogy simple
                                uom: parentLot.uom
                            });
                        }
                    }
                }
                
                // Calcular cantidades y desviaciones
                const targetQty = order.outputQty || 0;
                const actualQty = lot?.qtyMade || 0;
                const deviation = actualQty - targetQty;
                const deviationPct = targetQty > 0 ? (deviation / targetQty) * 100 : 0;
                
                productionSummary = {
                    orderId: orderId,
                    orderName: `Orden ${orderId}`,
                    responsible: 'N/A',
                    targetQty,
                    actualQty,
                    deviation,
                    deviationPct,
                    materialsConsumed,
                    protocols: [],
                    incidentCount: 0
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

        const onHandSnap = await db.collection('onHand').get();
        const onHandSummary = onHandSnap.docs
            .map(d => d.data() as OnHand)
            .filter(oh => oh.lotNumbers && oh.lotNumbers[lotNumber]);
        
        events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        console.log(`[TRACE] Total eventos generados: ${events.length}`);

        return ok({ lot, events, onHandSummary, receiptInfo, productionSummary, qualitySummary, saleInfo });

    } catch (error: any) {
        return fail(error.message || "Error al obtener la trazabilidad.");
    }
}
