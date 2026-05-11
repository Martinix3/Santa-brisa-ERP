/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import crypto from 'node:crypto';

export type BusinessRuleDomain =
  | 'inventory'
  | 'quality'
  | 'production'
  | 'logistics'
  | 'sales'
  | 'finance'
  | 'integrations';

export type RuleSeverity = 'info' | 'warning' | 'critical';

export interface BusinessRuleDefinition<Input = any> {
  id: string;
  name: string;
  description: string;
  domain: BusinessRuleDomain;
  tags?: string[];
  thresholds?: Record<string, number>;
  defaultSeverity: RuleSeverity;
  evaluate?: (input: Input) => BusinessRuleEvaluation;
  toGeminiObservation?: (evaluation: BusinessRuleEvaluation) => GeminiObservation;
}

export interface BusinessRuleEvaluation {
  ruleId: string;
  ok: boolean;
  severity: RuleSeverity;
  score: number;
  message: string;
  alertKey: string;
  taskKey?: string;
  data?: Record<string, unknown>;
}

export interface GeminiObservation {
  ruleId: string;
  severity: RuleSeverity;
  summary: string;
  suggestedActions?: string[];
  payload?: Record<string, unknown>;
}

const defaultObservation = (evaluation: BusinessRuleEvaluation): GeminiObservation => ({
  ruleId: evaluation.ruleId,
  severity: evaluation.severity,
  summary: evaluation.message,
  payload: evaluation.data,
});

const RULE_DEFINITIONS: BusinessRuleDefinition[] = [
  {
    id: 'inventory.qc.holdMaxHours',
    name: 'Lote en HOLD',
    description: 'Máximo de horas permitidas con estado HOLD antes de requerir acción correctiva.',
    domain: 'inventory',
    tags: ['qc', 'traceability'],
    thresholds: { holdMaxHours: 48, criticalHours: 72 },
    defaultSeverity: 'warning',
    evaluate: ({ hoursOnHold }: { hoursOnHold: number }) => {
      const threshold = 48;
      const critical = 72;
      const severity: RuleSeverity =
        hoursOnHold >= critical ? 'critical' : hoursOnHold > threshold ? 'warning' : 'info';
      const ok = hoursOnHold <= threshold;
      return makeEvaluation({
        ruleId: 'inventory.qc.holdMaxHours',
        ok,
        severity,
        score: scoreFromThreshold(hoursOnHold, threshold, critical),
        message: ok
          ? 'El lote está dentro del SLA de HOLD.'
          : `Lote en HOLD durante ${hoursOnHold}h (máximo ${threshold}h).`,
        data: { hoursOnHold, threshold, critical },
      });
    },
    toGeminiObservation: defaultObservation,
  },
  {
    id: 'inventory.expiry.upcomingDays',
    name: 'Caducidad próxima',
    description: 'Aviso si un lote está próximo a caducar según la política FEFO.',
    domain: 'inventory',
    tags: ['fefo', 'traceability'],
    thresholds: { warningDays: 14, criticalDays: 7 },
    defaultSeverity: 'warning',
    evaluate: ({ daysToExpiry }: { daysToExpiry: number }) => {
      const warning = 14;
      const critical = 7;
      const severity: RuleSeverity =
        daysToExpiry <= critical ? 'critical' : daysToExpiry <= warning ? 'warning' : 'info';
      const ok = daysToExpiry > warning;
      return makeEvaluation({
        ruleId: 'inventory.expiry.upcomingDays',
        ok,
        severity,
        score: scoreHighBetter(daysToExpiry, warning, critical),
        message: ok
          ? 'Caducidad dentro de los márgenes FEFO.'
          : `Caducidad próxima en ${daysToExpiry} días.`,
        data: { daysToExpiry, warning, critical },
      });
    },
    toGeminiObservation: defaultObservation,
  },
  {
    id: 'logistics.shipment.slaHours',
    name: 'SLA de envío',
    description: 'Tiempo máximo desde preparación hasta entrega para considerar SLA cumplido.',
    domain: 'logistics',
    tags: ['sendcloud', 'sla'],
    thresholds: { slaHours: 72, warningHours: 60 },
    defaultSeverity: 'warning',
    evaluate: ({ hoursInTransit }: { hoursInTransit: number }) => {
      const sla = 72;
      const warning = 60;
      const severity: RuleSeverity =
        hoursInTransit > sla ? 'critical' : hoursInTransit > warning ? 'warning' : 'info';
      const ok = hoursInTransit <= warning;
      return makeEvaluation({
        ruleId: 'logistics.shipment.slaHours',
        ok,
        severity,
        score: scoreFromThreshold(hoursInTransit, warning, sla),
        message: ok
          ? 'Envio dentro del SLA.'
          : `Envio fuera de SLA (${hoursInTransit}h, máximo ${sla}h).`,
        data: { hoursInTransit, warning, sla },
      });
    },
    toGeminiObservation: defaultObservation,
  },
  {
    id: 'sales.account.daysWithoutOrder',
    name: 'Días sin pedido',
    description: 'Detecta cuentas sin pedidos recientes para priorizar seguimiento comercial.',
    domain: 'sales',
    tags: ['churn', 'quicklog'],
    thresholds: { warningDays: 30, criticalDays: 45 },
    defaultSeverity: 'warning',
    evaluate: ({ daysWithoutOrder }: { daysWithoutOrder: number }) => {
      const warningDays = 30;
      const criticalDays = 45;
      const severity: RuleSeverity =
        daysWithoutOrder >= criticalDays
          ? 'critical'
          : daysWithoutOrder >= warningDays
          ? 'warning'
          : 'info';
      const ok = daysWithoutOrder < warningDays;
      return makeEvaluation({
        ruleId: 'sales.account.daysWithoutOrder',
        ok,
        severity,
        score: scoreHighBetter(daysWithoutOrder * -1, -warningDays, -criticalDays),
        message: ok
          ? 'Actividad comercial dentro de parámetros.'
          : `Cuenta sin pedido desde hace ${daysWithoutOrder} días.`,
        data: { daysWithoutOrder, warningDays, criticalDays },
      });
    },
    toGeminiObservation: defaultObservation,
  },
  {
    id: 'integrations.retry.failureRate',
    name: 'Ratio de errores en integraciones',
    description: 'Controla la tasa de errores de integraciones externas para activar alertas.',
    domain: 'integrations',
    tags: ['observability'],
    thresholds: { maxFailureRate: 0.05, warningRate: 0.02 },
    defaultSeverity: 'warning',
    evaluate: ({ failureRate }: { failureRate: number }) => {
      const warningRate = 0.02;
      const maxRate = 0.05;
      const severity: RuleSeverity =
        failureRate >= maxRate ? 'critical' : failureRate >= warningRate ? 'warning' : 'info';
      const ok = failureRate < warningRate;
      return makeEvaluation({
        ruleId: 'integrations.retry.failureRate',
        ok,
        severity,
        score: 1 - Math.min(1, failureRate / maxRate),
        message: ok
          ? 'Integraciones estables.'
          : `Ratio de fallo de integraciones ${Math.round(failureRate * 100)}%`,
        data: { failureRate, warningRate, maxRate },
      });
    },
    toGeminiObservation: defaultObservation,
  },
];

const DEFINITION_MAP = new Map(RULE_DEFINITIONS.map((rule) => [rule.id, rule]));

export function listBusinessRules() {
  return [...DEFINITION_MAP.values()];
}

export function getBusinessRule(id: string) {
  return DEFINITION_MAP.get(id);
}

export function evaluateBusinessRule(id: string, input: unknown): BusinessRuleEvaluation {
  const definition = DEFINITION_MAP.get(id);
  if (!definition) {
    throw new Error(`Business rule ${id} not found`);
  }

  if (definition.evaluate) {
    return definition.evaluate(input);
  }

  return makeEvaluation({
    ruleId: definition.id,
    ok: true,
    severity: definition.defaultSeverity,
    score: 1,
    message: 'Rule evaluated without custom logic.',
  });
}

export function makeAlertKey(ruleId: string, payload: unknown) {
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify({ ruleId, payload }))
    .digest('hex')
    .slice(0, 16);
  return `alert_${hash}`;
}

export function makeTaskKey(ruleId: string, payload: unknown) {
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify({ ruleId, payload, type: 'task' }))
    .digest('hex')
    .slice(0, 16);
  return `task_${hash}`;
}

function makeEvaluation(params: {
  ruleId: string;
  ok: boolean;
  severity: RuleSeverity;
  score: number;
  message: string;
  data?: Record<string, unknown>;
}): BusinessRuleEvaluation {
  const { ruleId, ok, severity, score, message, data } = params;
  return {
    ruleId,
    ok,
    severity,
    score: clamp(score, 0, 1),
    message,
    alertKey: makeAlertKey(ruleId, data),
    data,
  };
}

function scoreFromThreshold(value: number, warning: number, critical: number) {
  if (value <= warning) return 1;
  if (value >= critical) return 0;
  const delta = critical - warning;
  return clamp(1 - (value - warning) / delta, 0, 1);
}

function scoreHighBetter(value: number, warning: number, critical: number) {
  if (value >= warning) return 1;
  if (value <= critical) return 0;
  const delta = warning - critical;
  return clamp((value - critical) / delta, 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
