// src/app/api/pipeline-board/route.ts
import { NextResponse } from 'next/server';
import { computePipelineView } from '@/features/sales/pipeline/pipeline.service';

export const dynamic = 'force-dynamic'; // Ensure fresh data on every request

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      const k = String(key ?? '');
      if (k.endsWith('[]')) {
        const cleanKey = k.slice(0, -2);
        if (!filters[cleanKey]) filters[cleanKey] = [];
        filters[cleanKey].push(value);
      } else {
        filters[key] = value;
      }
    }
    
    const data = await computePipelineView(filters);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API /pipeline-board] Error:', error);
    return NextResponse.json({ message: 'Error fetching pipeline data', error: error.message }, { status: 500 });
  }
}
