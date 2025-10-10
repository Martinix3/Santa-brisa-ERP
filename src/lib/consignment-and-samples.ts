// src/lib/consignment-and-samples.ts
import type { StockMove, Shipment, Account } from "@/domain/ssot";

// ---- CONSIGNA -------------------------------------------------
// On-hand por cuenta y SKU = send - sell - return
// NOTA: En SSOT v7, StockMove usa documentRef para vincular
export function consignmentOnHandByAccount(stockMoves: StockMove[]) {
  const byAcc: Record<string, Record<string, number>> = {};
  
  for (const m of stockMoves || []) {
    // En v7, items es un array con { sku, quantity, lotNumber }
    if (!m.items || !Array.isArray(m.items)) continue;
    
    const reason = (m.reason || '').toLowerCase();
    
    for (const item of m.items) {
      const sku = item.sku;
      const qty = item.quantity || 0;
      
      // Detectar consignación por reason o type
      if (reason.includes('consignment') || reason.includes('consigna')) {
        const accTo = m.toWarehouseId;   // cuando se envía a consigna
        const accFrom = m.warehouseId;   // cuando sale de consigna
        
        if (reason.includes('send') && accTo) {
          byAcc[accTo] ||= {};
          byAcc[accTo][sku] = (byAcc[accTo][sku] || 0) + qty;
        }
        if (reason.includes('sell') && accFrom) {
          byAcc[accFrom] ||= {};
          byAcc[accFrom][sku] = (byAcc[accFrom][sku] || 0) - qty; // salida
        }
        if (reason.includes('return') && accFrom) {
          byAcc[accFrom] ||= {};
          byAcc[accFrom][sku] = (byAcc[accFrom][sku] || 0) - qty; // vuelve
        }
      }
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
// Muestras enviadas por cuenta
export function samplesSentSummary({
  shipments,
  stockMoves,
  accounts,
  sinceISO,
}: {
  shipments: Shipment[];
  stockMoves: StockMove[];
  accounts: Account[];
  sinceISO?: string;
}) {
  const byId = new Map(accounts.map(a => [a.id, a]));
  const cutoff = sinceISO ? new Date(sinceISO).getTime() : 0;

  const accRows: Record<string, { units: number; shipments: number; last: string | null; name: string }> = {};

  // 1) Shipments (buscar en documentRef si es muestra)
  for (const s of shipments || []) {
    const t = new Date(s.createdAt).getTime();
    if (cutoff && t < cutoff) continue;

    // En v7, no hay isSample, pero podemos inferir por orderId o metadata
    const orderId = s.orderId;
    if (!orderId) continue; // Skip manual shipments for now
    
    // Inferir accountId desde orderId (necesitaríamos el order)
    // Por ahora, skip
    continue;
  }

  // 2) StockMoves de muestra
  for (const m of stockMoves || []) {
    const reason = (m.reason || '').toLowerCase();
    if (!reason.includes('sample') && !reason.includes('muestra')) continue;
    
    const t = new Date(m.date).getTime();
    if (cutoff && t < cutoff) continue;
    
    if (!m.items || !Array.isArray(m.items)) continue;
    
    const accId = m.toWarehouseId || m.warehouseId || "N/A";
    const name = byId.get(accId)?.name || accId;
    const row = (accRows[accId] ||= { units: 0, shipments: 0, last: null, name });
    
    const totalQty = m.items.reduce((sum, item) => sum + Math.abs(item.quantity || 0), 0);
    row.units += totalQty;
    row.shipments += 1;
    row.last = !row.last || new Date(m.date) > new Date(row.last) ? m.date : row.last;
  }

  // salida ordenada por unidades desc
  return Object.entries(accRows)
    .map(([accountId, r]) => ({ accountId, ...r }))
    .sort((a, b) => b.units - a.units);
}
