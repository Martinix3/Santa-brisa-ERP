// domain/ssot.ts - Barrel ÚNICO del SSOT
// Re-exporta SOLO tipos canónicos desde los archivos ssot.* (no overlays)
export * from "./ssot.core";
export * from "./ssot.production";
export * from "./ssot.inventory";
export * from "./ssot.procurement";
export * from "./ssot.sales";
export * from "./ssot.marketing";
export * from "./ssot.dataset";

// Extend Account with new fields for enrichment
import type { Account as BaseAccount, Material as BaseMaterial } from './ssot.core';

export interface Account extends BaseAccount {
    mainContactName?: string;
    mainContactEmail?: string;
    mainContactPhone?: string;
    
    paymentTermsDays?: number;
    paymentMethod?: string;
    billingEmail?: string;

    subType?: string;
    tags?: string[];
    notes?: string;
    
    deliveryInstructions?: string;
    openingHours?: string;
}

export interface Material extends BaseMaterial {
    standardCost?: number;
    unit?: Uom;
}
