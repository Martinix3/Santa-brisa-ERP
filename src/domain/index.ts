// Barrel público: el resto de la app importa SIEMPRE desde 'domain'
export * from "./ssot"; // único punto del SSOT canónico

// Marketing - Influencers (módulo separado)
export * from "./influencers";
export type { SSOTAdapter } from "./ssot.helpers";
export * from "./production.exec";
