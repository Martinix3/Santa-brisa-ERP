// app/api/interactions/create/route.ts
import { NextResponse } from 'next/server';
import { createInteractionForAccount } from '@/server/actions/interactions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, userId, input } = body || {};
    if (!accountId || !userId || !input) {
      return NextResponse.json({ success: false, error: 'accountId, userId e input requeridos' }, { status: 400 });
    }
    const res = await createInteractionForAccount(accountId, userId, input);
    return NextResponse.json({ success: true, id: res.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error' }, { status: 500 });
  }
}

