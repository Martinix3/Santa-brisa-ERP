/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { ProductSpecSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

type ProductSpec = z.infer<typeof ProductSpecSchema>;

interface FormulaAdjustmentStepProps {
  specs: ProductSpec[];
}

const FormulaAdjustmentStep: React.FC<FormulaAdjustmentStepProps> = ({
  specs,
}) => {
  return (
    <div>
      <h4>Formula Adjustment</h4>
      <p>This step will provide Gemini-powered recommendations for formula adjustments.</p>
      <h5>Target Specifications:</h5>
      <ul>
        {specs.map((spec) => (
          <li key={spec.id}>
            {spec.specType}: {spec.target} {spec.unit}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FormulaAdjustmentStep;
