'use server';

import 'server-only';
import { adminDb, adminStorage } from '../firebase';
import { BomSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

export async function getBom(bomId: string): Promise<z.infer<typeof BomSchema> | null> {
  const bomRef = adminDb.collection('boms').doc(bomId);
  const bomDoc = await bomRef.get();

  if (!bomDoc.exists) {
    return null;
  }

  return bomDoc.data() as z.infer<typeof BomSchema>;
}

export async function uploadProductionPhoto(formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('Missing file');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const bucket = adminStorage.bucket();
  const filename = `production/${Date.now()}-${file.name}`;
  const fileRef = bucket.file(filename);

  await fileRef.save(buffer, {
    contentType: file.type || 'application/octet-stream',
    resumable: false,
  });

  // Opcional: URL firmada
  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60, // 1h
  });

  return { path: filename, url };
}
