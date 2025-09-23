
// /src/app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { getServerData } from '@/lib/dataprovider/server'; 
import type { Party, SantaData } from '@/domain/ssot';

async function getMany<T>(collection: keyof SantaData): Promise<T[]> {
    const data = await getServerData();
    return (data[collection] as T[]) || [];
}

export async function GET() {
  try {
    // Trae Parties (clientes, proveedores, etc.). Filtra aquí si quieres solo visibles.
    const parties = await getMany<Party>('parties');

    // Mapea a una lista de "contactos" segura, sin asumir arrays
    const rows = (parties ?? []).map(p => {
      const emails = (p.emails ?? []);
      const phones = (p.phones ?? []);
      const contacts = (p.contacts ?? []);          // legacy
      const addresses = (p.addresses ?? []);        // legacy
      const addr0 = addresses[0] as any || {};
      const mainLegacy = contacts.find(c => c.isPrimary) as any || {};

      return {
        id: p.id,
        legalName: p.legalName || p.name || '',
        tradeName: p.tradeName || undefined,
        vat: p.vat || p.taxId || undefined,
        // “principal” por preferencia: emails/phones modernos → fallback legacy
        email: emails.find(e => e.isPrimary)?.value || emails[0]?.value || (mainLegacy.type === 'email' ? mainLegacy.value : undefined),
        phone: phones.find(p => p.isPrimary)?.value || phones[0]?.value || (mainLegacy.type === 'phone' ? mainLegacy.value : undefined),
        city: addr0?.city || undefined,
        roles: p.roles || [],
        updatedAt: p.updatedAt ?? p.createdAt,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('[api/contacts] error', err);
    return NextResponse.json({ ok: false, error: 'CONTACTS_FETCH_FAILED' }, { status: 500 });
  }
}
