/**
 * Firebase Cloud Functions para Santa Brisa ERP
 * 
 * Funciones programadas y triggers para automatización
 */

// Automation Functions
export { checkInactiveAccounts } from "./automation/checkInactiveAccounts";

// Algolia Sync Functions
export { syncContactToAlgolia, syncTaskToAlgolia } from "./algolia-sync";

// Future functions can be added here:
// export { sendTaskReminders } from "./notifications/taskReminders";
// export { validateTaskRefs } from "./maintenance/validateRefs";
