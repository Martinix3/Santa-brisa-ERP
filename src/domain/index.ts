
// Barrel público: el resto de la app importa SIEMPRE desde 'domain'
export * from "./ssot"; // único punto del SSOT canónico

// Marketing - Influencers (módulo separado)
export type { InfluencerCollab, Creator } from "./influencers";

export type { SSOTAdapter } from "./ssot.helpers";

// Production execution types
export type { 
    RecipeBomExec, 
    ExecCheck, 
    ActualConsumption, 
    Reservation 
} from "./production.exec";
