// src/features/agenda/helpers.ts

// === Normalización robusta de fechas ===
export const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  
    if (typeof d === 'string' || typeof d === 'number') {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  
    // Firestore Timestamp u objetos parecidos
    if (typeof d === 'object') {
        // Evita arrays u objetos extraños
        if (Array.isArray(d)) return null;
        if (!d) return null;

        // Timestamp de Firestore
        if (typeof d.toDate === 'function') {
            const dt = d.toDate();
            return isNaN(dt.getTime()) ? null : dt;
        }
        if (typeof d.toMillis === 'function') {
            const dt = new Date(d.toMillis());
            return isNaN(dt.getTime()) ? null : dt;
        }
        // { seconds, nanoseconds }
        if ('seconds' in d && typeof d.seconds === 'number') {
            const ms = d.seconds * 1000 + (typeof d.nanoseconds === 'number' ? d.nanoseconds / 1e6 : 0);
            const dt = new Date(ms);
            return isNaN(dt.getTime()) ? null : dt;
        }
    }
  
    return null;
};
  
export const sbAsISO = (d: any) => {
    const date = toDate(d);
    // Guardas máximas: que exista y que tenga getTime
    if (!date || typeof (date as any).getTime !== 'function') return undefined;
    const t = (date as Date).getTime?.();
    if (typeof t !== 'number' || Number.isNaN(t)) return undefined;
    // Normaliza a “local-aware” ISO (sin desplazar el reloj)
    return new Date(t - new Date().getTimezoneOffset() * 60000).toISOString();
};
