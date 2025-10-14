'use server';

import { adminDb } from '@/server/firebase';
import { listContacts, getContactDetail, type ContactsFilters } from './actions';

// ============================================================================
// TYPES
// ============================================================================

export type ExportOptions = {
  includeMetadata?: boolean;
  filters?: ContactsFilters;
};

export type ImportRow = {
  line: number;
  id?: string;
  name: string;
  tradeName?: string;
  vat?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  tipo: 'client' | 'supplier' | 'customer';
  segment?: string;
  stage?: string;
  status?: string; // Label: "Activa", "Seguimiento", "Potencial", "Lost", "Scraped"
  flow?: 'DIRECT' | 'PLACEMENT';
  distributorId?: string;
  ownerId?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  tags?: string[];
  isTarget?: boolean;
};

export type ValidationError = {
  line: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  preview: Array<{
    row: ImportRow;
    action: 'CREATE' | 'UPDATE';
    existing?: any;
  }>;
};

// ============================================================================
// EXPORT CONTACTS TEMPLATE
// ============================================================================

export async function exportContactsTemplate(options: ExportOptions = {}) {
  const { includeMetadata = true, filters } = options;
  
  const { rows } = await listContacts(filters || {});
  
  // Get users and distributors for names
  const [usersSnap, distributorsSnap, accountsSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('parties').where('segment', '==', 'DISTRIBUIDOR').get(),
    adminDb.collection('contacts').get(),
  ]);
  
  const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data().name]));
  const distributorsMap = new Map(distributorsSnap.docs.map(d => [d.id, d.data().name]));
  const accountsMap = new Map(accountsSnap.docs.map(d => [d.id, d.data()]));
  
  // CSV Headers
  const headers = [
    'id', 'name', 'tradeName', 'vat', 'email', 'phone', 'mobile',
    'tipo', 'segment', 'stage', 'flow', 'distributorId', 'distributorName',
    'ownerId', 'ownerName', 'street', 'city', 'postalCode', 'province',
    'country', 'tags', 'isTarget',
  ];
  
  // Metadata row
  const metadata = [
    'LIBRE (ID para actualizar, vacío para crear)',
    'LIBRE* (obligatorio)',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'OPCIONES: client|supplier|customer',
    'OPCIONES: HORECA|RETAIL|DISTRIBUIDOR|PRIVADA|ONLINE|OTRO',
    'OPCIONES: ACTIVA|POTENCIAL|SEGUIMIENTO|FALLIDA|CERRADA|BAJA',
    'OPCIONES: DIRECT|PLACEMENT',
    'LIBRE (ID distribuidor)',
    'LIBRE (referencia)',
    'LIBRE (ID comercial)',
    'LIBRE (referencia)',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'LIBRE',
    'LIBRE (separar con ;)',
    'OPCIONES: true|false',
  ];
  
  const lines: string[] = [];
  lines.push(headers.join(','));
  
  if (includeMetadata) {
    lines.push('# ' + metadata.join(','));
  }
  
  // Data rows
  for (const contact of rows) {
    const account = accountsMap.get(contact.id);
    const ownerName = account?.ownerId ? usersMap.get(account.ownerId) || '' : '';
    const distributorName = account?.distributorPartyId ? distributorsMap.get(account.distributorPartyId) || '' : '';
    
    const row = [
      contact.id || '',
      `"${(contact.name || '').replace(/"/g, '""')}"`,
      `"${(account?.tradeName || '').replace(/"/g, '""')}"`,
      contact.cif || '',
      contact.email || '',
      contact.phone || '',
      '', // mobile
      contact.originType || 'client',
      contact.segment || '',
      account?.stage || '',
      account?.flow || '',
      account?.distributorPartyId || '',
      `"${distributorName.replace(/"/g, '""')}"`,
      account?.ownerId || '',
      `"${ownerName.replace(/"/g, '""')}"`,
      '', // street
      contact.city || '',
      '', // postalCode
      contact.province || '',
      'España',
      `"${(contact.tags || []).join(';')}"`,
      account?.isTarget ? 'true' : 'false',
    ];
    
    lines.push(row.join(','));
  }
  
  return {
    csv: lines.join('\n'),
    count: rows.length,
    filename: `contacts_${new Date().toISOString().split('T')[0]}.csv`,
  };
}

// ============================================================================
// VALIDATE IMPORT
// ============================================================================

export async function validateImportData(csvText: string): Promise<ValidationResult> {
  const lines = csvText.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  
  if (lines.length < 2) {
    return {
      valid: false,
      errors: [{ line: 0, field: 'file', message: 'Archivo vacío', severity: 'error' }],
      warnings: [],
      preview: [],
    };
  }
  
  // Detectar delimitador (tab, punto y coma o coma)
  let delimiter = ',';
  if (lines[0].includes('\t')) {
    delimiter = '\t';
  } else if (lines[0].includes(';')) {
    delimiter = ';';
  }
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const preview: ValidationResult['preview'] = [];
  
  // Validate required headers - acepta 'name' o 'displayName'
  const hasName = headers.includes('name') || headers.includes('displayName');
  const hasTipo = headers.includes('tipo') || headers.includes('roles') || headers.includes('kind');
  
  if (!hasName) {
    errors.push({ line: 0, field: 'name', message: 'Falta columna obligatoria: name o displayName', severity: 'error' });
  }
  if (!hasTipo) {
    errors.push({ line: 0, field: 'tipo', message: 'Falta columna obligatoria: tipo, roles o kind', severity: 'error' });
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings, preview: [] };
  }
  
  // Get existing contacts
  const { rows: existingContacts } = await listContacts({});
  const existingByVat = new Map(existingContacts.filter(c => c.cif).map(c => [c.cif!.toLowerCase(), c]));
  const existingById = new Map(existingContacts.map(c => [c.id, c]));
  
  // Get valid users and distributors
  const [usersSnap, distributorsSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('parties').where('segment', '==', 'DISTRIBUIDOR').get(),
  ]);
  
  const validUserIds = new Set(usersSnap.docs.map(d => d.id));
  const validDistributorIds = new Set(distributorsSnap.docs.map(d => d.id));
  
  // Valid values
  const validTipos = ['client', 'supplier', 'customer'];
  const validSegments = ['HORECA', 'RETAIL', 'DISTRIBUIDOR', 'CATERING', 'PRIVADA', 'ONLINE', 'OTRO', ''];
  const validStages = ['LEAD', 'CONTACTED', 'SCHEDULE_APPOINTMENT', 'INTERESTED', 'SEND_INFO', 'FOLLOW_UP', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'CONTACT_NEXT_SEASON', 'PENDIENTE', 'SCRAPPED', ''];
  const validFlows = ['DIRECT', 'PLACEMENT', ''];
  
  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    
    const row: any = { line: lineNum };
    
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || '';
      
      switch (header) {
        case 'id': row.id = value || undefined; break;
        case 'name':
        case 'displayName': row.name = value; break;
        case 'tradeName': row.tradeName = value || undefined; break;
        case 'vat': row.vat = value || undefined; break;
        case 'email':
        case 'emailPrimary': row.email = value || undefined; break;
        case 'phone':
        case 'phonePrimary': row.phone = value || undefined; break;
        case 'mobile': row.mobile = value || undefined; break;
        case 'tipo': row.tipo = value as any; break;
        case 'roles': 
          // Convertir CUSTOMER/SUPPLIER a client/supplier
          if (value.includes('CUSTOMER')) row.tipo = 'client';
          else if (value.includes('SUPPLIER')) row.tipo = 'supplier';
          else row.tipo = 'client';
          break;
        case 'kind':
          // kind es ORG/PERSON, NO determina el tipo comercial
          // No hacemos nada aquí
          break;
        case 'segment': row.segment = value || undefined; break;
        case 'status':
        case 'stage': 
          // Mapeo: CSV "status" → Firestore {stage, status}
          const statusMapping: Record<string, { stage: string; status: string }> = {
            // Activa
            'CLOSED_WON': { stage: 'CLOSED_WON', status: 'Activa' },
            'CLOSED / WON': { stage: 'CLOSED_WON', status: 'Activa' },
            'ACTIVA': { stage: 'CLOSED_WON', status: 'Activa' },
            
            // Seguimiento
            'NEGOTIATION': { stage: 'NEGOTIATION', status: 'Seguimiento' },
            'NEGOTATION': { stage: 'NEGOTIATION', status: 'Seguimiento' },
            'SCHEDULE_APPOINTMENT': { stage: 'SCHEDULE_APPOINTMENT', status: 'Seguimiento' },
            'SCHEDULE APPOINTMENT': { stage: 'SCHEDULE_APPOINTMENT', status: 'Seguimiento' },
            'INTERESTED': { stage: 'INTERESTED', status: 'Seguimiento' },
            'CONTACTED': { stage: 'CONTACTED', status: 'Seguimiento' },
            'SEND_INFO': { stage: 'SEND_INFO', status: 'Seguimiento' },
            'FOLLOW_UP': { stage: 'FOLLOW_UP', status: 'Seguimiento' },
            'SEGUIMIENTO': { stage: 'FOLLOW_UP', status: 'Seguimiento' },
            
            // Potencial
            'LEAD': { stage: 'LEAD', status: 'Potencial' },
            'POTENCIAL': { stage: 'LEAD', status: 'Potencial' },
            'CONTACT_NEXT_SEASON': { stage: 'CONTACT_NEXT_SEASON', status: 'Potencial' },
            'CONTACT NEXT SEASON': { stage: 'CONTACT_NEXT_SEASON', status: 'Potencial' },
            
            // Lost
            'CLOSED_LOST': { stage: 'CLOSED_LOST', status: 'Lost' },
            'CLOSED / LOST': { stage: 'CLOSED_LOST', status: 'Lost' },
            'CLOSED_LOSE': { stage: 'CLOSED_LOST', status: 'Lost' },
            'FALLIDA': { stage: 'CLOSED_LOST', status: 'Lost' },
            
            // Scraped
            'SCRAPPED': { stage: 'SCRAPPED', status: 'Scraped' },
            'SCRAPED': { stage: 'SCRAPPED', status: 'Scraped' },
            
            // Pendiente
            'PENDIENTE': { stage: 'PENDIENTE', status: 'Pendiente' },
          };
          
          const normalized = value ? statusMapping[value.toUpperCase().trim()] : undefined;
          if (normalized) {
            row.stage = normalized.stage;
            row.status = normalized.status;
          }
          break;
        case 'flow': row.flow = value as any || undefined; break;
        case 'distributorId': row.distributorId = value || undefined; break;
        case 'ownerId': row.ownerId = value || undefined; break;
        case 'street': row.street = value || undefined; break;
        case 'city': row.city = value || undefined; break;
        case 'postalCode': row.postalCode = value || undefined; break;
        case 'province': row.province = value || undefined; break;
        case 'country':
        case 'countryCode': row.country = value || undefined; break;
        case 'tags': row.tags = value ? value.split(';').map(t => t.trim()) : []; break;
        case 'isTarget': row.isTarget = value === 'true'; break;
      }
    });
    
    // Validate required fields
    if (!row.name) {
      errors.push({ line: lineNum, field: 'name', message: 'Nombre obligatorio', severity: 'error' });
    }
    
    if (!row.tipo || !validTipos.includes(row.tipo)) {
      errors.push({ line: lineNum, field: 'tipo', message: `Tipo inválido. Debe ser: ${validTipos.join(', ')}`, severity: 'error' });
    }
    
    // Validate enums
    if (row.segment && !validSegments.includes(row.segment)) {
      errors.push({ line: lineNum, field: 'segment', message: `Segmento inválido`, severity: 'error' });
    }
    
    if (row.stage && !validStages.includes(row.stage)) {
      errors.push({ line: lineNum, field: 'stage', message: `Stage inválido`, severity: 'error' });
    }
    
    if (row.flow && !validFlows.includes(row.flow)) {
      errors.push({ line: lineNum, field: 'flow', message: `Flow inválido`, severity: 'error' });
    }
    
    // Validate IDs
    if (row.ownerId && !validUserIds.has(row.ownerId)) {
      warnings.push({ line: lineNum, field: 'ownerId', message: 'ID de comercial no existe', severity: 'warning' });
    }
    
    if (row.distributorId && !validDistributorIds.has(row.distributorId)) {
      warnings.push({ line: lineNum, field: 'distributorId', message: 'ID de distribuidor no existe', severity: 'warning' });
    }
    
    if (row.flow === 'PLACEMENT' && !row.distributorId) {
      warnings.push({ line: lineNum, field: 'distributorId', message: 'Flow PLACEMENT requiere distributorId', severity: 'warning' });
    }
    
    // Detect duplicates
    let action: 'CREATE' | 'UPDATE' = 'CREATE';
    let existing: any = undefined;
    
    if (row.id) {
      existing = existingById.get(row.id);
      if (existing) {
        action = 'UPDATE';
      } else {
        warnings.push({ line: lineNum, field: 'id', message: 'ID no encontrado, se creará nuevo', severity: 'warning' });
      }
    } else if (row.vat) {
      existing = existingByVat.get(row.vat.toLowerCase());
      if (existing) {
        warnings.push({ line: lineNum, field: 'vat', message: `Ya existe contacto con NIF ${row.vat}`, severity: 'warning' });
      }
    }
    
    preview.push({ row: row as ImportRow, action, existing });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preview,
  };
}

// ============================================================================
// IMPORT CONTACTS
// ============================================================================

// ============================================================================
// JSON IMPORT (Google Maps Places format)
// ============================================================================

type GMapsPlace = {
  title: string;
  categoryName?: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  countryCode?: string;
  website?: string;
  phone?: string;
  location?: { lat: number; lng: number };
  totalScore?: number;
  reviewsCount?: number;
  placeId?: string;
  cid?: string;
  fid?: string;
  kgmid?: string;
  categories?: string[];
  emails?: string[];
  phones?: string[];
  instagrams?: string[];
  facebooks?: string[];
  [key: string]: any;
};

export async function validateJsonImport(jsonText: string): Promise<ValidationResult> {
  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data)) {
      return {
        valid: false,
        errors: [{ line: 0, field: 'file', message: 'El JSON debe ser un array', severity: 'error' }],
        warnings: [],
        preview: [],
      };
    }
    
    if (data.length === 0) {
      return {
        valid: false,
        errors: [{ line: 0, field: 'file', message: 'Array vacío', severity: 'error' }],
        warnings: [],
        preview: [],
      };
    }
    
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const preview: ValidationResult['preview'] = [];
    
    // Get existing contacts to check duplicates by querying Firestore directly
    const partiesSnap = await adminDb.collection('parties').get();
    const existingByPlaceId = new Map();
    
    partiesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.externalRefs?.gmaps?.placeId) {
        existingByPlaceId.set(data.externalRefs.gmaps.placeId, {
          id: doc.id,
          name: data.name,
          ...data
        });
      }
    });
    
    for (let i = 0; i < data.length; i++) {
      const place: GMapsPlace = data[i];
      const lineNum = i + 1;
      
      // Validate required fields
      if (!place.title) {
        errors.push({ line: lineNum, field: 'title', message: 'Título obligatorio', severity: 'error' });
        continue;
      }
      
      // Map to ImportRow
      const row: ImportRow = {
        line: lineNum,
        name: place.title,
        vat: undefined,
        email: place.email || place.emails?.[0],
        phone: place.phone || place.phones?.[0],
        tipo: 'client', // Default to client for GMaps places
        segment: place.categoryName?.includes('Restaurant') ? 'HORECA' : 
                 place.categoryName?.includes('Hotel') ? 'HORECA' :
                 place.categoryName?.includes('Bar') ? 'HORECA' : 'RETAIL',
        stage: 'LEAD',
        city: place.city,
        street: place.street || place.address,
        postalCode: place.postalCode,
        province: place.state,
        country: place.countryCode === 'ES' ? 'España' : place.countryCode,
        tags: place.categories || [],
      };
      
      // Check for duplicates
      let action: 'CREATE' | 'UPDATE' = 'CREATE';
      let existing: any = undefined;
      
      if (place.placeId) {
        existing = existingByPlaceId.get(place.placeId);
        if (existing) {
          action = 'UPDATE';
          row.id = existing.id;
          warnings.push({ 
            line: lineNum, 
            field: 'placeId', 
            message: `Ya existe contacto con placeId ${place.placeId}`, 
            severity: 'warning' 
          });
        }
      }
      
      // Warnings for missing data
      if (!place.phone && !place.email) {
        warnings.push({ 
          line: lineNum, 
          field: 'contact', 
          message: 'Sin teléfono ni email', 
          severity: 'warning' 
        });
      }
      
      if (!place.city && !place.address) {
        warnings.push({ 
          line: lineNum, 
          field: 'address', 
          message: 'Sin dirección', 
          severity: 'warning' 
        });
      }
      
      preview.push({ row, action, existing });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      preview,
    };
    
  } catch (error: any) {
    return {
      valid: false,
      errors: [{ line: 0, field: 'file', message: `Error parseando JSON: ${error.message}`, severity: 'error' }],
      warnings: [],
      preview: [],
    };
  }
}

export async function importJsonContacts(jsonText: string, validatedData: ValidationResult) {
  if (!validatedData.valid) {
    throw new Error('Datos inválidos');
  }
  
  const data: GMapsPlace[] = JSON.parse(jsonText);
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ line: number; error: string }>,
  };
  
  for (let i = 0; i < validatedData.preview.length; i++) {
    const item = validatedData.preview[i];
    const { row, action } = item;
    const place = data[i];
    
    try {
      if (action === 'UPDATE' && row.id) {
        // Update existing contact
        const updateData: any = {
          name: row.name,
          updatedAt: new Date().toISOString(),
        };
        
        if (row.email) updateData.email = row.email;
        if (row.phone) updateData.phone = row.phone;
        if (row.segment) updateData.segment = row.segment;
        
        // Update address
        if (row.city || row.street) {
          updateData.billingAddress = {
            street: row.street || '',
            city: row.city || '',
            zip: row.postalCode || '',
            postalCode: row.postalCode || '',
            province: row.province || '',
            country: row.country || 'España',
          };
        }
        
        // Update geo
        if (place.location) {
          updateData.geo = {
            lat: place.location.lat,
            lng: place.location.lng,
          };
        }
        
        // Update external refs
        updateData.externalRefs = {
          gmaps: {
            placeId: place.placeId,
            cid: place.cid,
            fid: place.fid,
            kgmid: place.kgmid,
            url: place.url,
          },
        };
        
        // Update metrics
        if (place.totalScore || place.reviewsCount) {
          updateData.metrics = {
            rating: place.totalScore,
            reviewsCount: place.reviewsCount,
          };
        }
        
        // Update social
        if (place.website || place.instagrams?.length || place.facebooks?.length) {
          updateData.social = {
            website: place.website,
            instagram: place.instagrams?.[0],
            facebook: place.facebooks?.[0],
          };
        }
        
        // Tags
        if (row.tags && row.tags.length > 0) {
          updateData.tags = row.tags;
        }
        
        // Store raw for audit
        updateData.rawData = place;
        
        await adminDb.collection('parties').doc(row.id).update(updateData);
        results.updated++;
        
      } else {
        // Create new contact
        const newData: any = {
          name: row.name,
          role: 'client',
          segment: row.segment || 'RETAIL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        if (row.email) newData.email = row.email;
        if (row.phone) newData.phone = row.phone;
        
        // Address
        if (row.city || row.street) {
          newData.billingAddress = {
            street: row.street || '',
            city: row.city || '',
            zip: row.postalCode || '',
            postalCode: row.postalCode || '',
            province: row.province || '',
            country: row.country || 'España',
          };
        }
        
        // Geo
        if (place.location) {
          newData.geo = {
            lat: place.location.lat,
            lng: place.location.lng,
          };
        }
        
        // External refs
        newData.externalRefs = {
          gmaps: {
            placeId: place.placeId,
            cid: place.cid,
            fid: place.fid,
            kgmid: place.kgmid,
            url: place.url,
          },
        };
        
        // Metrics
        if (place.totalScore || place.reviewsCount) {
          newData.metrics = {
            rating: place.totalScore,
            reviewsCount: place.reviewsCount,
          };
        }
        
        // Social
        if (place.website || place.instagrams?.length || place.facebooks?.length) {
          newData.social = {
            website: place.website,
            instagram: place.instagrams?.[0],
            facebook: place.facebooks?.[0],
          };
        }
        
        // Tags
        if (row.tags && row.tags.length > 0) {
          newData.tags = row.tags;
        }
        
        // Store raw for audit
        newData.rawData = place;
        
        const docRef = await adminDb.collection('parties').add(newData);
        
        // Create account
        const accountData: any = {
          partyId: docRef.id,
          name: row.name,
          segment: row.segment || 'RETAIL',
          stage: 'LEAD',
          flow: 'DIRECT',
          ownerId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await adminDb.collection('contacts').add(accountData);
        results.created++;
      }
    } catch (error: any) {
      results.errors.push({ line: row.line, error: error.message });
      results.skipped++;
    }
  }
  
  return results;
}

export async function importContacts(validatedData: ValidationResult) {
  if (!validatedData.valid) {
    throw new Error('Datos inválidos');
  }
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ line: number; error: string }>,
  };
  
  for (const item of validatedData.preview) {
    const { row, action } = item;
    
    try {
      // Build contact data according to SSOT v6
      const contactData: any = {
        kind: 'ORG', // Por defecto ORG, se puede inferir PERSON si necesario
        roles: row.tipo === 'supplier' ? ['SUPPLIER'] : ['CUSTOMER'],
        displayName: row.name,
        legalName: row.name,
        tradeName: row.tradeName || row.name,
        nameNorm: row.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""),
        status: (row as any).status || 'Potencial', // Usar status del CSV o default
        source: 'CSV',
        updatedAt: new Date().toISOString(),
      };
      
      // VAT/CIF
      if (row.vat) {
        contactData.vat = row.vat;
      }
      
      // Emails
      if (row.email) {
        contactData.emails = [{ value: row.email, isPrimary: true }];
      }
      
      // Phones - Guardar tanto phone como mobile si existen
      const phones: any[] = [];
      if (row.phone) {
        phones.push({ value: row.phone, kind: 'work', isPrimary: true });
      }
      if (row.mobile) {
        phones.push({ value: row.mobile, kind: 'mobile', isPrimary: !row.phone });
      }
      if (phones.length > 0) {
        contactData.phones = phones;
      }
      
      // Address
      if (row.city || row.street) {
        contactData.addresses = [{
          kind: 'billing',
          street: row.street || '',
          city: row.city || '',
          postalCode: row.postalCode || '',
          province: row.province || '',
          countryCode: row.country === 'España' ? 'ES' : 'ES',
        }];
      }
      
      // Customer data (if CUSTOMER role)
      if (row.tipo !== 'supplier') {
        contactData.customer = {
          segment: row.segment || 'UNKNOWN',
          placement: row.flow === 'PLACEMENT' ? 'COLOCACION' : 'DIRECTA',
        };
        
        if (row.distributorId) {
          contactData.customer.distributorId = row.distributorId;
        }
        
        if (row.ownerId) {
          contactData.customer.ownerId = row.ownerId;
        }
        
        // isTarget
        if (row.isTarget !== undefined) {
          contactData.customer.isTarget = row.isTarget;
        }
      }
      
      // Stage
      if (row.stage) {
        contactData.stage = row.stage;
      }
      
      // Tags
      if (row.tags && row.tags.length > 0) {
        contactData.tags = row.tags;
      }
      
      if (action === 'UPDATE' && row.id) {
        // Update existing contact
        await adminDb.collection('contacts').doc(row.id).update(contactData);
        results.updated++;
      } else {
        // Create new contact
        contactData.createdAt = new Date().toISOString();
        
        if (row.id) {
          // Use provided ID
          await adminDb.collection('contacts').doc(row.id).set(contactData);
        } else {
          // Generate new ID
          await adminDb.collection('contacts').add(contactData);
        }
        
        results.created++;
      }
    } catch (error: any) {
      results.errors.push({ line: row.line, error: error.message });
      results.skipped++;
    }
  }
  
  return results;
}
