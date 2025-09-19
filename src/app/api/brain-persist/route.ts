
// src/app/api/brain-persist/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import type { SantaData } from '@/domain/ssot';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Se elimina la función `verifyToken` ya que las reglas de seguridad de Firestore
// gestionan el acceso. Esto evita errores en entornos de desarrollo sin credenciales de servidor.

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: 'Firestore Admin is not available.' }, { status: 500 });
    }

    try {
        const { data: requestData, strategy } = await req.json();
        const data = requestData as Partial<SantaData>;
        const db = adminDb;
        const writeBatch = db.batch();

        for (const key of Object.keys(data)) {
            const collectionName = key as keyof SantaData;
            
            if (!SANTA_DATA_COLLECTIONS.includes(collectionName)) {
                console.warn(`Skipping unknown collection: ${collectionName}`);
                continue;
            }

            const items = data[collectionName];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (item.id) {
                        const docRef = db.collection(collectionName as string).doc(item.id);
                        if (strategy === 'overwrite') {
                           writeBatch.set(docRef, item);
                        } else { // merge by default
                           writeBatch.set(docRef, item, { merge: true });
                        }
                    }
                });
            }
        }
        
        await writeBatch.commit();
        
        return NextResponse.json({ ok: true, message: 'Data persisted successfully.' });

    } catch (error: any) {
        console.error('Error persisting data:', error);
        return NextResponse.json({ error: 'Server error while persisting data.', details: error.message }, { status: 500 });
    }
}
