#!/usr/bin/env tsx
/**
 * SSOT V2+ Seed Script
 * Seeds analysis library and base protocols
 * Direct to Firebase (no emulator)
 */

import { adminDb as db } from '../src/server/firebase';

const ANALYSIS_LIBRARY_SEED = [
  {
    id: 'PH-001',
    name: 'pH Measurement',
    category: 'PHYSICOCHEMICAL',
    unit: 'pH',
    methods: [
      {
        id: 'PH-M001',
        name: 'Potentiometric pH',
        equipment: ['pH meter', 'Calibration solutions'],
        procedure: 'Calibrate pH meter with standard solutions. Measure sample at 25°C.',
        acceptanceCriteria: { min: 3.0, max: 7.0 }
      }
    ],
    frequency: 'EVERY_LOT',
    isActive: true
  },
  {
    id: 'BRIX-001',
    name: 'Soluble Solids (Brix)',
    category: 'PHYSICOCHEMICAL',
    unit: '°Brix',
    methods: [
      {
        id: 'BRIX-M001',
        name: 'Refractometry',
        equipment: ['Refractometer'],
        procedure: 'Place sample drop on refractometer prism. Read at 20°C.',
        acceptanceCriteria: { min: 10.0, max: 14.0 }
      }
    ],
    frequency: 'EVERY_LOT',
    isActive: true
  },
  {
    id: 'MICRO-001',
    name: 'Total Aerobic Count',
    category: 'MICROBIOLOGICAL',
    unit: 'CFU/g',
    methods: [
      {
        id: 'MICRO-M001',
        name: 'Plate Count',
        equipment: ['Incubator', 'PCA plates'],
        procedure: 'Dilute sample, plate on PCA, incubate 48h at 37°C.',
        acceptanceCriteria: { max: 10000 }
      }
    ],
    frequency: 'EVERY_LOT',
    isActive: true
  },
  {
    id: 'YEAST-001',
    name: 'Yeast & Mold Count',
    category: 'MICROBIOLOGICAL',
    unit: 'CFU/g',
    methods: [
      {
        id: 'YEAST-M001',
        name: 'Plate Count',
        equipment: ['Incubator', 'YPD plates'],
        procedure: 'Dilute sample, plate on YPD, incubate 5 days at 25°C.',
        acceptanceCriteria: { max: 1000 }
      }
    ],
    frequency: 'EVERY_LOT',
    isActive: true
  },
  {
    id: 'SALM-001',
    name: 'Salmonella Detection',
    category: 'MICROBIOLOGICAL',
    unit: 'Presence/Absence',
    methods: [
      {
        id: 'SALM-M001',
        name: 'Enrichment + PCR',
        equipment: ['Incubator', 'PCR'],
        procedure: 'Pre-enrich 24h, selective enrich 24h, PCR confirmation.',
        acceptanceCriteria: { status: 'ABSENT' }
      }
    ],
    frequency: 'EVERY_LOT',
    isActive: true
  }
];

const PROTOCOLS_SEED = [
  {
    id: 'PROTO-JUICE-01',
    name: 'Juice Raw Material QC',
    itemCategories: ['JUICE_RAW'],
    parameters: [
      { parameterId: 'PH-001', mandatory: true },
      { parameterId: 'BRIX-001', mandatory: true },
      { parameterId: 'MICRO-001', mandatory: true },
      { parameterId: 'YEAST-001', mandatory: true },
      { parameterId: 'SALM-001', mandatory: false }
    ],
    samplingPlan: {
      sampleSize: 3,
      inspectionLevel: 'NORMAL',
      aql: 2.5
    },
    isActive: true,
    createdBy: 'SYSTEM_SEED',
    version: 1
  },
  {
    id: 'PROTO-PUREE-01',
    name: 'Puree Raw Material QC',
    itemCategories: ['PUREE_RAW'],
    parameters: [
      { parameterId: 'PH-001', mandatory: true },
      { parameterId: 'BRIX-001', mandatory: true },
      { parameterId: 'MICRO-001', mandatory: true },
      { parameterId: 'YEAST-001', mandatory: true }
    ],
    samplingPlan: {
      sampleSize: 3,
      inspectionLevel: 'NORMAL',
      aql: 2.5
    },
    isActive: true,
    createdBy: 'SYSTEM_SEED',
    version: 1
  }
];

async function seedAnalysisLibrary() {
  console.log('🌱 Seeding Analysis Library...');
  
  for (const analysis of ANALYSIS_LIBRARY_SEED) {
    const ref = db.doc(`analysisLibrary/${analysis.id}`);
    await ref.set({
      ...analysis,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'SYSTEM_SEED',
      schemaVersion: 1
    });
    console.log(`  ✓ ${analysis.id}: ${analysis.name}`);
  }
  
  console.log(`✅ Seeded ${ANALYSIS_LIBRARY_SEED.length} analyses\n`);
}

async function seedProtocols() {
  console.log('🌱 Seeding QC Protocols...');
  
  for (const protocol of PROTOCOLS_SEED) {
    const ref = db.doc(`qcProtocols/${protocol.id}`);
    await ref.set({
      ...protocol,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    });
    console.log(`  ✓ ${protocol.id}: ${protocol.name}`);
  }
  
  console.log(`✅ Seeded ${PROTOCOLS_SEED.length} protocols\n`);
}

async function main() {
  try {
    console.log('🚀 SSOT V2+ Seed Script\n');
    console.log('Target: Firebase Production\n');
    
    await seedAnalysisLibrary();
    await seedProtocols();
    
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
