import { NextResponse } from 'next/server';
import { ensureHoldedContact, updateHoldedContact } from '@/server/integrations/holded/pushContact';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';

export async function POST(req: Request) {
  const { partyId } = await req.json();
  const { parties } = await getServerData();
  const p = (parties as any[]).find(x => x.id === partyId);
  if (!p) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

  let id = p.external?.holdedContactId;
  if (!id) {
    const created = await ensureHoldedContact(p);
    id = created.id;
    await upsertMany('parties', [{ id: p.id, external: { ...(p.external ?? {}), holdedContactId: id } }]);
  } else {
    await updateHoldedContact(p);
  }
  return NextResponse.json({ ok: true, holdedContactId: id });
}
