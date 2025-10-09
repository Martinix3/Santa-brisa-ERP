// src/app/api/integrations/holded/export-raw/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebase';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/holded/export-raw
 * 
 * Exporta TODOS los datos RAW de las colecciones mirror de Holded
 * como un archivo JSON descargable.
 * 
 * Colecciones exportadas:
 * - integrations/holded/contacts_mirror
 * - integrations/holded/products_mirror
 * - integrations/holded/documents_mirror
 * - integrations/holded/warehouses_mirror
 * - integrations/holded/stockmovements_mirror
 * - integrations/holded/payments_mirror
 */
export async function GET(request: Request) {
  try {
    console.log('[API] Starting Holded raw export...');
    const startTime = Date.now();

    const collections = [
      'contacts_mirror',
      'products_mirror',
      'documents_mirror',
      'warehouses_mirror',
      'stockmovements_mirror',
      'payments_mirror',
    ];

    const exportData: Record<string, any[]> = {};
    const stats: Record<string, number> = {};

    // Fetch all data from each mirror collection
    for (const collectionName of collections) {
      const collectionPath = `integrations/holded/${collectionName}`;
      console.log(`[Export] Fetching ${collectionPath}...`);
      
      try {
        const snapshot = await adminDb.collection(collectionPath).get();
        const docs = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        exportData[collectionName] = docs;
        stats[collectionName] = docs.length;
        
        console.log(`[Export] Fetched ${docs.length} documents from ${collectionName}`);
      } catch (error: any) {
        console.error(`[Export] Error fetching ${collectionName}:`, error);
        exportData[collectionName] = [];
        stats[collectionName] = 0;
      }
    }

    const totalTime = Date.now() - startTime;
    const totalDocuments = Object.values(stats).reduce((sum, count) => sum + count, 0);

    // Create the export object with metadata
    const exportObject = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalDocuments,
        totalTime,
        stats,
      },
      data: exportData,
    };

    console.log(`[Export] Completed in ${totalTime}ms. Total documents: ${totalDocuments}`);

    // Return as JSON file download
    const jsonString = JSON.stringify(exportObject, null, 2);
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="holded-raw-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[API] Holded raw export failed:', error);
    
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
