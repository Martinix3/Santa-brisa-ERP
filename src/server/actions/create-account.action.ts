// src/server/actions/create-account.action.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Account, PartyRole, CustomerData, Segment, CommercialFlow } from '@/domain/ssot';

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
    ownerId: data.salesRepId,
    flow: 'COLOCACION', // QuickLog always creates PLACEMENT accounts
    distributorPartyId: data.distributorId,
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
        salesRepId: data.salesRepId,
        billerId: data.distributorId || 'SB', // Default to SB if somehow not provided
    } as CustomerData
  };
  
  const batch = db.batch();
  batch.set(partyRef, newParty as Party);
  batch.set(accountRef, newAccount);
  batch.set(roleRef, newRole);
  
  await batch.commit();

  // Return a structure that matches what the client expects
  return { account: { party: newParty, account: newAccount, role: newRole }};
}
