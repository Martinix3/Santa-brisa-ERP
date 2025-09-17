
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { DocumentData } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const importId = searchParams.get('importId');

    if (!importId) {
        return NextResponse.json({ error: 'Falta el ID de importación.' }, { status: 400 });
    }

    try {
        const db = adminDb;
        const stagedItemsRef = db.collection('staged_imports');
        const q = stagedItemsRef.where('importId', '==', importId);
        const snapshot = await q.get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'No se encontraron datos para este ID de importación.' }, { status: 404 });
        }

        const items: DocumentData[] = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json(items);
    } catch (error: any) {
        console.error('Error fetching staged import data:', error);
        return NextResponse.json({ error: 'Error del servidor al obtener los datos pre-importados.' }, { status: 500 });
    }
}
