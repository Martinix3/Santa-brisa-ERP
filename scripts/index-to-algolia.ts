#!/usr/bin/env tsx
/**
 * Script para indexar datos existentes en Algolia
 * 
 * Uso:
 * 1. Configurar variables de entorno ALGOLIA_APP_ID y ALGOLIA_ADMIN_KEY
 * 2. Ejecutar: npx tsx scripts/index-to-algolia.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { algoliasearch } from 'algoliasearch';

// Inicializar Firebase Admin con Application Default Credentials
initializeApp();

const db = getFirestore();

// Inicializar Algolia
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('❌ Error: ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY must be set');
  process.exit(1);
}

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

/**
 * Indexar todos los contacts (solo clientes)
 */
async function indexContacts() {
  console.log('\n📋 Indexing contacts...');
  
  const contactsSnapshot = await db.collection('contacts').get();
  
  const contactsData = [];
  let skipped = 0;
  
  for (const doc of contactsSnapshot.docs) {
    const data = doc.data();
    
    // Solo indexar clientes
    if (!data.roles || !Array.isArray(data.roles) || !data.roles.includes('CUSTOMER')) {
      skipped++;
      continue;
    }
    
    contactsData.push({
      objectID: doc.id,
      id: doc.id,
      displayName: data.displayName || '',
      legalName: data.legalName || '',
      tradeName: data.tradeName || '',
      nameNorm: data.nameNorm || '',
      vat: data.vat || '',
      roles: data.roles || [],
      customer: data.customer || {},
      addresses: data.addresses || [],
      status: data.status || 'active',
      updatedAt: data.updatedAt || '',
      createdAt: data.createdAt || '',
      _tags: [
        data.customer?.segment || '',
        data.customer?.stage || '',
        data.status || ''
      ].filter(Boolean)
    });
  }
  
  if (contactsData.length > 0) {
    await algoliaClient.saveObjects({
      indexName: 'contacts',
      objects: contactsData
    });
    console.log(`✅ Indexed ${contactsData.length} contacts (skipped ${skipped} non-customers)`);
  } else {
    console.log('⚠️  No contacts to index');
  }
}

/**
 * Indexar todas las tasks (excepto muy antiguas completadas)
 */
async function indexTasks() {
  console.log('\n📋 Indexing tasks...');
  
  const tasksSnapshot = await db.collection('tasks').get();
  
  const tasksData = [];
  let skipped = 0;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  for (const doc of tasksSnapshot.docs) {
    const data = doc.data();
    
    // No indexar tareas muy antiguas completadas
    if (data.status === 'DONE' && data.closedAt) {
      if (new Date(data.closedAt) < sixMonthsAgo) {
        skipped++;
        continue;
      }
    }
    
    tasksData.push({
      objectID: doc.id,
      id: doc.id,
      title: data.title || '',
      desc: data.desc || '',
      kind: data.kind || '',
      status: data.status || '',
      priority: data.priority || '',
      isPriority: data.isPriority || false,
      department: data.department || '',
      assignedToId: data.assignedToId || '',
      createdById: data.createdById || '',
      accountId: data.accountId || '',
      orderId: data.orderId || '',
      eventId: data.eventId || '',
      campaignId: data.campaignId || '',
      projectId: data.projectId || '',
      dueAt: data.dueAt || '',
      slaBucket: data.slaBucket || '',
      closedAt: data.closedAt || '',
      outcome: data.outcome || '',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      _dueAtTimestamp: data.dueAt ? new Date(data.dueAt).getTime() : 0,
      _priorityRank: data.isPriority ? 4 : (
        data.priority === 'URGENT' ? 3 :
        data.priority === 'HIGH' ? 2 :
        data.priority === 'MEDIUM' ? 1 : 0
      ),
      _tags: [
        data.status || '',
        data.kind || '',
        data.department || '',
        data.slaBucket || ''
      ].filter(Boolean)
    });
  }
  
  if (tasksData.length > 0) {
    await algoliaClient.saveObjects({
      indexName: 'tasks',
      objects: tasksData
    });
    console.log(`✅ Indexed ${tasksData.length} tasks (skipped ${skipped} old completed)`);
  } else {
    console.log('⚠️  No tasks to index');
  }
}

/**
 * Configurar índices (searchable attributes, ranking, etc)
 */
async function configureIndices() {
  console.log('\n⚙️  Configuring Algolia indices...');
  
  // Configurar índice contacts
  await algoliaClient.setSettings({
    indexName: 'contacts',
    indexSettings: {
      searchableAttributes: [
        'displayName',
        'legalName',
        'tradeName',
        'nameNorm',
        'vat',
        'unordered(addresses.city)'
      ],
      attributesForFaceting: [
        'searchable(roles)',
        'searchable(customer.segment)',
        'searchable(customer.stage)',
        'status'
      ],
      customRanking: ['desc(updatedAt)'],
      typoTolerance: 'min',
      removeStopWords: true,
      ignorePlurals: ['es'],
      queryLanguages: ['es']
    }
  });
  console.log('✅ Contacts index configured');
  
  // Configurar índice tasks
  await algoliaClient.setSettings({
    indexName: 'tasks',
    indexSettings: {
      searchableAttributes: [
        'title',
        'desc',
        'kind',
        'unordered(accountId)'
      ],
      attributesForFaceting: [
        'status',
        'priority',
        'department',
        'kind',
        'slaBucket',
        'assignedToId'
      ],
      customRanking: [
        'desc(_priorityRank)',
        'asc(_dueAtTimestamp)',
        'desc(createdAt)'
      ],
      typoTolerance: 'min',
      removeStopWords: true,
      ignorePlurals: ['es'],
      queryLanguages: ['es']
    }
  });
  console.log('✅ Tasks index configured');
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Starting Algolia indexing...');
  console.log(`📦 App ID: ${ALGOLIA_APP_ID}`);
  
  try {
    await indexContacts();
    await indexTasks();
    await configureIndices();
    
    console.log('\n✅ Indexing completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('1. Verify indices in Algolia Dashboard');
    console.log('2. Test search in Algolia Dashboard');
    console.log('3. Deploy Cloud Functions: firebase deploy --only functions');
    
  } catch (error) {
    console.error('\n❌ Error during indexing:', error);
    process.exit(1);
  }
}

main();
