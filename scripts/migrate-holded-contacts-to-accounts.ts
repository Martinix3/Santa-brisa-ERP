#!/usr/bin/env tsx
// scripts/migrate-holded-contacts-to-accounts.ts

/**
 * Migración: Holded Contacts → Accounts
 * 
 * Migra contactos de tipo "client" desde integrations/holded/contacts_mirror
 * a la colección accounts con clasificación automática por tipo.
 */

import { adminDb } from '../src/server/firebase';
import type { AccountType, Segment, Stage } from '../src/domain/ssot';
import { customAlphabet } from 'nanoid';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_OWNER_ID = 'mj@santabrisa.co'; // Owner por defecto (tú)
const INITIAL_STAGE: Stage = 'POTENCIAL';     // Todos empiezan aquí

// Generar IDs únicos
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);
const generateAccountId = () => `acc_${nanoid()}`;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detecta si un contacto tiene ventas por Shopify
 */
function hasShopifyPayments(holdedId: string, paymentsMap: Map<string, any[]>): boolean {
  const payments = paymentsMap.get(holdedId) || [];
  return payments.some(p => 
    p.raw?.desc?.includes('Shopify #') || 
    p.raw?.desc?.includes('(Invoice) Shopify')
  );
}

/**
 * Infiere segment y accountType por nombre y pagos
 * NOTA: Usa solo valores válidos del enum SSOT
 */
function inferTypeAndSegment(
  name: string,
  holdedId: string,
  paymentsMap: Map<string, any[]>
): { accountType: AccountType; segment: Segment } {
  // 1. Check Shopify (ONLINE)
  if (hasShopifyPayments(holdedId, paymentsMap)) {
    return {
      accountType: 'ONLINE',
      segment: 'ONLINE'  // Usar ONLINE en lugar de FINAL
    };
  }
  
  // 2. Heurística por nombre
  const n = name.toLowerCase();
  
  // HORECA
  if (
    n.includes('hotel') || n.includes('hostal') || n.includes('resort') ||
    n.includes('restaurante') || n.includes('restaurant') ||
    n.includes('bar ') || n.includes('bar.') || n.includes('taberna') ||
    n.includes('cafeteria') || n.includes('café') || n.includes('gastro')
  ) {
    return {
      accountType: 'HORECA',
      segment: 'HORECA'
    };
  }
  
  // RETAIL
  if (
    n.includes('super') || n.includes('market') || n.includes('tienda') ||
    n.includes('comercio') || n.includes('retail') || n.includes('shop') ||
    n.includes('delicatessen') || n.includes('gourmet')
  ) {
    return {
      accountType: 'RETAIL',
      segment: 'RETAIL'
    };
  }
  
  // DISTRIBUIDOR
  if (
    n.includes('distribu') || n.includes('importa') || n.includes('wholesal')
  ) {
    return {
      accountType: 'DISTRIBUIDOR',
      segment: 'DISTRIBUIDOR'
    };
  }
  
  // Default: PRIVADA (empresas, servicios, otros)
  return {
    accountType: 'OTRO',
    segment: 'PRIVADA'  // PRIVADA es el Segment más cercano para "otros"
  };
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrateHoldedContactsToAccounts() {
  console.log('🚀 Iniciando migración: Holded Contacts → Accounts\n');
  console.log('═'.repeat(70));
  
  try {
    // ========================================================================
    // STEP 1: Fetch contacts (clients only)
    // ========================================================================
    console.log('\n📥 STEP 1: Fetching contacts...');
    
    // Usar ruta completa en lugar de collectionGroup para evitar índice
    const contactsSnap = await adminDb
      .collection('integrations')
      .doc('holded')
      .collection('contacts_mirror')
      .where('raw.type', '==', 'client')
      .get();
    
    console.log(`   ✅ Encontrados ${contactsSnap.size} contacts (type=client)`);
    
    if (contactsSnap.empty) {
      console.log('\n⚠️  No hay contacts para migrar. Abortando.');
      return;
    }
    
    // ========================================================================
    // STEP 2: Fetch payments (para detectar Shopify)
    // ========================================================================
    console.log('\n📥 STEP 2: Fetching payments...');
    
    // Usar ruta completa en lugar de collectionGroup
    const paymentsSnap = await adminDb
      .collection('integrations')
      .doc('holded')
      .collection('payments_mirror')
      .get();
    
    console.log(`   ✅ Encontrados ${paymentsSnap.size} payments`);
    
    // Build lookup map: contactId → payments[]
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
    
    console.log(`   ✅ Payments mapeados por contactId`);
    
    // ========================================================================
    // STEP 3: Migrate contacts → accounts
    // ========================================================================
    console.log('\n📝 STEP 3: Migrando contacts...\n');
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    const typeStats: Record<string, number> = {
      ONLINE: 0,
      HORECA: 0,
      RETAIL: 0,
      DISTRIBUIDOR: 0,
      OTRO: 0,
    };
    
    for (const contactDoc of contactsSnap.docs) {
      const contact = contactDoc.data();
      const holdedId = contact.holdedId;
      const raw = contact.raw;
      
      if (!holdedId || !raw?.name) {
        console.log(`   ⚠️  Skip contact sin holdedId o name`);
        skipped++;
        continue;
      }
      
      try {
        // Check idempotencia: ¿Ya existe?
        const existingSnap = await adminDb
          .collection('accounts')
          .where('external.holded', '==', holdedId)
          .limit(1)
          .get();
        
        if (!existingSnap.empty) {
          console.log(`   ⏭️  Skip "${raw.name}" (ya existe)`);
          skipped++;
          continue;
        }
        
        // Clasificar tipo
        const { accountType, segment } = inferTypeAndSegment(
          raw.name,
          holdedId,
          paymentsMap
        );
        
        typeStats[accountType]++;
        
        // Mapear a Account (formato SSOT v5)
        const accountId = generateAccountId();
        
        // Crear Party ID asociado (simplificado)
        const partyId = `party_${nanoid()}`;
        
        const account = {
          id: accountId,
          partyId: partyId,
          name: raw.name,
          segment,
          stage: INITIAL_STAGE,
          ownerId: DEFAULT_OWNER_ID,
          flow: 'DIRECT' as const,
          
          // External IDs
          external: {
            holded: holdedId,
            holdedNum: raw.clientRecord?.num || null,
          },
          
          // Timestamps
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Crear Party asociado
        const party = {
          id: partyId,
          name: raw.name,
          kind: 'ORG' as const,
          tradeName: raw.tradeName || null,
          vat: raw.vatnumber || null,
          
          // Dirección
          billingAddress: raw.billAddress ? {
            street: raw.billAddress.address || '',
            city: raw.billAddress.city || '',
            zip: raw.billAddress.postalCode || '',
            province: raw.billAddress.province || '',
            country: raw.billAddress.country || 'España',
          } : undefined,
          
          // Contacto
          emails: raw.email ? [{ value: raw.email, isPrimary: true }] : [],
          phones: [
            ...(raw.phone ? [{ value: raw.phone, isPrimary: true }] : []),
            ...(raw.mobile ? [{ value: raw.mobile, isPrimary: false }] : []),
          ],
          
          // Tags
          tags: accountType === 'ONLINE' ? ['shopify', 'ecommerce'] : [],
          
          // Roles
          roles: ['CUSTOMER'] as const,
          
          // Timestamps
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Write to Firestore (batch)
        const batch = adminDb.batch();
        batch.set(adminDb.collection('accounts').doc(accountId), account);
        batch.set(adminDb.collection('parties').doc(partyId), party);
        await batch.commit();
        
        console.log(`   ✅ ${accountType.padEnd(12)} | ${raw.name}`);
        created++;
        
      } catch (error: any) {
        console.error(`   ❌ Error con "${raw.name}": ${error.message}`);
        errors++;
      }
    }
    
    // ========================================================================
    // STEP 4: Report
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DE MIGRACIÓN\n');
    console.log(`   ✅ Creados:  ${created.toString().padStart(4)} accounts`);
    console.log(`   ⏭️  Skipped:  ${skipped.toString().padStart(4)} (ya existían)`);
    console.log(`   ❌ Errores:  ${errors.toString().padStart(4)}`);
    
    console.log('\n📈 CLASIFICACIÓN POR TIPO:\n');
    Object.entries(typeStats)
      .filter(([_, count]) => count > 0)
      .forEach(([type, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   ${type.padEnd(12)} ${count.toString().padStart(4)} ${bar}`);
      });
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Migración completada exitosamente!\n');
    
    console.log('📝 Próximos pasos:');
    console.log('   1. Verificar datos en Firebase Console');
    console.log('   2. Deploy índices Firestore (ver PIPELINE_FIRESTORE_SETUP.md)');
    console.log('   3. Crear PipelinePage.tsx para visualizar');
    console.log('   4. Test con datos reales\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR FATAL:');
    console.error(error);
    process.exit(1);
  }
}

// Run
migrateHoldedContactsToAccounts().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
