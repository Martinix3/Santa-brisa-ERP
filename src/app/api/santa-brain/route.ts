// src/app/api/santa-brain/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processSantaBrainInput, SantaBrainContext } from '@/lib/santa-brain/gemini-client';
import { fuzzyMatchAccount } from '@/lib/santa-brain/fuzzy-matching';
import { adminDb } from '@/server/firebase';
import type { Account, Item, User } from '@/domain/ssot';

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
    const accountsSnapshot = await adminDb.collection('contacts')
      .where('ownerId', '==', userId)
      .get();
    
    return accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
  }
  
  const distributorId = partyRolesSnapshot.docs[0].data().partyId;
  
  // 2. Obtener cuentas de ese distribuidor
  const accountsSnapshot = await adminDb.collection('contacts')
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

  try {
    const body = await request.json();
    const { text, userId } = body;

    if (!text || !userId) {
      return NextResponse.json(
        { error: 'text y userId son requeridos' },
        { status: 400 }
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
      userName: user.name,
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

    // 4. Procesar con Gemini
    const geminiStart = Date.now();
    const geminiResponse = await processSantaBrainInput(text, context);
    const geminiTime = Date.now() - geminiStart;
    console.log(`[Santa Brain] ⏱️ Gemini: ${geminiTime}ms`);

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
    return NextResponse.json(
      { error: error.message || 'Error procesando la petición' },
      { status: 500 }
    );
  }
}
