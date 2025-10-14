import { algoliasearch } from 'algoliasearch';

// Inicializar cliente Algolia
const getAlgoliaClient = () => {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  
  if (!appId || !searchKey) {
    throw new Error('Algolia credentials not configured. Check .env.local');
  }
  
  return algoliasearch(appId, searchKey);
};

/**
 * Buscar contacts (cuentas) en Algolia
 */
export async function searchContacts(
  query: string,
  options: {
    userId?: string;
    segment?: string;
    hitsPerPage?: number;
  } = {}
) {
  try {
    const client = getAlgoliaClient();
    
    const filters: string[] = [];
    
    // Filtrar por usuario (si se proporciona)
    if (options.userId) {
      filters.push(`customer.ownerId:${options.userId}`);
    }
    
    // Filtrar por segmento
    if (options.segment) {
      filters.push(`customer.segment:${options.segment}`);
    }
    
    const { hits } = await client.searchSingleIndex({
      indexName: 'contacts',
      searchParams: {
        query,
        filters: filters.length > 0 ? filters.join(' AND ') : undefined,
        hitsPerPage: options.hitsPerPage || 5,
        attributesToRetrieve: [
          'id',
          'displayName',
          'customer.segment',
          'customer.stage',
          'addresses',
          'vat'
        ],
      }
    });
    
    return hits as Array<{
      objectID: string;
      id: string;
      displayName: string;
      customer: {
        segment?: string;
        stage?: string;
      };
      addresses?: Array<{ city?: string }>;
      vat?: string;
    }>;
  } catch (error) {
    console.error('[Algolia] Error searching contacts:', error);
    return [];
  }
}

/**
 * Buscar tasks en Algolia
 */
export async function searchTasks(
  query: string,
  options: {
    userId?: string;
    status?: string[];
    department?: string;
    slaBucket?: string;
    hitsPerPage?: number;
  } = {}
) {
  try {
    const client = getAlgoliaClient();
    
    const filters: string[] = [];
    
    // Filtrar por usuario asignado
    if (options.userId) {
      filters.push(`assignedToId:${options.userId}`);
    }
    
    // Filtrar por estado
    if (options.status && options.status.length > 0) {
      const statusFilters = options.status.map(s => `status:${s}`).join(' OR ');
      filters.push(`(${statusFilters})`);
    }
    
    // Filtrar por departamento
    if (options.department) {
      filters.push(`department:${options.department}`);
    }
    
    // Filtrar por SLA bucket
    if (options.slaBucket) {
      filters.push(`slaBucket:${options.slaBucket}`);
    }
    
    const { hits } = await client.searchSingleIndex({
      indexName: 'tasks',
      searchParams: {
        query,
        filters: filters.length > 0 ? filters.join(' AND ') : undefined,
        hitsPerPage: options.hitsPerPage || 20,
        attributesToRetrieve: [
          'id',
          'title',
          'kind',
          'status',
          'priority',
          'isPriority',
          'dueAt',
          'accountId',
          'slaBucket'
        ],
      }
    });
    
    return hits as Array<{
      objectID: string;
      id: string;
      title: string;
      kind: string;
      status: string;
      priority?: string;
      isPriority?: boolean;
      dueAt?: string;
      accountId?: string;
      slaBucket?: string;
    }>;
  } catch (error) {
    console.error('[Algolia] Error searching tasks:', error);
    return [];
  }
}

/**
 * Query de tareas para un usuario (para QuickTask)
 */
export async function queryTasksForUser(
  userId: string,
  timeframe: 'TODAY' | 'WEEK' | 'ALL' = 'ALL'
) {
  try {
    const client = getAlgoliaClient();
    
    let filters = `assignedToId:${userId}`;
    
    // Filtrar por timeframe
    if (timeframe === 'TODAY') {
      filters += ' AND slaBucket:TODAY';
    } else if (timeframe === 'WEEK') {
      filters += ' AND (slaBucket:TODAY OR slaBucket:WEEK)';
    }
    
    // Solo tareas no completadas
    filters += ' AND (status:BACKLOG OR status:IN_PROGRESS OR status:BLOCKED OR status:PROGRAMADA)';
    
    const { hits } = await client.searchSingleIndex({
      indexName: 'tasks',
      searchParams: {
        query: '',
        filters,
        hitsPerPage: 100,
        attributesToRetrieve: [
          'id',
          'title',
          'kind',
          'status',
          'priority',
          'isPriority',
          'dueAt',
          'accountId',
          'slaBucket'
        ],
      }
    });
    
    return hits as Array<{
      objectID: string;
      id: string;
      title: string;
      kind: string;
      status: string;
      priority?: string;
      isPriority?: boolean;
      dueAt?: string;
      accountId?: string;
      slaBucket?: string;
    }>;
  } catch (error) {
    console.error('[Algolia] Error querying tasks:', error);
    return [];
  }
}

/**
 * Encontrar contact por nombre (fuzzy matching)
 * Retorna el mejor match o null
 */
export async function findContactByName(
  name: string,
  userId?: string
): Promise<{
  id: string;
  displayName: string;
  segment?: string;
  score: number;
} | null> {
  const results = await searchContacts(name, {
    userId,
    hitsPerPage: 1
  });
  
  if (results.length === 0) {
    return null;
  }
  
  const best = results[0];
  return {
    id: best.id,
    displayName: best.displayName,
    segment: best.customer?.segment,
    score: 100 // Algolia ya da el mejor match
  };
}
