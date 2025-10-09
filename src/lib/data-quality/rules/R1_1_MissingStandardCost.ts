// src/lib/data-quality/rules/R1_1_MissingStandardCost.ts
import type { QualityRule, DataAnomaly } from '../types';
import type { Item } from '@/domain/ssot.v7';

export const R1_1_MissingStandardCost: QualityRule = {
  id: 'R1.1',
  description: 'Detecta ítems activos sin un coste estándar definido.',
  severity: 'CRITICAL',
  check: ({ items }) => {
    const anomalies: DataAnomaly[] = [];
    
    const itemsWithoutCost = items.filter(item => 
      item.active && (!item.stdCost || item.stdCost <= 0)
    );

    itemsWithoutCost.forEach(item => {
      anomalies.push({
        ruleId: R1_1_MissingStandardCost.id,
        severity: R1_1_MissingStandardCost.severity,
        message: `El ítem activo '${item.name}' no tiene un coste estándar definido.`,
        offendingEntity: {
          type: 'Item',
          id: item.id,
        },
      });
    });

    return anomalies;
  }
};
