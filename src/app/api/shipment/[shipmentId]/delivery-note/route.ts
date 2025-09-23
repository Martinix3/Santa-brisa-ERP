
// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, DeliveryNote, OrderSellOut, Account, Party } from '@/domain/ssot';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import { bucket } from '@/lib/firebase/admin';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await ctx.params;
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    // -------- Resolver partyId (shipment.partyId || order.accountId -> account.partyId)
    let resolvedPartyId: string | undefined = shp.partyId;
    let account: Account | null = null;
    if (!resolvedPartyId && shp.orderId) {
      const ord = await getOne<OrderSellOut>('ordersSellOut', shp.orderId);
      if (ord?.accountId) {
        account = await getOne<Account>('accounts', ord.accountId);
        resolvedPartyId = account?.partyId || resolvedPartyId;
      }
    }
    // Evitar llamadas con id vacío
    let party: Party | null = null;
    if (resolvedPartyId && resolvedPartyId.trim().length > 0) {
      party = await getOne<Party>('parties', resolvedPartyId);
    }

    // Persistir partyId resuelto en el shipment si no lo tenía
    if (!shp.partyId && resolvedPartyId) {
      await upsertMany('shipments', [{ id: shp.id, partyId: resolvedPartyId, updatedAt: new Date().toISOString() }]);
      shp.partyId = resolvedPartyId;
    }

    const now = new Date().toISOString();
    // Id estable si ya existía; así evitamos duplicados
    const existingId = shp.deliveryNoteId;
    const dnId = existingId ?? `DN-${now.slice(0,10)}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;

    // Datos del destinatario (soldTo/shipTo) con fallbacks
    const soldToName = party?.legalName || party?.tradeName || shp.customerName || account?.name || 'Cliente';
    const shipAddress = [
      shp.addressLine1 ?? '',
      shp.addressLine2 ?? ''
    ].join(' ').trim();
    const shipZip = shp.postalCode ?? '';
    const shipCity = shp.city ?? '';

    const dn: DeliveryNote = {
      id: dnId,
      orderId: shp.orderId,
      shipmentId: shp.id,
      partyId: shp.partyId || resolvedPartyId || '',
      series: 'B2B',
      date: now,
      soldTo: { name: soldToName, vat: party?.vat || party?.taxId },
      shipTo: {
        name: soldToName,
        address: shipAddress || (party?.billingAddress?.address ?? '') || '',
        zip: shipZip || party?.billingAddress?.zip || '',
        city: shipCity || party?.billingAddress?.city || '',
        country: 'ES',
      },
      lines: (shp.lines || []).map((l: Shipment['lines'][number]) => ({
        sku: l.sku,
        description: l.name ?? l.sku,
        qty: l.qty,
        uom: 'uds',
        lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000' },
      createdAt: now,
      updatedAt: now,
    };

    // Construye el payload que exige el renderer (incluye dateISO)
    const dnData = { ...dn, dateISO: dn.date } as any;

    // Genera PDF SIEMPRE en memoria (fuente única de verdad)
    const pdfBytes = await renderDeliveryNotePdf(dnData);

    // Sube a Storage (idempotente: sobreescribe si ya existe)
    const filePath = `delivery-notes/${dnId}.pdf`;
    const file = bucket().file(filePath);
    const nodeBody = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes as Uint8Array);
    await file.save(nodeBody, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });

    // URL firmada (larga duración)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '9999-12-31',
    });

    // Guarda metadatos e incorpora pdfUrl
    await upsertMany('deliveryNotes', [{ ...dn, pdfUrl: signedUrl }]);
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now }]);

    // Redirige al PDF en Storage (mejor UX y cacheable)
    return Response.redirect(signedUrl, 302);
  } catch (err: any) {
    console.error('[delivery-note][ERROR]', err);
    const msg = (err && err.message) ? err.message : String(err);
    if (err?.pdfBytes) {
      const nodeBody = Buffer.isBuffer(err.pdfBytes) ? err.pdfBytes : Buffer.from(err.pdfBytes as Uint8Array);
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
