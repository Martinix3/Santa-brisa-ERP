// Barrel público: el resto de la app importa SIEMPRE desde 'domain'
export * from "./ssot"; // único punto del SSOT canónico

// Overlays / extensiones de módulos (no canónicos)
export type {
  RecipeBomExec, BomLineExec, ProductionOrderExec,
  MaterialShortage, Reservation, ActualConsumption,
  ProdExecStatus, StageDetail, ProdExecution, ProdCosting,
} from "./production.exec";

// Helpers transversales
export * from "./uom";
export * from "./inventory.helpers";
export * from "./production.qc";

// Marketing - Influencers (módulo separado)
export * from "./influencers";
export type { SSOTAdapter } from "./ssot.helpers";
