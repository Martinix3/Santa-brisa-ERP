#!/usr/bin/env tsx
// scripts/migrate-holded-complete.ts

/**
 * Migración Completa: Holded → Firestore (3 colecciones)
 * 
 * - accounts (B2B: HORECA, RETAIL, DISTRIBUIDOR, PRIVADA)
 * - customers (ONLINE: Shopify)
 * - suppliers (Proveedores)
 */

import { adminDb } from '../src/server/firebase';
import type { AccountType, Segment, Stage } from '../src/domain/ssot';
import { customAlphabet } from 'nanoid';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_OWNER_ID = 'mj@santabrisa.co';
const INITIAL_STAGE: Stage = 'POTENCIAL';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

// ============================================================================
// TYPES
// ============================================================================

type SupplierCategory = 'raw_material' | 'packaging' | 'services' | 'other';

// ============================================================================
// HELPERS
// ============================================================================

function hasShopifyPayments(holdedId: string, paymentsMap: Map<string, any[]>): boolean {
  const payments = paymentsMap.get(holdedId) || [];
  return payments.some(p => 
    p.raw?.desc?.includes('Shopify #') || 
    p.raw?.desc?.includes('(Invoice) Shopify')
  );
}

function inferSegmentForB2B(name: string): Segment {
  const n = name.toLowerCase();
  
  // HORECA
  if (
    n.includes('hotel') || n.includes('hostal') || n.includes('resort') ||
    n.includes('restaurante') || n.includes('restaurant') ||
    n.includes('bar ') || n.includes('bar.') || n.includes('taberna') ||
    n.includes('cafeteria') || n.includes('café') || n.includes('gastro')
  ) {
    return 'HORECA';
  }
  
  // RETAIL
  if (
    n.includes('super') || n.includes('market') || n.includes('tienda') ||
    n.includes('comercio') || n.includes('retail') || n.includes('shop') ||
    n.includes('delicatessen') || n.includes('gourmet')
  ) {
    return 'RETAIL';
  }
  
  // DISTRIBUIDOR
  if (
    n.includes('distribu') || n.includes('importa') || n.includes('wholesal')
  ) {
    return 'DISTRIBUIDOR';
  }
  
  // Default: PRIVADA
  return 'PRIVADA';
}

function inferSupplierCategory(name: string): SupplierCategory {
  const n = name.toLowerCase();
  
  if (n.includes('vino') || n.includes('alcohol') || n.includes('beverage')) {
    return 'raw_material';
  }
  
  if (n.includes('embotellado') || n.includes('packaging') || n.includes('etiqueta')) {
    return 'packaging';
  }
  
  if (n.includes('transporte') || n.includes('logistica') || n.includes('almacen')) {
    return 'services';
  }
  
  return 'other';
}

// ============================================================================
// CREATE FUNCTIONS
// ============================================================================

async function createCustomer(contact: any) {
  const customerId = `cust_${nanoid()}`;
  const raw = contact.raw;
  
  const customer = {
    id: customerId,
    name: raw.name,
    email: raw.email || null,
    phone: raw.phone || null,
    
    // Ecommerce
    source: 'shopify' as const,
    
    // External
    external: {
      holded: contact.holdedId,
      shopifyCustomerId: null, // Se puede añadir después
    },
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await adminDb.collection('customers').doc(customerId).set(customer);
  return { type: 'customer', id: customerId, name: raw.name };
}

async function createAccount(contact: any) {
  const accountId = `acc_${nanoid()}`;
  const partyId = `party_${nanoid()}`;
  const raw = contact.raw;
  
  const segment = inferSegmentForB2B(raw.name);
  
  const account = {
    id: accountId,
    partyId,
    name: raw.name,
    
    // Clasificación (accountType = segment)
    segment,
    accountType: segment as AccountType,
    
    // Pipeline
    stage: INITIAL_STAGE,
    flow: 'DIRECT' as const,  // TODAS son DIRECT
    ownerId: DEFAULT_OWNER_ID,
    
    // External
    external: {
      holded: contact.holdedId,
      holdedNum: raw.clientRecord?.num || null,
    },
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const party = {
    id: partyId,
    name: raw.name,
    kind: 'ORG' as const,
    tradeName: raw.tradeName || null,
    vat: raw.vatnumber || null,
    
    billingAddress: raw.billAddress ? {
      street: raw.billAddress.address || '',
      city: raw.billAddress.city || '',
      zip: raw.billAddress.postalCode || '',
      province: raw.billAddress.province || '',
      country: raw.billAddress.country || 'España',
    } : undefined,
    
    emails: raw.email ? [{ value: raw.email, isPrimary: true }] : [],
    phones: [
      ...(raw.phone ? [{ value: raw.phone, isPrimary: true }] : []),
      ...(raw.mobile ? [{ value: raw.mobile, isPrimary: false }] : []),
    ],
    
    roles: ['CUSTOMER'] as const,
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const batch = adminDb.batch();
  batch.set(adminDb.collection('accounts').doc(accountId), account);
  batch.set(adminDb.collection('parties').doc(partyId), party);
  await batch.commit();
  
  return { type: 'account', id: accountId, name: raw.name, segment };
}

async function createSupplier(contact: any) {
  const supplierId = `sup_${nanoid()}`;
  const partyId = `party_${nanoid()}`;
  const raw = contact.raw;
  
  const category = inferSupplierCategory(raw.name);
  
  const supplier = {
    id: supplierId,
    partyId,
    name: raw.name,
    vat: raw.vatnumber || null,
    
    // Categoría
    category,
    
    // External
    external: {
      holded: contact.holdedId,
      holdedNum: raw.supplierRecord?.num || null,
    },
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const party = {
    id: partyId,
    name: raw.name,
    kind: 'ORG' as const,
    tradeName: raw.tradeName || null,
    vat: raw.vatnumber || null,
    
    billingAddress: raw.billAddress ? {
      street: raw.billAddress.address || '',
      city: raw.billAddress.city || '',
      zip: raw.billAddress.postalCode || '',
      province: raw.billAddress.province || '',
      country: raw.billAddress.country || 'España',
    } : undefined,
    
    emails: raw.email ? [{ value: raw.email, isPrimary: true }] : [],
    phones: [
      ...(raw.phone ? [{ value: raw.phone, isPrimary: true }] : []),
      ...(raw.mobile ? [{ value: raw.mobile, isPrimary: false }] : []),
    ],
    
    roles: ['SUPPLIER'] as const,
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const batch = adminDb.batch();
  batch.set(adminDb.collection('suppliers').doc(supplierId), supplier);
  batch.set(adminDb.collection('parties').doc(partyId), party);
  await batch.commit();
  
  return { type: 'supplier', id: supplierId, name: raw.name, category };
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrateHoldedComplete() {
  console.log('🚀 Migración Completa: Holded → Firestore (3 colecciones)\n');
  console.log('═'.repeat(70));
  
  try {
    // ========================================================================
    // STEP 1: Fetch contacts
    // ========================================================================
    console.log('\n📥 STEP 1: Fetching contacts...');
    
    const contactsSnap = await adminDb
      .collection('integrations')
      .doc('holded')
      .collection('contacts_mirror')
      .get();
    
    console.log(`   ✅ Encontrados ${contactsSnap.size} contacts totales`);
    
    // ========================================================================
    // STEP 2: Fetch payments
    // ========================================================================
    console.log('\n📥 STEP 2: Fetching payments...');
    
    const paymentsSnap = await adminDb
      .collection('integrations')
      .doc('holded')
      .collection('payments_mirror')
      .get();
    
    console.log(`   ✅ Encontrados ${paymentsSnap.size} payments`);
    
    const paymentsMap = new Map<string, any[]>();
    paymentsSnap.docs.forEach(doc => {
      const payment = doc.data();
      const contactId = payment.raw?.contactId;
      if (contactId) {
        if (!paymentsMap.has(contactId)) {
          paymentsMap.set(contactId, []);
        }
        paymentsMap.get(contactId)!.push(payment);
      }
    });
    
    console.log(`   ✅ Payments mapeados`);
    
    // ========================================================================
    // STEP 3: Clasificar y migrar
    // ========================================================================
    console.log('\n📝 STEP 3: Clasificando y migrando...\n');
    
    const stats = {
      customers: 0,
      accounts: { HORECA: 0, RETAIL: 0, DISTRIBUIDOR: 0, PRIVADA: 0 },
      suppliers: { raw_material: 0, packaging: 0, services: 0, other: 0 },
      errors: 0,
      skipped: 0,
    };
    
    for (const contactDoc of contactsSnap.docs) {
      const contact = contactDoc.data();
      const { holdedId, raw } = contact;
      
      if (!holdedId || !raw?.name) {
        stats.skipped++;
        continue;
      }
      
      try {
        if (raw.type === 'client') {
          // CLIENT
          if (hasShopifyPayments(holdedId, paymentsMap)) {
            // → customers
            const result = await createCustomer(contact);
            stats.customers++;
            console.log(`   ✅ CUSTOMER     | ${result.name}`);
          } else {
            // → accounts (B2B)
            const result = await createAccount(contact);
            stats.accounts[result.segment as keyof typeof stats.accounts]++;
            console.log(`   ✅ ${result.segment.padEnd(12)} | ${result.name}`);
          }
        } else if (raw.type === 'supplier') {
          // → suppliers
          const result = await createSupplier(contact);
          stats.suppliers[result.category]++;
          console.log(`   ✅ SUPPLIER (${result.category}) | ${result.name}`);
        } else {
          stats.skipped++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error con "${raw.name}": ${error.message}`);
        stats.errors++;
      }
    }
    
    // ========================================================================
    // STEP 4: Report
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DE MIGRACIÓN\n');
    
    const totalCustomers = stats.customers;
    const totalAccounts = Object.values(stats.accounts).reduce((a, b) => a + b, 0);
    const totalSuppliers = Object.values(stats.suppliers).reduce((a, b) => a + b, 0);
    const totalCreated = totalCustomers + totalAccounts + totalSuppliers;
    
    console.log(`   ✅ Total Creados:  ${totalCreated}`);
    console.log(`   ⏭️  Skipped:        ${stats.skipped}`);
    console.log(`   ❌ Errores:        ${stats.errors}\n`);
    
    console.log('📈 CUSTOMERS (ONLINE):\n');
    console.log(`   SHOPIFY       ${stats.customers.toString().padStart(4)} ${'█'.repeat(Math.ceil(stats.customers / 2))}\n`);
    
    console.log('📈 ACCOUNTS (B2B):\n');
    Object.entries(stats.accounts)
      .filter(([_, count]) => count > 0)
      .forEach(([type, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   ${type.padEnd(12)} ${count.toString().padStart(4)} ${bar}`);
      });
    
    console.log('\n📈 SUPPLIERS:\n');
    Object.entries(stats.suppliers)
      .filter(([_, count]) => count > 0)
      .forEach(([cat, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   ${cat.padEnd(12)} ${count.toString().padStart(4)} ${bar}`);
      });
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Migración completada exitosamente!\n');
    
    console.log('📝 Próximos pasos:');
    console.log('   1. Verificar datos en Firebase Console');
    console.log('   2. Ver 3 colecciones: accounts, customers, suppliers');
    console.log('   3. Deploy índices Firestore');
    console.log('   4. Crear dashboards separados\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
migrateHoldedComplete().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
