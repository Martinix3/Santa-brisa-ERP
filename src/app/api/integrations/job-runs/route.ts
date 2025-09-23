// src/app/api/integrations/job-runs/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';

export async function GET() {
    try {
        const jobsSnapshot = await adminDb.collection('jobs')
            .where('status', 'in', ['DONE', 'FAILED'])
            .orderBy('finishedAt', 'desc')
            .limit(10)
            .get();

        const runs = jobsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                kind: data.kind,
                status: data.status,
                finishedAt: data.finishedAt?.toDate().toISOString(),
                payload: { dryRun: data.payload?.dryRun || false },
                result: data.result || null,
                error: data.error || null,
            };
        });

        return NextResponse.json({ ok: true, runs });
    } catch (error: any) {
        console.error("Failed to fetch job runs:", error);
        return NextResponse.json({ ok: false, error: "Failed to fetch job runs", details: error.message }, { status: 500 });
    }
}
