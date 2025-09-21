// src/lib/consignment-and-samples.ts
import type { StockMove, Shipment, Account, SantaData } from "@/domain/ssot";

// ---- CONSIGNA -------------------------------------------------
// On-hand por cuenta y SKU = send - sell - return
export function consignmentOnHandByAccount(stockMoves: StockMove[]) {
  const byAcc: Record<string, Record<string, number>> = {};
  for (const m of stockMoves || []) {
    const sku = m.sku;
    const accFrom = m.fromLocation;   // cuando sale de consigna (venta/retorno)
    const accTo = m.toLocation;       // cuando se envía a consigna

    if (m.reason === "consignment_send" && accTo) {
      byAcc[accTo] ||= {};
      byAcc[accTo][sku] = (byAcc[accTo][sku] || 0) + (m.qty || 0);
    }
    if (m.reason === "consignment_sell" && accFrom) {
      byAcc[accFrom] ||= {};
      byAcc[accFrom][sku] = (byAcc[accFrom][sku] || 0) + (m.qty || 0); // normalmente qty negativa
    }
    if (m.reason === "consignment_return" && accFrom) {
      byAcc[accFrom] ||= {};
      byAcc[accFrom][sku] = (byAcc[accFrom][sku] || 0) + (m.qty || 0); // suele ser negativa (vuelve al HQ)
    }
  }
  // normaliza a enteros
  Object.values(byAcc).forEach(map => {
    Object.keys(map).forEach(sku => {
      map[sku] = Number(map[sku]) || 0;
    });
  });
  return byAcc; // { [accountId]: { [sku]: onHand } }
}

// Total por cuenta (sum de todos los SKUs)
export function consignmentTotalUnits(byAcc: Record<string, Record<string, number>>) {
  const totals: Record<string, number> = {};
  for (const accId of Object.keys(byAcc)) {
    totals[accId] = Object.values(byAcc[accId]).reduce((a, b) => a + b, 0);
  }
  return totals;
}

// ---- MUESTRAS -------------------------------------------------
// Muestras enviadas por cuenta (usa Shipments.isSample o StockMoves.sample_send)
export function samplesSentSummary({
  shipments,
  stockMoves,
  accounts,
  sinceISO, // opc: filtra por fecha
}: {
  shipments: Shipment[];
  stockMoves: StockMove[];
  accounts: Account[];
  sinceISO?: string;
}) {
  const byId = new Map(accounts.map(a => [a.id, a]));
  const cutoff = sinceISO ? new Date(sinceISO).getTime() : 0;

  const accRows: Record<string, { units: number; shipments: number; last: string | null; name: string }> = {};

  // 1) Shipments marcados como muestra
  for (const s of shipments || []) {
    if (!s.isSample) continue;
    const t = new Date(s.createdAt).getTime();
    if (cutoff && t < cutoff) continue;

    const accId = s.accountId;
    const units = (s.lines || []).reduce((a, l) => a + (l.qty || 0), 0);
    const name = byId.get(accId)?.name || s.customerName || accId;

    const row = (accRows[accId] ||= { units: 0, shipments: 0, last: null, name });
    row.units += units;
    row.shipments += 1;
    row.last = !row.last || new Date(s.createdAt) > new Date(row.last) ? s.createdAt : row.last;
  }

  // 2) StockMoves de muestra (por si no hay Shipment)
  for (const m of stockMoves || []) {
    if (m.reason !== "sample_send") continue;
    const t = new Date(m.occurredAt).getTime();
    if (cutoff && t < cutoff) continue;

    const accId = m.toLocation || m.fromLocation || "N/A";
    const name = byId.get(accId)?.name || accId;
    const row = (accRows[accId] ||= { units: 0, shipments: 0, last: null, name });
    row.units += Math.abs(m.qty || 0);
    row.last = !row.last || new Date(m.occurredAt) > new Date(row.last) ? m.occurredAt : row.last;
  }

  // salida ordenada por unidades desc
  return Object.entries(accRows)
    .map(([accountId, r]) => ({ accountId, ...r }))
    .sort((a, b) => b.units - a.units);
}
