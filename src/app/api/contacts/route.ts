// /src/app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

type Row = {
  id: string;
  legalName: string;
  tradeName?: string;
  vat?: string;
  city?: string;
  email?: string;
  phone?: string;
  roles: string[];
  holded?: boolean;
  updatedAt?: string;
};

export async function GET() {
  try {
    const qs = await db.collection('parties').limit(1000).get();
    const rows: Row[] = qs.docs.map((d) => {
      const p = d.data() as any;
      const emails: any[] = p.emails ?? [];
      const phones: any[] = p.phones ?? [];
      const contacts: any[] = p.contacts ?? [];   // legacy read-only
      const addr0: any = (p.addresses ?? [])[0] || {};
      const primaryEmail =
        emails.find((e) => e?.isPrimary)?.value ??
        emails[0]?.value ??
        contacts.find((c) => c.type === 'email' && c.isPrimary)?.value ??
        contacts.find((c) => c.type === 'email')?.value;

      const primaryPhone =
        phones.find((t) => t?.isPrimary)?.value ??
        phones[0]?.value ??
        contacts.find((c) => c.type === 'phone' && c.isPrimary)?.value ??
        contacts.find((c) => c.type === 'phone')?.value;

      const city =
        p.billingAddress?.city ?? p.shippingAddress?.city ?? addr0?.city ?? undefined;

      return {
        id: d.id,
        legalName: p.legalName || p.name || '',
        tradeName: p.tradeName || undefined,
        vat: p.vat || p.taxId || undefined,
        city,
        email: primaryEmail,
        phone: primaryPhone,
        roles: p.roles ?? [],
        holded: !!p?.external?.holdedContactId,
        updatedAt: p.updatedAt ?? p.createdAt,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('[api/contacts] error', err);
    return NextResponse.json({ ok: false, error: 'CONTACTS_FETCH_FAILED' }, { status: 500 });
  }
}
