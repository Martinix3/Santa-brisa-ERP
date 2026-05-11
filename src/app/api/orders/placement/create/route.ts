// app/api/orders/placement/create/route.ts
import { NextResponse } from 'next/server';
import { createPlacementOrder } from '@/server/actions/placement.actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createPlacementOrder(body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error' }, { status: 500 });
  }
}

