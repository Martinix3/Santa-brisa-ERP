import type { OrderStatus, ShipmentStatus } from '@/domain/ssot';

export const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  abierto:'open', confirmado:'confirmed', enviado:'SHIPPED', facturado:'invoiced',
  pagado:'paid', cancelado:'REJECTED', perdido:'lost',
  open:'open', confirmed:'confirmed', shipped:'SHIPPED', invoiced:'invoiced',
  paid:'paid', cancelled:'REJECTED', lost:'lost',
};

export function normalizeOrderStatus(s?: string): OrderStatus {
  return ORDER_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'open';
}

export const SHIPMENT_STATUS_MAP: Record<string, ShipmentStatus> = {
  pendiente:'DRAFT', 
  picking:'picking',
  validado:'READY', 
  preparado:'READY',
  enviado:'SHIPPED', 
  entregado:'DELIVERED', 
  incidencia:'exception', 
  cancelado:'REJECTED',
  pending:'DRAFT', 
  ready_to_ship:'READY',
  shipped:'SHIPPED', 
  delivered:'DELIVERED', 
  exception:'exception', 
  cancelled:'REJECTED',
};

export function normalizeShipmentStatus(s?: string): ShipmentStatus {
  return SHIPMENT_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'DRAFT';
}
