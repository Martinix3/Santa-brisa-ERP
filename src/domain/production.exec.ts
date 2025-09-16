// domain/production.exec.ts - Overlay de ejecución de Producción
import type { Uom } from './ssot';

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

export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };
