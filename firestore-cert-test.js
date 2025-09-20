const admin = require('firebase-admin');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Faltan FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

(async () => {
  try {
    const db = admin.firestore();
    const ref = db.collection(process.env.COLLECTION || 'debug_cli').doc();
    await ref.set({ source: 'node-admin-cert', ok: true, ts: new Date().toISOString() });
    console.log('WRITE_OK docId=', ref.id);
    process.exit(0);
  } catch (e) {
    console.error('WRITE_FAIL:', e?.code || e?.message, e);
    process.exit(2);
  }
})();
