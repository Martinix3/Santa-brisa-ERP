/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Quality Module - UI Types
 * 
 * Tipos específicos para componentes UI del módulo Quality.
 * Complementan las interfaces del SSOT con tipos específicos para forms, tablas, y vistas.
 * 
 * FASE 20 - Quality Module Implementation
 */

import { z } from 'zod';

// Derive types from SSOT canonical schemas
const QcStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'HOLD', 'PASSED', 'FAILED', 'CONDITIONAL', 'WAIVED']);
type QcStatus = z.infer<typeof QcStatusEnum>;

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Form data para liberar/rechazar un lote
 */
export interface QualityReleaseFormData {
  // Identificación
  lotId: string;
  lotNumber: string;
  sku: string;
  /** @deprecated usa sku */ itemId?: string;

  // Decisión
  decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL' | 'HOLD';
  reason?: string;
  observations?: string;
  conditions?: string[];

  // Tests realizados
  testsPerformed: Array<{
    parameterId: string;
    parameterName?: string; // Opcional - fallback a parameterId
    value: string | number;
    result: 'PASS' | 'FAIL' | 'NA';
    inSpec: boolean;
    spec?: {
      min?: number;
      max?: number;
      target?: number;
      unit?: string;
    };
  }>;

  // Documentación
  coaUrl?: string;
  photosUrls?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;

  // Tracking
  reviewDuration?: number; // minutos
  correctiveActions?: string[];
}

/**
 * Form data para crear/editar plan QC
 */
export interface QcPlanFormData {
  name: string;
  description?: string;
  appliesToItems?: string[];
  appliesToCategories?: string[];
  triggerOn: 'RECEIPT' | 'PRODUCTION' | 'BOTH';
  requiredForRelease: boolean;
  parameters: Array<{
    parameterId: string;
    required: boolean;
    autoApproveIfInSpec?: boolean;
    priority: 'CRITICAL' | 'MAJOR' | 'MINOR';
    unit?: string;
    target?: number;
    min?: number;
    max?: number;
    tolerance?: number;
    method?: string;
  }>;
  autoApproveRules?: {
    enabled: boolean;
    conditions?: {
      allTestsPass?: boolean;
      trustedSuppliers?: string[];
      maxLotSize?: number;
    };
  };
  samplingPlan?: {
    type?: 'FULL' | 'SAMPLING' | 'SKIP';
    sampleSize?: number;
    sampleMethod?: 'RANDOM' | 'SYSTEMATIC' | 'STRATIFIED';
    acceptanceCriteria?: string;
    acceptanceLevel?: number;
  };
  active: boolean;
}

/**
 * Form data para registrar test individual
 */
export interface QcTestFormData {
  parameterId: string;
  parameterName: string;
  value: string | number;
  spec?: {
    min?: number;
    max?: number;
    target?: number;
    unit?: string;
  };
  method?: string;
  equipment?: string;
  notes?: string;
}

// ============================================================================
// TABLE/LIST DISPLAY TYPES
// ============================================================================

/**
 * Row data para tabla de lotes pendientes de liberación
 */
export interface LotReleaseTableRow {
  id: string;
  lotNumber: string;
  sku: string;
  /** @deprecated usa sku */ itemId?: string;
  itemName: string;
  category: string;
  supplier: string;
  supplierName?: string;
  receptionDate: Date;
  qcStatus: QcStatus;
  qcPlanId?: string;
  qcPlanName?: string;
  qcApprovedByName?: string;
  qcRejectedByName?: string;
  qcReviewOwnerName?: string;
  qcCoaUrl?: string;
  qcCoa?: string; // Alias para qcCoaUrl
  qcDocuments?: Array<{ name: string; url: string; type?: string }>;
  qcConditions?: string[];
  daysInHold: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  hasCoaDocument: boolean;
  requiresAnalysis: boolean;
}

/**
 * Row data para tabla de liberaciones (historial)
 */
export interface QualityReleaseTableRow {
  id: string;
  lotNumber: string;
  itemName: string;
  decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL' | 'HOLD';
  decisionAt: Date;
  reviewedBy: string;
  reviewedByName: string;
  reviewDuration?: number;
  testsCount: number;
  testsPassedCount: number;
  passRate: number;
}

/**
 * Row data para tabla de planes QC
 */
export interface QcPlanTableRow {
  id: string;
  name: string;
  active: boolean;
  version: number;
  appliesToCategories?: string[];
  requiresAnalysis: boolean;
  autoApproveEnabled: boolean;
  parametersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STATISTICS/KPI TYPES
// ============================================================================

/**
 * Estadísticas generales de Quality
 */
export interface QualityStats {
  // Lotes
  totalLots: number;
  lotsInHold: number;
  lotsPending: number;
  lotsInProgress: number;
  lotsApproved: number;
  lotsRejected: number;
  lotsConditional: number;

  // Tiempos
  avgReviewTimeHours: number;
  maxReviewTimeHours: number;
  lotsOverdue: number; // >48h en hold

  // Performance
  passRate: number; // porcentaje
  firstTimePassRate: number; // sin necesidad de re-test

  // Últimas 24h
  last24hApprovals: number;
  last24hRejections: number;

  // Alertas
  criticalLotsCount: number; // >7 días en hold
  lotsNearingExpiry: number; // expiración <30 días
}

/**
 * Estadísticas por categoría de producto
 */
export interface QualityStatsByCategory {
  category: string;
  totalLots: number;
  approvedLots: number;
  rejectedLots: number;
  passRate: number;
  avgReviewTimeHours: number;
}

/**
 * Estadísticas por proveedor
 */
export interface QualityStatsBySupplier {
  supplierId: string;
  supplierName: string;
  totalLots: number;
  approvedLots: number;
  rejectedLots: number;
  passRate: number;
  avgReviewTimeHours: number;
  lastRejectionDate?: Date;
  consecutiveRejections: number;
}

/**
 * Tendencia temporal de calidad
 */
export interface QualityTrend {
  period: string; // e.g., "2025-W03", "2025-01"
  totalLots: number;
  approvedLots: number;
  rejectedLots: number;
  passRate: number;
  avgReviewTimeHours: number;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props para LotReleaseCard
 */
export interface LotReleaseCardProps {
  lot: LotReleaseTableRow;
  onRelease: (lotId: string) => void;
  onViewDetails: (lotId: string) => void;
}

/**
 * Props para QcTestForm component
 */
export interface QcTestFormProps {
  parameterId: string;
  parameterName: string;
  spec?: {
    min?: number;
    max?: number;
    target?: number;
    unit?: string;
  };
  onSubmit: (data: QcTestFormData) => void;
  onCancel: () => void;
}

/**
 * Props para ApprovalModal component
 */
export interface ApprovalModalProps {
  lot: LotReleaseTableRow;
  tests: QcTestFormData[];
  open: boolean;
  onClose: () => void;
  onApprove: (data: QualityReleaseFormData) => void;
  onReject: (data: QualityReleaseFormData) => void;
}

/**
 * Props para LotDetailDrawer
 */
export interface LotDetailDrawerProps {
  lotId: string;
  open: boolean;
  onClose: () => void;
  onRelease?: (data: QualityReleaseFormData) => void;
}

/**
 * Props para QcPlanEditor component
 */
export interface QcPlanEditorProps {
  planId?: string; // undefined = create mode
  initialData?: QcPlanFormData;
  open: boolean;
  onClose: () => void;
  onSave: (data: QcPlanFormData) => void;
}

// ============================================================================
// FILTER/SEARCH TYPES
// ============================================================================

/**
 * Filtros para búsqueda de lotes pendientes
 */
export interface LotReleaseFilters {
  qcStatus?: QcStatus[];
  category?: string[];
  supplier?: string[];
  priority?: ('low' | 'medium' | 'high' | 'critical')[];
  daysInHoldMin?: number;
  daysInHoldMax?: number;
  hasCoaDocument?: boolean;
  requiresAnalysis?: boolean;
  searchQuery?: string;
}

/**
 * Filtros para historial de liberaciones
 */
export interface QualityReleaseFilters {
  decision?: ('APPROVED' | 'REJECTED' | 'CONDITIONAL' | 'HOLD')[];
  reviewedBy?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  itemCategory?: string[];
  passRateMin?: number;
  passRateMax?: number;
  searchQuery?: string;
}

/**
 * Orden de columnas para tablas
 */
export interface QualityTableSort {
  field: 'lotNumber' | 'daysInHold' | 'priority' | 'receptionDate' | 'decisionAt' | 'passRate';
  direction: 'asc' | 'desc';
}

// ============================================================================
// ACTION RESULT TYPES
// ============================================================================

/**
 * Resultado de acciones de Quality
 */
export type QualityActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Resultado de validación de liberación
 */
export interface ReleaseValidationResult {
  canRelease: boolean;
  errors: string[];
  warnings: string[];
  missingTests: string[];
  outOfSpecTests: string[];
}

/**
 * Resultado de auto-approval check
 */
export interface AutoApprovalCheckResult {
  canAutoApprove: boolean;
  reason: string;
  matchedRule?: string;
  conditions: {
    allTestsPass: boolean;
    isTrustedSupplier: boolean;
    isWithinLotSizeLimit: boolean;
  };
}

// ============================================================================
// NOTIFICATION/ALERT TYPES
// ============================================================================

/**
 * Alerta de Quality para dashboard
 */
export interface QualityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'overdue' | 'rejection' | 'expiry' | 'performance';
  title: string;
  message: string;
  lotId?: string;
  lotNumber?: string;
  supplierId?: string;
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Notificación de Quality para usuarios
 */
export interface QualityNotification {
  id: string;
  userId: string;
  type: 'lot_assigned' | 'lot_overdue' | 'approval_required' | 'rejection_alert';
  title: string;
  message: string;
  lotId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

// ============================================================================
// EXPORT/REPORT TYPES
// ============================================================================

/**
 * Configuración de reporte de Quality
 */
export interface QualityReportConfig {
  type: 'summary' | 'detailed' | 'by_supplier' | 'by_category';
  dateFrom: Date;
  dateTo: Date;
  includeCharts: boolean;
  includeRawData: boolean;
  filters?: LotReleaseFilters;
  format: 'pdf' | 'excel' | 'csv';
}

/**
 * Datos para reporte semanal
 */
export interface WeeklyQualityReport {
  weekNumber: string;
  summary: QualityStats;
  byCategory: QualityStatsByCategory[];
  bySupplier: QualityStatsBySupplier[];
  topIssues: Array<{
    issue: string;
    occurrences: number;
    affectedLots: string[];
  }>;
  recommendations: string[];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard para verificar si una decisión requiere reason
 */
export function requiresReason(decision: string): decision is 'REJECTED' | 'HOLD' {
  return decision === 'REJECTED' || decision === 'HOLD';
}

/**
 * Type guard para verificar si una decisión requiere conditions
 */
export function requiresConditions(decision: string): decision is 'CONDITIONAL' {
  return decision === 'CONDITIONAL';
}

/**
 * Type guard para verificar si un lote está vencido (>48h)
 */
export function isLotOverdue(daysInHold: number): boolean {
  return daysInHold > 2;
}

/**
 * Type guard para verificar prioridad crítica (>7 días)
 */
export function isCriticalPriority(daysInHold: number): boolean {
  return daysInHold > 7;
}
