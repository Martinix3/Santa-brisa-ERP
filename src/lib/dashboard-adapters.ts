/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Dashboard Adapters System
 * 
 * Transforma datos de Firestore (SSOT) al formato esperado por la UI.
 * Centraliza toda la lógica de transformación para evitar código duplicado.
 * 
 * Ventajas:
 * - Single Source of Truth para transformaciones
 * - Reutilizable en todos los dashboards
 * - Mantenible (cambios en 1 lugar)
 * - Testeable (unit tests simples)
 */

// ============= TYPES =============

export interface InactiveAccountUI {
  id: string;
  name: string;
  city: string;
  lastActivity: string; // "45 días"
  daysSince: number;
}

export interface UpcomingVisitUI {
  id: string;
  accountId: string;
  accountName: string;
  city: string;
  type: string;
  date: string; // "Hoy", "Mañana", "Lunes 15"
  timestamp: Date;
  notes?: string;
}

export interface RecentActivityUI {
  id: string;
  type: 'visit' | 'call' | 'email' | 'order' | 'meeting' | 'note' | 'other';
  title: string;
  description: string;
  timestamp: string; // ISO string
  icon: string;
}

export interface TaskAlertUI {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  actionLabel: string;
}

// ============= UTILITIES =============

/**
 * Extrae ciudad de un objeto location con address
 */
function extractCityFromLocation(location?: { address?: string; city?: string }): string {
  // Si tiene campo city directo, usarlo
  if (location?.city) return location.city;
  
  // Si no, parsear address string
  if (!location?.address) return '';
  
  // Parse "Calle X, Madrid, 28001" → "Madrid"
  const parts = location.address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[1]; // Segunda parte suele ser ciudad
  }
  
  return '';
}

/**
 * Formatea fecha a formato UI español amigable
 */
function formatDateToUI(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  if (checkDate.getTime() === today.getTime()) return 'Hoy';
  if (checkDate.getTime() === tomorrow.getTime()) return 'Mañana';
  
  // Formato: "Lunes 15 nov"
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short' 
  });
}

/**
 * Calcula días desde una fecha
 */
function daysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============= ADAPTERS =============

export class DashboardAdapters {
  
  /**
   * Adapter: Account → InactiveAccountUI
   * Usado en dashboards para mostrar cuentas sin actividad reciente
   */
  static adaptInactiveAccount(account: any): InactiveAccountUI {
    const lastActivity = account.lastInteractionDate?.toDate 
      ? account.lastInteractionDate.toDate() 
      : account.lastInteractionAt 
        ? new Date(account.lastInteractionAt)
        : new Date(0);
    
    const days = daysSince(lastActivity);
    
    return {
      id: account.id,
      name: account.name || 'Sin nombre',
      city: extractCityFromLocation(account.location),
      lastActivity: `${days} días`,
      daysSince: days
    };
  }
  
  /**
   * Adapter: Interaction + Account → UpcomingVisitUI
   * Usado para mostrar próximas visitas programadas
   */
  static adaptUpcomingVisit(interaction: any, account: any): UpcomingVisitUI {
    const timestamp = interaction.plannedFor?.toDate 
      ? interaction.plannedFor.toDate()
      : interaction.timestamp?.toDate
        ? interaction.timestamp.toDate()
        : new Date();
    
    return {
      id: interaction.id,
      accountId: interaction.accountId || '',
      accountName: account?.name || 'Sin nombre',
      city: extractCityFromLocation(account?.location),
      type: interaction.kind || interaction.type || 'visit',
      date: formatDateToUI(timestamp),
      timestamp,
      notes: interaction.note || interaction.notes
    };
  }
  
  /**
   * Adapter: Interaction → RecentActivityUI
   * Usado para feed de actividad reciente
   */
  static adaptRecentActivity(interaction: any): RecentActivityUI {
    const kind = interaction.kind || interaction.type || 'other';
    const timestamp = interaction.createdAt?.toDate 
      ? interaction.createdAt.toDate()
      : interaction.timestamp?.toDate
        ? interaction.timestamp.toDate()
        : new Date();
    
    return {
      id: interaction.id,
      type: this.normalizeActivityType(kind),
      title: interaction.note || interaction.notes || `${kind} realizada`,
      description: kind,
      timestamp: timestamp.toISOString(),
      icon: this.getIconForKind(kind)
    };
  }
  
  /**
   * Adapter: Task → TaskAlertUI
   * Convierte tareas en alertas para dashboards
   */
  static adaptTaskToAlert(task: any): TaskAlertUI {
    const priority = task.priority || 'MEDIUM';
    const status = task.status || 'PENDING';
    
    return {
      id: task.id,
      type: this.getAlertTypeForPriority(priority),
      title: `📋 ${task.title || 'Tarea sin título'}`,
      description: `${status} · ${priority} prioridad`,
      actionLabel: 'Ver tarea'
    };
  }
  
  /**
   * Adapter: Order → OrderSummaryUI
   * Transforma pedido a formato summary para dashboards
   */
  static adaptOrderSummary(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber || order.id.slice(0, 8),
      customerName: order.customerName || 'Cliente',
      totalAmount: order.totalAmount || 0,
      status: order.status || 'PENDING',
      createdAt: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
      flow: order.flow || 'DIRECTA'
    };
  }
  
  /**
   * Adapter: Campaign → CampaignSummaryUI
   * Para dashboards de marketing
   */
  static adaptCampaignSummary(campaign: any) {
    const startDate = campaign.startDate?.toDate 
      ? campaign.startDate.toDate() 
      : new Date();
    const endDate = campaign.endDate?.toDate 
      ? campaign.endDate.toDate() 
      : new Date();
    
    return {
      id: campaign.id,
      name: campaign.name || 'Sin nombre',
      type: campaign.type || 'GENERAL',
      status: campaign.status || 'ACTIVE',
      progress: campaign.progress || 0,
      startDate,
      endDate,
      budget: campaign.budget || 0,
      spent: campaign.spent || 0
    };
  }
  
  // ============= HELPERS =============
  
  /**
   * Normaliza tipos de actividad a valores estándar
   */
  private static normalizeActivityType(kind: string): RecentActivityUI['type'] {
    const normalized = kind.toLowerCase();
    
    if (normalized.includes('visit') || normalized.includes('visita')) return 'visit';
    if (normalized.includes('call') || normalized.includes('llamada')) return 'call';
    if (normalized.includes('email') || normalized.includes('correo')) return 'email';
    if (normalized.includes('order') || normalized.includes('pedido')) return 'order';
    if (normalized.includes('meeting') || normalized.includes('reunion')) return 'meeting';
    if (normalized.includes('note') || normalized.includes('nota')) return 'note';
    
    return 'other';
  }
  
  /**
   * Mapea tipo de actividad a emoji/icono
   */
  private static getIconForKind(kind: string): string {
    const icons: Record<string, string> = {
      visit: '🤝',
      visita: '🤝',
      call: '📞',
      llamada: '📞',
      email: '📧',
      correo: '📧',
      order: '📦',
      pedido: '📦',
      meeting: '👥',
      reunion: '👥',
      note: '📝',
      nota: '📝',
      task: '✅',
      tarea: '✅'
    };
    
    const normalized = kind.toLowerCase();
    return icons[normalized] || '✨';
  }
  
  /**
   * Mapea prioridad de tarea a tipo de alerta
   */
  private static getAlertTypeForPriority(priority: string): TaskAlertUI['type'] {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return 'critical';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'info';
    }
  }
}

// ============= EXPORTS =============

export default DashboardAdapters;
