// src/app/api/integrations/holded/normalize/route.ts
import { NextResponse } from 'next/server';
import { normalizeAllHoldedData } from '@/server/integrations/holded/normalize-all';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/holded/normalize
 * 
 * Normaliza TODOS los datos de los mirrors de Holded al SSOT
 * con estructura completa (todos los campos presentes).
 * 
 * Proceso:
 * 1. Lee de integrations/holded/*_mirror
 * 2. Aplica mappers con materialize()
 * 3. Escribe a colecciones SSOT (accounts, items, warehouses, orders)
 * 4. Usa merge: false para forzar estructura completa
 */
export async function POST(request: Request) {
  try {
    console.log('[API] Starting Holded normalization...');
    
    const result = await normalizeAllHoldedData();
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Normalización completada exitosamente' 
        : 'Normalización completada con errores',
      summary: result.summary,
      totalTime: result.totalTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Holded normalization failed:', error);
    
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
