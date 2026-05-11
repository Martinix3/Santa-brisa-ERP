/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/holded/normalize.ts
type AnyObj = Record<string, any>;

export function normStr(v: any) {
  return (typeof v === 'string' ? v.trim() : '') || undefined;
}

export function normPhone(v: any) {
  const s = (v ?? '').toString();
  const digits = s.replace(/\D/g, '');
  return digits ? digits : undefined;
}

export type NormalizedAddress = {
  kind: 'BILLING' | 'SHIPPING' | 'OTHER';
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  attention?: string;
  phone?: string;
  email?: string;
};

function pickAddressLike(o: AnyObj): Omit<NormalizedAddress, 'kind'> {
  return {
    street: normStr(o.address) ?? normStr(o.street) ?? normStr(o.line1),
    city: normStr(o.city),
    province: normStr(o.state) ?? normStr(o.province),
    postalCode: normStr(o.zip) ?? normStr(o.postalCode),
    country: normStr(o.country),
    countryCode: normStr(o.countryCode) ?? normStr(o.country_iso2) ?? normStr(o.country_iso3),
    attention: normStr(o.attention) ?? normStr(o.contactName),
    phone: normPhone(o.phone) ?? normPhone(o.mobile),
    email: normStr(o.email),
  };
}

export function normalizeHoldedAddresses(contact: AnyObj): NormalizedAddress[] {
  const out: NormalizedAddress[] = [];
  
  // 1) Address principal del contacto
  const cAddr = pickAddressLike(contact);
  if (Object.values(cAddr).some(Boolean)) {
    out.push({ kind: 'OTHER', ...cAddr });
  }

  // 2) Array genérico de direcciones en el contacto (si existe)
  const arr: AnyObj[] = Array.isArray(contact.addresses) ? contact.addresses : [];
  for (const a of arr) {
    const base = pickAddressLike(a);
    const kindRaw = normStr(a.type) ?? normStr(a.kind) ?? '';
    const kind = kindRaw.toUpperCase().includes('BILL') ? 'BILLING'
               : kindRaw.toUpperCase().includes('SHIP') ? 'SHIPPING'
               : 'OTHER';
    if (Object.values(base).some(Boolean)) {
      out.push({ kind, ...base });
    }
  }

  // 3) Dedup por (kind, street, city, zip)
  const seen = new Set<string>();
  return out.filter(a => {
    const key = [a.kind, a.street, a.city, a.postalCode].map((v: any) => (v||'').toLowerCase()).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildEmails(contact: AnyObj): string[] {
  const e = new Set<string>();
  const main = normStr(contact.email);
  if (main) e.add(main.toLowerCase());
  if (Array.isArray(contact.emails)) {
    for (const it of contact.emails) {
      const v = normStr(it?.email ?? it);
      if (v) e.add(v.toLowerCase());
    }
  }
  return Array.from(e);
}

export function buildPhones(contact: AnyObj): string[] {
  const p = new Set<string>();
  const main = normPhone(contact.phone);
  if (main) p.add(main);
  for (const k of ['mobile', 'phone2', 'fax']) {
    const v = normPhone(contact[k]);
    if (v) p.add(v);
  }
  if (Array.isArray(contact.phones)) {
    for (const it of contact.phones) {
      const v = normPhone(it?.phone ?? it);
      if (v) p.add(v);
    }
  }
  return Array.from(p);
}

export function trimRaw(obj: AnyObj, maxBytes = 32_000) {
  try {
    const raw = JSON.stringify(obj);
    if (raw.length <= maxBytes) return obj;
    // Si pesa mucho, recorta arrays grandes
    const clone = { ...obj };
    for (const k of Object.keys(clone)) {
      if (Array.isArray(clone[k]) && clone[k].length > 20) {
        clone[k] = clone[k].slice(0, 20);
      }
    }
    return clone;
  } catch {
    return undefined;
  }
}
