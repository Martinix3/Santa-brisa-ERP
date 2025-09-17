
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import type { Account } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const { importId } = await req.json();

    if (!importId) {
        return NextResponse.json({ error: 'Falta el ID de importación.' }, { status: 400 });
    }

    const db = adminDb;

    try {
        const stagedItemsRef = db.collection('staged_imports');
        const q = stagedItemsRef.where('importId', '==', importId).where('status', '==', 'pending');
        const snapshot = await q.get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'No hay elementos pendientes para aprobar en esta importación.' }, { status: 404 });
        }

        const writeBatch = db.batch();
        let createdCount = 0;
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const item = doc.data();
            
            if (item.type === 'create') {
                const newId = db.collection('accounts').doc().id;
                const newAccountRef = db.collection('accounts').doc(newId);
                const newAccount: Account = {
                    id: newId,
                    createdAt: new Date().toISOString(),
                    ...item.proposedData,
                } as Account;
                writeBatch.set(newAccountRef, newAccount);
                createdCount++;
            } else if (item.type === 'update' && item.existingAccountId) {
                const accountRef = db.collection('accounts').doc(item.existingAccountId);
                // No sobreescribir datos clave, solo actualizar los informativos
                const updatePayload = {
                    ...item.proposedData,
                    updatedAt: new Date().toISOString(),
                };
                writeBatch.update(accountRef, updatePayload);
                updatedCount++;
            }
            
            // Marcar el item como procesado
            writeBatch.update(doc.ref, { status: 'approved' });
        });
        
        await writeBatch.commit();
        
        return NextResponse.json({
            ok: true,
            message: 'Importación aprobada y procesada con éxito.',
            created: createdCount,
            updated: updatedCount,
        });

    } catch (error: any) {
        console.error('Error approving import:', error);
        return NextResponse.json({ error: 'Error del servidor al aprobar la importación.' }, { status: 500 });
    }
}
