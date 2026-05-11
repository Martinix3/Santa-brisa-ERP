#!/usr/bin/env tsx
/**
 * Exporta ejemplos de contacts ORG (RAW) + PREVIEW canónico (sin modificar datos).
 * Además, imprime un informe de "drift" (legacy vs canon) para priorizar limpieza.
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Init
if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

/* -------------------------- Diccionario de compat -------------------------- */
const normalizeFlow = (x?: string): 'DIRECT' | 'PLACEMENT' | undefined => {
  if (x === 'COLOCACION') return 'PLACEMENT';
  if (x === 'DIRECTA') return 'DIRECT';
  if (x === 'DIRECT') return 'DIRECT';
  if (x === 'PLACEMENT') return 'PLACEMENT';
  return undefined; // valores desconocidos
};

const mapStage = (x?: string) => {
  if (!x) return undefined;
  if (x === 'CONTACTED') return 'POTENCIAL';
  if (x === 'QUALIFYING') return 'SEGUIMIENTO';
  if (x === 'PROPOSAL') return 'ACTIVA';
  if (x === 'NEGOTIATION') return 'ACTIVA';
  if (x === 'CLOSED_WON') return 'ACTIVA';
  if (x === 'CLOSED_LOST') return 'FALLIDA';
  // Mapear status legacies también
  if (x === 'Potencial') return 'POTENCIAL';
  if (x === 'Activa') return 'ACTIVA';
  return x; // ya canónico o desconocido
};

const pickAddress = (addresses?: any[], kind: 'billing'|'shipping' = 'billing') => {
  if (!Array.isArray(addresses)) return undefined;
  const byKind = addresses.find(a => a?.kind === kind);
  const any = addresses[0];
  const a = byKind || any;
  if (!a) return undefined;
  return {
    street: a.street || a.address || undefined,
    city: a.city || undefined,
    zip: a.postalCode || a.zip || undefined,
    province: a.province || a.state || undefined,
    country: a.countryCode || a.country || undefined,
  };
};

type CanonAccount = {
  id: string;
  name: string;
  legalName?: string;
  accountType?: string;          // canon
  accountStage?: string;         // canon
  salesRepId?: string;
  distributorId?: string;
  commercialFlow?: 'DIRECT'|'PLACEMENT';
  addressBilling?: any;
  addressShipping?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // para diagnóstico
  __legacy?: {
    placement?: string;
    segment?: string;
    ownerId?: string;
    stage?: string;
  }
};

const toCanonPreview = (doc: QueryDocumentSnapshot): CanonAccount => {
  const c = doc.data() as any;
  const name =
    c?.displayName ||
    c?.customer?.displayName ||
    c?.customer?.legalName ||
    c?.legalName ||
    c?.name ||
    '(sin nombre)';

  const legalName = c?.legalName || c?.customer?.legalName || undefined;

  const accountType = c?.customer?.segment || c?.accountType; // legacy→canon 1:1
  const accountStage = mapStage(c?.stage || c?.customer?.stage || c?.accountStage || c?.status);

  const salesRepId = c?.salesRepId || c?.customer?.ownerId;    // ownerId legacy
  const distributorId = c?.customer?.distributorId || c?.distributorId;

  const commercialFlow = normalizeFlow(c?.commercialFlow || c?.customer?.placement || c?.placement);

  return {
    id: doc.id,
    name,
    legalName,
    accountType,
    accountStage,
    salesRepId,
    distributorId,
    commercialFlow,
    addressBilling: pickAddress(c?.addresses, 'billing'),
    addressShipping: pickAddress(c?.addresses, 'shipping'),
    createdAt: c?.createdAt,
    updatedAt: c?.updatedAt,
    __legacy: {
      placement: c?.customer?.placement ?? c?.placement,
      segment: c?.customer?.segment,
      ownerId: c?.customer?.ownerId,
      stage: c?.stage ?? c?.customer?.stage ?? c?.status,
    }
  };
};

/* ---------------------------------- Main ----------------------------------- */
async function exportContactOrgSamples(limit = 100) {
  console.log('🔍 Buscando contacts (ORG) directamente en Firestore…\n');

  // 1) Lee solo ORG (kind está en la raíz según el output anterior)
  const snapshot = await db
    .collection('contacts')
    .where('kind', '==', 'ORG')
    .limit(limit)
    .get();

  console.log(`🏢 Contacts ORG encontrados: ${snapshot.size}\n`);

  if (snapshot.empty) {
    console.log('⚠️  No se encontraron contacts con kind = "ORG".');
    return;
  }

  // 2) RAW (muestra 3 ejemplos tal cual)
  const rawSamples = snapshot.docs.slice(0, 3).map(d => ({ id: d.id, ...d.data() }));

  // 3) PREVIEW CANÓNICO (para los mismos 3)
  const canonSamples = snapshot.docs.slice(0, 3).map(toCanonPreview);

  // 4) Informe de drift (sobre todos los ORG leídos)
  const canonAll = snapshot.docs.map(toCanonPreview);

  const drift = {
    legacyPlacement: canonAll.filter(a => a.__legacy?.placement && !a.commercialFlow).length,
    legacyOwnerId:   canonAll.filter(a => a.__legacy?.ownerId && !a.salesRepId).length,
    legacyStage:     canonAll.filter(a => a.__legacy?.stage && a.__legacy?.stage !== a.accountStage).length,
    legacySegment:   canonAll.filter(a => a.__legacy?.segment && !a.accountType).length,
    missingType:     canonAll.filter(a => !a.accountType).length,
    missingRep:      canonAll.filter(a => !a.salesRepId).length,
    missingFlow:     canonAll.filter(a => !a.commercialFlow).length,
    missingBilling:  canonAll.filter(a => !a.addressBilling).length,
  };

  // 5) Persistir a disco
  const outDir = path.join(__dirname, '../.out');
  fs.mkdirSync(outDir, { recursive: true });

  const rawPath   = path.join(outDir, 'contacts-org.raw.json');
  const canonPath = path.join(outDir, 'contacts-org.canon-preview.json');
  const infoPath  = path.join(outDir, 'contacts-org.drift-report.json');

  fs.writeFileSync(rawPath, JSON.stringify(rawSamples, null, 2));
  fs.writeFileSync(canonPath, JSON.stringify(canonSamples, null, 2));
  fs.writeFileSync(infoPath, JSON.stringify({ totals: { scanned: snapshot.size }, drift }, null, 2));

  // 6) Consola
  console.log('📋 EJEMPLOS RAW (3):');
  console.log(JSON.stringify(rawSamples, null, 2));
  console.log('\n📋 PREVIEW CANÓNICO (3):');
  console.log(JSON.stringify(canonSamples, null, 2));
  console.log('\n📊 DRIFT REPORT (resumen):');
  console.table(drift);
  console.log(`\n✅ Guardado en:\n  - ${rawPath}\n  - ${canonPath}\n  - ${infoPath}\n`);
}

exportContactOrgSamples().then(() => {
  console.log('✅ Completado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
