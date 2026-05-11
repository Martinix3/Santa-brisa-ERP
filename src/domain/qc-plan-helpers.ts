// src/domain/qc-plan-helpers.ts
/**
 * Helpers para migración y compatibilidad de QcPlan
 * Convierte entre formato antiguo y nuevo
 */

import type { QcPlan, QcPlanTrigger, QcParameter, QcParameterType } from './ssot';

/**
 * Normaliza triggerOn de string legacy a array
 */
export function normalizeTriggerOn(trigger?: string | string[]): 'RECEIPT' | 'PRODUCTION' | 'BOTH' {
  if (!trigger) return 'RECEIPT';

  if (Array.isArray(trigger)) {
    if (trigger.includes('RECEIPT') && trigger.includes('PRODUCTION')) return 'BOTH';
    if (trigger.includes('PRODUCTION')) return 'PRODUCTION';
    return 'RECEIPT';
  }

  const legacy = trigger.toUpperCase();
  if (legacy === 'BOTH') return 'BOTH';
  if (legacy === 'PRODUCTION') return 'PRODUCTION';
  return 'RECEIPT';
}

/**
 * Convierte parámetro legacy a formato nuevo
 */
export function normalizeParameter(param: any): QcParameter {
  // Si ya está en formato nuevo, retornar
  if (param.id && param.name && param.type) {
    return param as QcParameter;
  }

  // Migrar de formato legacy
  const id = param.id || param.parameterId || `param-${Date.now()}`;
  const name = param.name || param.parameterName || param.parameterId || 'Unknown';

  // Inferir tipo basado en campos presentes
  let type: QcParameterType = 'TEXT';
  if (param.min !== undefined || param.max !== undefined || param.target !== undefined) {
    type = 'NUMERIC';
  } else if (param.options && Array.isArray(param.options)) {
    type = 'SELECT';
  } else if (param.acceptedFormats) {
    type = 'FILE';
  }

  return {
    id,
    name,
    type,
    code: param.code,
    unit: param.unit,
    min: param.min,
    max: param.max,
    target: param.target,
    tolerance: param.tolerance,
    required: param.required,
    priority: param.priority,
    method: param.method,
    category: param.category,
    applicableAt: param.applicableAt,
    options: param.options,
    acceptedFormats: param.acceptedFormats,
    maxSizeMB: param.maxSizeMB,
    validationRules: param.validationRules,
  };
}

/**
 * Normaliza array de parámetros
 */
export function normalizeParameters(params: any[] | undefined): QcParameter[] {
  if (!params) return [];
  return params.map(normalizeParameter);
}

/**
 * Convierte autoApproveRules legacy a formato nuevo
 */
export function normalizeAutoApproveRules(rules: any): QcPlan['autoApproveRules'] {
  if (!rules) return undefined;

  // Si ya está en formato nuevo (objeto)
  if (rules.conditions && !Array.isArray(rules.conditions)) {
    return rules as QcPlan['autoApproveRules'];
  }

  // Migrar de formato legacy (array o antiguo objeto)
  const conditions: NonNullable<QcPlan['autoApproveRules']>['conditions'] = {};

  // Si viene como array (legacy intermedio)
  if (Array.isArray(rules.conditions)) {
    for (const cond of rules.conditions) {
      if (cond.type === 'ALL_PARAMS_IN_SPEC') conditions.allTestsPass = true;
      if (cond.type === 'VALUE_THRESHOLD') conditions.maxLotSize = cond.threshold;
    }
  }
  // Si viene como objeto legacy
  else if (rules.conditions) {
    if (rules.conditions.allTestsPass) conditions.allTestsPass = true;
    if (rules.conditions.maxLotSize) conditions.maxLotSize = rules.conditions.maxLotSize;
    if (rules.conditions.trustedSuppliers) conditions.trustedSuppliers = rules.conditions.trustedSuppliers;
  }

  return {
    enabled: rules.enabled,
    conditions: Object.keys(conditions).length > 0 ? conditions : undefined
  };
}

/**
 * Migra QcPlan completo de formato legacy a nuevo
 */
export function migrateQcPlan(plan: any): QcPlan {
  return {
    ...plan,
    triggerOn: normalizeTriggerOn(plan.triggerOn || plan.trigger),
    parameters: normalizeParameters(plan.parameters),
    autoApproveRules: normalizeAutoApproveRules(plan.autoApproveRules),
  };
}

/**
 * Verifica si un plan tiene integración activa en un módulo
 */
export function hasModuleIntegration(
  plan: QcPlan,
  module: 'production' | 'logistics' | 'inventory'
): boolean {
  if (!plan.integrations) return false;

  const integration = plan.integrations[module];
  if (!integration) return false;

  // Verificar que al menos una opción esté activa
  return Object.values(integration).some(val => val === true);
}

/**
 * Obtiene label de trigger
 */
export function getTriggerLabel(trigger: QcPlanTrigger): string {
  const labels: Record<QcPlanTrigger, string> = {
    RECEIPT: 'Recepción',
    PRODUCTION: 'Producción',
    TRANSFER: 'Transferencia',
    SHIPMENT: 'Envío',
    PERIODIC: 'Periódico',
    ON_DEMAND: 'Bajo demanda',
    CONDITIONAL: 'Condicional',
  };
  return labels[trigger] ?? trigger;
}
