/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { ShopifyClient } from './client';
import { normalizeShopifyOrder } from './map';
import type { Account, OrderSellOut, Party, Timestamp } from '@/domain/ssot';
import { upsertMany } from '@/lib/dataprovider/actions';
import { getServerData } from '@/lib/dataprovider/server';
import { enqueue } from '@/server/queue/queue';

const ONLINE_PARTY_LEGAL = 'SHOPIFY D2C';
const ONLINE_ACCOUNT_NAME = 'Canal Online (Shopify)';

async function ensureOnlinePartyAccount() {
  const data = await getServerData() as { parties: Party[]; accounts: Account[] };

  let party = data.parties.find(p => p.name === ONLINE_PARTY_LEGAL);
  if (!party) {
    const now = new Date().toISOString();
    party = {
      id: 'ONLINE',
      name: ONLINE_PARTY_LEGAL,
      kind: 'ORG',
      createdAt: now,
      updatedAt: now,
    } as unknown as Party;

    await upsertMany('parties', [party]);
  }

  let account = data.accounts.find((a: Account) => a.partyId === party!.id && a.segment === 'ONLINE');
  if (!account) {
    const now = new Date().toISOString();
    const acc: Account = {
      id: 'ONLINE',
      partyId: party!.id,
      name: ONLINE_ACCOUNT_NAME,
      segment: 'ONLINE',
      flow: 'DIRECT',
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
  if (!process.env.SHOPIFY_SHOP || !process.env.SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify env vars missing');
  }

  const client = new ShopifyClient();
  const shopifyOrder = await client.getOrderById(Number(orderId));
  if (!shopifyOrder) throw new Error(`Shopify order ${orderId} not found`);
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
