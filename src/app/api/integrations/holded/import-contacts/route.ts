
// src/app/api/integrations/holded/import-contacts/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { fetchContacts } from '@/features/integrations/holded/service';
import type { Account, Party } from '@/domain/ssot';

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
  const db = adminDb;
  
  try {
    const holdedApiKey = process.env.HOLDED_API_KEY;

    if (!holdedApiKey) {
      return NextResponse.json({ error: 'La API Key de Holded no está configurada en el archivo .env.' }, { status: 400 });
    }

    const holdedContacts = await fetchContacts(holdedApiKey);
    const partiesSnapshot = await db.collection('parties').get();
    const existingParties: Party[] = partiesSnapshot.docs.map(doc => doc.data() as Party);
    
    const partiesByTaxId = new Map<string, Party>();
    const partiesByName = new Map<string, Party>();
    existingParties.forEach(p => {
      if (p.taxId?.trim()) partiesByTaxId.set(p.taxId.trim().toUpperCase(), p);
      partiesByName.set(p.name.trim().toLowerCase(), p);
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

      const contactTaxId = (contact.code || '').trim().toUpperCase();
      let existingParty: Party | undefined = undefined;

      if (contactTaxId) existingParty = partiesByTaxId.get(contactTaxId);
      if (!existingParty) existingParty = partiesByName.get(contact.name.trim().toLowerCase());
      
      const proposedData: Partial<Party> = {
        name: contact.name,
        taxId: contact.code || undefined,
        addresses: contact.billAddress ? [{
            type: 'billing',
            street: contact.billAddress.address,
            city: contact.billAddress.city,
            postalCode: contact.billAddress.postalCode,
            country: contact.billAddress.country,
        }] : [],
        contacts: contact.phone ? [{ type: 'phone', value: contact.phone, isPrimary: true, description: 'Principal' }] : [],
        kind: 'ORG',
      };
      
      const docRef = db.collection('staged_imports').doc();
      if (existingParty) {
        importBatch.set(docRef, {
            importId,
            type: 'update_party',
            existingPartyId: existingParty.id,
            proposedData,
            status: 'pending'
        });
        toUpdateCount++;
      } else {
        importBatch.set(docRef, {
            importId,
            type: 'create_party_and_account',
            proposedData,
            status: 'pending'
        });
        toCreateCount++;
      }
    }

    await importBatch.commit();
    
    try {
      await db.collection('dev-metadata').doc('integrations').set({ holded: { lastContactSyncAt: new Date().toISOString() } }, { merge: true });
    } catch (e) {
      console.warn("Could not save last sync time for Holded contacts.", e);
    }


    return NextResponse.json({
      ok: true,
      importId,
      message: `Análisis completado. Listos para importar.`,
      toCreate: toCreateCount,
      toUpdate: toUpdateCount,
      reviewUrl: `/dev/data-viewer?reviewImportId=${importId}`
    });

  } catch (error: any) {
    console.error('[Holded Import Contacts Error]', error);
    return NextResponse.json({ error: 'Fallo al importar contactos de Holded.', details: error.message }, { status: 500 });
  }
}
