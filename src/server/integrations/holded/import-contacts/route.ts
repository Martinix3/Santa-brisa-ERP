// This file is deprecated and can be removed. 
// The functionality has been moved to the worker src/server/workers/holded.syncContacts.ts
// and is triggered by the /api/integrations/holded/import endpoint.
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ ok: true, message: "This endpoint is deprecated." });
}
