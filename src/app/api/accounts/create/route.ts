// app/api/accounts/create/route.ts
import { NextResponse } from 'next/server';
import { createAccountAndParty } from '@/server/actions/create-account.action';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, city, type, ownerId, distributorId } = body || {};
    if (!name || !ownerId) {
      return NextResponse.json({ success: false, error: 'name y ownerId requeridos' }, { status: 400 });
    }
    const result = await createAccountAndParty({ name, city, type, ownerId, distributorId });
    return NextResponse.json({ success: true, account: result.account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error' }, { status: 500 });
  }
}

