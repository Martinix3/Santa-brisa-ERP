"use strict";
/**
 * Firebase Cloud Functions para Santa Brisa ERP
 *
 * Funciones programadas y triggers para automatización
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTaskToAlgolia = exports.syncContactToAlgolia = exports.checkInactiveAccounts = void 0;
// Automation Functions
var checkInactiveAccounts_1 = require("./automation/checkInactiveAccounts");
Object.defineProperty(exports, "checkInactiveAccounts", { enumerable: true, get: function () { return checkInactiveAccounts_1.checkInactiveAccounts; } });
// Algolia Sync Functions
var algolia_sync_1 = require("./algolia-sync");
Object.defineProperty(exports, "syncContactToAlgolia", { enumerable: true, get: function () { return algolia_sync_1.syncContactToAlgolia; } });
Object.defineProperty(exports, "syncTaskToAlgolia", { enumerable: true, get: function () { return algolia_sync_1.syncTaskToAlgolia; } });
// Future functions can be added here:
// export { sendTaskReminders } from "./notifications/taskReminders";
// export { validateTaskRefs } from "./maintenance/validateRefs";
//# sourceMappingURL=index.js.map