/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/orders/OrderCompleteness.tsx
import { type OrderSellOut } from '@/domain/ssot';

interface CompletenessRule {
  field: keyof OrderSellOut | string;
  label: string;
  required: boolean;
  validator?: (order: OrderSellOut) => boolean;
  weight: number; // 1-10, importance for completeness score
}

const COMPLETENESS_RULES: CompletenessRule[] = [
  // Datos básicos del pedido
  { field: 'docNumber', label: 'Número de pedido', required: true, weight: 8 },
  { field: 'accountId', label: 'Cliente asignado', required: true, weight: 10 },
  { field: 'status', label: 'Estado del pedido', required: true, weight: 5 },
  { field: 'lines', label: 'Líneas de pedido', required: true, weight: 10, 
    validator: (order) => order.lines && order.lines.length > 0 },
  
  // Datos comerciales SSOT V2.1
  { field: 'channel', label: 'Canal de venta', required: true, weight: 7 },
  { field: 'ownerId', label: 'Responsable comercial', required: true, weight: 8 },
  { field: 'source', label: 'Origen del pedido', required: false, weight: 5 },
  
  // Datos del cliente (SSOT V2.1)
  { field: 'customerVat', label: 'CIF/VAT del cliente', required: true, weight: 9 },
  { field: 'customerName', label: 'Nombre del cliente', required: true, weight: 8 },
  { field: 'billingAddress', label: 'Dirección de facturación', required: true, weight: 9 },
  { field: 'shippingAddress', label: 'Dirección de envío', required: false, weight: 6 },
  
  // Datos financieros
  { field: 'totalAmount', label: 'Importe total', required: true, weight: 9 },
  { field: 'currency', label: 'Moneda', required: true, weight: 5 },
  
  // Datos de distribución (si aplica)
  { field: 'distributorPartyId', label: 'Distribuidor', required: false, weight: 6,
    validator: (order) => order.flow !== 'PLACEMENT' || !!order.distributorPartyId },
  
  // Fechas importantes
  { field: 'orderDate', label: 'Fecha del pedido', required: false, weight: 4 },
  { field: 'createdAt', label: 'Fecha de creación', required: true, weight: 3 },
];

interface OrderCompletenessResult {
  score: number; // 0-100
  maxScore: number;
  missingRequired: CompletenessRule[];
  missingOptional: CompletenessRule[];
  completedFields: CompletenessRule[];
  level: 'CRITICAL' | 'WARNING' | 'GOOD' | 'EXCELLENT';
}

function calculateCompleteness(order: OrderSellOut): OrderCompletenessResult {
  const missingRequired: CompletenessRule[] = [];
  const missingOptional: CompletenessRule[] = [];
  const completedFields: CompletenessRule[] = [];
  
  let score = 0;
  let maxScore = 0;
  
  for (const rule of COMPLETENESS_RULES) {
    maxScore += rule.weight;
    
    const fieldValue = getFieldValue(order, rule.field);
    const isComplete = rule.validator 
      ? rule.validator(order)
      : fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    
    if (isComplete) {
      score += rule.weight;
      completedFields.push(rule);
    } else {
      if (rule.required) {
        missingRequired.push(rule);
      } else {
        missingOptional.push(rule);
      }
    }
  }
  
  const percentage = Math.round((score / maxScore) * 100);
  
  let level: OrderCompletenessResult['level'];
  if (missingRequired.length > 0) {
    level = 'CRITICAL';
  } else if (percentage < 70) {
    level = 'WARNING';
  } else if (percentage < 90) {
    level = 'GOOD';
  } else {
    level = 'EXCELLENT';
  }
  
  return {
    score: percentage,
    maxScore,
    missingRequired,
    missingOptional,
    completedFields,
    level
  };
}

function getFieldValue(order: OrderSellOut, field: string): any {
  // Handle nested fields like 'billingAddress.street'
  const parts = field.split('.');
  let value: any = order;
  
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) break;
  }
  
  return value;
}

interface OrderCompletenessProps {
  order: OrderSellOut;
  showDetails?: boolean;
  compact?: boolean;
}

export function OrderCompleteness({ 
  order, 
  showDetails = false, 
  compact = false 
}: OrderCompletenessProps) {
  const result = calculateCompleteness(order);
  
  const levelConfig = {
    CRITICAL: { 
      label: 'Crítico', 
      className: 'sb-badge--destructive',
      icon: '🚨'
    },
    WARNING: { 
      label: 'Incompleto', 
      className: 'sb-badge--warning',
      icon: '⚠️'
    },
    GOOD: { 
      label: 'Bueno', 
      className: 'sb-badge--info',
      icon: '✅'
    },
    EXCELLENT: { 
      label: 'Excelente', 
      className: 'sb-badge--success',
      icon: '🌟'
    }
  };
  
  const config = levelConfig[result.level];
  
  if (compact) {
    return (
      <div className="order-completeness order-completeness--compact">
        <div className="order-completeness__score">
          <span className="order-completeness__percentage">{result.score}%</span>
          <span className={`sb-badge sb-badge--xs ${config.className}`}>
            {config.icon} {config.label}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="order-completeness">
      <div className="order-completeness__header">
        <div className="order-completeness__score">
          <span className="order-completeness__percentage">{result.score}%</span>
          <span className="order-completeness__label">Completitud</span>
        </div>
        <span className={`sb-badge ${config.className}`}>
          {config.icon} {config.label}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="order-completeness__progress">
        <div 
          className="order-completeness__progress-fill"
          style={{ width: `${result.score}%` }}
          data-level={result.level.toLowerCase()}
        />
      </div>
      
      {showDetails && (
        <div className="order-completeness__details">
          {/* Missing required fields */}
          {result.missingRequired.length > 0 && (
            <div className="order-completeness__section">
              <h4 className="order-completeness__section-title order-completeness__section-title--critical">
                🚨 Campos obligatorios faltantes ({result.missingRequired.length})
              </h4>
              <ul className="order-completeness__field-list">
                {result.missingRequired.map((rule) => (
                  <li key={rule.field} className="order-completeness__field order-completeness__field--missing">
                    <span className="order-completeness__field-label">{rule.label}</span>
                    <span className="order-completeness__field-weight">Peso: {rule.weight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Missing optional fields */}
          {result.missingOptional.length > 0 && (
            <div className="order-completeness__section">
              <h4 className="order-completeness__section-title order-completeness__section-title--warning">
                ⚠️ Campos opcionales faltantes ({result.missingOptional.length})
              </h4>
              <ul className="order-completeness__field-list">
                {result.missingOptional.map((rule) => (
                  <li key={rule.field} className="order-completeness__field order-completeness__field--optional">
                    <span className="order-completeness__field-label">{rule.label}</span>
                    <span className="order-completeness__field-weight">Peso: {rule.weight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Completed fields summary */}
          <div className="order-completeness__section">
            <h4 className="order-completeness__section-title order-completeness__section-title--success">
              ✅ Campos completados ({result.completedFields.length})
            </h4>
            <div className="order-completeness__summary">
              Puntuación obtenida: {result.score}% ({result.completedFields.reduce((sum, rule) => sum + rule.weight, 0)} de {result.maxScore} puntos)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para usar en listas de pedidos
export function useOrderCompleteness(orders: OrderSellOut[]) {
  const results = orders.map(order => ({
    orderId: order.id,
    ...calculateCompleteness(order)
  }));
  
  const stats = {
    total: orders.length,
    critical: results.filter(r => r.level === 'CRITICAL').length,
    warning: results.filter(r => r.level === 'WARNING').length,
    good: results.filter(r => r.level === 'GOOD').length,
    excellent: results.filter(r => r.level === 'EXCELLENT').length,
    averageScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
  };
  
  return { results, stats };
}

// Componente para mostrar estadísticas globales
interface OrderCompletenessStatsProps {
  orders: OrderSellOut[];
}

export function OrderCompletenessStats({ orders }: OrderCompletenessStatsProps) {
  const { stats } = useOrderCompleteness(orders);
  
  return (
    <div className="order-completeness-stats">
      <div className="order-completeness-stats__header">
        <h3>Completitud de Pedidos</h3>
        <span className="order-completeness-stats__average">
          Promedio: {stats.averageScore}%
        </span>
      </div>
      
      <div className="order-completeness-stats__breakdown">
        <div className="order-completeness-stats__item order-completeness-stats__item--critical">
          <span className="order-completeness-stats__count">{stats.critical}</span>
          <span className="order-completeness-stats__label">Críticos</span>
        </div>
        <div className="order-completeness-stats__item order-completeness-stats__item--warning">
          <span className="order-completeness-stats__count">{stats.warning}</span>
          <span className="order-completeness-stats__label">Incompletos</span>
        </div>
        <div className="order-completeness-stats__item order-completeness-stats__item--good">
          <span className="order-completeness-stats__count">{stats.good}</span>
          <span className="order-completeness-stats__label">Buenos</span>
        </div>
        <div className="order-completeness-stats__item order-completeness-stats__item--excellent">
          <span className="order-completeness-stats__count">{stats.excellent}</span>
          <span className="order-completeness-stats__label">Excelentes</span>
        </div>
      </div>
    </div>
  );
}
