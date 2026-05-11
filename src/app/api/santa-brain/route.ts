// src/app/api/santa-brain/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processSantaBrainInput, SantaBrainContext } from '@/lib/santa-brain/gemini-client';
import { fuzzyMatchAccount } from '@/lib/santa-brain/fuzzy-matching';
import { adminDb } from '@/server/firebase';
import type { Account, Item, User } from '@/domain/ssot';
import { geminiCache } from '@/lib/cache/gemini-cache';
import { santaBrainLimiter } from '@/lib/rate-limit/rate-limiter';
import { geminiTelemetry } from '@/lib/telemetry/gemini-telemetry';
import { geminiCircuitBreaker } from '@/lib/resilience/circuit-breaker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Obtiene las cuentas del distribuidor del comercial
 */
async function getComercialAccounts(userId: string): Promise<Account[]> {
  // 1. Obtener distribuidor del comercial
  const partyRolesSnapshot = await adminDb.collection('partyRoles')
    .where('userId', '==', userId)
    .where('role', '==', 'SALESPERSON')
    .get();
  
  if (partyRolesSnapshot.empty) {
    // Si no tiene distribuidor, retornar todas las cuentas del comercial
    const accountsSnapshot = await adminDb.collection('accounts')
      .where('ownerId', '==', userId)
      .get();
    
    return accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
  }
  
  const distributorId = partyRolesSnapshot.docs[0].data().partyId;
  
  // 2. Obtener cuentas de ese distribuidor
  const accountsSnapshot = await adminDb.collection('accounts')
    .where('distributorPartyId', '==', distributorId)
    .get();
  
  return accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
}

/**
 * Obtiene el producto Santa Brisa con info logística
 */
async function getSantaBrisaProduct(): Promise<Item | null> {
  const itemsSnapshot = await adminDb.collection('items')
    .where('name', '==', 'Santa Brisa 750ml')
    .limit(1)
    .get();
  
  if (itemsSnapshot.empty) {
    // Fallback: buscar por SKU o primer item activo
    const fallbackSnapshot = await adminDb.collection('items')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (fallbackSnapshot.empty) return null;
    
    return { id: fallbackSnapshot.docs[0].id, ...fallbackSnapshot.docs[0].data() } as Item;
  }
  
  return { id: itemsSnapshot.docs[0].id, ...itemsSnapshot.docs[0].data() } as Item;
}

/**
 * Obtiene catálogo POS
 */
function getPosCatalog() {
  return [
    { name: 'Vasos', type: 'VASO' },
    { name: 'Cubos', type: 'CUBO' },
    { name: 'Displays', type: 'DISPLAY' },
    { name: 'Banderolas', type: 'BANDEROLA' },
    { name: 'Manteles', type: 'MANTEL' },
    { name: 'Posavasos', type: 'POSAVASOS' },
  ];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Santa Brain] 🚀 REQUEST START');
  
  let telemetryId: string | null = null;

  try {
    const body = await request.json();
    const { text, userId } = body;

    if (!text || !userId) {
      return NextResponse.json(
        { error: 'text y userId son requeridos' },
        { status: 400 }
      );
    }
    
    // Iniciar tracking de telemetría
    telemetryId = geminiTelemetry.startRequest({
      userId,
      operation: 'santa-brain',
      model: 'gemini-2.5-flash',
      complexity: 'medium'
    });

    // Rate Limiting
    const rateLimit = await santaBrainLimiter.checkLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`[Santa Brain] ⚠️ Rate limit exceeded for user ${userId}`);
      return NextResponse.json(
        { 
          error: 'Demasiadas peticiones. Intenta de nuevo en unos momentos.',
          retryAfter: rateLimit.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString()
          }
        }
      );
    }

    // 1. Obtener usuario
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    const user = { id: userDoc.id, ...userDoc.data() } as User;

    // 2. Cargar contexto en paralelo
    const [myAccounts, santaBrisa] = await Promise.all([
      getComercialAccounts(userId),
      getSantaBrisaProduct()
    ]);
    
    if (!santaBrisa) {
      return NextResponse.json(
        { error: 'Producto Santa Brisa no encontrado en catálogo' },
        { status: 500 }
      );
    }

    console.log(`[Santa Brain] 📊 ${myAccounts.length} cuentas | Producto: ${santaBrisa.name}`);

    // 3. Construir contexto para Gemini
    const context: SantaBrainContext = {
      userId: user.id,
      userName: user.name ?? user.displayName ?? user.email,
      myAccounts: myAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        segment: acc.accountType,
        aliases: (acc as any).aliases || []
      })),
      salesCatalog: {
        id: santaBrisa.id,
        name: santaBrisa.name,
        sku: santaBrisa.sku || 'SB-750',
        unitsPerCase: (santaBrisa as any).unitsPerCase || 6,
        priceList: (santaBrisa as any).priceList || {}
      },
      posCatalog: getPosCatalog()
    };

    // 4. Intentar obtener del cache primero
    const cacheKey = `santabrain:${userId}:${text.toLowerCase().trim()}`;
    const cached = await geminiCache.get<any>(cacheKey, context, 300); // 5 min TTL
    
    let geminiResponse;
    let cacheHit = false;
    
    if (cached) {
      console.log('[Santa Brain] ✅ Cache HIT');
      geminiResponse = cached;
      cacheHit = true;
    } else {
      // Procesar con Gemini
      const geminiStart = Date.now();
      geminiResponse = await processSantaBrainInput(text, context);
      const geminiTime = Date.now() - geminiStart;
      console.log(`[Santa Brain] ⏱️ Gemini: ${geminiTime}ms`);
      
      // Guardar en cache
      await geminiCache.set(cacheKey, context, geminiResponse, 300);
    }

    // 5. Fuzzy match de la cuenta sugerida por Gemini
    let matchedAccount: Account | null = null;
    let matchScore = 0;
    
    if (geminiResponse.entidades.cuenta) {
      const fuzzyResult = fuzzyMatchAccount(
        geminiResponse.entidades.cuenta,
        myAccounts
      );
      
      if (fuzzyResult) {
        matchedAccount = fuzzyResult.match;
        matchScore = fuzzyResult.score;
        
        console.log(`[Santa Brain] ✅ Match: "${geminiResponse.entidades.cuenta}" → "${matchedAccount.name}" (${matchScore.toFixed(0)}%, ${fuzzyResult.matchType})`);
      } else {
        console.log(`[Santa Brain] ⚠️ No match para: "${geminiResponse.entidades.cuenta}"`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Santa Brain] ✅ TOTAL: ${totalTime}ms`);
    
    // Finalizar tracking de telemetría (éxito)
    if (telemetryId) {
      geminiTelemetry.endRequest(telemetryId, {
        status: 'success',
        cacheHit,
        circuitBreakerState: geminiCircuitBreaker.getState().state,
        // Nota: tokens no disponibles en respuesta actual de Gemini
        // Se puede añadir si el SDK lo expone en el futuro
      });
    }

    return NextResponse.json({
      success: true,
      geminiResponse,
      matchedAccount: matchedAccount ? {
        id: matchedAccount.id,
        name: matchedAccount.name,
        segment: matchedAccount.accountType,
        matchScore,
      } : null,
      message: geminiResponse.respuesta_usuario
    });

  } catch (error: any) {
    console.error('[Santa Brain] ❌ Error:', error);
    
    // Finalizar tracking de telemetría (error)
    if (telemetryId) {
      geminiTelemetry.endRequest(telemetryId, {
        status: 'error',
        error: error.message,
        circuitBreakerState: geminiCircuitBreaker.getState().state
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Error procesando la petición' },
      { status: 500 }
    );
  }
}
