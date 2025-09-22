// src/server/integrations/shopify/process.ts
import { adminDb } from '@/server/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { enqueue } from '@/server/queue/queue';
import { mapShopifyToSSOT } from './mappers';
import { verifyShopifyHmac } from './hmac';
import type { Account } from '@/domain/ssot';

interface WebhookParams {
  rawBody: string;
  hmac: string | null;
  topic: string;
  shop: string;
}

async function upsertAccount(accountData: Partial<Account>, shopifyCustomer: any): Promise<FirebaseFirestore.DocumentReference> {
  if (!shopifyCustomer.email) {
    throw new Error("Customer email is required to upsert an account from Shopify.");
  }

  const accountsRef = adminDb.collection('accounts');
  
  // 1. Try to find by Shopify Customer ID
  const qById = await accountsRef.where('external.shopifyCustomerId', '==', String(shopifyCustomer.id)).limit(1).get();
  if (!qById.empty) {
    const docRef = qById.docs[0].ref;
    await docRef.set(accountData, { merge: true });
    return docRef;
  }
  
  // 2. If not found, try to find by email (assuming email is a unique contact point)
  const qByEmail = await accountsRef.where('mainContactEmail', '==', shopifyCustomer.email).limit(1).get();
  if (!qByEmail.empty) {
    const docRef = qByEmail.docs[0].ref;
    await docRef.set(accountData, { merge: true });
    return docRef;
  }

  // 3. If still not found, create a new account
  const docRef = accountsRef.doc();
  await docRef.set({
    ...accountData,
    id: docRef.id,
    type: 'ONLINE',
    stage: 'ACTIVA',
    ownerId: 'system_shopify', // Assign to a system user
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef;
}

export async function processShopifyEvent(params: WebhookParams) {
  if (!verifyShopifyHmac(params.rawBody, params.hmac)) {
    return { ok: false, error: 'Invalid HMAC signature', status: 401 };
  }

  const payload = JSON.parse(params.rawBody);
  const eventRef = adminDb.collection('integrations').doc('shopify').collection('events').doc(String(payload.id));
  
  const snap = await eventRef.get();
  if (snap.exists && snap.data()?.processedAt) {
    return { ok: true, message: 'Already processed' };
  }

  await eventRef.set({
    topic: params.topic,
    shop: params.shop,
    payload,
    receivedAt: FieldValue.serverTimestamp(),
    status: 'PENDING'
  }, { merge: true });

  try {
    if (params.topic === 'orders/paid' || params.topic === 'orders/create') {
      const { accountData, orderData, correlationId } = mapShopifyToSSOT(payload);
      
      const accRef = await upsertAccount(accountData, payload.customer);

      const orderRef = adminDb.collection('ordersSellOut').doc(`shopify-${payload.id}`);
      await orderRef.set({
        ...orderData,
        id: orderRef.id,
        accountId: accRef.id,
        source: 'SHOPIFY',
        billingStatus: 'PENDING',
        external: { shopifyOrderId: String(payload.id) },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      await enqueue({
        kind: 'CREATE_HOLDED_INVOICE',
        payload: { orderId: orderRef.id },
        correlationId,
        maxAttempts: 5,
        delaySec: 10,
      });
      
      await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'OK', orderId: orderRef.id });
      return { ok: true, message: 'Webhook processed and job enqueued.' };
    }
    
    // Handle other topics or skip
    await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'SKIPPED' });
    return { ok: true, message: 'Topic skipped.' };

  } catch (e: any) {
    console.error(`[Shopify Process] Error processing event ${payload.id}:`, e);
    await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'ERROR', error: e.message });
    throw e;
  }
}
