// src/lib/data-quality/engine.ts
import { adminDb as db } from '@/server/firebase';
import type { DataAnomaly, QualityRule } from './types';
import type { Item, OnHandView, Lot } from '@/domain/ssot';

// Importa todas tus reglas
import { R1_1_MissingStandardCost } from './rules/R1_1_MissingStandardCost';
// ... import { R4_1_NegativeStock } from './rules/R4_1_NegativeStock';

// Colecciona todas las reglas en un array para ejecutarlas fácilmente
const allRules: QualityRule[] = [
  R1_1_MissingStandardCost,
  // R4_1_NegativeStock, 
  // ...añade más reglas aquí a medida que las crees
];

async function fetchDataForDQE(): Promise<{ items: Item[], onHand: OnHandView[], lots: Lot[] }> {
    const [itemsSnap, onHandSnap, lotsSnap] = await Promise.all([
        db.collection('items').get(),
        db.collection('onHand').get(),
        db.collection('lots').get(),
    ]);

    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    const onHand = onHandSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnHandView));
    const lots = lotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lot));
    
    return { items, onHand, lots };
}

export async function runDataQualityEngine(): Promise<DataAnomaly[]> {
  console.log('🚀 Ejecutando Motor de Calidad de Datos...');
  
  // 1. Obtén todos los datos necesarios.
  const context = await fetchDataForDQE();
  
  // 2. Ejecuta cada regla y concatena los resultados.
  let allAnomalies: DataAnomaly[] = [];
  
  for (const rule of allRules) {
    try {
        const anomalies = rule.check(context);
        if (anomalies.length > 0) {
          allAnomalies = allAnomalies.concat(anomalies);
        }
    } catch (e) {
        console.error(`Error ejecutando la regla ${rule.id}:`, e);
    }
  }

  console.log(`✅ Auditoría completada. Se encontraron ${allAnomalies.length} anomalías.`);
  return allAnomalies;
}
