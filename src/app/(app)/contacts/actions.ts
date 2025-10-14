'use server';

import { adminDb } from '@/server/firebase';
import { FieldPath } from 'firebase-admin/firestore';

// ============================================================================
// ADAPTERS UNIVERSALES (Normalizan legacy → canon)
// ============================================================================

function normalizeOriginType(doc: any): ContactOriginType {
  const roles: string[] = doc.roles || [];
  const segment = doc.customer?.segment;
  
  if (roles.includes('SUPPLIER')) return 'supplier';
  if (roles.includes('CUSTOMER') || segment === 'ONLINE') return 'customer';
  return 'client';
}

function normalizeStage(x?: string): string | undefined {
  if (!x) return undefined;
  
  const stageMap: Record<string, string> = {
    'CLOSED_WON': 'ACTIVA',
    'CLOSED_LOST': 'FALLIDA',
    'CONTACTED': 'POTENCIAL',
    'QUALIFYING': 'SEGUIMIENTO',
    'PROPOSAL': 'ACTIVA',
    'NEGOTIATION': 'ACTIVA',
    // Legacy string stages
    'Potencial': 'POTENCIAL',
    'Activa': 'ACTIVA',
    'Fallida': 'FALLIDA',
  };
  
  return stageMap[x] || x; // Si ya es canónico, pasa tal cual
}

function normalizePlacement(x?: string): 'DIRECT' | 'PLACEMENT' | undefined {
  if (!x) return undefined;
  if (x === 'COLOCACION') return 'PLACEMENT';
  if (x === 'DIRECTA') return 'DIRECT';
  if (x === 'DIRECT') return 'DIRECT';
  if (x === 'PLACEMENT') return 'PLACEMENT';
  return undefined; // Valores desconocidos
}

function firstEmail(doc: any): string | null {
  const primary = doc.emails?.find((e: any) => e.isPrimary);
  return primary?.value || doc.emails?.[0]?.value || null;
}

function firstPhone(doc: any): string | null {
  const primary = doc.phones?.find((p: any) => p.isPrimary);
  return primary?.value || doc.phones?.[0]?.value || null;
}

function cityFromAddresses(doc: any): string | null {
  const billing = doc.addresses?.find((a: any) => a.kind === 'billing');
  return billing?.city || doc.addresses?.[0]?.city || null;
}

function provinceFromAddresses(doc: any): string | null {
  const billing = doc.addresses?.find((a: any) => a.kind === 'billing');
  return billing?.province || doc.addresses?.[0]?.province || null;
}

// Adapter para lista (ContactRow) - NO exportar (helper interno)
function toContactRow(doc: any): ContactRow {
  return {
    id: doc.id,
    name: doc.displayName || doc.legalName || doc.tradeName || '(Sin nombre)',
    originType: normalizeOriginType(doc),
    segment: doc.customer?.segment || null,
    city: cityFromAddresses(doc) || null,
    province: provinceFromAddresses(doc) || null,
    email: firstEmail(doc) || null,
    phone: firstPhone(doc) || null,
    cif: doc.vat || null,
    tags: doc.tags || [],
  };
}

// Adapter para detalle (normaliza para vista de detalle) - NO exportar (helper interno)
function toContactDetail(doc: any) {
  return {
    id: doc.id,
    name: doc.displayName || doc.legalName || '',
    tradeName: doc.tradeName || null,
    cif: doc.vat || null,
    email: firstEmail(doc) || null,
    phone: firstPhone(doc) || null,
    mobile: doc.phones?.find((p: any) => p.kind === 'mobile')?.value || null,
    originType: normalizeOriginType(doc),
    segment: doc.customer?.segment || null,
    stage: normalizeStage(doc.stage || doc.customer?.stage) || null,
    ownerId: doc.customer?.ownerId || doc.salesRepId || null,
    distributorPartyId: doc.customer?.distributorId || null,
    ownerName: doc.customer?.ownerName || null,
    flow: normalizePlacement(doc.customer?.placement || doc.placement) || 'DIRECT',
    category: doc.category || null,
    billingAddress: doc.addresses?.[0] ? {
      street: doc.addresses[0].street,
      city: doc.addresses[0].city,
      zip: doc.addresses[0].postalCode,
      postalCode: doc.addresses[0].postalCode,
      province: doc.addresses[0].province,
      country: doc.addresses[0].countryCode === 'ES' ? 'España' : doc.addresses[0].countryCode,
    } : null,
    website: doc.links?.website || null,
    externalIds: doc.externalRefs || {},
    tags: doc.tags || [],
    createdAt: doc.createdAt || null,
    // Campos raw para edición
    customer: {
      segment: doc.customer?.segment,
      stage: normalizeStage(doc.stage || doc.customer?.stage),
      placement: normalizePlacement(doc.customer?.placement || doc.placement),
      ownerId: doc.customer?.ownerId || doc.salesRepId,
      distributorId: doc.customer?.distributorId,
    },
    emails: Array.isArray(doc.emails) ? doc.emails : [],
    phones: Array.isArray(doc.phones) ? doc.phones : [],
    addresses: Array.isArray(doc.addresses) ? doc.addresses : [],
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type ContactType = 'client' | 'supplier' | 'customer' | 'all';
export type ContactOriginType = 'client' | 'supplier' | 'customer';

export type ContactsFilters = {
  type?: ContactType;
  segment?: string | 'all';
  city?: string | 'all';
  q?: string;
  pageSize?: number;
  cursor?: { nameLower: string; id: string } | null;
};

export type ContactRow = {
  id: string;
  name: string;
  originType: ContactOriginType;
  segment?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  cif?: string | null;
  tags?: string[];
};

// ============================================================================
// LIST CONTACTS (Busca en parties)
// ============================================================================

export async function listContacts(filters: ContactsFilters) {
  const search = (filters.q ?? '').trim().toLowerCase();
  
  // Query contacts collection con filtro ORG
  let query = adminDb.collection('contacts')
    .where('kind', '==', 'ORG')
    .limit(500);
  
  const contactsSnap = await query.get();
  console.log('[listContacts] Found', contactsSnap.size, 'ORG contacts');
  
  // Mapear todos usando el adapter universal
  const allResults: ContactRow[] = contactsSnap.docs.map(d => 
    toContactRow({ id: d.id, ...d.data() })
  );
  
  // Filtrar en memoria
  let results = allResults.filter(r => {
    // Filtro por tipo (originType)
    if (filters.type && filters.type !== 'all' && r.originType !== filters.type) {
      return false;
    }
    
    // Filtro segment
    if (filters.segment && filters.segment !== 'all' && r.segment !== filters.segment) {
      return false;
    }
    
    // Filtro city
    if (filters.city && filters.city !== 'all' && r.city !== filters.city) {
      return false;
    }
    
    // Búsqueda por nombre, NIF, email, phone o ciudad
    if (search) {
      const hay = [
        r.name,
        r.cif,
        r.email,
        r.phone,
        r.city
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!hay.includes(search)) {
        return false;
      }
    }
    
    return true;
  });

  // Ordenar por nombre
  results.sort((a, b) => a.name.localeCompare(b.name));

  // Retornar sin paginación (simplificado)
  return { rows: results, nextCursor: null, hasMore: false };
}

// ============================================================================
// GET CONTACT DETAIL
// ============================================================================

export async function getContactDetail(id: string) {
  const doc = await adminDb.collection('contacts').doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  // Cargar historial de actividad de múltiples colecciones (sin orderBy para evitar índices)
  const [interactionsSnap, ordersSnap, eventsSnap, posSnap] = await Promise.all([
    adminDb.collection('interactions').where('accountId', '==', id).get(),
    adminDb.collection('ordersSellOut').where('accountId', '==', id).get(),
    adminDb.collection('marketingEvents').where('accountId', '==', id).get(),
    adminDb.collection('posTactics').where('accountId', '==', id).get(),
  ]);
  
  // Mapear a formato timeline con 2 columnas
  const history: Array<{ 
    type: string; 
    detail: string; 
    dateCreated: string; 
    dateScheduled?: string;
    createdAt: string;
  }> = [];
  
  interactionsSnap.docs.forEach(d => {
    const data = d.data();
    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    }) : undefined;
    
    history.push({
      type: 'Visita',
      detail: data.note || '',
      dateCreated: data.createdAt || data.date,
      dateScheduled: scheduledDate,
      createdAt: data.createdAt || data.date,
    });
  });
  
  ordersSnap.docs.forEach(d => {
    const data = d.data();
    const total = data.totalAmount || 0;
    const lines = data.lines || [];
    const cajas = lines.reduce((sum: number, line: any) => {
      const qty = line.quantity || 0;
      const unitsPerCase = 6; // Default
      return sum + Math.ceil(qty / unitsPerCase);
    }, 0);
    
    history.push({
      type: 'Pedido',
      detail: `${total.toFixed(2)}€ (${cajas} cajas)`,
      dateCreated: data.createdAt || data.date,
      createdAt: data.createdAt || data.date,
    });
  });
  
  eventsSnap.docs.forEach(d => {
    const data = d.data();
    const eventType = data.type || 'Marketing';
    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    }) : undefined;
    
    history.push({
      type: `Evento: ${eventType}`,
      detail: data.note || '',
      dateCreated: data.createdAt || data.date,
      dateScheduled: scheduledDate,
      createdAt: data.createdAt || data.date,
    });
  });
  
  posSnap.docs.forEach(d => {
    const data = d.data();
    const tacticType = data.description || 'Material POS';
    
    history.push({
      type: 'Táctica POS',
      detail: tacticType,
      dateCreated: data.createdAt || data.date,
      createdAt: data.createdAt || data.date,
    });
  });
  
  // Ordenar por fecha descendente
  history.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
  
  // Formatear fecha de creación
  history.forEach(item => {
    const date = new Date(item.dateCreated);
    item.dateCreated = date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  });
  
  // Usar adapter universal para normalizar + añadir history
  return {
    ...toContactDetail({ id: doc.id, ...doc.data() }),
    history: history.slice(0, 20), // Limitar a 20 más recientes
  };
}

// ============================================================================
// DETECT DUPLICATES
// ============================================================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

export async function detectDuplicates() {
  // Get all contacts from parties, customers and suppliers
  const [partiesSnap, customersSnap, suppliersSnap] = await Promise.all([
    adminDb.collection('parties').get(),
    adminDb.collection('customers').get(),
    adminDb.collection('suppliers').get(),
  ]);
  
  const accounts = [
    ...partiesSnap.docs.map(d => ({ 
      id: d.id, 
      collection: 'parties',
      ...d.data() 
    })),
    ...customersSnap.docs.map(d => ({ 
      id: d.id,
      collection: 'customers',
      name: d.data().name || `${d.data().firstName} ${d.data().lastName}`,
      ...d.data() 
    })),
    ...suppliersSnap.docs.map(d => ({ 
      id: d.id,
      collection: 'suppliers',
      ...d.data() 
    })),
  ] as any[];

  const groups: Array<{
    accounts: any[];
    reason: string;
    confidence: number;
  }> = [];

  const processed = new Set<string>();

  for (let i = 0; i < accounts.length; i++) {
    if (processed.has(accounts[i].id)) continue;

    const duplicates: any[] = [accounts[i]];
    let reason = '';
    let confidence = 0;

    for (let j = i + 1; j < accounts.length; j++) {
      if (processed.has(accounts[j].id)) continue;

      const acc1 = accounts[i];
      const acc2 = accounts[j];

      // Check same VAT/NIF
      if (acc1.vat && acc2.vat && acc1.vat === acc2.vat) {
        duplicates.push(acc2);
        reason = 'Mismo NIF/CIF';
        confidence = 1.0;
        processed.add(acc2.id);
        continue;
      }

      // Check exact name match
      if (acc1.name.toLowerCase() === acc2.name.toLowerCase()) {
        duplicates.push(acc2);
        reason = 'Mismo nombre exacto';
        confidence = 0.95;
        processed.add(acc2.id);
        continue;
      }

      // Check similar name (>85% similarity)
      const nameSimilarity = similarity(acc1.name, acc2.name);
      if (nameSimilarity > 0.85) {
        // Additional check: same city
        if (
          acc1.billingAddress?.city &&
          acc2.billingAddress?.city &&
          acc1.billingAddress.city === acc2.billingAddress.city
        ) {
          duplicates.push(acc2);
          reason = `Nombre similar (${Math.round(nameSimilarity * 100)}%) + misma ciudad`;
          confidence = nameSimilarity;
          processed.add(acc2.id);
        }
      }
    }

    if (duplicates.length > 1) {
      groups.push({ accounts: duplicates, reason, confidence });
      processed.add(accounts[i].id);
    }
  }

  return groups;
}

// ============================================================================
// MERGE ACCOUNTS
// ============================================================================

export async function mergeAccounts(keepId: string, mergeIds: string[]) {
  const batch = adminDb.batch();

  // Update orders
  const ordersSnap = await adminDb.collection('ordersSellOut')
    .where('accountId', 'in', mergeIds)
    .get();
  
  ordersSnap.docs.forEach(doc => {
    batch.update(doc.ref, { accountId: keepId });
  });

  // Update interactions
  const interactionsSnap = await adminDb.collection('interactions')
    .where('accountId', 'in', mergeIds)
    .get();
  
  interactionsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { accountId: keepId });
  });

  // Update shipments
  const shipmentsSnap = await adminDb.collection('shipments')
    .where('accountId', 'in', mergeIds)
    .get();
  
  shipmentsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { accountId: keepId });
  });

  // Delete merged accounts
  mergeIds.forEach(id => {
    batch.delete(adminDb.collection('parties').doc(id));
  });

  await batch.commit();

  return {
    success: true,
    keptId: keepId,
    merged: mergeIds.length,
    ordersUpdated: ordersSnap.size,
    interactionsUpdated: interactionsSnap.size,
    shipmentsUpdated: shipmentsSnap.size,
  };
}

// ============================================================================
// GEOCODE ADDRESSES
// ============================================================================

export async function geocodeAddresses(accountIds: string[]) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const results = {
    success: 0,
    failed: [] as Array<{ id: string; error: string }>,
    enriched: [] as Array<{ id: string; location: { lat: number; lng: number } }>,
  };

  for (const id of accountIds) {
    const doc = await adminDb.collection('parties').doc(id).get();
    if (!doc.exists) {
      results.failed.push({ id, error: 'Account not found' });
      continue;
    }

    const account = doc.data() as any;
    const addr = account.billingAddress;
    
    if (!addr?.street || !addr?.city) {
      results.failed.push({ id, error: 'Dirección incompleta' });
      continue;
    }

    try {
      const query = `${addr.street}, ${addr.zip || addr.postalCode || ''} ${addr.city}, ${addr.country || 'España'}`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`;

      const response = await fetch(url);
      const geocodeData = await response.json();

      if (geocodeData.status === 'OK' && geocodeData.results[0]) {
        const result = geocodeData.results[0];
        const location = result.geometry.location;

        // Extract address components
        const getComponent = (type: string) => {
          const component = result.address_components.find((c: any) =>
            c.types.includes(type)
          );
          return component?.long_name || '';
        };

        // Update account
        await adminDb.collection('parties').doc(id).update({
          location: {
            lat: location.lat,
            lng: location.lng,
            address: result.formatted_address,
          },
          billingAddress: {
            street: getComponent('route') || addr.street,
            city: getComponent('locality') || addr.city,
            zip: getComponent('postal_code') || addr.zip || addr.postalCode || '',
            postalCode: getComponent('postal_code') || addr.zip || addr.postalCode,
            province: getComponent('administrative_area_level_2') || addr.province,
            country: getComponent('country') || addr.country || 'España',
            countryCode: result.address_components.find((c: any) =>
              c.types.includes('country')
            )?.short_name,
          },
          updatedAt: new Date().toISOString(),
        });

        results.success++;
        results.enriched.push({ id, location });
      } else {
        results.failed.push({ id, error: geocodeData.status });
      }
    } catch (error: any) {
      results.failed.push({ id, error: error.message });
    }

    // Rate limiting (50 req/s allowed by Google)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return results;
}

// ============================================================================
// BULK UPDATE
// ============================================================================

export async function bulkUpdateContacts(params: {
  ids: string[];
  updates: {
    segment?: string;
    city?: string;
    originType?: ContactOriginType;
  };
}) {
  const { ids, updates } = params;
  const batch = adminDb.batch();
  
  for (const id of ids) {
    const contactRef = adminDb.collection('contacts').doc(id);
    const updateData: any = { updatedAt: new Date().toISOString() };
    
    // Update segment (in customer object)
    if (updates.segment) {
      updateData['customer.segment'] = updates.segment;
    }
    
    // Update city (in first address)
    if (updates.city) {
      updateData['addresses.0.city'] = updates.city;
    }
    
    // Update originType (change roles)
    if (updates.originType) {
      if (updates.originType === 'supplier') {
        updateData.roles = ['SUPPLIER'];
      } else {
        updateData.roles = ['CUSTOMER'];
      }
    }
    
    batch.update(contactRef, updateData);
  }
  
  await batch.commit();
  
  return { success: true, updated: ids.length };
}

// ============================================================================
// CREATE CONTACT
// ============================================================================

export async function createContact(params: {
  name: string;
  type: 'client' | 'supplier';
  cif?: string;
  segment?: string;
  email?: string;
  phone?: string;
  city?: string;
}) {
  const { name, type, cif, segment, email, phone, city } = params;
  
  // Build contact data (SSOT v6)
  const data: any = {
    kind: 'ORG',
    roles: type === 'supplier' ? ['SUPPLIER'] : ['CUSTOMER'],
    displayName: name.trim(),
    legalName: name.trim(),
    nameNorm: name.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""),
    status: 'ACTIVE',
    source: 'Manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  if (cif) data.vat = cif.trim();
  
  if (email) {
    data.emails = [{ value: email.trim(), isPrimary: true }];
  }
  
  if (phone) {
    data.phones = [{ value: phone.trim(), isPrimary: true }];
  }
  
  if (city) {
    data.addresses = [{
      kind: 'billing',
      city: city.trim(),
      countryCode: 'ES',
    }];
  }
  
  if (type !== 'supplier') {
    data.customer = {
      segment: segment || 'UNKNOWN',
      placement: 'DIRECTA',
    };
  }
  
  const docRef = await adminDb.collection('contacts').add(data);
  
  return {
    success: true,
    id: docRef.id,
    collection: 'contacts',
  };
}
