#!/usr/bin/env tsx
/**
 * Script de migración para normalizar UOMs en Firestore
 * 
 * Este script normaliza 'uds' -> 'unit' en todas las colecciones relevantes
 * para mantener la consistencia con el SSOT.
 * 
 * Uso: npx tsx scripts/migrate-normalize-uoms.ts [--dry-run]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Inicializar Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('❌ No se encontró serviceAccountKey.json en la raíz del proyecto');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Función de normalización UOM (igual que en src/domain/uom.ts)
const UOM_ALIASES: Record<string, string> = { uds: 'unit' };

function normalizeUom(uom: string): string {
  const normalized = UOM_ALIASES[uom.toLowerCase()];
  return normalized || uom;
}

// Verificar si es dry-run
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 MODO DRY-RUN: No se realizarán cambios en la base de datos\n');
} else {
  console.log('⚠️  MODO ESCRITURA: Los cambios se aplicarán a la base de datos\n');
}

// Estadísticas
const stats = {
  productionOrders: { total: 0, updated: 0, errors: 0 },
  billOfMaterials: { total: 0, updated: 0, errors: 0 },
  lots: { total: 0, updated: 0, errors: 0 },
  onHand: { total: 0, updated: 0, errors: 0 },
  stockMoves: { total: 0, updated: 0, errors: 0 }
};

/**
 * Normaliza UOMs en productionOrders
 */
async function migrateProductionOrders() {
  console.log('📦 Migrando productionOrders...');
  const snapshot = await db.collection('productionOrders').get();
  stats.productionOrders.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Normalizar baseUnit
      if (data.baseUnit && normalizeUom(data.baseUnit) !== data.baseUnit) {
        updates.baseUnit = normalizeUom(data.baseUnit);
        needsUpdate = true;
      }

      // Normalizar nominal[].uom
      if (data.nominal && Array.isArray(data.nominal)) {
        const normalizedNominal = data.nominal.map((item: any) => {
          if (item.uom && normalizeUom(item.uom) !== item.uom) {
            needsUpdate = true;
            return { ...item, uom: normalizeUom(item.uom) };
          }
          return item;
        });
        if (needsUpdate) {
          updates.nominal = normalizedNominal;
        }
      }

      // Normalizar reservations[].uom
      if (data.reservations && Array.isArray(data.reservations)) {
        const normalizedReservations = data.reservations.map((item: any) => {
          if (item.uom && normalizeUom(item.uom) !== item.uom) {
            needsUpdate = true;
            return { ...item, uom: normalizeUom(item.uom) };
          }
          return item;
        });
        if (needsUpdate) {
          updates.reservations = normalizedReservations;
        }
      }

      // Normalizar finalOutputs[].uom
      if (data.finalOutputs && Array.isArray(data.finalOutputs)) {
        const normalizedOutputs = data.finalOutputs.map((item: any) => {
          if (item.uom && normalizeUom(item.uom) !== item.uom) {
            needsUpdate = true;
            return { ...item, uom: normalizeUom(item.uom) };
          }
          return item;
        });
        if (needsUpdate) {
          updates.finalOutputs = normalizedOutputs;
        }
      }

      // Normalizar finalConsumptions[].uom
      if (data.finalConsumptions && Array.isArray(data.finalConsumptions)) {
        const normalizedConsumptions = data.finalConsumptions.map((item: any) => {
          if (item.uom && normalizeUom(item.uom) !== item.uom) {
            needsUpdate = true;
            return { ...item, uom: normalizeUom(item.uom) };
          }
          return item;
        });
        if (needsUpdate) {
          updates.finalConsumptions = normalizedConsumptions;
        }
      }

      if (needsUpdate) {
        console.log(`  ✓ Actualizando ${doc.id}: ${JSON.stringify(updates)}`);
        if (!isDryRun) {
          await doc.ref.update(updates);
        }
        stats.productionOrders.updated++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error en ${doc.id}:`, error.message);
      stats.productionOrders.errors++;
    }
  }
}

/**
 * Normaliza UOMs en billOfMaterials
 */
async function migrateBillOfMaterials() {
  console.log('📋 Migrando billOfMaterials...');
  const snapshot = await db.collection('billOfMaterials').get();
  stats.billOfMaterials.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Normalizar baseUnit
      if (data.baseUnit && normalizeUom(data.baseUnit) !== data.baseUnit) {
        updates.baseUnit = normalizeUom(data.baseUnit);
        needsUpdate = true;
      }

      // Normalizar items[].uom
      if (data.items && Array.isArray(data.items)) {
        const normalizedItems = data.items.map((item: any) => {
          if (item.uom && normalizeUom(item.uom) !== item.uom) {
            needsUpdate = true;
            return { ...item, uom: normalizeUom(item.uom) };
          }
          return item;
        });
        if (needsUpdate) {
          updates.items = normalizedItems;
        }
      }

      if (needsUpdate) {
        console.log(`  ✓ Actualizando ${doc.id}`);
        if (!isDryRun) {
          await doc.ref.update(updates);
        }
        stats.billOfMaterials.updated++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error en ${doc.id}:`, error.message);
      stats.billOfMaterials.errors++;
    }
  }
}

/**
 * Normaliza UOMs en lots
 */
async function migrateLots() {
  console.log('🏷️  Migrando lots...');
  const snapshot = await db.collection('lots').get();
  stats.lots.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      
      if (data.uom && normalizeUom(data.uom) !== data.uom) {
        console.log(`  ✓ Actualizando ${doc.id}: ${data.uom} -> ${normalizeUom(data.uom)}`);
        if (!isDryRun) {
          await doc.ref.update({ uom: normalizeUom(data.uom) });
        }
        stats.lots.updated++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error en ${doc.id}:`, error.message);
      stats.lots.errors++;
    }
  }
}

/**
 * Normaliza UOMs en onHand
 */
async function migrateOnHand() {
  console.log('📊 Migrando onHand...');
  const snapshot = await db.collection('onHand').get();
  stats.onHand.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      
      if (data.uom && normalizeUom(data.uom) !== data.uom) {
        console.log(`  ✓ Actualizando ${doc.id}: ${data.uom} -> ${normalizeUom(data.uom)}`);
        if (!isDryRun) {
          await doc.ref.update({ uom: normalizeUom(data.uom) });
        }
        stats.onHand.updated++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error en ${doc.id}:`, error.message);
      stats.onHand.errors++;
    }
  }
}

/**
 * Normaliza UOMs en stockMoves
 */
async function migrateStockMoves() {
  console.log('📦 Migrando stockMoves...');
  const snapshot = await db.collection('stockMoves').get();
  stats.stockMoves.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      
      if (data.uom && normalizeUom(data.uom) !== data.uom) {
        console.log(`  ✓ Actualizando ${doc.id}: ${data.uom} -> ${normalizeUom(data.uom)}`);
        if (!isDryRun) {
          await doc.ref.update({ uom: normalizeUom(data.uom) });
        }
        stats.stockMoves.updated++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error en ${doc.id}:`, error.message);
      stats.stockMoves.errors++;
    }
  }
}

/**
 * Ejecuta todas las migraciones
 */
async function main() {
  console.log('🚀 Iniciando migración de normalización UOM...\n');
  const startTime = Date.now();

  try {
    await migrateProductionOrders();
    await migrateBillOfMaterials();
    await migrateLots();
    await migrateOnHand();
    await migrateStockMoves();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Migración completada en', duration, 'segundos\n');
    console.log('📊 Estadísticas:');
    console.log('─────────────────────────────────────────────────');
    
    Object.entries(stats).forEach(([collection, counts]) => {
      console.log(`${collection}:`);
      console.log(`  Total: ${counts.total}`);
      console.log(`  Actualizados: ${counts.updated}`);
      console.log(`  Errores: ${counts.errors}`);
    });
    
    const totalUpdated = Object.values(stats).reduce((sum, s) => sum + s.updated, 0);
    const totalErrors = Object.values(stats).reduce((sum, s) => sum + s.errors, 0);
    
    console.log('─────────────────────────────────────────────────');
    console.log(`TOTAL Actualizados: ${totalUpdated}`);
    console.log(`TOTAL Errores: ${totalErrors}`);

    if (isDryRun) {
      console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
    }

  } catch (error: any) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
