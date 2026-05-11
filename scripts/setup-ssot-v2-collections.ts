#!/usr/bin/env tsx
// scripts/setup-ssot-v2-collections.ts

import { adminDb as db } from '../src/server/firebase';
import { validateSchemaData } from '../src/domain/ssot-v2-schemas';
import { LocationSchema } from '../src/domain/ssot-v2-schemas';
import type { LocationV2 } from '../src/domain/ssot-v2-schemas';

/**
 * Script para inicializar las nuevas colecciones del SSOT v2
 * Ejecutar: npx tsx scripts/setup-ssot-v2-collections.ts
 */

async function setupLocations() {
  console.log('📍 Setting up locations collection...');
  
  const defaultLocations: Omit<LocationV2, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      code: 'MAIN',
      name: 'Almacén Principal',
      type: 'WAREHOUSE',
      allowsStock: true,
      requiresQc: false,
      address: 'Santa Brisa - Almacén Central',
      capacity: {
        maxWeight: 50000,        // 50 toneladas
        maxVolume: 1000,         // 1000 m3
        maxPallets: 200
      },
      isActive: true,
      schemaVersion: 1
    },
    {
      code: 'QC_LAB',
      name: 'Laboratorio de Calidad',
      type: 'WAREHOUSE',
      allowsStock: true,
      requiresQc: true,
      isActive: true,
      schemaVersion: 1
    },
    {
      code: 'REJECTED_AREA',
      name: 'Área de Rechazados',
      type: 'WAREHOUSE',
      allowsStock: true,
      requiresQc: false,
      isActive: true,
      schemaVersion: 1
    },
    {
      code: 'PRODUCTION_LINE_1',
      name: 'Línea de Producción 1',
      type: 'PRODUCTION',
      allowsStock: true,
      requiresQc: false,
      isActive: true,
      schemaVersion: 1
    },
    {
      code: 'SHIPPING_DOCK',
      name: 'Muelle de Carga',
      type: 'WAREHOUSE',
      allowsStock: true,
      requiresQc: false,
      isActive: true,
      schemaVersion: 1
    },
    {
      code: 'SUPPLIER_VIRTUAL',
      name: 'Proveedor (Virtual)',
      type: 'VIRTUAL',
      allowsStock: false,
      isActive: true,
      schemaVersion: 1
    }
  ];
  
  const batch = db.batch();
  const now = new Date();
  
  for (const locationData of defaultLocations) {
    const locationRef = db.collection('locations').doc();
    
    const fullLocationData: LocationV2 = {
      ...locationData,
      id: locationRef.id,
      createdAt: now,
      updatedAt: now
    };
    
    // Validar con schema antes de escribir
    validateSchemaData(LocationSchema, fullLocationData);
    
    batch.set(locationRef, fullLocationData);
    console.log(`  ✅ Created location: ${locationData.code} - ${locationData.name}`);
  }
  
  await batch.commit();
  console.log('📍 Locations collection setup complete!\n');
}

async function setupCounters() {
  console.log('🔢 Setting up counters collection...');
  
  // Crear contadores iniciales para diferentes ámbitos
  const initialCounters = [
    {
      scope: 'LOT:SB:25001',     // Ejemplo: Santa Brisa, día 1 del año 2025
      value: 0,
      lastUsed: new Date().toISOString(),
      updatedAt: new Date()
    }
  ];
  
  const batch = db.batch();
  
  for (const counterData of initialCounters) {
    const counterRef = db.collection('counters').doc(counterData.scope);
    batch.set(counterRef, counterData);
    console.log(`  ✅ Created counter: ${counterData.scope}`);
  }
  
  await batch.commit();
  console.log('🔢 Counters collection setup complete!\n');
}

async function verifyCollections() {
  console.log('✅ Verifying collections...');
  
  // Verificar locations
  const locationsSnap = await db.collection('locations').limit(1).get();
  console.log(`  📍 Locations: ${locationsSnap.size} documents`);
  
  // Verificar counters
  const countersSnap = await db.collection('counters').limit(1).get();
  console.log(`  🔢 Counters: ${countersSnap.size} documents`);
  
  console.log('✅ Collection verification complete!\n');
}

async function createIndexes() {
  console.log('📊 Creating Firestore indexes...');
  
  const indexDefinitions = [
    // OnHand indexes
    'onHand: itemId',
    'onHand: itemId, locationId',
    'onHand: lotCode',
    'onHand: locationId',
    'onHand: itemId, availableQty',
    'onHand: updatedAt',
    
    // TraceEvents v2 indexes
    'traceEvents: itemId',
    'traceEvents: lotCode',
    'traceEvents: occurredAt',
    'traceEvents: kind',
    'traceEvents: itemId, occurredAt',
    
    // AlertEvents indexes
    'alertEvents: phase',
    'alertEvents: status',
    'alertEvents: at',
    'alertEvents: ruleId',
    
    // Documents indexes
    'documents: linkedEntity.type',
    'documents: linkedEntity.id',
    'documents: uploadedBy',
    'documents: type',
    'documents: uploadedAt',
    
    // Locations indexes
    'locations: code',
    'locations: type',
    'locations: isActive',
    
    // Lots v2 indexes (actualizar)
    'lots: lotCode',              // Nuevo índice único
    'lots: itemId',
    'lots: qcStatus',
    'lots: itemId, qcStatus',
    
    // Items indexes (añadir unique constraint)
    'items: sku',                 // Debe ser único
    'items: category',
    'items: active'
  ];
  
  console.log('📊 Required Firestore indexes:');
  indexDefinitions.forEach(def => {
    console.log(`  - ${def}`);
  });
  
  console.log('\n⚠️  MANUAL STEP REQUIRED:');
  console.log('   Create these indexes in Firestore Console:');
  console.log('   https://console.firebase.google.com/project/santa-brisa-erp/firestore/indexes');
  console.log();
}

async function main() {
  try {
    console.log('🚀 SSOT v2 - Collections Setup\n');
    
    await setupLocations();
    await setupCounters();
    await verifyCollections();
    await createIndexes();
    
    console.log('🎉 SSOT v2 collections setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Create Firestore indexes manually (see above)');
    console.log('   2. Run tests: npm run test:ssot-v2');
    console.log('   3. Proceed to FASE 2: Transacciones');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { setupLocations, setupCounters, verifyCollections, createIndexes };
