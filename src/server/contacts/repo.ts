
'use server';
import { db } from '@/lib/firebase/admin';
import type { Party } from '@/domain/ssot';

export async function findPartyByVat(vat: string) {
  const snap = await db.collection('parties').where('vat','==',vat).limit(1).get();
  return snap.empty ? undefined : ({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as Party);
}

export async function findPartiesByPhone(phone: string) {
  const qs = await db.collection('parties').where('phones.value','==',phone).limit(10).get();
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Party));
}

export async function findPartiesByEmail(email: string) {
  const qs = await db.collection('parties').where('emails.value','==',email).limit(10).get();
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Party));
}

export async function searchPartiesByNameNorm(prefix: string) {
  const start = prefix.toLowerCase();
  const end = start + '\uf8ff';
  const qs = await db.collection('parties').orderBy('nameNorm').startAt(start).endAt(end).limit(25).get();
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Party));
}
