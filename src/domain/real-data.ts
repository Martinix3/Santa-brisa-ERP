
import type { SantaData } from './ssot';
import { mockSantaData } from './mock-data';

// This data is intentionally simple and clean, matching the SSOT types directly.
// It avoids the need for complex data processing in the DataProvider.

const realAccounts: SantaData['accounts'] = [
    { id: 'acc_real_1', name: 'Restaurante La Cuchara', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_patxi', biller: 'SB' }, createdAt: '2024-04-12T10:00:00Z' },
    { id: 'acc_real_2', name: 'Bar El Trocadero', city: 'Barcelona', type: 'HORECA', stage: 'SEGUIMIENTO', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_nico', biller: 'SB' }, createdAt: '2024-04-15T10:00:00Z' },
    { id: 'acc_real_3', name: 'Hotel Vista al Mar', city: 'Valencia', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_alfonso', biller: 'SB' }, createdAt: '2024-04-18T10:00:00Z' },
    { id: 'acc_real_4', name: 'Coctelería El Alquimista', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_patxi', biller: 'SB' }, createdAt: '2024-04-20T10:00:00Z' },
    { id: 'acc_real_5', name: 'Terraza del Sol', city: 'Sevilla', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_nico', biller: 'SB' }, createdAt: '2024-04-22T10:00:00Z' },
    { id: 'acc_real_6', name: 'Gastrobar Fusión', city: 'Bilbao', type: 'HORECA', stage: 'SEGUIMIENTO', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_alfonso', biller: 'SB' }, createdAt: '2024-04-25T10:00:00Z' },
    { id: 'acc_real_7', name: 'Chiringuito La Ola', city: 'Málaga', type: 'HORECA', stage: 'POTENCIAL', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_nico', biller: 'SB' }, createdAt: '2024-05-01T10:00:00Z' },
    { id: 'acc_real_8', name: 'Taberna del Norte', city: 'Santander', type: 'HORECA', stage: 'SEGUIMIENTO', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_patxi', biller: 'SB' }, createdAt: '2024-05-05T10:00:00Z' },
    { id: 'acc_real_9', name: 'Venta Directa Online', city: 'Web', type: 'OTRO', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_martin', biller: 'SB' }, createdAt: '2024-05-12T10:00:00Z' },
];

const realOrders: SantaData['ordersSellOut'] = [
    { id: 'ORD-001', accountId: 'acc_real_4', userId: 'u_patxi', status: 'confirmed', currency: 'EUR', createdAt: '2024-04-20T11:00:00Z', lines: [{ sku: 'SB-750', qty: 5, priceUnit: 51, unit: 'caja' }] },
    { id: 'ORD-002', accountId: 'acc_real_5', userId: 'u_nico', status: 'confirmed', currency: 'EUR', createdAt: '2024-04-22T11:00:00Z', lines: [{ sku: 'SB-750', qty: 10, priceUnit: 50, unit: 'caja' }] },
    { id: 'ORD-003', accountId: 'acc_real_1', userId: 'u_patxi', status: 'confirmed', currency: 'EUR', createdAt: '2024-04-28T11:00:00Z', lines: [{ sku: 'SB-750', qty: 8, priceUnit: 51, unit: 'caja' }] },
    { id: 'ORD-004', accountId: 'acc_real_3', userId: 'u_alfonso', status: 'confirmed', currency: 'EUR', createdAt: '2024-05-03T11:00:00Z', lines: [{ sku: 'SB-750', qty: 15, priceUnit: 49, unit: 'caja' }] },
    { id: 'ORD-005', accountId: 'acc_real_5', userId: 'u_nico', status: 'confirmed', currency: 'EUR', createdAt: '2024-05-10T11:00:00Z', lines: [{ sku: 'SB-750', qty: 12, priceUnit: 50, unit: 'caja' }] },
    { id: 'WEB-001', accountId: 'acc_real_9', userId: 'u_martin', status: 'confirmed', currency: 'EUR', createdAt: '2024-05-12T11:00:00Z', lines: [{ sku: 'SB-750', qty: 6, priceUnit: 15, unit: 'ud' }] },
];

const realInteractions: SantaData['interactions'] = [
    { id: 'int_real_1', accountId: 'acc_real_1', userId: 'u_patxi', kind: 'LLAMADA', note: 'Llamada inicial, mostraram interés. Agendar visita.', createdAt: '2024-04-12T12:00:00Z', dept: 'VENTAS' },
    { id: 'int_real_2', accountId: 'acc_real_2', userId: 'u_nico', kind: 'EMAIL', note: 'Enviado catálogo por email. Pendiente de respuesta.', createdAt: '2024-04-15T12:00:00Z', dept: 'VENTAS' },
    { id: 'int_real_3', accountId: 'acc_real_3', userId: 'u_alfonso', kind: 'VISITA', note: 'Visita programada para el 25/04. Preparar muestras.', createdAt: '2024-04-18T12:00:00Z', dept: 'VENTAS' },
    { id: 'int_real_4', accountId: 'acc_real_6', userId: 'u_alfonso', kind: 'VISITA', note: 'Interesados pero ya tienen proveedor. Volver a contactar en Septiembre.', createdAt: '2024-04-25T12:00:00Z', dept: 'VENTAS' },
    { id: 'int_real_5', accountId: 'acc_real_7', userId: 'u_nico', kind: 'EMAIL', note: 'Primer contacto, enviado email con info.', createdAt: '2024-05-01T12:00:00Z', dept: 'VENTAS' },
    { id: 'int_real_6', accountId: 'acc_real_8', userId: 'u_patxi', kind: 'LLAMADA', note: 'Solicitaron muestra, pendiente de envío.', createdAt: '2024-05-05T12:00:00Z', dept: 'VENTAS' },
];

export const realSantaData: SantaData = {
    ...mockSantaData,
    accounts: [...mockSantaData.accounts, ...realAccounts],
    ordersSellOut: [...mockSantaData.ordersSellOut, ...realOrders],
    interactions: [...mockSantaData.interactions, ...realInteractions],
};
