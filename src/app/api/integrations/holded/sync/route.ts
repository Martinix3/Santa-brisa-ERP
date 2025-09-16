
import { NextResponse } from 'next/server';
import { fetchInvoices } from '@/features/integrations/holded/service';

const mem: any = globalThis as any;
mem._secrets ??= {};

/**
 * POST: Triggers a sync with Holded.
 */
export async function POST() {
  const holdedSecrets = mem._secrets?.holded;

  if (!holdedSecrets || !holdedSecrets.apiKey) {
    return NextResponse.json({ error: 'Holded API key no está configurada.' }, { status: 400 });
  }

  try {
    const invoices = await fetchInvoices(holdedSecrets.apiKey);
    
    // Por ahora, solo mostramos los datos en la consola del servidor.
    // El siguiente paso sería mapear estos datos a nuestro `OrderSellOut` y `Account`.
    console.log(`[Holded Sync] Se han obtenido ${invoices.length} facturas.`);
    console.log(JSON.stringify(invoices.slice(0, 2), null, 2)); // Muestra las 2 primeras para inspeccionar

    // Actualizar la fecha del último sync
    mem._secrets.holded.lastSyncAt = new Date().toISOString();

    return NextResponse.json({ 
        ok: true, 
        message: `Se han obtenido ${invoices.length} facturas de Holded.`,
        invoiceCount: invoices.length,
    });

  } catch (error: any) {
    console.error('[Holded Sync Error]', error);
    return NextResponse.json({ error: 'Fallo al obtener datos de Holded.', details: error.message }, { status: 500 });
  }
}
