"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTaskToAlgolia = exports.syncContactToAlgolia = void 0;
const functions = __importStar(require("firebase-functions"));
const algoliasearch_1 = require("algoliasearch");
// Inicializar Algolia
const getAlgoliaClient = () => {
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_ADMIN_KEY;
    if (!appId || !apiKey) {
        throw new Error('Algolia credentials not configured');
    }
    return (0, algoliasearch_1.algoliasearch)(appId, apiKey);
};
/**
 * Sync contact to Algolia when created/updated/deleted
 */
exports.syncContactToAlgolia = functions
    .firestore
    .document('contacts/{contactId}')
    .onWrite(async (change, context) => {
    var _a, _b;
    try {
        const client = getAlgoliaClient();
        const contactId = context.params.contactId;
        // Delete
        if (!change.after.exists) {
            console.log(`[Algolia] Deleting contact ${contactId}`);
            await client.deleteObject({
                indexName: 'contacts',
                objectID: contactId
            });
            return null;
        }
        // Create/Update
        const data = change.after.data();
        if (!data)
            return null;
        // Solo indexar contactos con rol CUSTOMER
        if (!data.roles || !Array.isArray(data.roles) || !data.roles.includes('CUSTOMER')) {
            console.log(`[Algolia] Skipping contact ${contactId} - not a customer`);
            // Si existía antes, eliminarlo
            if (change.before.exists) {
                await client.deleteObject({
                    indexName: 'contacts',
                    objectID: contactId
                });
            }
            return null;
        }
        // Preparar objeto para Algolia
        const algoliaObject = {
            objectID: contactId,
            id: contactId,
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
            // Campos adicionales para búsqueda
            _tags: [
                ((_a = data.customer) === null || _a === void 0 ? void 0 : _a.segment) || '',
                ((_b = data.customer) === null || _b === void 0 ? void 0 : _b.stage) || '',
                data.status || ''
            ].filter(Boolean)
        };
        console.log(`[Algolia] Saving contact ${contactId}: ${algoliaObject.displayName}`);
        await client.saveObject({
            indexName: 'contacts',
            body: algoliaObject
        });
        return null;
    }
    catch (error) {
        console.error('[Algolia] Error syncing contact:', error);
        throw error;
    }
});
/**
 * Sync task to Algolia when created/updated/deleted
 */
exports.syncTaskToAlgolia = functions
    .firestore
    .document('tasks/{taskId}')
    .onWrite(async (change, context) => {
    try {
        const client = getAlgoliaClient();
        const taskId = context.params.taskId;
        // Delete
        if (!change.after.exists) {
            console.log(`[Algolia] Deleting task ${taskId}`);
            await client.deleteObject({
                indexName: 'tasks',
                objectID: taskId
            });
            return null;
        }
        // Create/Update
        const data = change.after.data();
        if (!data)
            return null;
        // No indexar tareas muy antiguas completadas (> 6 meses)
        if (data.status === 'DONE' && data.closedAt) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            if (new Date(data.closedAt) < sixMonthsAgo) {
                console.log(`[Algolia] Skipping old completed task ${taskId}`);
                // Si existía antes, eliminarlo
                if (change.before.exists) {
                    await client.deleteObject({
                        indexName: 'tasks',
                        objectID: taskId
                    });
                }
                return null;
            }
        }
        // Preparar objeto para Algolia
        const algoliaObject = {
            objectID: taskId,
            id: taskId,
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
            // Timestamp numérico para ordenar
            _dueAtTimestamp: data.dueAt ? new Date(data.dueAt).getTime() : 0,
            _priorityRank: data.isPriority ? 4 : (data.priority === 'URGENT' ? 3 :
                data.priority === 'HIGH' ? 2 :
                    data.priority === 'MEDIUM' ? 1 : 0),
            // Tags para filtrado
            _tags: [
                data.status || '',
                data.kind || '',
                data.department || '',
                data.slaBucket || ''
            ].filter(Boolean)
        };
        console.log(`[Algolia] Saving task ${taskId}: ${algoliaObject.title}`);
        await client.saveObject({
            indexName: 'tasks',
            body: algoliaObject
        });
        return null;
    }
    catch (error) {
        console.error('[Algolia] Error syncing task:', error);
        throw error;
    }
});
//# sourceMappingURL=algolia-sync.js.map