// src/app/api/integrations/holded/import-raw/route.ts
import { NextResponse } from 'next/server';
import { importAllHoldedRaw } from '@/server/integrations/holded/import-all-raw';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/holded/import-raw
 * 
 * Importa TODOS los datos de Holded en crudo (sin transformaciones)
 * a colecciones mirror en Firestore.
 * 
 * Colecciones creadas:
 * - integrations/holded/contacts_mirror
 * - integrations/holded/products_mirror
 * - integrations/holded/documents_mirror
 * - integrations/holded/warehouses_mirror
 * - integrations/holded/stockmovements_mirror
 * - integrations/holded/payments_mirror
 */
export async function POST(request: Request) {
  try {
    console.log('[API] Starting Holded raw import...');
    
    const result = await importAllHoldedRaw();
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Importación completada exitosamente' 
        : 'Importación completada con errores',
      summary: result.summary,
      totalTime: result.totalTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Holded raw import failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
