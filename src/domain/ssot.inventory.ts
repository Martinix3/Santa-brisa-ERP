// domain/ssot.inventory.ts - Canónico de Inventario/Logística
import type { Uom } from './ssot.core';

export type StockReason = 'RECEIPT' | 'PROD_CONSUME' | 'PROD_OUTPUT' | 'PACK_OUTPUT' | 'TRANSFER' | 'PICK' | 'SHIP' | 'ADJUSTMENT' | 'RETURN';

export interface StockMove {
  id: string;
  lotId: string;
  sku: string;
  qty: number;
  uom: Uom;
  fromLocation?: string;
  toLocation?: string;
  reason: StockReason;
  ref?: {
    receiptId?: string;
    batchId?: string;
    packRunId?: string;
    orderId?: string;
    shipmentId?: string;
  };
  occurredAt: string;
  createdAt: string;
}

export interface ShipmentLine {
  lotId: string;
  sku: string;
  qty: number;
  uom: 'bottle' | 'case';
}

export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export interface Shipment {
  id: string;
  orderId: string;
  carrier?: 'Sendcloud' | string;
  labelUrl?: string;
  lines: ShipmentLine[];
  packedById?: string;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  checks?: {
      visualOk?: boolean;
      boxPics?: string[];
  };
  createdAt: string;
}
