// app/api/items/fg/route.ts
import { NextResponse } from 'next/server';
import { listOrderItems } from '@/server/actions/orders-data';

export async function GET() {
  try {
    const items = await listOrderItems();
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error' }, { status: 500 });
  }
}

