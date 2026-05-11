// Ejecuta:  npx tsx scripts/sanity-write.ts
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);

async function main() {
  const id = 'sanity-' + Date.now();
  await db.collection('jobs').doc(id).set({ hello: 'world', at: new Date().toISOString() }, { merge: true });
  const snap = await db.collection('jobs').doc(id).get();
  console.log({ exists: snap.exists, data: snap.data() });
}
main().catch(e => { console.error(e); process.exit(1); });