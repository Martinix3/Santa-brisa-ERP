// src/server/integrations/shopify/upsertShopifyOrder.usecase.ts
import { adminDb } from '@/server/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { enqueue } from '../queue';
import { mapShopifyToSSOT } from './shopify.mapper';
import type { Account } from '@/domain/ssot';

async function upsertAccount(accountData: Partial<Account>, shopifyCustomer: any): Promise<FirebaseFirestore.DocumentReference> {
  const email = shopifyCustomer.email;
  if (!email) throw new Error("Customer email is required to upsert account");

  const q = await adminDb.collection('accounts').where('external.shopifyCustomerId', '==', String(shopifyCustomer.id)).limit(1).get();
  
  if (!q.empty) {
    const docRef = q.docs[0].ref;
    await docRef.set(accountData, { merge: true });
    return docRef;
  }
  
  // Si no se encuentra por ID, busca por email
  const qByEmail = await adminDb.collection('accounts').where('mainContactEmail', '==', email).limit(1).get();
  if(!qByEmail.empty){
    const docRef = qByEmail.docs[0].ref;
    await docRef.set(accountData, { merge: true });
    return docRef;
  }

  // Si no existe, crea uno nuevo
  const docRef = adminDb.collection('accounts').doc();
  await docRef.set({
    ...accountData,
    id: docRef.id,
    type: 'ONLINE',
    stage: 'ACTIVA',
    ownerId: 'system_shopify',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef;
}

export async function upsertShopifyOrder(shopifyOrder: any) {
  const { accountData, orderData, correlationId } = mapShopifyToSSOT(shopifyOrder);

  const accRef = await upsertAccount(accountData, shopifyOrder.customer);

  const orderRef = adminDb.collection('ordersSellOut').doc(`shopify-${shopifyOrder.id}`);
  await orderRef.set({
    ...orderData,
    id: orderRef.id,
    accountId: accRef.id,
    source: 'SHOPIFY',
    billingStatus: 'PENDING',
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: new Date(shopifyOrder.created_at).toISOString(),
  }, { merge: true });

  await enqueue({
    kind: 'CREATE_HOLDED_INVOICE',
    payload: { orderId: orderRef.id },
    correlationId,
    maxAttempts: 6
  });

  return { orderId: orderRef.id };
}
