"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISOWeek = getISOWeek;
exports.addDays = addDays;
exports.daysBetween = daysBetween;
exports.subDays = subDays;
exports.addMinutes = addMinutes;
/**
 * Obtiene el número de semana ISO del año para una fecha
 * Útil para deduplicación semanal de tareas
 */
function getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
/**
 * Añade días a una fecha
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
/**
 * Calcula los días entre dos fechas
 */
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffInMs = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffInMs / oneDay);
}
/**
 * Resta días a una fecha
 */
function subDays(date, days) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const result = new Date(dateObj);
    result.setDate(result.getDate() - days);
    return result;
}
/**
 * Añade minutos a una fecha
 */
function addMinutes(date, minutes) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const result = new Date(dateObj);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
}
//# sourceMappingURL=dateHelpers.js.map