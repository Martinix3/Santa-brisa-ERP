/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/accounts/[id]/server-actions.ts
'use server';

import { adminDb } from '@/server/firebase';
import type { Account } from '@/domain/ssot';
import { normalizeStageToSSOT } from '@/lib/stage-utils';
import { revalidatePath } from 'next/cache';

export async function updateAccount(partial: Partial<Account>): Promise<{ success: boolean; message?: string }>{
  try {
    if (!partial?.id) return { success: false, message: 'Falta id' };
    const accountRef = adminDb.collection('accounts').doc(partial.id);

    const now = new Date().toISOString();
    const update: any = { ...partial, updatedAt: now };
    if (partial.stage) update.stage = normalizeStageToSSOT(partial.stage);

    await accountRef.set(update, { merge: true });
    revalidatePath(`/accounts/${partial.id}`);
    revalidatePath('/ventas/pipeline');
    return { success: true };
  } catch (e: any) {
    console.error('[updateAccount] Error:', e);
    return { success: false, message: e?.message || 'Error desconocido' };
  }
}

export async function addAccountNote(accountId: string, text: string): Promise<{ success: boolean; message?: string }>{
  try {
    if (!accountId || !text) return { success: false, message: 'Faltan datos' };
    const noteRef = adminDb.collection('notes').doc();
    await noteRef.set({
      id: noteRef.id,
      text,
      createdAt: new Date().toISOString(),
      accountId,
      derived: { kind: 'NOTA' }
    });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (e: any) {
    console.error('[addAccountNote] Error:', e);
    return { success: false, message: e?.message || 'Error desconocido' };
  }
}

export async function updateContactInfo(
  accountId: string,
  payload: { emails?: string[]; phones?: string[]; vat?: string }
): Promise<{ success: boolean; message?: string }>{
  try {
    const accountRef = adminDb.collection('accounts').doc(accountId);
    const accSnap = await accountRef.get();
    if (!accSnap.exists) return { success: false, message: 'Cuenta no encontrada' };
    const acc = accSnap.data() as any;
    const partyId = acc.partyId;

    if (partyId) {
      const contactRef = adminDb.collection('contacts').doc(partyId);
      const partyRef = adminDb.collection('parties').doc(partyId);

      const [contactSnap, partySnap] = await Promise.all([contactRef.get(), partyRef.get()]);

      if (contactSnap.exists) {
        const emails = (payload.emails || []).filter(Boolean).map(v => ({ value: v }));
        const phones = (payload.phones || []).filter(Boolean).map(v => ({ value: v }));
        await contactRef.set(
          {
            emails: emails.length ? emails : (contactSnap.data()?.emails || []),
            phones: phones.length ? phones : (contactSnap.data()?.phones || []),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      if (partySnap.exists) {
        if (payload.vat) {
          await partyRef.set({ vat: payload.vat, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    } else {
      // Fallback: update deprecated fields on Account
      const update: any = { updatedAt: new Date().toISOString() };
      if (payload.vat) update.vat = payload.vat;
      if (payload.emails && payload.emails.length) update.email = payload.emails[0];
      if (payload.phones && payload.phones.length) update.phone = payload.phones[0];
      await accountRef.set(update, { merge: true });
    }

    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (e: any) {
    console.error('[updateContactInfo] Error:', e);
    return { success: false, message: e?.message || 'Error desconocido' };
  }
}

export async function getAccountDates(accountId: string): Promise<{ success: boolean; data?: Array<{ id: string; label: string; date: string }>; message?: string }>{
  try {
    const snap = await adminDb.collection('accountDates').where('accountId', '==', accountId).get();
    const dates = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
    dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { success: true, data: dates };
  } catch (e: any) {
    console.error('[getAccountDates] Error:', e);
    return { success: false, message: e?.message };
  }
}

export async function addAccountDate(accountId: string, label: string, date: string): Promise<{ success: boolean; message?: string }>{
  try {
    if (!accountId || !label || !date) return { success: false, message: 'Datos incompletos' };
    const ref = adminDb.collection('accountDates').doc();
    await ref.set({ id: ref.id, accountId, label, date, createdAt: new Date().toISOString() });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (e: any) {
    console.error('[addAccountDate] Error:', e);
    return { success: false, message: e?.message };
  }
}
