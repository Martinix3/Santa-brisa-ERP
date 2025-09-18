// Barrel público: el resto de la app importa SIEMPRE desde 'domain'
export * from "./ssot"; // único punto del SSOT canónico

// Marketing - Influencers (módulo separado, pero sus tipos ya están en ssot.ts)
export type { InfluencerCollab, Creator } from "./ssot";

// Helpers de SSOT
export type { SSOTAdapter } from "./ssot.helpers";

// Tipos específicos para la ejecución de producción
export type { 
    RecipeBomExec, 
    ExecCheck, 
    ActualConsumption, 
    Reservation 
} from "./production.exec";
