const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    // Usará ADC (tu application_default_credentials.json del paso anterior)
    credential: admin.credential.applicationDefault(),
  });
}

(async () => {
  try {
    const db = admin.firestore();
    const ref = db.collection(process.env.COLLECTION || 'debug_cli').doc();
    await ref.set({ source: 'node-admin-adc', ok: true, ts: new Date().toISOString() });
    console.log('WRITE_OK docId=', ref.id);
    process.exit(0);
  } catch (e) {
    console.error('WRITE_FAIL:', e?.code || e?.message, e);
    process.exit(2);
  }
})();
