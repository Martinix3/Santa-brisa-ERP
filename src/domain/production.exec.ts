
// domain/production.exec.ts - Overlay de ejecución de Producción
import type { Uom, QCResult, Timestamp, ProductionOrder } from './ssot';

// --- Tipos para la UI y Lógica de Ejecución ---

export type BomLineExec = {
  itemId: string;
  name: string;
  qtyPerBatch: number;
  uom: Uom;
  stdCostPerUom: number;
};

export type RecipeBomExec = {
  id: string;
  name: string;
  finishedItemId: string;
  finishedName: string;
  baseBatchSize: number;
  baseUnit: Uom;
  commercialItemId: string;
  bottlesPerLitre?: number;
  lines: BomLineExec[];
  protocolChecklist: { id: string; text: string }[];
  stdOverheadPerBatch?: number;
  stdLaborCostPerHour?: number;
  stdLaborHoursPerBatch?: number;
};

export type MaterialShortage = {
  itemId: string;
  name: string;
  required: number;
  available: number;
  uom: Uom;
};

export type Reservation = {
  itemId: string;
  fromLotNumber: string;
  reservedQty: number;
  uom: Uom;
};

export type ActualConsumption = {
  itemId: string;
  name: string;
  fromLotNumber?: string;
  theoreticalQty: number;
  actualQty: number;
  uom: Uom;
  costPerUom: number;
};

export type ProdExecStatus = "PROGRAMADA" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";

export type ProdExecution = {
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  durationHours?: number;
  finalYield?: number;
  yieldUom?: 'L' | 'unit';
  goodUnits?: number;
  scrapUnits?: number;
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
  bomId: string;
  outputItemId: string;
  targetQuantity: number;
  status: 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
  createdAt: Timestamp;
  batchCode?: string;
  // Overlay/UI specific fields
  execStatus?: ProdExecStatus;
  scheduledFor?: Timestamp;
  responsibleId?: string;
  checks?: ExecCheck[];
  reservations?: Reservation[];
  shortages?: MaterialShortage[];
  actuals?: ActualConsumption[];
  execution?: ProdExecution;
  incidents?: { id: string; when: Timestamp; severity: "BAJA" | "MEDIA" | "ALTA"; text: string }[];
};
