// domain/production.exec.ts - Overlay de ejecución de Producción
import type { Uom, QCResult } from './ssot.core';

// --- Tipos para la UI y Lógica de Ejecución ---

export type BomLineExec = {
  materialId: string;
  name: string;
  qtyPerBatch: number;
  uom: Uom;
  stdCostPerUom: number;
};

export type RecipeBomExec = {
  id: string;
  name: string;
  finishedSku: string;
  finishedName: string;
  baseBatchSize: number;
  baseUnit: Uom;
  commercialSku: string;
  bottlesPerLitre?: number;
  lines: BomLineExec[];
  protocolChecklist: { id: string; text: string }[];
  stdOverheadPerBatch?: number;
  stdLaborCostPerHour?: number;
  stdLaborHoursPerBatch?: number;
};

export type MaterialShortage = {
  materialId: string;
  name: string;
  required: number;
  available: number;
  uom: Uom;
};

export type Reservation = {
  materialId: string;
  fromLot: string;
  reservedQty: number;
  uom: Uom;
};

export type ActualConsumption = {
  materialId: string;
  name: string;
  fromLot?: string;
  theoreticalQty: number;
  actualQty: number;
  uom: Uom;
  costPerUom: number;
};

export type ProdExecStatus = "PROGRAMADA" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";

export type ProdExecution = {
  startedAt?: string;
  finishedAt?: string;
  durationHours?: number;
  finalYield?: number;
  yieldUom?: 'L' | 'ud';
  goodBottles?: number;
  scrapBottles?: number;
};

export type ProdCosting = {
  materialsEUR: number;
  laborEUR: number;
  overheadEUR: number;
  totalEUR: number;
  costPerBottleEUR: number;
  yieldPct: number;
  scrapPct: number;
};

export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };

export interface StageDetail {
  name: string;
  checklists?: { id: string; text: string; done: boolean }[];
  instructions?: string;
}

export type ProductionOrderExec = {
  id: string;
  bomId: string; // Changed from recipeId
  sku: string; // finished good SKU
  targetQuantity: number;
  status: 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
  createdAt: string;
  lotId?: string;
  // Overlay/UI specific fields
  execStatus?: ProdExecStatus;
  scheduledFor?: string;
  responsibleId?: string;
  checks?: ExecCheck[];
  reservations?: Reservation[];
  shortages?: MaterialShortage[];
  actuals?: ActualConsumption[];
  execution?: ProdExecution;
  incidents?: { id: string; when: string; severity: "BAJA" | "MEDIA" | "ALTA"; text: string }[];
  costing?: ProdCosting;
  updatedAt?: string;
};
