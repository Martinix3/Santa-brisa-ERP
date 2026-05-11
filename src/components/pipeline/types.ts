/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/pipeline/types.ts
export type StageKey = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA';

export interface PipelineItem {
  id: string;
  name: string;               // Account name
  stage: StageKey;
  city?: string;
  lastInteractionDays?: number;  // días desde último contacto
  lastInteractionDate?: Date;    // fecha de última interacción
  lastOrderDays?: number;        // días desde último pedido
  posInstalled?: boolean;        // tiene POS
  estValueEUR?: number;          // valor estimado (opcional)
  isTarget?: boolean;            // cuenta marcada como target (copper dark card)
  hasAlerts?: boolean;           // tiene alertas activas
  noConsumption?: boolean;       // sin consumo reciente
  zone?: string;                 // zona geográfica
  commercialId?: string;         // ID del comercial asignado
  distributorPartyId?: string;   // ID del distribuidor
}

export interface PipelineFilters {
  query?: string;
  zone?: string;
  repId?: string;
  commercialId?: string;         // filtro por comercial
  distributorPartyId?: string;   // filtro por distribuidor
  noContactGtDays?: number;
  withPOS?: boolean;
  onlyRisk?: boolean;            // p.ej., activa >30d sin compra
  onlyTargets?: boolean;         // solo cuentas target
  withAlerts?: boolean;          // solo con alertas
}
