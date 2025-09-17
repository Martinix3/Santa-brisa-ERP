
// src/app/api/integrations/holded/import-contacts/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { fetchContacts } from '@/features/integrations/holded/service';
import type { Account, SantaData } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper para obtener una clave única para un contacto (CIF/NIF o nombre normalizado)
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
    // 1. Obtener la API key de Holded (asumimos que está guardada en una colección de configuración)
    // Para esta demo, la leemos de una colección 'secrets' no segura. ¡NO HACER ESTO EN PRODUCCIÓN!
    const secretsSnap = await db.collection('dev-secrets').doc('holded').get();
    const holdedApiKey = secretsSnap.data()?.apiKey;

    if (!holdedApiKey) {
      return NextResponse.json({ error: 'La API Key de Holded no está configurada.' }, { status: 400 });
    }

    // 2. Obtener todos los contactos de Holded
    const holdedContacts = await fetchContacts(holdedApiKey);

    // 3. Obtener todas las cuentas existentes de nuestra BD
    const accountsSnapshot = await db.collection('accounts').get();
    const existingAccounts: Account[] = accountsSnapshot.docs.map(doc => doc.data() as Account);
    
    // Crear un mapa para búsqueda rápida por CIF/NIF o nombre
    const accountsByCif = new Map<string, Account>();
    const accountsByName = new Map<string, Account>();
    existingAccounts.forEach(acc => {
      if (acc.cif) {
        accountsByCif.set(acc.cif.trim().toUpperCase(), acc);
      }
      accountsByName.set(acc.name.trim().toLowerCase(), acc);
    });

    let createdCount = 0;
    let updatedCount = 0;
    const batch = db.batch();

    // 4. Procesar cada contacto de Holded
    for (const contact of holdedContacts) {
      if (!contact.name) continue;

      const contactCif = (contact.code || '').trim().toUpperCase();
      let existingAccount: Account | undefined = undefined;

      // Buscar por CIF primero, luego por nombre
      if (contactCif) {
        existingAccount = accountsByCif.get(contactCif);
      }
      if (!existingAccount) {
        existingAccount = accountsByName.get(contact.name.trim().toLowerCase());
      }
      
      const accountData: Partial<Account> = {
        name: contact.name,
        cif: contact.code || undefined,
        address: contact.billAddress?.address || undefined,
        city: contact.billAddress?.city || undefined,
        phone: contact.phone || undefined,
        // Asignaciones por defecto para nuevos contactos
        type: 'HORECA',
        stage: 'POTENCIAL',
        ownerId: 'u_admin', // Asignar a un usuario por defecto
        billerId: 'SB',
      };

      if (existingAccount) {
        // Actualizar cuenta existente
        const accountRef = db.collection('accounts').doc(existingAccount.id);
        batch.update(accountRef, {
            // Solo actualizamos campos si vienen de Holded, no sobreescribimos los importantes
            name: accountData.name,
            cif: accountData.cif || existingAccount.cif,
            address: accountData.address || existingAccount.address,
            city: accountData.city || existingAccount.city,
            phone: accountData.phone || existingAccount.phone,
            updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        // Crear cuenta nueva
        const newId = db.collection('accounts').doc().id;
        const newAccountRef = db.collection('accounts').doc(newId);
        const newAccount: Account = {
            id: newId,
            createdAt: new Date().toISOString(),
            ...accountData,
        } as Account;
        batch.set(newAccountRef, newAccount);
        createdCount++;
      }
    }

    // 5. Ejecutar la escritura en lote
    await batch.commit();

    // Opcional: Actualizar la fecha del último sync
    await db.collection('dev-secrets').doc('holded').set({ lastContactSyncAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({
      ok: true,
      message: `Importación completada. Cuentas creadas: ${createdCount}, actualizadas: ${updatedCount}.`,
      created: createdCount,
      updated: updatedCount,
    });

  } catch (error: any) {
    console.error('[Holded Import Contacts Error]', error);
    return NextResponse.json({ error: 'Fallo al importar contactos de Holded.', details: error.message }, { status: 500 });
  }
}
