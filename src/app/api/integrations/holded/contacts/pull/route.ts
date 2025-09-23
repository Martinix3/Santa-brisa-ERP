import { NextResponse } from 'next/server';
import { pullHoldedContacts } from '@/server/integrations/holded/pullContacts';

export async function POST(req: Request) {
  const { since } = await req.json().catch(() => ({}));
  const res = await pullHoldedContacts({ since });
  return NextResponse.json(res);
}
