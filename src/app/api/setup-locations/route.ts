// src/app/api/setup-locations/route.ts
import { NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { CANONICAL_LOCATIONS } from '@/config/locations';

const LOCATIONS_TO_CREATE = [
  {
    id: CANONICAL_LOCATIONS.ALMACEN_PRINCIPAL,
    code: 'MAIN',
    name: 'Almacén Principal',
    type: 'WAREHOUSE',
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
    type: 'PRODUCTION',
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
    type: 'WAREHOUSE',
    allowsStock: true,
    requiresQc: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 1,
  },
];

export async function POST() {
  try {
    const batch = db.batch();
    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const location of LOCATIONS_TO_CREATE) {
      try {
        const locationRef = db.collection('locations').doc(location.id);
        const locationSnap = await locationRef.get();

        if (locationSnap.exists) {
          results.skipped.push(location.name);
        } else {
          batch.set(locationRef, location);
          results.created.push(location.name);
        }
      } catch (error: any) {
        results.errors.push(`${location.name}: ${error.message}`);
      }
    }

    if (results.created.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Configuración completada: ${results.created.length} creadas, ${results.skipped.length} ya existían`,
      results,
    });
  } catch (error: any) {
    console.error('Error al configurar ubicaciones:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
