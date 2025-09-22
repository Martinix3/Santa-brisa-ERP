#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const mustHave = [
  "src/server/firebaseAdmin.ts",
  "src/server/integrations/shopify/hmac.ts",
  "src/server/integrations/shopify/mappers.ts",
  "src/server/integrations/shopify/process.ts",
  "src/server/integrations/holded/client.ts",
  "src/server/integrations/sendcloud/client.ts",
  "src/server/queue/queue.ts",
  "src/server/queue/types.ts",
  "src/server/workers/holded.createInvoice.ts",
  "src/server/workers/shopify.fulfillment.ts",
  // opcional según tu decisión:
  "src/server/workers/sendcloud.createLabel.ts",
  // endpoint Next:
  "src/app/api/webhooks/shopify/route.ts",
];

const envKeys = [
  "SHOPIFY_SHOP",
  "SHOPIFY_WEBHOOK_SECRET",
  // si actualizas fulfillments:
  // "SHOPIFY_ADMIN_TOKEN",
  "HOLDED_API_KEY",
  // si usas sendcloud en hub:
  // "SENDCLOUD_PUBLIC_KEY",
  // "SENDCLOUD_SECRET_KEY",
  // "SENDCLOUD_WEBHOOK_TOKEN",
];

function ok(msg){ console.log("✔︎", msg); }
function bad(msg){ console.error("✗", msg); }

async function exists(p){
  try { await fs.access(join(root,p)); return true; }
  catch { return false; }
}

async function main(){
  let fail = false;

  console.log("— Estructura");
  for (const f of mustHave) {
    const e = await exists(f);
    if (!e) { bad(`Falta: ${f}`); fail = true; } else ok(`OK: ${f}`);
  }

  console.log("\n— SSOT diffs esperados (teoría)");
  const ssot = join(root, "src/domain/ssot.ts");
  if (!(await exists("src/domain/ssot.ts"))) {
    bad("No encuentro src/domain/ssot.ts (revisa rutas)");
    fail = true;
  } else {
    const txt = await fs.readFile(ssot, "utf8").catch(()=> "");
    const neededBits = [
      "external?: {",
      "shopifyOrderId",
      "holdedInvoiceId",
      "billingStatus",
      "source?: 'SHOPIFY'|'ERP'|'OTHER'",
      "shopifyCustomerId",
      "holdedContactId"
    ];
    const missing = neededBits.filter(b => !txt.includes(b));
    if (missing.length) {
      bad("ssot.ts parece incompleto. Faltan: " + missing.join(", "));
      fail = true;
    } else {
      ok("ssot.ts contiene campos external/source/billingStatus");
    }
  }

  console.log("\n— Endpoint webhooks");
  const route = join(root, "src/app/api/webhooks/shopify/route.ts");
  if (await exists("src/app/api/webhooks/shopify/route.ts")) ok("route.ts encontrado");
  else { bad("No encuentro /api/webhooks/shopify/route.ts"); fail = true; }

  console.log("\n— Variables de entorno");
  const missingEnv = envKeys.filter(k => !process.env[k]);
  if (missingEnv.length) {
    bad("Variables ausentes (puede ser normal si no has cargado .env): " + missingEnv.join(", "));
  } else {
    ok("Variables clave presentes en entorno");
  }

  console.log("\n— Firestore index jobs (opcional)");
  const idxPath = join(root, "firestore.indexes.json");
  if (await exists("firestore.indexes.json")) {
    const idx = JSON.parse(await fs.readFile(idxPath,"utf8"));
    const hasJobsIdx = JSON.stringify(idx).includes('"collectionGroup":"jobs"')
      && JSON.stringify(idx).includes('"fieldPath":"status"')
      && JSON.stringify(idx).includes('"fieldPath":"nextRunAt"');
    if (hasJobsIdx) ok("Índice jobs(status,nextRunAt) detectado");
    else bad("Añade índice para jobs(status,nextRunAt) a firestore.indexes.json");
  } else bad("No encuentro firestore.indexes.json (no bloquea, pero recomendable)");

  console.log("\n— Resultado");
  if (fail) {
    console.error("❌ Faltan piezas. Revisa los mensajes arriba.");
    process.exit(1);
  } else {
    console.log("✅ Hub base: OK a nivel de estructura. Ejecuta las pruebas de integración.");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
