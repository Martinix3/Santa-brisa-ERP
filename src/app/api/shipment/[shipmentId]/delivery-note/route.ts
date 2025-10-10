// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, Order, Account } from '@/domain/ssot';
// import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote'; // TODO: Implement
// import { bucket } from '@/server/firebase'; // TODO: Implement

// Tipo temporal hasta implementar DeliveryNote en SSOT
type DeliveryNote = any;

export async function GET(_req: NextRequest, ctx: { params: { shipmentId: string } }) {
  try {
    const { shipmentId } = ctx.params;
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    // -------- Resolver partyId (shipment.partyId || order.accountId -> account.partyId)
    let resolvedPartyId: string | undefined = shp.partyId;
    let account: Account | null = null;
    if (!resolvedPartyId && shp.orderId) {
      const ord = await getOne<Order>('orders', shp.orderId);
      if (ord?.accountId) {
        account = await getOne<Account>('accounts', ord.accountId);
        resolvedPartyId = account?.id || resolvedPartyId;
      }
    }
    // En v7, Party ya no existe, Account contiene todo
    const party = account;

    // Persistir partyId resuelto en el shipment si no lo tenía
    if (!shp.partyId && resolvedPartyId) {
      await upsertMany('shipments', [{ id: shp.id, partyId: resolvedPartyId, updatedAt: new Date().toISOString() } as any]);
      shp.partyId = resolvedPartyId;
    }

    const now = new Date().toISOString();
    // Id estable si ya existía; así evitamos duplicados
    const existingId = (shp as any).deliveryNoteId;
    const dnId = existingId ?? `DN-${now.slice(0,10)}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;

    // Datos del destinatario (soldTo/shipTo) con fallbacks
    const soldToName = party?.name || 'Cliente';
    const shipAddress = (shp.toAddress?.street || '').trim();
    const shipZip = shp.toAddress?.postalCode || '';
    const shipCity = shp.toAddress?.city || '';

    const dn: Partial<DeliveryNote> = {
      id: dnId,
      shipmentId: shp.id,
      partyId: shp.partyId || resolvedPartyId || '',
      series: 'B2B',
      date: now,
      soldTo: { name: soldToName, vat: (party as any)?.taxId || '' },
      shipTo: {
        name: soldToName,
        address: shipAddress || (party?.billingAddress?.street ?? '') || '',
        zip: shipZip || party?.billingAddress?.postalCode || '',
        city: shipCity || party?.billingAddress?.city || '',
        country: 'ES',
      },
      lines: (shp.lines || []).map((l: any) => ({
        sku: l.sku,
        description: l.name ?? l.sku,
        qty: l.qty,
        uom: l.uom || 'uds',
        lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000', address: 'C/ Olivos 10', zip: '28010', city: 'Madrid', country: 'España' },
    };

    // TODO: Implementar renderDeliveryNotePdf y bucket
    // Por ahora retornamos JSON con los datos
    return new Response(JSON.stringify({ ...dn, orderId: shp.orderId }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    // CÓDIGO ORIGINAL COMENTADO - Descomentar cuando esté disponible:
    /*
    const dnData = { ...dn, dateISO: dn.date, orderId: shp.orderId } as any;
    const pdfBytes = await renderDeliveryNotePdf(dnData);
    const filePath = `delivery-notes/${dnId}.pdf`;
    const file = bucket().file(filePath);
    const nodeBody = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes as Uint8Array);
    await file.save(nodeBody, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '9999-12-31',
    });
    await upsertMany('deliveryNotes', [{ ...dn, pdfUrl: signedUrl }] as any);
    if (!(shp as any).deliveryNoteId) {
      await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now } as any]);
    }
    return Response.redirect(signedUrl, 302);
    */
  } catch (err: any) {
    console.error('[delivery-note][ERROR]', err);
    const msg = (err && err.message) ? err.message : String(err);
    if ((err as any)?.pdfBytes) {
      const nodeBody = Buffer.isBuffer((err as any).pdfBytes) ? (err as any).pdfBytes : Buffer.from((err as any).pdfBytes as Uint8Array);
      return new Response(nodeBody as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="albaran.pdf"',
        },
      });
    }
    return new Response(`Error generating delivery note: ${msg}`, { status: 500 });
  }
}
