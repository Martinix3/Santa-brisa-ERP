

import type { Shipment, Party, OrderSellOut } from '@/domain/ssot';

export const hasDimsAndWeight = (shipment: Shipment) => {
  const s = shipment as any; // Cast to any to access nested properties safely
  const w = Number(s?.weightKg || 0);
  const d = s?.dimsCm || {};
  return w > 0 && ["l", "w", "h"].every((k) => Number(d?.[k] || 0) > 0);
};

export const hasContactInfo = (party?: Party) => {
    if (!party) return false;
    const hasPhone = (party.contacts ?? []).some(c => c.type === 'phone' && c.value);
    const hasAddress = (party.addresses ?? []).some(a => a.street);
    return hasPhone && hasAddress;
};
export const canGenerateDeliveryNote = (row: Shipment) => Boolean(row.checks?.visualOk || row.status === 'ready_to_ship');
export const canGenerateLabel = (shipment: Shipment) => Boolean(shipment.deliveryNoteId) && Boolean(shipment.carrier) && hasDimsAndWeight(shipment);
export const canMarkShipped = (row: Shipment) => Boolean(row.labelUrl);
export const canInvoice = (shipment: Shipment, order?: OrderSellOut) => {
  // Simplified logic: can invoice if shipped and not already invoiced
  return shipment.status === 'shipped' && order?.billingStatus !== 'INVOICED';
};

export const pendingReasons = (row: Shipment): string[] => {
  const reasons: string[] = [];
  if (!row.checks?.visualOk) reasons.push("Visual OK");
  if (!row.deliveryNoteId) reasons.push("Albarán");
  if (!row.carrier || !hasDimsAndWeight(row)) reasons.push("Srv/Peso/Dim");
  if (!row.labelUrl) reasons.push("Etiqueta");
  return Array.from(new Set(reasons));
};

    