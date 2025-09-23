'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/admin';
import type { Party, PartyDuplicate } from '@/domain/ssot';
import { mergeParties } from '@/features/contacts/merge/mergeParties';
import { withDerived } from '@/server/contacts/derive';
import { pullHoldedContacts } from '@/server/integrations/holded/pullContacts';

export async function pullHoldedContactsAction(formData: FormData) {
  try {
    const since = (formData.get('since') as string) || undefined;
    await pullHoldedContacts({ since });
    revalidatePath('/contacts');
    return { ok: true };
  } catch (err: any) {
    console.error('[pullHoldedContactsAction] error', err);
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function pushPartyToHoldedAction(partyId: string) {
  const snap = await db.collection('parties').doc(partyId).get();
  if (!snap.exists) throw new Error('Party not found');
  const party = { id: snap.id, ...(snap.data() as any) } as Party;
  const { ensureHoldedContact, updateHoldedContact } = await import('@/server/integrations/holded/pushContact');
  if (!party.external?.holdedContactId) {
    const { id } = await ensureHoldedContact(party);
    await db.collection('parties').doc(party.id).set({ external: { ...(party.external ?? {}), holdedContactId: id } }, { merge: true });
  } else {
    await updateHoldedContact(party);
  }
  revalidatePath('/contacts');
}

export async function mergePartyDuplicateAction(dupId: string) {
  const dupSnap = await db.collection('partyDuplicates').doc(dupId).get();
  if (!dupSnap.exists) throw new Error('Duplicate not found');
  const dup = { id: dupSnap.id, ...(dupSnap.data() as any) } as PartyDuplicate;

  const [primarySnap, duplicateSnap] = await Promise.all([
    db.collection('parties').doc(dup.primaryPartyId).get(),
    db.collection('parties').doc(dup.duplicatePartyId).get(),
  ]);
  if (!primarySnap.exists || !duplicateSnap.exists) throw new Error('Party not found');

  const primary = { id: primarySnap.id, ...(primarySnap.data() as any) } as Party;
  const duplicate = { id: duplicateSnap.id, ...(duplicateSnap.data() as any) } as Party;

  const merged = withDerived(mergeParties(primary, duplicate));

  const batch = db.batch();
  // 1) Actualiza la party ganadora
  batch.set(db.collection('parties').doc(primary.id), merged, { merge: true });

  // 2) Reasignar referencias partyId en colecciones
  const collPartyField: Array<{ name: string; field: string }> = [
    { name: 'accounts', field: 'partyId' },
    { name: 'ordersSellOut', field: 'partyId' },
    { name: 'interactions', field: 'partyId' },
    { name: 'shipments', field: 'partyId' },
    { name: 'goodsReceipts', field: 'supplierPartyId' },
    { name: 'financeLinks', field: 'partyId' },
    { name: 'incidents', field: 'partyId' },
  ];

  for (const { name, field } of collPartyField) {
    const qs = await db.collection(name).where(field, '==', duplicate.id).get();
    qs.forEach(doc => batch.update(doc.ref, { [field]: primary.id }));
  }

  // 3) Marca el duplicate como MERGED y borra la party duplicada
  batch.update(db.collection('partyDuplicates').doc(dup.id), { status: 'MERGED', resolvedAt: new Date().toISOString() });
  batch.delete(db.collection('parties').doc(duplicate.id));

  await batch.commit();
  revalidatePath('/contacts');
  revalidatePath('/contacts/merge');
}