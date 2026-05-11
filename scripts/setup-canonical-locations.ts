// scripts/setup-canonical-locations.ts
/**
 * Script para crear ubicaciones canónicas en Firestore
 * Ejecutar una vez para inicializar el sistema de ubicaciones
 */

import { adminDb as db } from '../src/server/firebase';
import { CANONICAL_LOCATIONS } from '../src/config/locations';

const LOCATIONS_TO_CREATE = [
  {
    id: CANONICAL_LOCATIONS.ALMACEN_PRINCIPAL,
    code: 'MAIN',
    name: 'Almacén Principal',
    type: 'WAREHOUSE' as const,
    allowsStock: true,
    requiresQc: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
  {
    id: 'PRODUCCION',
    code: 'PROD',
    name: 'Producción',
    type: 'PRODUCTION' as const,
    allowsStock: true,
    requiresQc: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
  {
    id: 'CALIDAD',
    code: 'QC',
    name: 'Control de Calidad',
    type: 'WAREHOUSE' as const,
    allowsStock: true,
    requiresQc: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
  {
    id: CANONICAL_LOCATIONS.VIRTUAL_MANUAL,
    code: 'VIR_MAN',
    name: 'Ajustes Manuales (Virtual)',
    type: 'VIRTUAL' as const,
    allowsStock: false,
    requiresQc: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
  {
    id: CANONICAL_LOCATIONS.VIRTUAL_PRODUCTION,
    code: 'VIR_PROD',
    name: 'Producción (Virtual)',
    type: 'VIRTUAL' as const,
    allowsStock: false,
    requiresQc: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
];

async function setupCanonicalLocations() {
  console.log('🏗️  Iniciando configuración de ubicaciones canónicas...\n');

  const batch = db.batch();
  let created = 0;
  let skipped = 0;

  for (const location of LOCATIONS_TO_CREATE) {
    const locationRef = db.collection('locations').doc(location.id);
    const locationSnap = await locationRef.get();

    if (locationSnap.exists) {
      console.log(`⏭️  Ubicación ya existe: ${location.name} (${location.id})`);
      skipped++;
    } else {
      batch.set(locationRef, location);
      console.log(`✅ Creando ubicación: ${location.name} (${location.id})`);
      created++;
    }
  }

  if (created > 0) {
    await batch.commit();
    console.log(`\n✅ ${created} ubicación(es) creada(s) exitosamente`);
  }

  console.log(`⏭️  ${skipped} ubicación(es) ya existían`);
  console.log('\n🎉 Configuración completada\n');
}

// Ejecutar
setupCanonicalLocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error al configurar ubicaciones:', error);
    process.exit(1);
  });
