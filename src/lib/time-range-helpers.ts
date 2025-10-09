/**
 * Rango temporal para dashboards
 * Usado en todos los dashboards excepto Dashboard Personal
 */
export type TimeRange = 'day' | 'week' | 'month' | 'ytd';

/**
 * Labels en español para los rangos temporales
 */
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Hoy',
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
  ytd: 'Acumulado'
};

/**
 * Filtra una fecha según el rango temporal seleccionado
 * Todos los rangos son "rolling" (ventanas móviles) excepto ytd
 */
export function filterByTimeRange(date: string, range: TimeRange): boolean {
  const now = new Date();
  const targetDate = new Date(date);
  
  switch (range) {
    case 'day': {
      // Hoy (desde las 00:00 de hoy)
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return targetDate >= today;
    }
    
    case 'week': {
      // Últimos 7 días (rolling)
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return targetDate >= weekAgo;
    }
      
    case 'month': {
      // Últimos 30 días (rolling)
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);
      return targetDate >= monthAgo;
    }
      
    case 'ytd': {
      // Año hasta la fecha (Year To Date)
      return targetDate.getFullYear() === now.getFullYear();
    }
    
    default:
      return true;
  }
}

/**
 * Obtiene el label del rango temporal
 */
export function getTimeRangeLabel(range: TimeRange): string {
  return TIME_RANGE_LABELS[range];
}

/**
 * Obtiene las fechas de inicio y fin del periodo
 */
export function getPeriodDates(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  
  switch (range) {
    case 'day': {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    }
    
    case 'week': {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    }
      
    case 'month': {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    }
      
    case 'ytd': {
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }
  
  return { start, end };
}

/**
 * Verifica si una fecha está vencida (pasada)
 */
export function isOverdue(date: string): boolean {
  const now = new Date();
  const targetDate = new Date(date);
  now.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < now;
}

/**
 * Calcula días desde una fecha
 */
export function daysSince(date: string): number {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
