// Ejecuta:  npx tsx scripts/sanity-write.ts
import { db, infoAdmin } from '@/lib/firebase/admin';

async function main() {
  const { projectId } = infoAdmin();
  const id = 'sanity-' + Date.now();
  await db.collection('jobs').doc(id).set(
    { hello: 'world', createdAt: new Date().toISOString() },
    { merge: true },
  );
  const snap = await db.collection('jobs').doc(id).get();
  console.log('[SANITY]', { projectId, exists: snap.exists, data: snap.data() });
}

main().catch((e) => {
  console.error('[SANITY][ERROR]', e);
  process.exit(1);
});
