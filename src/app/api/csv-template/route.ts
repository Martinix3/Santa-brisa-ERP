// src/app/api/csv-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SANTA_DATA_COLLECTIONS } from '@/domain';
import JSZip from 'jszip';

const HEADERS: Partial<Record<keyof typeof SANTA_DATA_COLLECTIONS[number], string[]>> = {
  accounts: ['id', 'name', 'city', 'type', 'stage', 'ownerId'],
  ordersSellOut: ['id', 'accountCode', 'accountName', 'status', 'createdAt', 'currency', 'lines'],
  interactions: ['id', 'userEmail', 'accountName', 'kind', 'note', 'plannedFor', 'status'],
  products: ['id', 'sku', 'name', 'category', 'active', 'bottleMl', 'caseUnits', 'casesPerPallet'],
  materials: ['id', 'sku', 'name', 'category', 'uom', 'standardCost'],
  users: ['id', 'name', 'email', 'role', 'active'],
  // ... añadir más si es necesario
};

const SUGGESTED_IMPORT_ORDER: (keyof typeof HEADERS)[] = [
  'users',
  'accounts',
  'products',
  'materials',
  'ordersSellOut',
  'interactions',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get('collection') as keyof typeof HEADERS;
  const format = searchParams.get('format');

  if (format === 'zip') {
    const zip = new JSZip();
    SUGGESTED_IMPORT_ORDER.forEach((coll, i) => {
      const headers = HEADERS[coll];
      if (headers) {
        const csvString = headers.join(',');
        zip.file(`${String(i + 1).padStart(2, '0')}-${coll}.csv`, csvString);
      }
    });

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="santa_brisa_templates.zip"',
      },
    });
  }

  if (!collection || !HEADERS[collection]) {
    return NextResponse.json({ error: 'Colección no válida o no soportada.' }, { status: 400 });
  }

  const headers = HEADERS[collection]!.join(',');
  return new NextResponse(headers, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${collection}_template.csv"`,
    },
  });
}
