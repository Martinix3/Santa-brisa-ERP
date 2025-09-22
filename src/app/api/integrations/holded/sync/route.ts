
import { NextResponse } from 'next/server';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { enqueue } from '@/server/queue/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Para una sincronización completa, encolamos trabajos para compras y proveedores.
    await enqueue({ kind: 'SYNC_HOLDED_PURCHASES', payload: { page: 1 }, maxAttempts: 3 });
    // Opcionalmente podrías encolar una sincronización de proveedores por separado si la lógica es compleja
    // await enqueue({ kind: 'SYNC_HOLDED_SUPPLIERS', payload: { page: 1 }, maxAttempts: 3 });

    return NextResponse.json({ 
        ok: true, 
        message: "Sincronización con Holded iniciada. Los trabajos se han encolado para procesarse en segundo plano.",
    });

  } catch (error: any) {
    console.error('[Holded Sync Trigger Error]', error);
    return NextResponse.json({ error: 'Fallo al iniciar la sincronización con Holded.', details: error.message }, { status: 500 });
  }
}
