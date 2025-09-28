// src/app/(app)/quality/traceability/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, QcTest, LotGenealogyEdge } from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';

export type TraceEvent = {
    id: string;
    at: string;
    kind: 'RECEIPT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'SHIP' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'QC_TEST' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
    title: string;
    details: string;
};

// --- Helper para traducir ubicaciones ---
const PRETTY_LOCATIONS: Record<string, string> = {
    'FG/MAIN': 'Producto Terminado',
    'RM/MAIN': 'Materias Primas',
    'PKG/MAIN': 'Packaging',
    'QC/AREA': 'Área de Calidad',
};

const prettyLocation = (locId?: string | null) => locId ? (PRETTY_LOCATIONS[locId] || locId) : 'N/A';

export async function getLotTraceability(lotNumber: string): Promise<ActionResult<TraceEvent[]>> {
    if (!lotNumber) return fail("Número de lote no proporcionado.");

    try {
        const events: TraceEvent[] = [];

        // 1. Buscar movimientos de stock
        const movesSnap = await db.collection('stockMoves').where('lotNumber', '==', lotNumber).get();
        movesSnap.docs.forEach(doc => {
            const move = doc.data() as StockMove;
            const from = prettyLocation(move.fromLocationId || (move as any).fromLocation);
            const to = prettyLocation(move.toLocationId || (move as any).toLocation);
            
            events.push({
                id: move.id,
                at: move.occurredAt,
                kind: move.reason.toUpperCase() as any,
                title: `Movimiento: ${move.reason}`,
                details: `Cantidad: ${move.qty} ${move.uom}. De: ${from} a ${to}.`
            });
        });

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
                details: `Resultado: ${value}. Realizado por: ${test.testedBy}`
            });
        });
        
        // 3. Buscar la genealogía (se ejecuta siempre)
        const childOfSnap = await db.collection('lotGenealogy').where('parentLotNumber', '==', lotNumber).get();
        childOfSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            events.push({
                id: `gen-child-${edge.id}`, at: edge.createdAt, kind: 'GENEALOGY_CHILD',
                title: `Usado para producir Lote: ${edge.childLotNumber}`,
                details: `Cantidad usada: ${(edge as any).quantityUsed || edge.qty} ${edge.uom}`
            });
        });

        const parentOfSnap = await db.collection('lotGenealogy').where('childLotNumber', '==', lotNumber).get();
        parentOfSnap.docs.forEach(doc => {
            const edge = doc.data() as LotGenealogyEdge;
            events.push({
                id: `gen-parent-${edge.id}`, at: edge.createdAt, kind: 'GENEALOGY_PARENT',
                title: `Producido a partir de Lote: ${edge.parentLotNumber}`,
                details: `Cantidad usada: ${(edge as any).quantityUsed || edge.qty} ${edge.uom}`
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
