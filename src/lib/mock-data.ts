// src/lib/mock-data.ts
import type { SantaData, Account, Party, OrderSellOut } from '@/domain/ssot';

const MOCK_PARTIES: Party[] = [
    { id: 'party_1', name: 'Bar El Sol', legalName: 'Bar El Sol', kind: 'ORG', taxId: 'B12345678', createdAt: '2023-01-15T10:00:00Z', updatedAt: '2023-01-15T10:00:00Z' },
    { id: 'party_2', name: 'Supermercado La Esquina', legalName: 'Supermercado La Esquina', kind: 'ORG', taxId: 'A87654321', createdAt: '2023-02-20T11:00:00Z', updatedAt: '2023-02-20T11:00:00Z' },
    { id: 'party_3', name: 'Distribuciones Norte S.L.', legalName: 'Distribuciones Norte S.L.', kind: 'ORG', taxId: 'B99998888', createdAt: '2023-03-10T09:00:00Z', updatedAt: '2023-03-10T09:00:00Z' },
];

const MOCK_ACCOUNTS: Account[] = [
    { id: 'acc_1', partyId: 'party_1', flow: 'DIRECT', segment: 'HORECA', name: 'Bar El Sol', ownerId: 'user_1', stage: 'ACTIVA', createdAt: '2023-01-15T10:00:00Z', updatedAt: '2023-01-15T10:00:00Z' },
    { id: 'acc_2', partyId: 'party_2', flow: 'DIRECT', segment: 'RETAIL', name: 'Supermercado La Esquina', ownerId: 'user_1', stage: 'ACTIVA', createdAt: '2023-02-20T11:00:00Z', updatedAt: '2023-02-20T11:00:00Z' },
    { id: 'acc_3', partyId: 'party_3', flow: 'PLACEMENT', segment: 'RETAIL', name: 'Canal Distribución Norte', ownerId: 'user_2', distributorPartyId: 'dist_norte', stage: 'ACTIVA', createdAt: '2023-03-10T09:00:00Z', updatedAt: '2023-03-10T09:00:00Z' },
];

const MOCK_ORDERS: OrderSellOut[] = [
    { id: 'ord_1', accountId: 'acc_1', status: 'shipped', lines: [{ itemId: 'item_1', name: 'Santa Brisa 750ml', qty: 6, uom: 'uds', priceUnit: 15 }], totalAmount: 90, currency: 'EUR', createdAt: '2024-05-10T14:00:00Z', updatedAt: '2024-05-10T14:00:00Z' },
    { id: 'ord_2', accountId: 'acc_2', status: 'paid', lines: [{ itemId: 'item_1', name: 'Santa Brisa 750ml', qty: 24, uom: 'uds', priceUnit: 14 }], totalAmount: 336, currency: 'EUR', createdAt: '2024-05-12T10:00:00Z', updatedAt: '2024-05-12T10:00:00Z' },
];

export const MOCK_DATA: Partial<SantaData> = {
    parties: MOCK_PARTIES as any,
    accounts: MOCK_ACCOUNTS as any,
    ordersSellOut: MOCK_ORDERS,
    // Add other collections as empty arrays to prevent crashes
    users: [{ id: 'user_1', name: 'Comercial 1', role: 'comercial', active: true }, { id: 'user_2', name: 'Comercial 2', role: 'comercial', active: true }],
    items: [{ id: 'item_1', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'fg', uom: 'uds', active: true }],
    shipments: [],
    priceLists: [],
    accountPriceOverrides: [],
    plvMaterials: [],
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
