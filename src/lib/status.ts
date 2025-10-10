import type { OrderStatus } from '@/domain/ssot';

// Shipment status type según SSOT v7
type ShipmentStatus = 'DRAFT' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  // Español
  borrador: 'BORRADOR',
  abierto: 'ABIERTO',
  confirmado: 'ABIERTO',
  en_proceso: 'EN_PROCESO',
  servido: 'SERVIDO',
  enviado: 'SERVIDO',
  facturado: 'FACTURADO',
  pagado: 'PAGADO',
  cancelado: 'CANCELADO',
  perdido: 'CANCELADO',
  // Inglés
  draft: 'BORRADOR',
  open: 'ABIERTO',
  confirmed: 'ABIERTO',
  in_progress: 'EN_PROCESO',
  served: 'SERVIDO',
  shipped: 'SERVIDO',
  invoiced: 'FACTURADO',
  paid: 'PAGADO',
  cancelled: 'CANCELADO',
  lost: 'CANCELADO',
};

export function normalizeOrderStatus(s?: string): OrderStatus {
  return ORDER_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'ABIERTO';
}

export const SHIPMENT_STATUS_MAP: Record<string, ShipmentStatus> = {
  // Español
  pendiente: 'DRAFT', 
  borrador: 'DRAFT',
  picking: 'READY',
  validado: 'READY', 
  preparado: 'READY',
  listo: 'READY',
  enviado: 'SHIPPED', 
  entregado: 'DELIVERED', 
  incidencia: 'CANCELLED', 
  cancelado: 'CANCELLED',
  // Inglés
  draft: 'DRAFT',
  pending: 'DRAFT', 
  ready: 'READY',
  ready_to_ship: 'READY',
  shipped: 'SHIPPED', 
  delivered: 'DELIVERED', 
  exception: 'CANCELLED', 
  cancelled: 'CANCELLED',
};

export function normalizeShipmentStatus(s?: string): ShipmentStatus {
  return SHIPMENT_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'DRAFT';
}
