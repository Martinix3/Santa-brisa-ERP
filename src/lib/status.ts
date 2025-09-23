import type { OrderStatus, ShipmentStatus } from '@/domain/ssot';

export const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  abierto:'open', confirmado:'confirmed', enviado:'shipped', facturado:'invoiced',
  pagado:'paid', cancelado:'cancelled', perdido:'lost',
  open:'open', confirmed:'confirmed', shipped:'shipped', invoiced:'invoiced',
  paid:'paid', cancelled:'cancelled', lost:'lost',
};

export function normalizeOrderStatus(s?: string): OrderStatus {
  return ORDER_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'open';
}

export const SHIPMENT_STATUS_MAP: Record<string, ShipmentStatus> = {
  pendiente:'pending', 
  picking:'picking',
  validado:'ready_to_ship', 
  preparado:'ready_to_ship',
  enviado:'shipped', 
  entregado:'delivered', 
  incidencia:'exception', 
  cancelado:'cancelled',
  pending:'pending', 
  ready_to_ship:'ready_to_ship',
  shipped:'shipped', 
  delivered:'delivered', 
  exception:'exception', 
  cancelled:'cancelled',
};

export function normalizeShipmentStatus(s?: string): ShipmentStatus {
  return SHIPMENT_STATUS_MAP[(s || '').toLowerCase().trim()] ?? 'pending';
}
