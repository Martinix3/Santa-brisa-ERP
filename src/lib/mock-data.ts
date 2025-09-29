// src/lib/mock-data.ts
import type { SantaData, Account, Party, OrderSellIn } from '@/domain/ssot.v4';

const MOCK_PARTIES: Party[] = [
    { id: 'party_1', legalName: 'Bar El Sol', cif: 'B12345678', createdAt: '2023-01-15T10:00:00Z', updatedAt: '2023-01-15T10:00:00Z' },
    { id: 'party_2', legalName: 'Supermercado La Esquina', cif: 'A87654321', createdAt: '2023-02-20T11:00:00Z', updatedAt: '2023-02-20T11:00:00Z' },
    { id: 'party_3', legalName: 'Distribuciones Norte S.L.', cif: 'B99998888', createdAt: '2023-03-10T09:00:00Z', updatedAt: '2023-03-10T09:00:00Z' },
];

const MOCK_ACCOUNTS: Account[] = [
    { id: 'acc_1', partyId: 'party_1', mode: 'DIRECTA', segment: 'HORECA', name: 'Bar El Sol', ownerId: 'user_1', stage: 'ACTIVA', createdAt: '2023-01-15T10:00:00Z', updatedAt: '2023-01-15T10:00:00Z' },
    { id: 'acc_2', partyId: 'party_2', mode: 'DIRECTA', segment: 'RETAIL', name: 'Supermercado La Esquina', ownerId: 'user_1', stage: 'ACTIVA', createdAt: '2023-02-20T11:00:00Z', updatedAt: '2023-02-20T11:00:00Z' },
    { id: 'acc_3', partyId: 'party_3', mode: 'COLOCACION', segment: 'RETAIL', name: 'Canal Distribución Norte', ownerId: 'user_2', distributorId: 'dist_norte', stage: 'ACTIVA', createdAt: '2023-03-10T09:00:00Z', updatedAt: '2023-03-10T09:00:00Z' },
];

const MOCK_ORDERS: OrderSellIn[] = [
    { id: 'ord_1', accountId: 'acc_1', channel: 'FIELD', status: 'fulfilled', lines: [{ sku: 'SB-750', qty: 6, unitPrice: 15 }], total: 90, currency: 'EUR', createdAt: '2024-05-10T14:00:00Z', updatedAt: '2024-05-10T14:00:00Z' },
    { id: 'ord_2', accountId: 'acc_2', channel: 'FIELD', status: 'paid', lines: [{ sku: 'SB-750', qty: 24, unitPrice: 14 }], total: 336, currency: 'EUR', createdAt: '2024-05-12T10:00:00Z', updatedAt: '2024-05-12T10:00:00Z' },
];

export const MOCK_DATA: Partial<SantaData> = {
    parties: MOCK_PARTIES as any,
    accounts: MOCK_ACCOUNTS as any,
    ordersSellIn: MOCK_ORDERS,
    // Add other collections as empty arrays to prevent crashes
    users: [{ id: 'user_1', name: 'Comercial 1', role: 'comercial' }, { id: 'user_2', name: 'Comercial 2', role: 'comercial' }],
    items: [{ id: 'item_1', sku: 'SB-750', name: 'Santa Brisa 750ml' }],
    ordersSellOut: [],
    shipments: [],
    invoices: [],
    priceLists: [],
    accountPriceOverrides: [],
    plvMaterials: [],
    activations: [],
    promotions: [],
    stockMoves: [],
    productionOrders: [],
    onHand: [],
    interactions: [],
    billOfMaterials: [],
    lots: [],
    partyDuplicates: [],
    qcParameters: [],
    qcPlans: [],
    qcTests: [],
    deliveryNotes: [],
    lotGenealogy: [],
    marketingEvents: [],
    onlineCampaigns: [],
    influencerCollabs: [],
    posTactics: [],
    posCostCatalog: [],
    plv_material: [],
};
