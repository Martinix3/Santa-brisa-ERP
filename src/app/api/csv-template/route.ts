// ================================================================
// FILE: src/app/api/csv-template/route.ts
// PURPOSE: API para descargar cabeceras CSV por colección
// ================================================================

import { NextResponse } from 'next/server';
import { SANTA_DATA_COLLECTIONS, type SantaData } from '@/domain/ssot';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coll = searchParams.get('collection') as keyof SantaData | null;
  if (!coll || !SANTA_DATA_COLLECTIONS.includes(coll)) { return new NextResponse('Invalid or missing collection', { status: 400 }); }
  const { generateCsvTemplate } = await import('@/app/(app)/admin/data-import/actions');
  const csv = await generateCsvTemplate(coll);
  return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="template_${coll}.csv"` } });
}
