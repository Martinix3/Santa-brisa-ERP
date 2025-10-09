// src/server/actions/santa-brain.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { ok, fail, type ActionResult } from '@/lib/result';
import { createAccountAndParty } from './create-account.action';
import type { Account, User } from '@/domain/ssot.v7';

interface SantaBrainAction {
  type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS';
  date: string | null;
  details: any;
}

interface SantaBrainData {
  accountName: string;
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
 * Busca una cuenta por nombre usando fuzzy matching avanzado
 */
async function findAccountByName(name: string, userId: string): Promise<string | null> {
  // Importar fuzzy matching
  const { fuzzyMatchAccount } = await import('@/lib/santa-brain/fuzzy-matching');
  
  // Obtener cuentas del comercial (del distribuidor)
  const partyRolesSnapshot = await db.collection('partyRoles')
    .where('userId', '==', userId)
    .where('role', '==', 'SALESPERSON')
    .get();
  
  let accountsSnapshot;
  
  if (partyRolesSnapshot.empty) {
    // Sin distribuidor, buscar cuentas propias
    accountsSnapshot = await db.collection('accounts')
      .where('ownerId', '==', userId)
      .get();
  } else {
    // Con distribuidor, buscar cuentas del distribuidor
    const distributorId = partyRolesSnapshot.docs[0].data().partyId;
    accountsSnapshot = await db.collection('accounts')
      .where('distributorPartyId', '==', distributorId)
      .get();
  }
  
  const accounts = accountsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  })) as Account[];
  
  // Usar fuzzy matching avanzado
  const match = fuzzyMatchAccount(name, accounts);
  
  if (match) {
    console.log(`[Santa Brain Actions] ✅ Fuzzy match: "${name}" → "${match.match.name}" (${match.score.toFixed(0)}%, ${match.matchType})`);
    return match.match.id;
  }
  
  console.log(`[Santa Brain Actions] ⚠️ No match encontrado para: "${name}"`);
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
        const allNotes = visitas.map(v => (v.details.notes || '').toLowerCase()).join(' ');
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
        distributorPartyId: distributorId || undefined,
      });
      
      accountId = accountResult.account.account.id;
      
      // Actualizar stage según lo determinado
      if (initialStage !== 'POTENCIAL') {
        await db.collection('accounts').doc(accountId).update({
          stage: initialStage,
          updatedAt: now
        });
      }
      
      successes.push({ type: 'CUENTA_CREADA', id: accountId });
    } else {
      // Buscar cuenta existente con fuzzy matching
      const foundId = await findAccountByName(data.accountName, userId);
      
      if (!foundId) {
        return fail(`No se encontró la cuenta "${data.accountName}"`);
      }
      
      accountId = foundId;
    }
    
    // 2. Procesar cada acción (con try-catch individual)
    for (const action of data.actions) {
      try {
        switch (action.type) {
          case 'VISITA': {
            // Crear interacción
            const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.collection('interactions').doc(interactionId).set({
              id: interactionId,
              accountId,
              userId,
              kind: 'VISITA',
              dept: 'VENTAS',
              date: action.date || now.split('T')[0],
              note: action.details.notes || data.rawTranscript.substring(0, 200),
              createdAt: now,
              updatedAt: now,
            });
            successes.push({ type: 'VISITA', id: interactionId });
            break;
          }
          
          case 'PEDIDO': {
            // Crear orden de venta
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Obtener cuenta para determinar segmento
            const accountDoc = await db.collection('accounts').doc(accountId).get();
            const accountSegment = accountDoc.exists ? accountDoc.data()?.segment : 'HORECA';
            
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
              throw new Error('Producto Santa Brisa no encontrado');
            }
            
            const unitsPerCase = santaBrisa.unitsPerCase || 6;
            
            // Mapear líneas con conversión cajas → botellas
            const lines = (action.details.lines || []).map((line: any) => {
              // Convertir cajas a botellas si es necesario
              const unit = line.unit || 'botellas';
              let quantityInBottles = line.quantity || 1;
              
              if (unit === 'cajas' || unit === 'caja') {
                quantityInBottles = (line.quantity || 1) * unitsPerCase;
                console.log(`[Santa Brain] Conversión: ${line.quantity} cajas = ${quantityInBottles} botellas`);
              }
              
              // Obtener precio según segmento
              let priceUnit = santaBrisa.priceBase || 0;
              if (santaBrisa.priceList && santaBrisa.priceList[accountSegment]) {
                priceUnit = santaBrisa.priceList[accountSegment];
              }
              
              return {
                sku: santaBrisa.sku || 'SB-750',
                itemId: santaBrisa.id,
                quantity: quantityInBottles, // Siempre en botellas
                unit: 'botellas',
                priceUnit,
                originalInput: `${line.quantity} ${unit}`, // Para auditoría
              };
            });
            
            const totalAmount = lines.reduce((sum: number, l: any) => 
              sum + (l.quantity * l.priceUnit), 0
            );
            
            // Obtener distribuidor (del comercial o null)
            const distributorId = await getUserDistributor(userId);
            
            await db.collection('ordersSellOut').doc(orderId).set({
              id: orderId,
              accountId,
              userId,
              distributorId: distributorId || undefined,
              status: 'PENDING',
              lines,
              totalAmount,
              currency: 'EUR',
              note: action.details.notes || '',
              date: action.date || now.split('T')[0],
              createdAt: now,
              updatedAt: now,
            });
            
            // Actualizar stage de cuenta a ACTIVA si estaba en POTENCIAL o SEGUIMIENTO
            const accountDocCheck = await db.collection('accounts').doc(accountId).get();
            if (accountDocCheck.exists) {
              const accountData = accountDocCheck.data();
              if (accountData?.stage === 'POTENCIAL' || accountData?.stage === 'SEGUIMIENTO') {
                await db.collection('accounts').doc(accountId).update({
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
              type: action.details.eventType || 'degustacion',
              date: action.date || now.split('T')[0],
              note: action.details.notes || '',
              createdAt: now,
              updatedAt: now,
            });
            successes.push({ type: 'EVENTO', id: eventId });
            break;
          }
          
          case 'POS': {
            // Crear registro de material POS
            const posId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.collection('posTactics').doc(posId).set({
              id: posId,
              accountId,
              userId,
              items: action.details.items || [],
              tacticType: action.details.tacticType || 'material',
              date: action.date || now.split('T')[0],
              note: action.details.notes || '',
              createdAt: now,
              updatedAt: now,
            });
            successes.push({ type: 'POS', id: posId });
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
