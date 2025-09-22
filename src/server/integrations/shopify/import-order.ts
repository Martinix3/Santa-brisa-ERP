import { getOrderById } from './client';
import { normalizeShopifyOrder } from './map';
import type { Account, OrderSellOut, Party, Timestamp } from '@/domain/ssot';
import { upsertMany } from '@/lib/dataprovider/actions';
import { getServerData } from '@/lib/dataprovider/server';
import { enqueue } from '@/server/queue/queue';

const ONLINE_PARTY_LEGAL = 'SHOPIFY D2C';
const ONLINE_ACCOUNT_NAME = 'Canal Online (Shopify)';

async function ensureOnlinePartyAccount() {
  // This helper function might need adjustment based on how getServerData is implemented.
  // For now, assuming it can fetch specific collections.
  const data = await getServerData() as { parties: Party[]; accounts: Account[] };

  let party = data.parties.find(p => p.legalName === ONLINE_PARTY_LEGAL);
  if (!party) {
    const now = new Date().toISOString();
    party = {
      id: 'ONLINE',
      legalName: ONLINE_PARTY_LEGAL,
      tradeName: 'Tienda online',
      roles: ['CUSTOMER'],
      createdAt: now,
      updatedAt: now,
      name: ONLINE_PARTY_LEGAL,
      kind: 'ORG',
      contacts: [],
      addresses: [],
    } as unknown as Party;

    await upsertMany('parties', [party]);
  }

  let account = data.accounts.find(a => a.partyId === party!.id && a.type === 'ONLINE');
  if (!account) {
    const now = new Date().toISOString();
    const acc: Account = {
      id: 'ONLINE',
      partyId: party!.id,
      name: ONLINE_ACCOUNT_NAME,
      type: 'ONLINE',
      stage: 'ACTIVA',
      ownerId: 'SYSTEM',
      createdAt: now,
      updatedAt: now,
      external: { shopifyCustomerId: undefined },
    };
    await upsertMany('accounts', [acc]);
  }

  return { partyId: 'ONLINE', accountId: 'ONLINE' };
}

export async function importSingleShopifyOrder(orderId: string) {
  if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Shopify env vars missing');
  }

  const shopifyOrder = await getOrderById(orderId);
  const ssotOrder = normalizeShopifyOrder(shopifyOrder);

  // Garantiza ONLINE Party/Account y reemplaza ids
  const ids = await ensureOnlinePartyAccount();
  ssotOrder.partyId = ids.partyId;
  ssotOrder.accountId = ids.accountId;

  // Idempotente por id = "shopify:<id>"
  await upsertMany('ordersSellOut', [ssotOrder as OrderSellOut]);

  // Criterio MVP: si el pedido está confirmado (paid/authorized), encola creación de Shipment
  if (ssotOrder.status === 'confirmed') {
    await enqueue({
      kind: 'CREATE_SHIPMENT_FROM_ORDER',
      payload: { orderId: ssotOrder.id },
      maxAttempts: 5,
    });
  }

  return ssotOrder;
}
