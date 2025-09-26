/* scripts/smoke-admin.ts
 * Smoke test de escritura con Firebase Admin (ADC / Impersonation).
 */
import * as admin from "firebase-admin";

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = {
    kind: "ADMIN_SMOKE",
    at: admin.firestore.FieldValue.serverTimestamp(),
    runtimeProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null,
    impersonatedSA: process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT || null,
    envHints: {
      NODE_ENV: process.env.NODE_ENV || null,
      VERCEL: process.env.VERCEL || null,
      APP_HOSTING: process.env.GOOGLE_CLOUD_PROJECT ? "likely" : "unknown",
    },
  };

  await db.collection("admin_smoke").doc(id).set(payload);
  const snap = await db.collection("admin_smoke").doc(id).get();

  console.log("✅ Admin write OK");
  console.log("docId:", id);
  console.log("data:", snap.data());
}

main().catch((err) => {
  console.error("❌ Admin write FAILED");
  console.error("name:", err?.name);
  console.error("code:", (err as any)?.code);
  console.error("message:", err?.message);
  console.error(err?.stack);
  process.exit(1);
});
