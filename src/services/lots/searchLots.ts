
// src/services/lots/searchLots.ts
import type {
  SantaData, LotStatus, QcStatus, LotNumber, Uom,
} from "@/domain/ssot";

export type LotSearchParams = {
  itemIds?: string[];                 // uno o varios ítems
  text?: string;                      // búsqueda parcial en lotNumber
  locationIds?: string[];             // filtra ubicaciones
  minAvailableQty?: number;           // disponibilidad (onHand - reservas)
  uom?: Uom;                          // opcional: asegura misma UoM
  qcStatuses?: QcStatus[];            // p.ej. ['RELEASED']
  lotStatuses?: LotStatus[];          // p.ej. ['OPEN','RELEASED']
  producedByOrderId?: string;         // lotes salida de una orden
  parentLotNumber?: LotNumber;        // para ENVASADO (hijos de un intermedio)
  expBefore?: string;                 // FEFO: caduca antes de
  expAfter?: string;
  receivedAfter?: string;             // para compras
  createdAfter?: string;              // para producción
  includeConsumed?: boolean;          // por defecto false
  genealogyMode?: "PARENTS"|"CHILDREN"; // usa lotGenealogy si aplicas parent/child
  sort?: "FEFO"|"FIFO"|"CREATED_AT"|"EXP_DATE"; // orden preferido
  limit?: number;
  preferLocations?: string[];         // ranking por ubicación (p.ej. pick-face)
};

export type LotHit = {
  lotNumber: LotNumber;
  itemId: string;
  name?: string;
  locationId?: string;
  qcStatus?: QcStatus;
  lotStatus?: LotStatus;
  expDate?: string;
  createdAt?: string;
  receivedAt?: string;
  producedByOrderId?: string;
  parentLotNumber?: LotNumber;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;   // onHand - reserved
  score: number;          // utilidad para desempates
};

export function searchLots(data: SantaData, p: LotSearchParams): LotHit[] {
  const {
    items, onHand, reservations, lots, lotGenealogy, qcBatchResults,
  } = data;

  // Index rápidos
  const lotMeta = new Map<string, typeof lots[number]>();
  for (const L of (lots ?? [])) lotMeta.set(L.lotNumber, L);

  const reservedByLot = new Map<string, number>();
  for (const r of (reservations ?? [])) {
    if (!r.lotNumber) continue;
    reservedByLot.set(r.lotNumber, (reservedByLot.get(r.lotNumber) ?? 0) + r.qty);
  }

  // Filtro base: sólo posiciones con cantidad > 0 (onHand)
  let rows = (onHand ?? []).filter(r => r.qty > 0);

  // Filtros por parámetros
  if (p.itemIds?.length) rows = rows.filter(r => p.itemIds!.includes(r.itemId));
  if (p.locationIds?.length) rows = rows.filter(r => r.locationId && p.locationIds!.includes(r.locationId!));

  // Enriquecer con metadatos del lote
  const hits: LotHit[] = rows.map(r => {
    const meta = r.lotNumber ? lotMeta.get(r.lotNumber) : undefined;
    const reservedQty = r.lotNumber ? (reservedByLot.get(r.lotNumber) ?? 0) : 0;
    const availableQty = r.qty - reservedQty;
    return {
      lotNumber: r.lotNumber!, // en onHand puede ser undefined, asumimos lotes trazables
      itemId: r.itemId,
      name: meta?.itemName,
      locationId: r.locationId,
      qcStatus: r.qcStatus ?? meta?.qcStatus,
      lotStatus: r.lotStatus ?? meta?.status,
      expDate: meta?.expDate,
      createdAt: meta?.createdAt,
      receivedAt: meta?.receivedAt,
      producedByOrderId: meta?.producedByOrderId,
      parentLotNumber: meta?.parentLotNumber,
      onHandQty: r.qty,
      reservedQty,
      availableQty,
      score: 0,
    };
  }).filter(h => !!h.lotNumber);

  // Filtros adicionales
  let out = hits;

  if (p.text?.trim()) {
    const q = p.text.trim().toLowerCase();
    out = out.filter(h => h.lotNumber.toLowerCase().includes(q));
  }
  if (p.minAvailableQty != null) out = out.filter(h => h.availableQty >= (p.minAvailableQty ?? 0));
  if (p.qcStatuses?.length) out = out.filter(h => h.qcStatus && p.qcStatuses!.includes(h.qcStatus));
  if (p.lotStatuses?.length) out = out.filter(h => h.lotStatus && p.lotStatuses!.includes(h.lotStatus));
  if (!p.includeConsumed) out = out.filter(h => h.lotStatus !== 'CONSUMED' && h.lotStatus !== 'SCRAPPED' && h.lotStatus !== 'BLOCKED');
  if (p.producedByOrderId) out = out.filter(h => h.producedByOrderId === p.producedByOrderId);
  if (p.parentLotNumber)  out = out.filter(h => h.parentLotNumber === p.parentLotNumber);
  if (p.expBefore)        out = out.filter(h => h.expDate && h.expDate <= p.expBefore!);
  if (p.expAfter)         out = out.filter(h => h.expDate && h.expDate >= p.expAfter!);
  if (p.receivedAfter)    out = out.filter(h => h.receivedAt && h.receivedAt >= p.receivedAfter!);
  if (p.createdAfter)     out = out.filter(h => h.createdAt && h.createdAt >= p.createdAfter!);

  // Genealogía (opcional)
  if (p.genealogyMode && lotGenealogy?.length) {
    const edges = lotGenealogy;
    if (p.genealogyMode === "PARENTS") {
      const childSet = new Set(out.map(h => h.lotNumber));
      const parents = new Set(edges.filter(e => childSet.has(e.childLot)).map(e => e.parentLot));
      out = out.filter(h => parents.has(h.lotNumber));
    } else if (p.genealogyMode === "CHILDREN") {
      const parentSet = new Set(out.map(h => h.lotNumber));
      const children = new Set(edges.filter(e => parentSet.has(e.parentLot)).map(e => e.childLot));
      out = out.filter(h => children.has(h.lotNumber));
    }
  }

  // Scoring para ranking práctico:
  // + preferimos RELEASED
  // + preferimos ubicaciones “preferLocations”
  // + FEFO (expDate) o FIFO (createdAt/receivedAt)
  const preferLoc = new Map<string, number>();
  p.preferLocations?.forEach((id, i) => preferLoc.set(id, (p.preferLocations!.length - i)));

  for (const h of out) {
    let s = 0;
    if (h.qcStatus === 'RELEASED') s += 10;
    if (h.lotStatus === 'OPEN' || h.lotStatus === 'RELEASED') s += 2;
    if (h.locationId && preferLoc.has(h.locationId)) s += (2 + preferLoc.get(h.locationId)!);
    // disponibilidad ayuda a desempatar
    s += Math.min(h.availableQty, 100) / 100;
    h.score = s;
  }

  const byDate = (a?: string, b?: string) => (a && b ? (a < b ? -1 : a > b ? 1 : 0) : a ? -1 : b ? 1 : 0);

  out.sort((a, b) => {
    // 1) score desc
    if (b.score !== a.score) return b.score - a.score;

    // 2) orden elegido
    switch (p.sort) {
      case 'FEFO':      return byDate(a.expDate, b.expDate);
      case 'FIFO':      return byDate(a.receivedAt ?? a.createdAt, b.receivedAt ?? b.createdAt);
      case 'CREATED_AT':return byDate(a.createdAt, b.createdAt);
      case 'EXP_DATE':  return byDate(a.expDate, b.expDate);
      default:          return byDate(a.receivedAt ?? a.createdAt, b.receivedAt ?? b.createdAt);
    }
  });

  return p.limit ? out.slice(0, p.limit) : out;
}
