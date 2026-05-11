/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { 
    StockMove, 
    QcTest, 
    ProductionOrder, 
    Lot, 
    OnHand,
    TraceEventKind,
    TraceEventPhase,
    TraceEvent,
    MaterialConsumption,
    ProductionSummary,
    QualitySummary,
    TraceData
} from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';


export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceData>> {
    if (!lotNumber) return fail("Número de lote no proporcionado.");

    try {
        let receiptInfo, saleInfo;
        let productionSummary: ProductionSummary | undefined;

        const lotSnap = await db.collection('lots').doc(lotNumber).get();
        const lot = lotSnap.exists ? { id: lotSnap.id, ...lotSnap.data() } as Lot : null;

        // Cargar datos de contexto para enriquecer eventos
        const [usersSnap, itemsSnap, partiesSnap] = await Promise.all([
          db.collection('users').get(),
          db.collection('items').get(),
          db.collection('parties').get(),
        ]);
        
        const usersById = new Map(usersSnap.docs.map(d => [d.id, d.data()]));
        const itemsBySku = new Map(itemsSnap.docs.map(d => [d.data().sku, d.data()]));
        const partiesById = new Map(partiesSnap.docs.map(d => [d.id, d.data()]));

        // ✅ Generar eventos ENRIQUECIDOS desde stockMoves
        const movesSnap = await db.collection('stockMoves').where('lotNumber', '==', lotNumber).get();
        console.log(`[TRACE] Encontrados ${movesSnap.docs.length} stockMoves para ${lotNumber}`);
        
        const events: TraceEvent[] = movesSnap.docs.map(doc => {
            const move = doc.data() as StockMove;
            const reason = (move.reason || '').toUpperCase();
            const kind = reason as TraceEventKind;
            const ref = (move as any).ref || {};
            const item = itemsBySku.get(move.sku);
            
            // Enriquecer según tipo de evento
            let enrichedData: any = {
              transactional: {
                qty: move.qty,
                uom: move.uom,
                locationFrom: move.fromLocationId || move.warehouseId,
                locationTo: move.toLocationId || move.toWarehouseId,
              },
              notes: ref.note || (move as any).notes,
            };
            
            // RECEIPT: Añadir info de proveedor y documentos
            if (kind === 'RECEIPT') {
              const supplier = partiesById.get(move.fromLocationId || ref.supplierId);
              const receiver = usersById.get(ref.receivedBy);
              
              enrichedData = {
                ...enrichedData,
                supplier: supplier ? {
                  id: supplier.id,
                  name: supplier.displayName || supplier.name,
                  contact: supplier.email?.[0]?.value,
                } : null,
                documents: {
                  deliveryNote: ref.deliveryNote,
                  invoice: ref.invoiceRef,
                  photos: ref.photos || [],
                  attachments: ref.attachments || [],
                },
                personnel: {
                  receivedBy: ref.receivedBy,
                  receivedByName: receiver?.displayName,
                  approvedBy: ref.approvedBy,
                },
                financial: ref.unitCost || move.unitCost ? {
                  unitCost: ref.unitCost || move.unitCost,
                  totalValue: move.qty * (ref.unitCost || move.unitCost || 0),
                  currency: ref.currency || 'EUR',
                } : null,
              };
            }
            
            // PRODUCTION: Añadir info de orden y responsables
            if (kind === 'PRODUCTION_IN' || kind === 'PRODUCTION_OUT') {
              const operator = usersById.get(ref.operatorId);
              const supervisor = usersById.get(ref.supervisorId);
              
              enrichedData = {
                ...enrichedData,
                productionOrder: {
                  id: ref.orderId || ref.prodOrderId,
                  name: ref.orderName,
                },
                personnel: {
                  operator: ref.operatorId,
                  operatorName: operator?.displayName,
                  supervisor: ref.supervisorId,
                  supervisorName: supervisor?.displayName,
                  responsible: ref.responsible,
                },
                documents: {
                  batchRecord: ref.batchRecordUrl,
                  photos: ref.photos || [],
                },
              };
            }
            
            // SHIP/SALE: Añadir info de cliente y envío
            if (kind === 'SHIP' || kind === 'SALE') {
              const customer = partiesById.get(ref.customerId);
              const packer = usersById.get(ref.packedBy);
              
              enrichedData = {
                ...enrichedData,
                customer: customer ? {
                  id: customer.id,
                  name: customer.displayName || customer.name,
                  address: customer.shippingAddress,
                } : ref.customerName ? {
                  name: ref.customerName,
                } : null,
                shipment: {
                  carrier: ref.carrier,
                  trackingNumber: ref.trackingNumber,
                  packingList: ref.packingListUrl,
                },
                personnel: {
                  pickedBy: ref.pickedBy,
                  packedBy: ref.packedBy,
                  packedByName: packer?.displayName,
                  shippedBy: ref.shippedBy,
                },
                documents: {
                  invoice: ref.invoiceUrl,
                  deliveryNote: ref.deliveryNoteUrl,
                  cmr: ref.cmrUrl,
                },
              };
            }
            
            return {
              id: doc.id,
              at: move.date || move.occurredAt,
              kind,
              phase: 'WAREHOUSE' as TraceEventPhase,
              title: `${move.reason}: ${move.qty} ${move.uom} ${item?.name || move.sku || ''}`,
              details: `De ${move.fromLocationId || 'origen'} → ${move.toLocationId || 'destino'}`,
              data: enrichedData,
              links: {
                orderId: ref.orderId,
                shipmentId: ref.shipmentId,
              }
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
                            if (parentLot.sku) {
                                const itemsSnap = await db.collection('items').where('sku', '==', parentLot.sku).limit(1).get();
                                const itemName = itemsSnap.empty ? parentLot.sku : itemsSnap.docs[0].data()?.name;
                                
                                materialsConsumed.push({
                                    sku: parentLot.sku,
                                    itemName: itemName || parentLot.sku,
                                    lotNumber: parentLotNum,
                                    qtyUsed: 0, // No tenemos qty en genealogy simple
                                    uom: parentLot.uom as string
                                });
                            }
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
