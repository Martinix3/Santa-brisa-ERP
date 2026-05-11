#!/usr/bin/env tsx
/**
 * SSOT V2.1: Order Migration Script
 * 
 * Populates V2.1 fields in existing OrderSellOut documents:
 * - channel (inferred from account segment)
 * - ownerId/ownerName (from account)
 * - customerVat, customerName, contactPerson
 * - billingAddress, shippingAddress, bankAccount
 * 
 * Usage:
 *   npm run migrate:orders-v2.1           # Dry run (preview changes)
 *   npm run migrate:orders-v2.1 --execute # Execute migration
 */

import { adminDb } from '../src/server/firebase';
import { inferChannelFromSegment, populateOrderCustomerData } from '../src/domain/ssot-v2-plus-schemas';
import type { OrderSellOut, Contact, Party, Account } from '../src/domain/ssot';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = !process.argv.includes('--execute');
const BATCH_SIZE = 50;
const DELAY_MS = 100; // Delay between batches to avoid rate limits

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
  total: number;
  processed: number;
  enriched: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ orderId: string; error: string }>;
}

interface OrderEnrichment {
  orderId: string;
  before: Partial<OrderSellOut>;
  after: Partial<OrderSellOut>;
  changes: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getContact(contactId: string): Promise<Contact | null> {
  try {
    const doc = await adminDb.collection('contacts').doc(contactId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Contact) : null;
  } catch (error) {
    console.error(`Error fetching contact ${contactId}:`, error);
    return null;
  }
}

async function getParty(partyId: string): Promise<Party | null> {
  try {
    const doc = await adminDb.collection('parties').doc(partyId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Party) : null;
  } catch (error) {
    console.error(`Error fetching party ${partyId}:`, error);
    return null;
  }
}

async function getAccount(accountId: string): Promise<Account | null> {
  try {
    const doc = await adminDb.collection('accounts').doc(accountId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Account) : null;
  } catch (error) {
    console.error(`Error fetching account ${accountId}:`, error);
    return null;
  }
}

function needsEnrichment(order: OrderSellOut): boolean {
  // Check if order is missing V2.1 fields
  return !(
    order.channel &&
    order.customerVat &&
    order.customerName &&
    order.billingAddress
  );
}

function getChanges(before: Partial<OrderSellOut>, after: Partial<OrderSellOut>): string[] {
  const changes: string[] = [];
  
  if (!before.channel && after.channel) {
    changes.push(`channel: ${after.channel}`);
  }
  if (!before.ownerId && after.ownerId) {
    changes.push(`ownerId: ${after.ownerId}`);
  }
  if (!before.ownerName && after.ownerName) {
    changes.push(`ownerName: ${after.ownerName}`);
  }
  if (!before.customerVat && after.customerVat) {
    changes.push(`customerVat: ${after.customerVat}`);
  }
  if (!before.customerName && after.customerName) {
    changes.push(`customerName: ${after.customerName}`);
  }
  if (!before.billingAddress && after.billingAddress) {
    changes.push(`billingAddress: ${after.billingAddress.city}`);
  }
  if (!before.shippingAddress && after.shippingAddress) {
    changes.push(`shippingAddress: ${after.shippingAddress.city}`);
  }
  if (!before.bankAccount && after.bankAccount) {
    changes.push(`bankAccount: ${after.bankAccount}`);
  }
  
  return changes;
}

async function enrichOrder(order: OrderSellOut): Promise<OrderEnrichment | null> {
  try {
    const before = { ...order };
    
    // Step 1: Get account to infer channel and owner
    const account = order.accountId ? await getAccount(order.accountId) : null;
    
    // Step 2: Get contact/party for customer data
    let contact: Contact | null = null;
    let party: Party | null = null;
    
    if (order.partyId) {
      party = await getParty(order.partyId);
    }
    if (account?.partyId) {
      contact = await getContact(account.partyId);
    }
    
    // Step 3: Build enriched order
    const enriched = populateOrderCustomerData(order, contact, party);
    
    // Step 4: Infer channel from account segment
    if (!enriched.channel && account?.segment) {
      enriched.channel = inferChannelFromSegment(account.segment);
    }
    
    // Step 5: Set owner from account
    if (!enriched.ownerId && account?.ownerId) {
      enriched.ownerId = account.ownerId;
    }
    
    // Step 6: Get owner name from users collection
    if (enriched.ownerId && !enriched.ownerName) {
      try {
        const userDoc = await adminDb.collection('users').doc(enriched.ownerId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          enriched.ownerName = userData?.displayName || userData?.name;
        }
      } catch (error) {
        console.warn(`Could not fetch owner name for ${enriched.ownerId}`);
      }
    }
    
    // Step 7: Set distributorPartyId from account if PLACEMENT flow
    if (order.flow === 'PLACEMENT' && !enriched.distributorPartyId && account?.distributorPartyId) {
      enriched.distributorPartyId = account.distributorPartyId;
    }
    
    const changes = getChanges(before, enriched);
    
    if (changes.length === 0) {
      return null; // No changes needed
    }
    
    return {
      orderId: order.id,
      before,
      after: enriched,
      changes
    };
  } catch (error) {
    console.error(`Error enriching order ${order.id}:`, error);
    return null;
  }
}

async function applyEnrichment(enrichment: OrderEnrichment): Promise<void> {
  const updateData: any = {
    updatedAt: new Date().toISOString()
  };
  
  if (enrichment.after.channel) updateData.channel = enrichment.after.channel;
  if (enrichment.after.ownerId) updateData.ownerId = enrichment.after.ownerId;
  if (enrichment.after.ownerName) updateData.ownerName = enrichment.after.ownerName;
  if (enrichment.after.customerVat) updateData.customerVat = enrichment.after.customerVat;
  if (enrichment.after.customerName) updateData.customerName = enrichment.after.customerName;
  if (enrichment.after.contactPerson) updateData.contactPerson = enrichment.after.contactPerson;
  if (enrichment.after.billingAddress) updateData.billingAddress = enrichment.after.billingAddress;
  if (enrichment.after.shippingAddress) updateData.shippingAddress = enrichment.after.shippingAddress;
  if (enrichment.after.bankAccount) updateData.bankAccount = enrichment.after.bankAccount;
  if (enrichment.after.distributorPartyId) updateData.distributorPartyId = enrichment.after.distributorPartyId;
  
  await adminDb.collection('ordersSellOut').doc(enrichment.orderId).update(updateData);
}

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

async function migrateOrders(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  };
  
  console.log('🚀 Starting OrderSellOut V2.1 Migration');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'EXECUTE (will modify data)'}`);
  console.log('');
  
  // Get total count
  const countSnapshot = await adminDb.collection('ordersSellOut').count().get();
  stats.total = countSnapshot.data().count;
  
  console.log(`📊 Total orders: ${stats.total}`);
  console.log('');
  
  // Process in batches
  let lastDoc: any = null;
  let batchNum = 0;
  
  while (true) {
    batchNum++;
    console.log(`\n📦 Processing batch ${batchNum}...`);
    
    // Query next batch
    let query = adminDb.collection('ordersSellOut')
      .orderBy('createdAt')
      .limit(BATCH_SIZE);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      break; // No more documents
    }
    
    // Process each order in batch
    for (const doc of snapshot.docs) {
      const order = { id: doc.id, ...doc.data() } as OrderSellOut;
      stats.processed++;
      
      try {
        // Check if enrichment needed
        if (!needsEnrichment(order)) {
          stats.skipped++;
          continue;
        }
        
        // Enrich order
        const enrichment = await enrichOrder(order);
        
        if (!enrichment) {
          stats.skipped++;
          continue;
        }
        
        // Display changes
        console.log(`\n  ✏️  Order ${order.id} (${order.docNumber || 'no number'})`);
        enrichment.changes.forEach(change => {
          console.log(`     + ${change}`);
        });
        
        // Apply changes if not dry run
        if (!DRY_RUN) {
          await applyEnrichment(enrichment);
          stats.enriched++;
        } else {
          stats.enriched++; // Count as enriched in dry run for stats
        }
        
      } catch (error) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errorDetails.push({
          orderId: order.id,
          error: errorMsg
        });
        console.error(`  ❌ Error processing order ${order.id}:`, errorMsg);
      }
    }
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    // Progress update
    const progress = ((stats.processed / stats.total) * 100).toFixed(1);
    console.log(`\n  Progress: ${stats.processed}/${stats.total} (${progress}%)`);
    console.log(`  Enriched: ${stats.enriched}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);
    
    // Delay between batches
    if (!snapshot.empty) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  return stats;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    const startTime = Date.now();
    
    const stats = await migrateOrders();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total orders:     ${stats.total}`);
    console.log(`Processed:        ${stats.processed}`);
    console.log(`Enriched:         ${stats.enriched}`);
    console.log(`Skipped:          ${stats.skipped}`);
    console.log(`Errors:           ${stats.errors}`);
    console.log(`Duration:         ${duration}s`);
    console.log('═'.repeat(60));
    
    if (stats.errorDetails.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errorDetails.forEach(({ orderId, error }) => {
        console.log(`  - ${orderId}: ${error}`);
      });
    }
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made');
      console.log('   Run with --execute flag to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully');
    }
    
    process.exit(stats.errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();
