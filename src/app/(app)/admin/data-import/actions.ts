// src/app/(app)/admin/data-import/actions.ts
'use server';
import Papa from 'papaparse';
import { z } from 'zod';
import { SANTA_DATA_COLLECTIONS, type SantaData, type Party } from '@/domain';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import { generateNextLot, generateNextOrder } from '@/lib/codes';

// ===================================
// TYPES
// ===================================
export type StagedImportItem = {
  key: string;
  collection: keyof SantaData;
  action: 'create' | 'update';
  payload: any;
  description: string;
  warnings: string[];
};

export type ImportResult = {
  staged: StagedImportItem[];
  summary: { total: number; new: number; updated: number; warnings: number; };
  error?: string;
};

// ===================================
// HELPERS
// ===================================
const normalizeValue = (value: string, type: 'string' | 'number' | 'boolean' | 'json' | 'date') => {
  if (value === '' || value === null || value === undefined) return undefined;
  try {
    switch (type) {
      case 'number': return Number(value.replace(',', '.'));
      case 'boolean': return ['true', '1', 'yes', 'si'].includes(value.toLowerCase());
      case 'json': return JSON.parse(value);
      case 'date': return new Date(value).toISOString();
      default: return value;
    }
  } catch {
    return value; // fallback to string if parsing fails
  }
};

async function resolveFk(
  value: string,
  targetCollection: keyof SantaData,
  targetFields: string[],
  serverData: SantaData
): Promise<string | undefined> {
  if (!value) return undefined;
  const items = (serverData as any)[targetCollection] as any[];
  if (!items) return undefined;
  
  for (const field of targetFields) {
    const found = items.find(it => it[field]?.toString().toLowerCase() === value.toLowerCase());
    if (found) return found.id;
  }
  return undefined;
}

// ===================================
// MAIN SERVER ACTIONS
// ===================================

export async function importPreview(args: { collection: string; csvText: string }): Promise<ImportResult> {
  const { collection, csvText } = args;

  if (!SANTA_DATA_COLLECTIONS.includes(collection as any)) {
    return { error: 'Colección no soportada', staged: [], summary: { total: 0, new: 0, updated: 0, warnings: 0 } };
  }

  const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parseResult.errors.length > 0) {
    return { error: `Error de CSV: ${parseResult.errors[0].message}`, staged: [], summary: { total: 0, new: 0, updated: 0, warnings: 0 } };
  }
  
  const serverData = await getServerData();
  const existingItems = new Map(((serverData as any)[collection] as any[] || []).map(it => [it.id, it]));
  const staged: StagedImportItem[] = [];

  for (const row of parseResult.data as any[]) {
    let payload: any = {};
    const warnings: string[] = [];

    // Generic field processing
    for (const key in row) {
      if (row[key] !== '') {
        const value = row[key];
        // Heurísticas de normalización
        if (key.endsWith('Id') || key.endsWith('Id')) payload[key] = value;
        else if (key.includes('At') || key.includes('Date')) payload[key] = normalizeValue(value, 'date');
        else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) payload[key] = normalizeValue(value, 'json');
        else if (!isNaN(Number(value.replace(',', '.')))) payload[key] = normalizeValue(value, 'number');
        else if (['true', 'false'].includes(value.toLowerCase())) payload[key] = normalizeValue(value, 'boolean');
        else payload[key] = value;
      }
    }

    // Collection-specific logic & FK resolution
    if (collection === 'ordersSellOut') {
        const accountId = await resolveFk(row.accountCode || row.accountName, 'accounts', ['code', 'name'], serverData);
        if(accountId) {
            payload.accountId = accountId;
        } else if (row.accountName) {
            warnings.push(`Cuenta '${row.accountName}' no encontrada, se creará una nueva.`);
        }
    } else if (collection === 'interactions') {
        const accountId = await resolveFk(row.accountName, 'accounts', ['name'], serverData);
        if(accountId) payload.accountId = accountId;
        else warnings.push(`Cuenta '${row.accountName}' no encontrada.`);
        
        const userId = await resolveFk(row.userEmail, 'users', ['email'], serverData);
        if(userId) payload.userId = userId;
        else warnings.push(`Usuario con email '${row.userEmail}' no encontrado.`);
    } else if (collection === 'goodsReceipts') {
        if (payload.lines && Array.isArray(payload.lines)) {
            for(const line of payload.lines) {
                const materialId = await resolveFk(line.materialSku || line.materialId, 'materials', ['sku', 'id'], serverData);
                if(materialId) line.materialId = materialId;
                else warnings.push(`Material '${line.materialSku || line.materialId}' no encontrado.`);
            }
        }
    }
    // ... más lógicas aquí

    const key = row.id || row.code || row.name || `new_${staged.length}`;
    const action = row.id && existingItems.has(row.id) ? 'update' : 'create';
    if(action === 'create' && !row.id) payload.id = `${collection.slice(0,3)}_${Date.now()}_${staged.length}`;
    else if(action === 'update') payload.id = row.id;

    staged.push({
      key,
      collection: collection as keyof SantaData,
      action,
      payload,
      description: Object.entries(payload).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', '),
      warnings,
    });
  }
  
  return {
    staged,
    summary: {
        total: staged.length,
        new: staged.filter(s => s.action === 'create').length,
        updated: staged.filter(s => s.action === 'update').length,
        warnings: staged.reduce((acc, s) => acc + s.warnings.length, 0),
    }
  };
}

export async function importCommit(args: { stagedItems: StagedImportItem[] }): Promise<{ committedCount: number; error?: string }> {
  const { stagedItems } = args;
  if (!stagedItems || stagedItems.length === 0) {
    return { committedCount: 0, error: 'No hay datos para importar.' };
  }
  
  const serverData = await getServerData();
  const itemsToUpsert: Record<string, any[]> = {};
  
  // Re-resolve FKs and create missing entities if needed
  for (const item of stagedItems) {
    if (!itemsToUpsert[item.collection]) itemsToUpsert[item.collection] = [];

    // Special logic for creating accounts on the fly for orders
    if (item.collection === 'ordersSellOut' && !item.payload.accountId && item.payload.accountName) {
        const newPartyId = `party_imp_${Date.now()}`;
        const newAccountId = `acc_imp_${Date.now()}`;
        
        const newParty: Party = {
            id: newPartyId,
            name: item.payload.accountName,
            kind: 'ORG',
            createdAt: new Date().toISOString(),
            contacts: [], addresses: [],
        };
        const newAccount = {
            id: newAccountId,
            partyId: newPartyId,
            name: item.payload.accountName,
            type: 'HORECA',
            stage: 'POTENCIAL',
            ownerId: 'u_admin', // Asignar a un admin por defecto
            createdAt: new Date().toISOString(),
        };

        if(!itemsToUpsert['parties']) itemsToUpsert['parties'] = [];
        if(!itemsToUpsert['accounts']) itemsToUpsert['accounts'] = [];
        itemsToUpsert['parties'].push(newParty);
        itemsToUpsert['accounts'].push(newAccount);
        
        item.payload.accountId = newAccountId;
    }
    
    itemsToUpsert[item.collection].push(item.payload);
  }

  try {
    let committedCount = 0;
    for(const collName in itemsToUpsert) {
      await upsertMany(collName as keyof SantaData, itemsToUpsert[collName]);
      committedCount += itemsToUpsert[collName].length;
    }
    return { committedCount };
  } catch (e: any) {
    return { committedCount: 0, error: e.message };
  }
}
