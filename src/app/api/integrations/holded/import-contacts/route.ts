
// src/app/api/integrations/holded/import-contacts/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { fetchContacts } from '@/features/integrations/holded/service';
import type { Account, SantaData } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getContactUniqueKey = (contact: any): string => {
  const cif = (contact.code || '').trim().toUpperCase();
  if (cif && cif.length > 5) {
    return cif;
  }
  return (contact.name || '').trim().toLowerCase();
};

export async function POST(req: Request) {
  const db = adminDb();
  
  try {
    const secretsSnap = await db.collection('dev-secrets').doc('holded').get();
    const holdedApiKey = secretsSnap.data()?.apiKey;

    if (!holdedApiKey) {
      return NextResponse.json({ error: 'La API Key de Holded no está configurada.' }, { status: 400 });
    }

    const holdedContacts = await fetchContacts(holdedApiKey);
    const accountsSnapshot = await db.collection('accounts').get();
    const existingAccounts: Account[] = accountsSnapshot.docs.map(doc => doc.data() as Account);
    
    const accountsByCif = new Map<string, Account>();
    const accountsByName = new Map<string, Account>();
    existingAccounts.forEach(acc => {
      if (acc.cif) accountsByCif.set(acc.cif.trim().toUpperCase(), acc);
      accountsByName.set(acc.name.trim().toLowerCase(), acc);
    });

    // Limpiar staging area anterior
    const oldStaged = await db.collection('staged_imports').get();
    const deleteBatch = db.batch();
    oldStaged.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    
    const importBatch = db.batch();
    let toCreateCount = 0;
    let toUpdateCount = 0;
    const importId = `holded_${new Date().getTime()}`;

    for (const contact of holdedContacts) {
      if (!contact.name) continue;

      const contactCif = (contact.code || '').trim().toUpperCase();
      let existingAccount: Account | undefined = undefined;

      if (contactCif) existingAccount = accountsByCif.get(contactCif);
      if (!existingAccount) existingAccount = accountsByName.get(contact.name.trim().toLowerCase());
      
      const proposedData: Partial<Account> = {
        name: contact.name,
        cif: contact.code || undefined,
        address: contact.billAddress?.address || undefined,
        city: contact.billAddress?.city || undefined,
        phone: contact.phone || undefined,
        type: 'HORECA',
        stage: 'POTENCIAL',
        ownerId: 'u_admin', 
        billerId: 'SB',
      };
      
      const docRef = db.collection('staged_imports').doc();
      if (existingAccount) {
        importBatch.set(docRef, {
            importId,
            type: 'update',
            existingAccountId: existingAccount.id,
            proposedData,
            status: 'pending'
        });
        toUpdateCount++;
      } else {
        importBatch.set(docRef, {
            importId,
            type: 'create',
            proposedData,
            status: 'pending'
        });
        toCreateCount++;
      }
    }

    await importBatch.commit();
    await db.collection('dev-secrets').doc('holded').set({ lastContactSyncAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({
      ok: true,
      importId,
      message: `Análisis completado. Listos para importar.`,
      toCreate: toCreateCount,
      toUpdate: toUpdateCount,
      // Devuelve la URL de revisión para el DataViewer
      reviewUrl: `/dev/data-viewer?reviewImportId=${importId}`
    });

  } catch (error: any) {
    console.error('[Holded Import Contacts Error]', error);
    return NextResponse.json({ error: 'Fallo al importar contactos de Holded.', details: error.message }, { status: 500 });
  }
}
