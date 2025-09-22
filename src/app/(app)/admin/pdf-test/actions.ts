'use server';

import { renderDeliveryNotePdf, toDataUri } from '@/server/pdf/deliveryNote';

export async function generateTestPdf() {
  const pdf = await renderDeliveryNotePdf({
    id: 'DN-TEST-0001',
    dateISO: new Date().toISOString(),
    orderId: 'SO-TEST-123',
    soldTo: { name: 'Restaurante Demo, S.L.', vat: 'B12345678' },
    shipTo: { name: 'Restaurante Demo, S.L.', address: 'Gran Vía 1', zip: '28013', city: 'Madrid', country: 'España' },
    lines: [
      { sku: 'SB-750', description: 'Santa Brisa 750ml', qty: 6, uom: 'bot' },
      { sku: 'SB-1500', description: 'Santa Brisa Magnum', qty: 1, uom: 'bot' },
    ],
    notes: 'Manipular con cuidado. Entrega en horario de mañana.',
    company: { name: 'Santa Brisa', vat: 'B00000000', address: 'C/ Olivos 10', zip: '28010', city: 'Madrid', country: 'España' },
  });
  return { dataUri: toDataUri(pdf) };
}
