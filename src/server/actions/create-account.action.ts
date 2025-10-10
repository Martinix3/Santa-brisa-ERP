// src/server/actions/create-account.action.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Account } from '@/domain/ssot';

// Tipos temporales
type Segment = 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'PRIVADA' | 'ONLINE' | 'OTRO';

export async function createAccountAndParty(data: { name: string; city?: string; type?: Segment; ownerId: string; distributorId?: string }) {
  const now = new Date().toISOString();
  
  const partyRef = db.collection('parties').doc();
  const newParty: any = {
    id: partyRef.id,
    name: data.name,
    kind: 'ORG',
    createdAt: now,
    updatedAt: now,
  };
  
  const accountRef = db.collection('accounts').doc();
  const newAccount: any = {
    id: accountRef.id,
    partyId: partyRef.id,
    name: data.name,
    accountType: (data.type as any) || 'HORECA',
    stage: 'POTENCIAL',
    accountStage: 'POTENCIAL',
    commercialFlow: 'PLACEMENT',
    ownerId: data.ownerId,
    distributorId: data.distributorId,
    createdAt: now,
    updatedAt: now,
  };
  
  const batch = db.batch();
  batch.set(partyRef, newParty as Party);
  batch.set(accountRef, newAccount);
  
  await batch.commit();

  // Return a structure that matches what the client expects
  return { account: { party: newParty, account: newAccount }};
}
