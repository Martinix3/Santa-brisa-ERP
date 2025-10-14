// Order Status Workflow Types
// Phase 1 - Orders Intelligence

export type OrderStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL' 
  | 'APPROVED'
  | 'IN_LOGISTICS'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

export type StatusTransition = {
  from: OrderStatus;
  to: OrderStatus;
  requiresNote?: boolean;
  autoActions?: string[]; // e.g., ['CREATE_SHIPMENT', 'NOTIFY_CUSTOMER']
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  timestamp: string;
  userId: string;
  userName?: string;
  note?: string;
  metadata?: Record<string, any>;
};

export type OrderWorkflowMetadata = {
  currentStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  lastStatusChange?: string;
  lastStatusChangeBy?: string;
};

// Valid transitions map
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['IN_LOGISTICS', 'CANCELLED'],
  IN_LOGISTICS: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: []
};

// Status labels in Spanish
export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente Aprobación',
  APPROVED: 'Aprobado',
  IN_LOGISTICS: 'En Logística',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado'
};

// Status colors for badges
export const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  DRAFT: 'sb-badge',
  PENDING_APPROVAL: 'sb-badge sb-badge--warning',
  APPROVED: 'sb-badge sb-badge--success',
  IN_LOGISTICS: 'sb-pill sb-pill--primary',
  SHIPPED: 'sb-pill sb-pill--primary',
  DELIVERED: 'sb-badge sb-badge--success',
  CLOSED: 'sb-badge',
  CANCELLED: 'sb-badge sb-badge--destructive'
};

// Helper to check if transition is valid
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Get available next statuses for current status
export function getAvailableTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
