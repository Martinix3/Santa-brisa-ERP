"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { adminDb as db } from "@/server/firebase";
import { algoliasearch } from 'algoliasearch';

const getAlgoliaClient = () => {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_KEY;
  
  if (!appId || !apiKey) {
    throw new Error('Algolia credentials not configured');
  }
  
  return algoliasearch(appId, apiKey);
};

export async function reindexAlgolia() {
  try {
    const algoliaClient = getAlgoliaClient();
    
    // Indexar accounts
    const contactsSnapshot = await db.collection('accounts').get();
    const contactsData = [];
    let skippedContacts = 0;
    
    for (const doc of contactsSnapshot.docs) {
      const data = doc.data();
      
      // Solo indexar clientes
      if (!data.roles || !Array.isArray(data.roles) || !data.roles.includes('CUSTOMER')) {
        skippedContacts++;
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
    }
    
    // Indexar tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const tasksData = [];
    let skippedTasks = 0;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    for (const doc of tasksSnapshot.docs) {
      const data = doc.data();
      
      // No indexar tareas muy antiguas completadas
      if (data.status === 'DONE' && data.closedAt) {
        if (new Date(data.closedAt) < sixMonthsAgo) {
          skippedTasks++;
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
    }
    
    return {
      success: true,
      contactsIndexed: contactsData.length,
      contactsSkipped: skippedContacts,
      tasksIndexed: tasksData.length,
      tasksSkipped: skippedTasks,
    };
  } catch (error) {
    console.error('Error reindexing Algolia:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
