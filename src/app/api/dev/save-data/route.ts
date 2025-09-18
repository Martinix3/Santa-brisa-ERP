
import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS, SantaData } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEV_USER_ID = 'dev-user-fixed-id';

export async function POST(req: NextRequest) {
  try {
    const { collection, data, persistenceEnabled } = await req.json();

    if (persistenceEnabled === false) {
      return NextResponse.json({ ok: true, message: 'Persistencia desactivada. No se guardaron datos.' });
    }

    if (!collection || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Payload inválido. Se necesita "collection" (string) y "data" (array).' }, { status: 400 });
    }

    if (!SANTA_DATA_COLLECTIONS.includes(collection as keyof SantaData)) {
      return NextResponse.json({ error: `La colección "${collection}" no es válida.` }, { status: 400 });
    }
    
    const db = adminDb;
    const docRef = db.collection('userData').doc(DEV_USER_ID).collection(collection).doc('all');
    
    await docRef.set({ data });

    console.log(`[api/dev/save-data] Colección '${collection}' guardada para el usuario ${DEV_USER_ID}.`);
    
    return NextResponse.json({ ok: true, message: `Colección '${collection}' guardada con éxito.` });

  } catch (e: any) {
    console.error('Error en /api/dev/save-data:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error desconocido en el servidor.' }, { status: 500 });
  }
}
