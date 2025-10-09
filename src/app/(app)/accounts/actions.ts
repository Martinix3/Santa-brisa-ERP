// src/app/(app)/accounts/actions.ts
"use server";
import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import type { Account } from '@/domain/ssot.v7';

export async function createAccount(data: { name: string; salesRepId: string; }): Promise<Account> {
  const { name, salesRepId } = data;
  if (!name || !salesRepId) {
    throw new Error('El nombre y el representante de ventas son obligatorios para crear una cuenta.');
  }

  const now = new Date().toISOString();
  
  // Crear la cuenta según SSOT v7
  const accountRef = db.collection('accounts').doc();
  const newAccount: Account = {
    id: accountRef.id,
    name,
    segment: 'HORECA',
    stage: 'POTENCIAL',
    salesRepId,  // ✅ Campo correcto en v7 (antes era ownerId)
    channels: ['HORECA'],  // ✅ Campo requerido en v7
    commercialFlow: 'DIRECTA',  // ✅ Campo correcto en v7 (antes era flow: 'DIRECT')
    createdAt: now,
    updatedAt: now,
    createdBy: salesRepId,
  };

  await accountRef.set(newAccount);

  // Revalida los datos para que la UI se actualice en todas partes
  revalidatePath('/agenda'); 
  revalidatePath('/accounts');

  return newAccount;
}
