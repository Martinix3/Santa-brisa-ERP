// src/lib/data-quality/types.ts
import type { Item, OnHandView, Lot } from '@/domain/ssot.v7';

export type AnomalySeverity = 'CRITICAL' | 'WARNING';

// Describe un problema encontrado por el motor.
export interface DataAnomaly {
  ruleId: string;         // Identificador de la regla que falló (ej: 'R1.1')
  severity: AnomalySeverity;
  message: string;        // Descripción del problema (ej: "El ítem no tiene coste estándar.")
  offendingEntity: {     // La entidad específica que tiene el problema
    type: 'Item' | 'Lot' | 'OnHand';
    id: string;           // El SKU, número de lote, etc.
  };
}

// Define la estructura de una regla.
export interface QualityRule {
  id: string;
  description: string;
  severity: AnomalySeverity;
  // La función que ejecuta la lógica de la regla.
  // Recibe los datos necesarios y devuelve una lista de anomalías.
  check: (context: { items: Item[], onHand: OnHandView[], lots: Lot[] }) => DataAnomaly[];
}
