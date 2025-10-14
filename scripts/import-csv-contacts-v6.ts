#!/usr/bin/env tsx
/**
 * Script para importar contacts_normalized_Final.csv a Firestore
 * Transforma estructura plana CSV → SSOT v6
 */

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Contact, Stage, CustomerSegment, ContactRole } from '../src/domain/ssot';
import { normalizeName, buildNameNorm } from '../src/domain/ssot';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normaliza texto a Title Case preservando acrónimos
 */
function toTitleCase(str: string): string {
  if (!str) return '';
  
  // Acrónimos conocidos que deben preservarse
  const acronyms = ['NH', 'AC', 'SL', 'SLU', 'SA', 'SLL', 'RTDM', 'PLV', 'IVA', 'NIF', 'CIF', 'VAT'];
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase();
      if (acronyms.includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Mapea stages antiguos a nuevos
 */
function mapStage(oldStage?: string): Stage {
  const mapping: Record<string, Stage> = {
    'ACTIVA': 'CLOSED_WON',
    'CLOSED / WON': 'CLOSED_WON',
    'CLOSED / LOST': 'CLOSED_LOST',
    'NEGOTATION': 'NEGOTIATION',
    'CONTACT NEXT SEASON': 'CONTACT_NEXT_SEASON',
    'SCHEDULE APPOINTMENT': 'SCHEDULE_APPOINTMENT',
    'INTERESTED': 'INTERESTED',
    'CONTACTED': 'CONTACTED',
    'LEAD': 'LEAD',
    'FOLLOW UP': 'FOLLOW_UP',
    'SEND INFO': 'SEND_INFO',
  };
  
  return mapping[oldStage?.toUpperCase().trim() || ''] || 'LEAD';
}

/**
 * Normaliza flow
 */
function mapFlow(flow?: string): 'DIRECTA' | 'COLOCACION' {
  const f = flow?.toUpperCase().trim();
  return f === 'PLACEMENT' || f === 'COLOCACION' ? 'COLOCACION' : 'DIRECTA';
}

/**
 * Infiere givenName y familyName de un nombre completo
 */
function splitPersonName(fullName: string): { givenName: string; familyName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { givenName: parts[0], familyName: '' };
  }
  
  // Primera palabra = givenName, resto = familyName
  const givenName = parts[0];
  const familyName = parts.slice(1).join(' ');
  
  return { givenName, familyName };
}

// ============================================================================
// CSV PARSING
// ============================================================================

type CSVRow = {
  displayName?: string;
  id?: string;
  kind?: string;
  roles?: string;
  nameNorm?: string;
  emailPrimary?: string;
  phonePrimary?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  segment?: string;
  flow?: string;
  stage?: string;
  distributorId?: string;
  ownerId?: string;
  holdedId?: string;
  source?: string;
  [key: string]: string | undefined; // Para columnas vacías extra
};

async function importContacts(csvPath: string) {
  console.log('📖 Reading CSV file:', csvPath);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    trim: true,
    relax_column_count: true, // Permite columnas vacías
  }) as CSVRow[];
  
  console.log(`✅ Parsed ${rows.length} rows\n`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // +2 because CSV has header and is 1-indexed
    
    try {
      // Validar campos obligatorios
      if (!row.displayName || !row.id || !row.kind) {
        console.log(`⚠️  Line ${lineNum}: Missing required fields (displayName, id, kind)`);
        skipped++;
        continue;
      }
      
      // Normalizar displayName
      const displayName = toTitleCase(row.displayName);
      
      // Parse roles
      const rolesStr = row.roles?.toUpperCase().trim() || 'CUSTOMER';
      const roles = rolesStr.split(',').map(r => r.trim()) as ContactRole[];
      
      // Build contact base
      const contact: Contact = {
        id: row.id,
        kind: row.kind.toUpperCase() as 'ORG' | 'PERSON',
        roles,
        displayName,
        nameNorm: row.nameNorm || buildNameNorm(displayName, row.city),
        status: 'ACTIVE',
        source: 'CSV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Set name fields based on kind
      if (contact.kind === 'ORG') {
        contact.legalName = displayName;
        contact.tradeName = displayName;
      } else {
        const { givenName, familyName } = splitPersonName(displayName);
        contact.givenName = givenName;
        contact.familyName = familyName;
      }
      
      // Email
      if (row.emailPrimary) {
        contact.emails = [{ value: row.emailPrimary.trim(), isPrimary: true }];
      }
      
      // Phone
      if (row.phonePrimary) {
        contact.phones = [{ value: row.phonePrimary.trim(), isPrimary: true }];
      }
      
      // Address
      if (row.street || row.city) {
        contact.addresses = [{
          kind: 'billing',
          street: row.street?.trim(),
          city: row.city ? toTitleCase(row.city) : undefined,
          province: row.province ? toTitleCase(row.province) : undefined,
          postalCode: row.postalCode?.trim(),
          countryCode: row.countryCode?.toUpperCase().trim() || 'ES',
        }];
      }
      
      // Customer data
      if (roles.includes('CUSTOMER')) {
        const segment = (row.segment?.toUpperCase().trim() || 'UNKNOWN') as CustomerSegment;
        const flow = mapFlow(row.flow);
        
        contact.customer = {
          segment,
          placement: flow,
        };
        
        if (row.distributorId) {
          contact.customer.distributorId = row.distributorId;
        }
      }
      
      // Stage
      contact.stage = mapStage(row.stage);
      
      // External refs
      if (row.holdedId && row.holdedId !== 'nd') {
        contact.externalRefs = {
          holdedId: row.holdedId,
        };
      }
      
      // Check if exists
      const docRef = db.collection('contacts').doc(contact.id);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        // Update
        await docRef.update({
          ...contact,
          updatedAt: new Date().toISOString(),
        });
        updated++;
        console.log(`✏️  Updated: ${displayName} (${contact.id})`);
      } else {
        // Create
        await docRef.set(contact);
        created++;
        console.log(`✅ Created: ${displayName} (${contact.id})`);
      }
      
    } catch (error: any) {
      errors++;
      console.error(`❌ Line ${lineNum} (${row.displayName}):`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Created:  ${created}`);
  console.log(`✏️  Updated:  ${updated}`);
  console.log(`⚠️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📦 Total:    ${rows.length}`);
  console.log('='.repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

const csvPath = process.argv[2] || 'contacts_normalized_Final.csv';

importContacts(csvPath)
  .then(() => {
    console.log('\n✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
