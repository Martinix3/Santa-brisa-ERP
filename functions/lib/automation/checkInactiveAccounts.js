"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInactiveAccounts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_admin_1 = require("../firebase-admin");
const dateHelpers_1 = require("../utils/dateHelpers");
/**
 * Cloud Function programada que revisa cuentas inactivas
 * y genera tareas automáticas para el equipo de ventas
 *
 * Ejecuta diariamente a las 9 AM
 */
exports.checkInactiveAccounts = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * *", // Diario a las 9 AM
    timeZone: "Europe/Madrid",
    memory: "512MiB",
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    console.log("🤖 [checkInactiveAccounts] Iniciando revisión de cuentas inactivas...");
    try {
        // 1. Obtener configuración del sistema
        const configSnap = await firebase_admin_1.db.collection("systemConfig").doc("default").get();
        const config = configSnap.data();
        const DAYS_WITHOUT_ORDER = ((_b = (_a = config === null || config === void 0 ? void 0 : config.businessRules) === null || _a === void 0 ? void 0 : _a.alerts) === null || _b === void 0 ? void 0 : _b.daysWithoutOrder) || 45;
        const DAYS_WITHOUT_VISIT = ((_d = (_c = config === null || config === void 0 ? void 0 : config.businessRules) === null || _c === void 0 ? void 0 : _c.alerts) === null || _d === void 0 ? void 0 : _d.daysWithoutVisit) || 30;
        const DAYS_CRITICAL = ((_f = (_e = config === null || config === void 0 ? void 0 : config.businessRules) === null || _e === void 0 ? void 0 : _e.alerts) === null || _f === void 0 ? void 0 : _f.daysSinPedidoCritical) || 60;
        console.log(`📊 Thresholds: ${DAYS_WITHOUT_ORDER}d sin pedido, ${DAYS_WITHOUT_VISIT}d sin visita`);
        const now = new Date();
        const weekKey = (0, dateHelpers_1.getISOWeek)(now); // Para deduplicación semanal
        // 2. Obtener cuentas activas (CUSTOMER)
        const accountsSnap = await firebase_admin_1.db
            .collection("contacts")
            .where("roles", "array-contains", "CUSTOMER")
            .get();
        console.log(`📋 Revisando ${accountsSnap.size} cuentas...`);
        let tasksCreated = 0;
        let tasksUpdated = 0;
        // 3. Revisar cada cuenta
        for (const accountDoc of accountsSnap.docs) {
            const account = accountDoc.data();
            // Skip si no tiene owner
            if (!((_g = account.customer) === null || _g === void 0 ? void 0 : _g.ownerId)) {
                continue;
            }
            // A. Check último pedido
            const lastOrderSnap = await firebase_admin_1.db
                .collection("ordersSellOut")
                .where("accountId", "==", account.id)
                .orderBy("orderDate", "desc")
                .limit(1)
                .get();
            const lastOrder = (_h = lastOrderSnap.docs[0]) === null || _h === void 0 ? void 0 : _h.data();
            const daysSinceOrder = lastOrder
                ? (0, dateHelpers_1.daysBetween)(new Date(lastOrder.orderDate), now)
                : 999;
            if (daysSinceOrder >= DAYS_WITHOUT_ORDER) {
                const priority = daysSinceOrder >= DAYS_CRITICAL ? "HIGH" : "MEDIUM";
                const dedupeKey = `no-order-${account.id}-week-${weekKey}`;
                const result = await upsertAutoTask({
                    dedupeKey,
                    accountId: account.id,
                    title: `Visitar: ${account.displayName} (${daysSinceOrder}d sin pedido)`,
                    desc: `Último pedido: ${(lastOrder === null || lastOrder === void 0 ? void 0 : lastOrder.orderDate) ? new Date(lastOrder.orderDate).toLocaleDateString() : "nunca"}`,
                    kind: "VISITA",
                    department: "VENTAS",
                    source: "AUTO_RULE",
                    assignedToId: account.customer.ownerId,
                    status: "BACKLOG",
                    priority,
                    dueAt: (0, dateHelpers_1.addDays)(now, 2).toISOString(),
                });
                if (result.created)
                    tasksCreated++;
                else
                    tasksUpdated++;
            }
            // B. Check última visita
            const lastVisitSnap = await firebase_admin_1.db
                .collection("interactions")
                .where("accountId", "==", account.id)
                .where("kind", "==", "VISITA")
                .where("status", "==", "done")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
            const lastVisit = (_j = lastVisitSnap.docs[0]) === null || _j === void 0 ? void 0 : _j.data();
            const daysSinceVisit = lastVisit
                ? (0, dateHelpers_1.daysBetween)(new Date(lastVisit.createdAt), now)
                : 999;
            if (daysSinceVisit >= DAYS_WITHOUT_VISIT) {
                const dedupeKey = `no-visit-${account.id}-week-${weekKey}`;
                const result = await upsertAutoTask({
                    dedupeKey,
                    accountId: account.id,
                    title: `Contactar: ${account.displayName} (${daysSinceVisit}d sin visita)`,
                    desc: `Última visita: ${(lastVisit === null || lastVisit === void 0 ? void 0 : lastVisit.createdAt) ? new Date(lastVisit.createdAt).toLocaleDateString() : "nunca"}`,
                    kind: "VISITA",
                    department: "VENTAS",
                    source: "AUTO_RULE",
                    assignedToId: account.customer.ownerId,
                    status: "BACKLOG",
                    priority: "MEDIUM",
                    dueAt: (0, dateHelpers_1.addDays)(now, 3).toISOString(),
                });
                if (result.created)
                    tasksCreated++;
                else
                    tasksUpdated++;
            }
        }
        console.log(`✅ [checkInactiveAccounts] Completado: ${tasksCreated} creadas, ${tasksUpdated} actualizadas`);
        return {
            success: true,
            accountsReviewed: accountsSnap.size,
            tasksCreated,
            tasksUpdated,
        };
    }
    catch (error) {
        console.error("❌ [checkInactiveAccounts] Error:", error);
        throw error;
    }
});
/**
 * Crea o actualiza una tarea automática con deduplicación
 */
async function upsertAutoTask(data) {
    const { dedupeKey } = data, taskData = __rest(data, ["dedupeKey"]);
    // Buscar tarea existente para esta cuenta en estado activo
    const existingSnap = await firebase_admin_1.db
        .collection("tasks")
        .where("source", "==", "AUTO_RULE")
        .where("accountId", "==", taskData.accountId)
        .where("status", "in", ["BACKLOG", "IN_PROGRESS", "PROGRAMADA"])
        .where("kind", "==", taskData.kind)
        .limit(1)
        .get();
    const now = new Date().toISOString();
    if (!existingSnap.empty) {
        // Actualizar tarea existente
        const taskRef = existingSnap.docs[0].ref;
        await taskRef.update({
            title: taskData.title,
            desc: taskData.desc,
            priority: taskData.priority,
            dueAt: taskData.dueAt,
            updatedAt: now,
        });
        return {
            created: false,
            updated: true,
            taskId: existingSnap.docs[0].id,
        };
    }
    else {
        // Crear nueva tarea
        const ref = firebase_admin_1.db.collection("tasks").doc();
        await ref.set(Object.assign(Object.assign({ id: ref.id }, taskData), { isPriority: false, priorityRank: taskData.priority === "HIGH" ? 1 : 0, slaBucket: "LATER", progress: 0, createdById: "system", createdAt: now, updatedAt: now }));
        return {
            created: true,
            updated: false,
            taskId: ref.id,
        };
    }
}
//# sourceMappingURL=checkInactiveAccounts.js.map