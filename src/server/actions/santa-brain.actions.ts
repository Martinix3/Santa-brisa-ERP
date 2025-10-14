// src/server/actions/santa-brain.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { ok, fail, type ActionResult } from '@/lib/result';
import { createAccountAndParty } from './create-account.action';
import type { Account, User } from '@/domain/ssot';

interface SantaBrainAction {
  type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS';
  what: string; // Descripción/cantidad/tipo
  details: string;
  date: string | null;
  scheduledDate?: string | null; // Fecha programada
}

interface SantaBrainData {
  accountName: string;
  accountId?: string; // ID de cuenta si ya existe
  isNewAccount: boolean;
  actions: SantaBrainAction[];
  rawTranscript: string;
}

interface SaveResult {
  accountId: string;
  successes: Array<{ type: string; id?: string }>;
  failures: Array<{ type: string; error: string }>;
}

/**
 * Busca una cuenta por nombre usando Algolia (con fallback a fuzzy local)
 */
async function findAccountByName(name: string, userId: string): Promise<string | null> {
  // 1. Intentar con Algolia primero (rápido, typo tolerance)
  try {
    const { findContactByName } = await import('@/lib/algolia/search');
    const algoliaMatch = await findContactByName(name, userId);
    
    if (algoliaMatch) {
      console.log(`[Santa Brain] ✅ Algolia match: "${name}" → "${algoliaMatch.displayName}" (${algoliaMatch.id})`);
      return algoliaMatch.id;
    }
    
    console.log(`[Santa Brain] ⚠️ Algolia: no match para "${name}", usando fallback local`);
  } catch (error: any) {
    console.warn(`[Santa Brain] ⚠️ Algolia error: ${error.message}, usando fallback local`);
  }
  
  // 2. Fallback: Fuzzy matching local (robusto pero más lento)
  
  // Obtener cuentas del comercial (del distribuidor)
  const partyRolesSnapshot = await db.collection('partyRoles')
    .where('userId', '==', userId)
    .where('role', '==', 'SALESPERSON')
    .get();
  
  let accountsSnapshot;
  
  if (partyRolesSnapshot.empty) {
    // Sin distribuidor, buscar cuentas propias
    accountsSnapshot = await db.collection('contacts')
      .where('ownerId', '==', userId)
      .get();
  } else {
    // Con distribuidor, buscar cuentas del distribuidor
    const distributorId = partyRolesSnapshot.docs[0].data().partyId;
    accountsSnapshot = await db.collection('contacts')
      .where('distributorPartyId', '==', distributorId)
      .get();
  }
  
  const accounts = accountsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  })) as any[];
  
  console.log(`[Santa Brain] 🔍 Cuentas disponibles (${accounts.length}):`, accounts.map(a => a.displayName || a.name));
  
  // Normalizar para búsqueda flexible
  const normalizeString = (str: string) => {
    let normalized = str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
    
    // Quitar palabras comunes al inicio
    const prefixes = ['bar ', 'restaurante ', 'cafe ', 'cafeteria ', 'hotel ', 'pub ', 'discoteca ', 'club '];
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length);
        break;
      }
    }
    
    return normalized
      .replace(/[^a-z0-9\s]/g, '') // Quitar puntuación
      .trim();
  };
  
  const searchNormalized = normalizeString(name);
  console.log(`[Santa Brain] Búsqueda normalizada: "${name}" → "${searchNormalized}"`);
  
  // Obtener info del usuario para scoring
  const userDoc = await db.collection('users').doc(userId).get();
  const userCity = userDoc.exists ? userDoc.data()?.city : null;
  const userDistributorId = partyRolesSnapshot.empty ? null : partyRolesSnapshot.docs[0].data().partyId;
  
  // Función de scoring para desempate
  const scoreMatch = (account: any, isExact: boolean): number => {
    let score = isExact ? 100 : 50; // Base score
    
    // +30 si mismo distribuidor
    if (userDistributorId && account.distributorPartyId === userDistributorId) {
      score += 30;
    }
    
    // +20 si misma ciudad
    if (userCity && account.addresses && account.addresses.length > 0) {
      const accountCity = account.addresses[0]?.city;
      if (accountCity && normalizeString(accountCity) === normalizeString(userCity)) {
        score += 20;
      }
    }
    
    return score;
  };
  
  // 1. Intento: Coincidencia exacta (case-insensitive)
  const exactMatches = accounts.filter(a => {
    const accountName = a.displayName || a.tradeName || a.legalName || a.name || '';
    return normalizeString(accountName) === searchNormalized;
  });
  
  if (exactMatches.length === 1) {
    const match = exactMatches[0];
    const matchedName = match.displayName || match.tradeName || match.name;
    console.log(`[Santa Brain] ✅ Exact match: "${name}" → "${matchedName}"`);
    return match.id;
  } else if (exactMatches.length > 1) {
    // Desempate por score
    const scored = exactMatches.map(a => ({ account: a, score: scoreMatch(a, true) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    
    console.log(`[Santa Brain] ✅ Exact match (${exactMatches.length} candidatos, score: ${best.score}):`, 
      `"${name}" → "${best.account.displayName || best.account.name}"`);
    return best.account.id;
  }
  
  // 2. Intento: Coincidencia parcial (incluye)
  const partialMatches = accounts.filter(a => {
    const accountName = a.displayName || a.tradeName || a.legalName || a.name || '';
    const accountNorm = normalizeString(accountName);
    return accountNorm.includes(searchNormalized) || searchNormalized.includes(accountNorm);
  });
  
  if (partialMatches.length === 1) {
    const match = partialMatches[0];
    const matchedName = match.displayName || match.tradeName || match.name;
    console.log(`[Santa Brain] ✅ Partial match: "${name}" → "${matchedName}"`);
    return match.id;
  } else if (partialMatches.length > 1) {
    // Desempate por score
    const scored = partialMatches.map(a => ({ account: a, score: scoreMatch(a, false) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    
    console.log(`[Santa Brain] ✅ Partial match (${partialMatches.length} candidatos, score: ${best.score}):`,
      `"${name}" → "${best.account.displayName || best.account.name}"`);
    return best.account.id;
  }
  
  // 3. Intento: Fuzzy matching avanzado (solo si existe la función)
  try {
    const { fuzzyMatchAccount } = await import('@/lib/santa-brain/fuzzy-matching');
    const fuzzyMatch = fuzzyMatchAccount(name, accounts);
    
    if (fuzzyMatch) {
      console.log(`[Santa Brain] ✅ Fuzzy match: "${name}" → "${fuzzyMatch.match.name}" (${fuzzyMatch.score.toFixed(0)}%)`);
      return fuzzyMatch.match.id;
    }
  } catch (e) {
    console.log(`[Santa Brain] ⚠️ Fuzzy matching no disponible`);
  }
  
  console.log(`[Santa Brain] ⚠️ No match encontrado para: "${name}"`);
  return null;
}

/**
 * Obtiene el distribuidor del usuario (para comerciales)
 */
async function getUserDistributor(userId: string): Promise<string | null> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  
  const userData = userDoc.data() as User;
  if (userData.role !== 'comercial') return null;
  
  // Buscar el partyRole del usuario como comercial
  const partyRolesSnapshot = await db.collection('partyRoles')
    .where('userId', '==', userId)
    .where('role', '==', 'SALESPERSON')
    .get();
  
  if (partyRolesSnapshot.empty) return null;
  
  // El distribuidor es el partyId del comercial
  return partyRolesSnapshot.docs[0].data().partyId;
}

/**
 * Guarda los datos procesados por Santa Brain
 */
export async function saveSantaBrainData(
  data: SantaBrainData,
  userId: string
): Promise<ActionResult<SaveResult>> {
  try {
    const now = new Date().toISOString();
    const successes: Array<{ type: string; id?: string }> = [];
    const failures: Array<{ type: string; error: string }> = [];
    
    // 1. Resolver o crear cuenta
    let accountId: string;
    
    if (data.isNewAccount) {
      // Crear nueva cuenta
      const distributorId = await getUserDistributor(userId);
      
      // Determinar stage según acciones
      const hasPedido = data.actions.some(a => a.type === 'PEDIDO');
      const visitas = data.actions.filter(a => a.type === 'VISITA');
      
      let initialStage: 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' = 'POTENCIAL';
      
      if (hasPedido) {
        initialStage = 'ACTIVA';
      } else if (visitas.length > 0) {
        // Analizar sentimiento de la visita
        const allNotes = visitas.map(v => `${v.what} ${v.details}`.toLowerCase()).join(' ');
        const transcript = data.rawTranscript.toLowerCase();
        const fullText = `${allNotes} ${transcript}`;
        
        // Palabras negativas -> FALLIDA
        const negativeWords = ['no le interesa', 'no interesa', 'rechazó', 'rechaza', 'no quiere', 'no están interesados'];
        const isNegative = negativeWords.some(word => fullText.includes(word));
        
        if (isNegative) {
          initialStage = 'FALLIDA';
        } else {
          // Si hay interés o seguimiento -> SEGUIMIENTO
          initialStage = 'SEGUIMIENTO';
        }
      }
      
      const accountResult = await createAccountAndParty({
        name: data.accountName,
        type: 'HORECA', // Por defecto
        ownerId: userId,
        distributorId: distributorId || undefined,
      });
      
      accountId = accountResult.account.account.id;
      
      // Actualizar stage según lo determinado
      if (initialStage !== 'POTENCIAL') {
        await db.collection('contacts').doc(accountId).update({
          stage: initialStage,
          updatedAt: now
        });
      }
      
      successes.push({ type: 'CUENTA_CREADA', id: accountId });
    } else {
      // Si ya tenemos accountId, usarlo directamente
      if (data.accountId) {
        console.log(`[Santa Brain] ✅ Usando cuenta proporcionada: ${data.accountId}`);
        accountId = data.accountId;
      } else {
        // Buscar cuenta existente con fuzzy matching
        console.log(`[Santa Brain] 🔍 Buscando cuenta: "${data.accountName}"`);
        const foundId = await findAccountByName(data.accountName, userId);
        
        if (foundId) {
          console.log(`[Santa Brain] ✅ Usando cuenta existente: ${foundId}`);
          accountId = foundId;
        } else {
        // No se encuentra → crear automáticamente
        console.log(`[Santa Brain] 🟡 Cuenta no encontrada, creando automáticamente: "${data.accountName}"`);
        
        const distributorId = await getUserDistributor(userId);
        const accountResult = await createAccountAndParty({
          name: data.accountName || 'Nueva cuenta',
          type: 'HORECA',
          ownerId: userId,
          distributorId: distributorId || undefined,
        });
        
          accountId = accountResult.account.account.id;
          console.log(`[Santa Brain] ✅ Cuenta creada: ${accountId}`);
          successes.push({ type: 'CUENTA_CREADA', id: accountId });
        }
      }
    }
    
    // 2. Procesar cada acción (con try-catch individual)
    for (const action of data.actions) {
      try {
        switch (action.type) {
          case 'VISITA': {
            // Crear interacción
            const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('[Santa Brain] 🔵 Creando VISITA:', { interactionId, accountId, userId });
            
            await db.collection('interactions').doc(interactionId).set({
              id: interactionId,
              accountId,
              userId,
              kind: 'VISITA',
              dept: 'VENTAS',
              date: action.date || now.split('T')[0],
              scheduledDate: action.scheduledDate || null,
              note: action.details || data.rawTranscript.substring(0, 200),
              createdAt: now,
              updatedAt: now,
            });
            
            console.log('[Santa Brain] ✅ VISITA creada:', interactionId);
            successes.push({ type: 'VISITA', id: interactionId });
            
            // Si tiene scheduledDate, crear Task
            if (action.scheduledDate) {
              const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await db.collection('tasks').doc(taskId).set({
                id: taskId,
                kind: 'interaction',
                title: `Visita programada${action.what ? ': ' + action.what : ''}`,
                desc: action.details || '',
                accountId,
                assigneeId: userId,
                dueAt: action.scheduledDate,
                status: 'todo',
                priority: 'med',
                tags: ['visita', 'autogen'],
                createdAt: now,
              });
              console.log('[Santa Brain] ✅ TASK creada para visita:', taskId);
            }
            
            break;
          }
          
          case 'PEDIDO': {
            // Crear orden de venta
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('[Santa Brain] 🔵 Creando PEDIDO:', { orderId, accountId, userId });
            
            // Obtener cuenta para determinar segmento
            const accountDoc = await db.collection('contacts').doc(accountId).get();
            const accountSegment = accountDoc.exists ? accountDoc.data()?.accountType : 'HORECA';
            
            // Obtener Santa Brisa (único producto)
            const santaBrisaSnapshot = await db.collection('items')
              .where('name', '==', 'Santa Brisa 750ml')
              .limit(1)
              .get();
            
            let santaBrisa: any = null;
            if (!santaBrisaSnapshot.empty) {
              santaBrisa = { id: santaBrisaSnapshot.docs[0].id, ...santaBrisaSnapshot.docs[0].data() };
            } else {
              // Fallback: primer item activo
              const fallbackSnapshot = await db.collection('items')
                .where('isActive', '==', true)
                .limit(1)
                .get();
              if (!fallbackSnapshot.empty) {
                santaBrisa = { id: fallbackSnapshot.docs[0].id, ...fallbackSnapshot.docs[0].data() };
              }
            }
            
            if (!santaBrisa) {
              console.warn('[Santa Brain] ⚠️ Producto Santa Brisa no encontrado, creando pedido sin líneas');
              // Crear pedido sin líneas de producto
            await db.collection('ordersSellOut').doc(orderId).set({
              id: orderId,
              accountId,
              userId,
              distributorId: await getUserDistributor(userId) || undefined,
              status: 'CONFIRMED',
              lines: [],
              totalAmount: 0,
              currency: 'EUR',
              note: action.details || 'Pedido registrado - productos por definir',
              date: action.date || now.split('T')[0],
              createdAt: now,
              updatedAt: now,
            });
              
              console.log('[Santa Brain] ✅ PEDIDO creado (sin productos):', orderId);
              successes.push({ type: 'PEDIDO', id: orderId });
              break;
            }
            
            const unitsPerCase = santaBrisa.unitsPerCase || 6;
            
            // Parsear cantidad del campo "what" (ej: "4 cajas", "12 botellas")
            const whatMatch = action.what.match(/(\d+)\s*(caja|cajas|botella|botellas)/i);
            let quantityInBottles = 1;
            
            if (whatMatch) {
              const qty = parseInt(whatMatch[1]);
              const unit = whatMatch[2].toLowerCase();
              
              if (unit.startsWith('caja')) {
                quantityInBottles = qty * unitsPerCase;
                console.log(`[Santa Brain] Conversión: ${qty} cajas = ${quantityInBottles} botellas`);
              } else {
                quantityInBottles = qty;
              }
            }
            
            // Obtener precio según segmento
            let priceUnit = santaBrisa.priceBase || 0;
            if (santaBrisa.priceList && santaBrisa.priceList[accountSegment]) {
              priceUnit = santaBrisa.priceList[accountSegment];
            }
            
            const lines = [{
              sku: santaBrisa.id,
              quantity: quantityInBottles,
              unit: 'botellas',
              priceUnit,
              originalInput: action.what,
            }];
            
            const totalAmount = quantityInBottles * priceUnit;
            
            // Obtener distribuidor (del comercial o null)
            const distributorId = await getUserDistributor(userId);
            
            await db.collection('ordersSellOut').doc(orderId).set({
              id: orderId,
              accountId,
              userId,
              distributorId: distributorId || undefined,
              status: 'CONFIRMED',
              lines,
              totalAmount,
              currency: 'EUR',
              note: action.details || '',
              date: action.date || now.split('T')[0],
              createdAt: now,
              updatedAt: now,
            });
            
            console.log('[Santa Brain] ✅ PEDIDO creado:', orderId);
            
            // Actualizar stage de cuenta a ACTIVA si estaba en POTENCIAL o SEGUIMIENTO
            const accountDocCheck = await db.collection('contacts').doc(accountId).get();
            if (accountDocCheck.exists) {
              const accountData = accountDocCheck.data();
              if (accountData?.stage === 'POTENCIAL' || accountData?.stage === 'SEGUIMIENTO') {
                await db.collection('contacts').doc(accountId).update({
                  stage: 'ACTIVA',
                  updatedAt: now
                });
              }
            }
            
            successes.push({ type: 'PEDIDO', id: orderId });
            break;
          }
          
          case 'EVENTO': {
            // Crear evento de marketing
            const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.collection('marketingEvents').doc(eventId).set({
              id: eventId,
              accountId,
              userId,
              type: action.what || 'degustacion', // "mariachis", "degustación", etc.
              scheduledDate: action.scheduledDate || null,
              date: action.date || now.split('T')[0],
              note: action.details || '',
              createdAt: now,
              updatedAt: now,
            });
            successes.push({ type: 'EVENTO', id: eventId });
            
            // Si tiene scheduledDate, crear Task
            if (action.scheduledDate) {
              const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await db.collection('tasks').doc(taskId).set({
                id: taskId,
                kind: 'event',
                title: `Evento: ${action.what || 'Marketing'}`,
                desc: action.details || '',
                accountId,
                assigneeId: userId,
                dueAt: action.scheduledDate,
                status: 'todo',
                priority: 'high',
                tags: ['evento', 'autogen', action.what || 'marketing'],
                createdAt: now,
              });
              console.log('[Santa Brain] ✅ TASK creada para evento:', taskId);
            }
            
            break;
          }
          
          case 'POS': {
            // Crear registro de material POS
            const posId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.collection('posTactics').doc(posId).set({
              id: posId,
              accountId,
              userId,
              description: action.what || 'Material POS', // "Menú", "Cartel", etc.
              date: action.date || now.split('T')[0],
              note: action.details || '',
              createdAt: now,
              updatedAt: now,
            });
            successes.push({ type: 'POS', id: posId });
            
            // Crear Task para acción POS (siempre, 7 días)
            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const dueDate = new Date(Date.now() + 7 * 24 * 3600e3).toISOString();
            await db.collection('tasks').doc(taskId).set({
              id: taskId,
              kind: 'pos',
              title: `Material POS: ${action.what || 'Pendiente'}`,
              desc: action.details || '',
              accountId,
              assigneeId: userId,
              dueAt: dueDate,
              status: 'todo',
              priority: 'med',
              tags: ['pos', 'autogen'],
              createdAt: now,
            });
            console.log('[Santa Brain] ✅ TASK creada para POS:', taskId);
            
            break;
          }
        }
      } catch (actionError: any) {
        console.error(`Error procesando acción ${action.type}:`, actionError);
        failures.push({
          type: action.type,
          error: actionError.message || 'Error desconocido',
        });
      }
    }
    
    return ok({
      accountId,
      successes,
      failures,
    });
  } catch (error: any) {
    console.error('Error en saveSantaBrainData:', error);
    return fail(error.message || 'Error al guardar los datos');
  }
}
