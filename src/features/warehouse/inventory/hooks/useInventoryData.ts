/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/warehouse/inventory/hooks/useInventoryData.ts
/**
 * Hook para transformar y preparar datos de inventario
 * Siguiendo convenciones SSOT
 */

import { useMemo } from 'react';
import type { OnHandView, Item, StockMove } from '@/domain/ssot';
import { buildFriendlyLotCode, hasUomMismatch } from '@/domain/inventory.helpers';
import { computeSkuRollup, type SkuStockSummary } from '@/lib/inventory';
import { INVENTORY_ALERT_CONFIG } from '@/config/inventory';

type UseInventoryDataOptions = {
  onHand: OnHandView[];
  items: Item[];
  stockMoves: StockMove[];
  lots?: any[]; // Lotes completos para enriquecer datos
};

export type LotRowData = {
  id: string;
  lotNumber: string;
  lotCode: string;  // ✅ SSOT V2: Campo canónico
  friendlyLotCode: string;
  sku: string;
  name: string;
  qty: number;
  free: number;
  uom: string;
  itemUom: string | null;
  locationId: string;
  qcStatus: OnHandView['qcStatus'];
  expiryAt: string | null;
  updatedAt: string;
  value: number;
  uomMismatch: boolean;
};

export type SkuWithLots = {
  summary: SkuStockSummary;
  lots: Array<OnHandView & {
    friendlyLotCode: string;
    uomMismatch: boolean;
    itemUom: string | null;
  }>;
};

export function useInventoryData({
  onHand,
  items,
  stockMoves,
  lots = [],
}: UseInventoryDataOptions) {
  // Crear mapa de items para lookup rápido (SSOT V2: Use itemId as canonical key)
  const itemsById = useMemo(
    () => new Map(items.map(item => [item.id, item])),
    [items]
  );
  
  // Legacy SKU map for backwards compatibility (deprecated)
  const itemsBySku = useMemo(
    () => new Map(items.map(item => [item.sku, item])),
    [items]
  );

  // Calcular resúmenes por SKU
  const summaries = useMemo(
    () => computeSkuRollup(onHand, { 
      nearExpiryDays: INVENTORY_ALERT_CONFIG.nearExpiryDays, 
      items 
    }),
    [onHand, items]
  );

  // Crear mapa de lots para lookup rápido
  const lotsByCode = useMemo(
    () => new Map(lots.map(lot => [lot.lotCode || lot.lotNumber, lot])),
    [lots]
  );

  // Preparar SKUs con lotes agrupados
  const skusWithLots = useMemo<SkuWithLots[]>(() => {
    return Object.values(summaries)
      .map(summary => {
        // SSOT V2: Filter by itemId (canonical), with SKU fallback for legacy data
        const sourceLots = onHand.filter(lot => 
          lot.itemId === summary.itemId || lot.sku === summary.sku
        );
        // SSOT V2: Lookup by itemId first, then SKU for backwards compatibility
        const item = (summary.itemId ? itemsById.get(summary.itemId) : undefined) || itemsBySku.get(summary.sku);
        
        const mappedLots = sourceLots.map(lot => {
          // Usar lotCode canónico (SSOT v2) o fallback a lotNumbers legacy
          const lotCode = lot.lotCode || Object.keys(lot.lotNumbers ?? {})[0] || `${summary.sku}-SIN-LOTE`;
          
          // Enriquecer con datos del lot master
          const lotMaster = lotsByCode.get(lotCode);
          
          return {
            ...lot,
            lotNumber: lotCode, // Usar lotCode como lotNumber para compatibilidad
            friendlyLotCode: buildFriendlyLotCode({
              lotNumber: lotCode,
              sku: summary.sku,
              createdAt: lot.updatedAt,
            }),
            uomMismatch: hasUomMismatch(lot.uom, item?.uom),
            itemUom: item?.uom ?? null,
            // Enriquecer con datos del lot master si existen
            expDate: lotMaster?.expDate,
            supplierId: lotMaster?.supplierId,
            externalLot: lotMaster?.externalLot,
          };
        });
        
        return { summary, lots: mappedLots };
      })
      .sort((a, b) => {
        const nameA = itemsBySku.get(a.summary.sku)?.name || a.summary.sku;
        const nameB = itemsBySku.get(b.summary.sku)?.name || b.summary.sku;
        return nameA.localeCompare(nameB);
      });
  }, [summaries, onHand, itemsBySku, lotsByCode]);

  // Preparar filas de lotes para vista plana
  const lotRows = useMemo<LotRowData[]>(() => {
    return onHand
      .map(r => {
        const sku = r.sku ?? '';
        // SSOT V2: Lookup by itemId (canonical), with SKU fallback
        const item = (r.itemId ? itemsById.get(r.itemId) : undefined) || itemsBySku.get(sku);
        
        // Usar lotCode canónico (SSOT v2) o fallback a lotNumbers legacy
        const lotCode = r.lotCode || Object.keys(r.lotNumbers ?? {})[0] || `${sku}-SIN-LOTE`;
        
        // Enriquecer con datos del lot master
        const lotMaster = lotsByCode.get(lotCode);
        
        // Calcular cantidades usando buckets SSOT v2
        let qty: number;
        let qtyReleased: number;
        let reservedQty: number;
        
        if (typeof r.qty === 'object' && r.qty !== null) {
          // SSOT v2: qty = { RELEASED, HOLD, REJECTED }
          qtyReleased = (r.qty as any).RELEASED || 0;
          const qtyHold = (r.qty as any).HOLD || 0;
          const qtyRejected = (r.qty as any).REJECTED || 0;
          qty = qtyReleased + qtyHold + qtyRejected;
        } else {
          // Legacy: qty as number
          qty = Number(r.qty) || 0;
          qtyReleased = qty;
        }
        
        if (typeof r.reservedQty === 'object' && r.reservedQty !== null) {
          reservedQty = (r.reservedQty as any).RELEASED || 0;
        } else {
          reservedQty = Number(r.reservedQty ?? r.reserved ?? 0);
        }
        
        const friendlyLotCode = buildFriendlyLotCode({
          lotNumber: lotCode,
          sku,
          createdAt: r.updatedAt,
        });
        
        return {
          id: r.id,
          lotNumber: lotCode,
          lotCode: lotCode,  // ✅ SSOT V2: Campo canónico
          friendlyLotCode,
          sku,
          name: item?.name ?? sku,
          qty,
          free: Math.max(0, qtyReleased - reservedQty),
          uom: r.uom || item?.uom || 'unit',
          itemUom: item?.uom ?? null,
          // SSOT V2: Use locationId (canonical), warehouseId is legacy
          locationId: r.locationId || r.warehouseId || '',
          qcStatus: r.qcStatus,
          expiryAt: lotMaster?.expDate || null,
          updatedAt: r.updatedAt,
          value: qty * (item?.stdCost ?? 0),
          uomMismatch: hasUomMismatch(r.uom, item?.uom),
        };
      })
      .sort((a, b) => a.friendlyLotCode.localeCompare(b.friendlyLotCode));
  }, [onHand, itemsBySku, items, lotsByCode]);

  // Calcular incidencias UOM
  const uomIncidentCount = useMemo(() => {
    return onHand.reduce((acc, row) => {
      const item = row.sku ? itemsBySku.get(row.sku) : undefined;
      return acc + (hasUomMismatch(row.uom, item?.uom) ? 1 : 0);
    }, 0);
  }, [onHand, itemsBySku]);

  // Extraer ubicaciones únicas
  const locations = useMemo(() => {
    const set = new Set<string>();
    // SSOT V2: Use locationId (canonical), with warehouseId fallback for legacy data
    onHand.forEach(o => { 
      const location = o.locationId || o.warehouseId;
      if (location) set.add(location); 
    });
    
    return ['ALL', ...Array.from(set).sort()];
  }, [onHand]);

  return {
    summaries,
    skusWithLots,
    lotRows,
    uomIncidentCount,
    locations,
    itemsById,     // SSOT V2: Canonical item lookup by ID
    itemsBySku,    // Legacy: Deprecated, kept for backwards compatibility
  };
}
