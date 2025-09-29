// src/features/quicklog/actions/create-account-action.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Account, PartyRole, CustomerData, Segment } from '@/domain/ssot';

export async function createAccountAndParty(data: { name: string; city?: string; type?: Segment; ownerId: string; distributorPartyId?: string }) {
  const now = new Date().toISOString();
  
  const partyRef = db.collection('parties').doc();
  const newParty: Partial<Party> = {
    id: partyRef.id,
    legalName: data.name,
    name: data.name,
    kind: 'ORG',
    billingAddress: data.city ? { street: '', city: data.city, zip: '', country: 'España' } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  
  const accountRef = db.collection('accounts').doc();
  const newAccount: Account = {
    id: accountRef.id,
    partyId: partyRef.id,
    name: data.name,
    segment: data.type || 'HORECA',
    stage: 'POTENCIAL',
    ownerId: data.ownerId,
    flow: data.distributorPartyId ? 'PLACEMENT' : 'DIRECT',
    distributorPartyId: data.distributorPartyId,
    mode: data.distributorPartyId ? 'COLOCACION' : 'DIRECTA', // for compatibility
    createdAt: now,
    updatedAt: now,
  };
  
  const roleRef = db.collection('partyRoles').doc();
  const newRole: PartyRole = {
    id: roleRef.id,
    partyId: partyRef.id,
    role: 'CUSTOMER',
    isActive: true,
    createdAt: now,
    data: {
        salesRepId: data.ownerId,
        billerId: data.distributorPartyId || 'SB',
    } as CustomerData
  };
  
  const batch = db.batch();
  batch.set(partyRef, newParty as Party);
  batch.set(accountRef, newAccount);
  batch.set(roleRef, newRole);
  
  await batch.commit();

  return { account: { party: newParty, account: newAccount, role: newRole }};
}
