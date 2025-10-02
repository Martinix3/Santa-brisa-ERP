// src/app/(app)/accounts/actions.ts
"use server";
import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import type { Account, Party, PartyRole, CustomerData } from '@/domain/ssot';

export async function createAccount(data: { name: string; ownerId: string; }): Promise<Account> {
  const { name, ownerId } = data;
  if (!name || !ownerId) {
    throw new Error('El nombre y el propietario son obligatorios para crear una cuenta.');
  }

  const now = new Date().toISOString();
  
  // 1. Crear la entidad 'Party' asociada
  const partyRef = db.collection('parties').doc();
  const partyId = partyRef.id;

  const newParty: Partial<Party> = {
      id: partyId,
      name: name,
      kind: 'ORG',
      createdAt: now,
      updatedAt: now,
  };
  
  // 2. Crear la cuenta y vincularla a la Party y al Owner
  const accountRef = db.collection('accounts').doc();
  const newAccount: Account = {
    id: accountRef.id,
    name,
    ownerId,
    partyId,
    stage: 'POTENCIAL', // Un estado por defecto
    segment: 'HORECA',
    flow: 'DIRECT',
    createdAt: now,
    updatedAt: now,
  };

  const roleRef = db.collection('partyRoles').doc();
  const newRole: PartyRole = {
      id: roleRef.id,
      partyId,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: now,
      data: {
          salesRepId: ownerId,
          billerId: 'SB'
      } as CustomerData
  };

  const batch = db.batch();
  batch.set(partyRef, newParty as Party);
  batch.set(accountRef, newAccount);
  batch.set(roleRef, newRole);

  await batch.commit();

  // Revalida los datos para que la UI se actualice en todas partes
  revalidatePath('/agenda'); 
  revalidatePath('/accounts');

  return newAccount;
}

    